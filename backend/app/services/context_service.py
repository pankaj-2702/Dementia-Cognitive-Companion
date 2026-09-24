import re
from app.models.memory_model import find_memories_by_patient
from app.models.message_model import get_recent_messages


def _extract_list(raw_val):
    if not raw_val:
        return []
    if isinstance(raw_val, list):
        return [str(x).strip() for x in raw_val if str(x).strip()]
    if isinstance(raw_val, str):
        return [x.strip() for x in raw_val.split(",") if x.strip()]
    return []


def _matches_keyword(text: str, kw: str) -> bool:
    if not kw or not text:
        return False
    kw_clean = kw.lower().strip()
    text_clean = text.lower().strip()
    if " " in kw_clean:
        return kw_clean in text_clean
    if kw_clean.isascii() and kw_clean.isalnum():
        return bool(re.search(r'\b' + re.escape(kw_clean) + r'\b', text_clean))
    return kw_clean in text_clean


def detect_intent(message_text: str, patient_data: dict) -> str:
    """
    Classify user message intent to enforce privacy-preserving, minimal context retrieval.
    Rules defined in Section 4 & 5 of the Voice AI Companion specification.
    """
    if not message_text:
        return "general"

    text = message_text.lower().strip()

    # 1. Check for general greeting first (so "Good morning" isn't misclassified as routine)
    greeting_phrases = [
        "good morning", "good evening", "good afternoon", "good night",
        "hello", "hi there", "how are you", "namaste", "shubh prabhat",
        "नमस्ते", "प्रणाम", "सुप्रभात", "कैसे हो", "कैसी हो", "क्या हाल है"
    ]
    if any(_matches_keyword(text, gp) for gp in greeting_phrases) and len(text.split()) <= 4:
        return "general"

    # 2. Family / Person
    family_members = _extract_list(patient_data.get("family"))
    family_keywords = [
        "who is", "family", "son", "daughter", "grandson", "granddaughter",
        "spouse", "husband", "wife", "child", "children", "mother", "father",
        "brother", "sister", "beta", "beti", "pota", "poti", "parivar", "pati", "patni", "koun", "kaun",
        "परिवार", "बेटा", "बेटी", "पोता", "पोती", "पति", "पत्नी", "माता", "पिता", "भाई", "बहन", "कौन"
    ]
    if any(_matches_keyword(text, kw) for kw in family_keywords):
        return "family"
    # Check if user mentioned any known family member's name
    for member in family_members:
        name_part = member.split("(")[0].strip().lower()
        if name_part and len(name_part) > 2 and _matches_keyword(text, name_part):
            return "family"

    # 3. Favorite / Preference (checked before routine so "favorite song/food" matches preference)
    pref_keywords = [
        "favorite", "favourite", "hobby", "hobbies", "enjoy",
        "song", "music", "food", "dish", "pasand", "shauk", "geet", "gaana", "khana",
        "पसंद", "शौक", "गाना", "गीत", "खाना", "व्यंजन", "रुचि"
    ]
    if any(_matches_keyword(text, kw) for kw in pref_keywords):
        return "preference"

    # 4. Memory / Story
    memory_keywords = [
        "memory", "memories", "remember", "recollect", "story", "stories",
        "trip", "travel", "visit", "photo", "picture", "yaad", "kahani",
        "purani", "pichle", "bachpan", "kissa", "reminisce",
        "याद", "यादें", "कहानी", "किस्सा", "बचपन", "यात्रा", "सफर", "तस्वीर", "पुरानी बातें"
    ]
    if any(_matches_keyword(text, kw) for kw in memory_keywords):
        return "memory"

    # 5. Daily Routine
    routine_keywords = [
        "routine", "schedule", "timetable", "medicine", "pill", "medication",
        "walk", "tea", "chai", "breakfast", "lunch", "dinner", "walk",
        "dawai", "subah", "shaam", "baje", "samay", "kya karna", "kab",
        "दिनचर्या", "दवा", "दवाई", "चाय", "नाश्ता", "सुबह", "शाम", "समय", "घड़ी", "कब लेना"
    ]
    if any(_matches_keyword(text, kw) for kw in routine_keywords):
        return "routine"

    # 6. Game / Quiz Performance
    game_keywords = [
        "game", "quiz", "score", "points", "accuracy", "khel", "dimag", "level",
        "खेल", "दिमाग", "क्विज", "अंक"
    ]
    if any(_matches_keyword(text, kw) for kw in game_keywords):
        return "game"

    return "general"


