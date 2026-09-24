import re
import time
from app.models.conversation_model import (
    create_conversation,
    get_conversation_by_id,
    update_conversation_timestamp
)
from app.models.message_model import create_message
from app.services.context_service import build_compact_context
from app.providers import get_ai_provider


SYSTEM_PROMPT = """You are SmritiRoots, a compassionate, warm, and comforting voice companion designed specifically for an elderly person.

Guidelines:
1. Use simple, warm, respectful, and concise language (1 to 3 comforting sentences). Keep sentences short and clear so they sound natural when spoken aloud by text-to-speech.
2. Ground your answers ONLY in the verified facts provided. NEVER invent family members, memories, dates, medications, or events.
3. If asked about a family member, memory, or place not in the facts, gently and kindly explain that you do not recall that yet, and suggest asking their family or caregiver.
4. Do NOT diagnose, provide medical prescriptions, or advise on clinical treatments. If they mention feeling unwell or having an emergency, gently remind them to rest and notify their caregiver or family immediately.
5. Always respond in the requested language (e.g. Hindi or English)."""


def sanitize_speech_text(text: str) -> str:
    """
    Remove markdown asterisks, hashtags, and code fences so browser TTS speaks smoothly.
    """
    if not text:
        return ""
    # Strip markdown bold/italic
    cleaned = re.sub(r'[*_#`~]', '', text)
    # Strip multiple consecutive spaces/newlines
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()
    return cleaned


def generate_grounded_fallback(context_data: dict, language: str) -> str:
    pref_name = context_data.get("preferred_name") or "Friend"
    intent = context_data.get("intent", "general")
    facts = context_data.get("facts", [])
    detail = facts[1] if len(facts) > 1 else ""

    is_hi = language.startswith("hi")

    if intent == "family":
        if is_hi:
            return f"{pref_name} जी, आपका परिवार आपसे बहुत स्नेह करता है। {detail if detail else 'वे हमेशा आपके साथ हैं।'}"
        return f"{pref_name}, your family cares for you so deeply. {detail if detail else 'They are always close to your heart.'}"

    elif intent == "routine":
        if is_hi:
            return f"{pref_name} जी, यह आपकी शांतिपूर्ण दिनचर्या का समय है। {detail if detail else 'आराम से अपना समय लें और खुश रहें।'}"
        return f"{pref_name}, having a gentle daily routine is so comforting. {detail if detail else 'Take your time and enjoy your day at your own pace.'}"

    elif intent == "memory":
        if is_hi:
            return f"{pref_name} जी, पुरानी अच्छी यादों को याद करना मन को बहुत सुकून देता है। {detail if detail else 'यह पल वाकई बहुत सुंदर थे।'}"
        return f"{pref_name}, looking back on cherished memories brings such warmth. {detail if detail else 'Those moments are truly precious.'}"

    elif intent == "preference":
        if is_hi:
            return f"{pref_name} जी, अपनी पसंदीदा चीजों का आनंद लेना बहुत अच्छा है। {detail if detail else 'यह आपके चेहरे पर मुस्कान लाती हैं।'}"
        return f"{pref_name}, thinking of things that bring you happiness is wonderful. {detail if detail else 'It is a lovely reminder to smile.'}"

    else:
        if is_hi:
            return f"नमस्ते {pref_name} जी! मैं आपकी स्मृति साथी हूँ। मैं आपके साथ बात करने के लिए हमेशा यहाँ हूँ।"
        return f"Hello {pref_name}, I am right here by your side. It is always a pleasure chatting with you."


def process_companion_message(patient_data: dict, message_text: str, conversation_id: str = None, language: str = "en-IN") -> dict:
    """
    Main orchestration function for Voice AI Companion:
    1. Ensure or create conversation session
    2. Retrieve strictly relevant context & conversation history
    3. Generate response using server-side AI provider (Gemini)
    4. Validate and sanitize response for TTS
    5. Persist both user and assistant messages
    6. Return response payload
    """
    if not message_text or not str(message_text).strip():
        raise ValueError("Message text cannot be empty")

    patient_id = str(patient_data.get("_id") or patient_data.get("id"))
    clean_message = str(message_text).strip()

    # 1. Manage Conversation Session
    try:
        if conversation_id:
            conv = get_conversation_by_id(conversation_id)
            if not conv:
                # If provided ID is invalid/expired, create a new conversation
                conversation_id = create_conversation(patient_id, language)
        else:
            conversation_id = create_conversation(patient_id, language)
    except Exception as db_err:
        print(f"[CompanionService] Conversation session DB warning: {db_err}")
        conversation_id = conversation_id or f"session_{int(time.time())}"

    # 2. Retrieve Minimal Context (Whitelisted facts + last 5-10 messages)
    context_data = build_compact_context(
        patient_data=patient_data,
        conversation_id=conversation_id,
        current_message=clean_message,
        language=language
    )

    # 3. Call AI Provider (Gemini)
    provider = get_ai_provider()
    try:
        raw_reply = provider.generate(
            system_instruction=SYSTEM_PROMPT,
            context_facts=context_data["facts"],
            recent_messages=context_data["recent_messages"],
            current_message=clean_message,
            language=language
        )
    except Exception as e:
        print(f"[CompanionService] AI Provider error: {e}. Using warm grounded fallback.")
        raw_reply = generate_grounded_fallback(context_data, language)

    # 4. Clean text for natural speech synthesis
    speech_ready_reply = sanitize_speech_text(raw_reply)

    # 5. Persist messages in MongoDB
    try:
        create_message(
            conversation_id=conversation_id,
            patient_id=patient_id,
            role="user",
            text=clean_message,
            language=language
        )
        create_message(
            conversation_id=conversation_id,
            patient_id=patient_id,
            role="assistant",
            text=speech_ready_reply,
            language=language
        )
        update_conversation_timestamp(conversation_id, language)
    except Exception as db_err:
        print(f"[CompanionService] Error persisting messages: {db_err}")

    return {
        "status": "success",
        "conversation_id": conversation_id,
        "reply": speech_ready_reply,
        "language": language
    }