def build_compact_context(patient_data: dict, conversation_id: str, current_message: str, language: str = "en-IN") -> dict:
    """
    Retrieve ONLY the strictly relevant verified facts matching the user's intent.
    Never sends full patient profile. Includes the last 5-10 messages.
    """
    patient_data = patient_data or {}
    preferred_name = patient_data.get("preferred_name") or "Friend"
    patient_id = patient_data.get("_id") or patient_data.get("id")

    intent = detect_intent(current_message, patient_data)
    facts = [f"Elder's Preferred Name: {preferred_name}"]

    if intent == "family":
        family_members = _extract_list(patient_data.get("family"))
        if family_members:
            # If user mentioned a specific name, filter down; otherwise include relevant family
            text_lower = current_message.lower()
            matched = [m for m in family_members if any(part in text_lower for part in m.lower().split() if len(part) > 2)]
            selected = matched if matched else family_members[:3]
            for m in selected:
                facts.append(f"Verified Family Member: {m}")
        else:
            facts.append("No family details recorded yet.")

    elif intent == "routine":
        routine_items = _extract_list(patient_data.get("daily_routine"))
        if routine_items:
            for item in routine_items[:3]:
                facts.append(f"Comforting Routine: {item}")
        else:
            facts.append("Gentle daily routine: morning tea, regular rest, peaceful walks.")

    elif intent == "preference":
        fav_items = _extract_list(patient_data.get("favorite_things"))
        if fav_items:
            for item in fav_items[:3]:
                facts.append(f"Cherished Preference/Hobby: {item}")
        else:
            facts.append("Likes: peaceful music, comforting tea, pleasant conversations.")

    elif intent == "memory":
        # Pull verified memories from MongoDB memory collection
        memories = []
        if patient_id:
            try:
                memories = find_memories_by_patient(str(patient_id))
            except Exception as e:
                print(f"[ContextService] find_memories error: {e}")

        # Fallback to patient_data personal_memories field if collection has none
        if not memories:
            raw_mems = _extract_list(patient_data.get("personal_memories"))
            for rm in raw_mems[:2]:
                facts.append(f"Verified Memory: {rm}")
        else:
            for m in memories[:2]:
                m_title = m.get("title", "")
                m_desc = m.get("description", "")
                facts.append(f"Verified Memory: {m_title} - {m_desc}")

    elif intent == "game":
        facts.append("Brain games played: Active Mind Games on SmritiRoots app designed for cognitive joy and steady recall.")

    else:
        # General chat - minimal context only
        if patient_data.get("age"):
            facts.append(f"Age: {patient_data.get('age')}")
        places = _extract_list(patient_data.get("important_places"))
        if places:
            facts.append(f"Dear Place: {places[0]}")

    # Retrieve last 5–10 messages for conversation continuity
    recent_messages = []
    if conversation_id:
        try:
            recent_raw = get_recent_messages(conversation_id, limit=8)
            for rm in recent_raw:
                recent_messages.append({
                    "role": rm.get("role"),
                    "text": rm.get("text", ""),
                    "language": rm.get("language", language)
                })
        except Exception as e:
            print(f"[ContextService] get_recent_messages error: {e}")

    return {
        "intent": intent,
        "preferred_name": preferred_name,
        "facts": facts,
        "recent_messages": recent_messages,
        "language": language
    }
