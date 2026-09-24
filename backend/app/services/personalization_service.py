import os
import json
import random
from google import genai


def patient_has_personal_info(patient_data):
    """
    Check if the patient has provided any personal details
    (family, favorite things, daily routine, important places, personal memories).
    """
    if not patient_data:
        return False

    keys = [
        "family",
        "favorite_things",
        "daily_routine",
        "important_places",
        "personal_memories"
    ]

    for k in keys:
        val = patient_data.get(k)
        if isinstance(val, list) and len(val) > 0 and any(str(x).strip() for x in val):
            return True
        if isinstance(val, str) and val.strip():
            return True

    return False


def generate_template_personalized_questions(patient_data, count=5):
    """
    Generate meaningful multiple-choice questions grounded directly in the
    patient's own personal info when Gemini API is offline or high demand.
    """
    preferred_name = patient_data.get("preferred_name") or "Friend"

    def extract_list(key):
        val = patient_data.get(key) or []
        if isinstance(val, str):
            return [x.strip() for x in val.split(",") if x.strip()]
        return [str(x).strip() for x in val if str(x).strip()]

    favs = extract_list("favorite_things")
    family = extract_list("family")
    routine = extract_list("daily_routine")
    places = extract_list("important_places")
    memories = extract_list("personal_memories")

    distractors_fav = [
        "Cold bitter coffee",
        "Heavy traffic noise",
        "Stormy blizzard",
        "Loud alarm bell",
        "Spicy chili peppers"
    ]
    distractors_fam = [
        "Sherlock Holmes",
        "Captain Hook",
        "Oliver Twist",
        "Robin Hood",
        "Peter Pan"
    ]
    distractors_routine = [
        "Running a midnight marathon",
        "Fixing an airplane engine",
        "Deep sea scuba diving",
        "Climbing Mount Everest",
        "Mowing a giant lawn at 3 AM"
    ]
    distractors_places = [
        "The North Pole",
        "Deep Sahara Desert",
        "Amazon Rain Forest",
        "Outer Space",
        "Antarctic Ice Shelf"
    ]
    distractors_memories = [
        "Catching a rocket to Jupiter",
        "Exploring underwater volcanoes",
        "Racing in Formula 1 grand prix",
        "Flying a hot air balloon over Mars",
        "Swimming with polar bears"
    ]

    questions = []

    if favs:
        ans = favs[0]
        opts = [ans] + random.sample(distractors_fav, 3)
        random.shuffle(opts)
        questions.append({
            "question": f"Which of these is one of your favorite things, {preferred_name}?",
            "options": opts,
            "answer": ans,
            "category": "memory",
            "difficulty": "easy"
        })

    if family:
        ans = family[0]
        opts = [ans] + random.sample(distractors_fam, 3)
        random.shuffle(opts)
        questions.append({
            "question": f"Who is a beloved member of your family circle, {preferred_name}?",
            "options": opts,
            "answer": ans,
            "category": "family",
            "difficulty": "easy"
        })

    if routine:
        ans = routine[0]
        opts = [ans] + random.sample(distractors_routine, 3)
        random.shuffle(opts)
        questions.append({
            "question": f"What is a familiar, comforting part of your daily routine, {preferred_name}?",
            "options": opts,
            "answer": ans,
            "category": "routine",
            "difficulty": "easy"
        })

    if places:
        ans = places[0]
        opts = [ans] + random.sample(distractors_places, 3)
        random.shuffle(opts)
        questions.append({
            "question": f"Which special place is familiar and dear to your heart, {preferred_name}?",
            "options": opts,
            "answer": ans,
            "category": "place",
            "difficulty": "easy"
        })

    if memories:
        ans = memories[0]
        opts = [ans] + random.sample(distractors_memories, 3)
        random.shuffle(opts)
        questions.append({
            "question": f"Which cherished memory brings a warm smile to you, {preferred_name}?",
            "options": opts,
            "answer": ans,
            "category": "memory",
            "difficulty": "easy"
        })

    for idx, q in enumerate(questions, 1):
        q["id"] = f"pq_{idx}"

    return questions[:count]


def generate_personalized_questions(
    patient_data,
    difficulty="easy",
    count=5
):
    """
    Generate personalized questions using Gemini API from user personal info.
    If user provided personal info, calls Gemini; if Gemini is busy or times out,
    uses template personalization directly from their data.
    If user has NO personal info, returns None so callers use backup questions.
    """
    if not patient_has_personal_info(patient_data):
        return None

    api_key = os.getenv("GEMINI_API_KEY")

    if api_key:
        try:
            client = genai.Client(api_key=api_key)

            personal_context = {
                "preferred_name": patient_data.get("preferred_name"),
                "family": patient_data.get("family", []),
                "favorite_things": patient_data.get("favorite_things", []),
                "daily_routine": patient_data.get("daily_routine", []),
                "important_places": patient_data.get("important_places", []),
                "personal_memories": patient_data.get("personal_memories", [])
            }

            prompt = f"""
Create {count} simple, heartwarming multiple-choice cognitive engagement questions for an elderly person.
Difficulty: {difficulty}

Use this person's real personal information so the questions feel familiar, warm, and comforting:
{json.dumps(personal_context, default=str)}

Rules:
- Keep questions simple, respectful, and encouraging.
- Exactly 4 options per question.
- Exactly 1 correct answer (must match their personal info).
- Do not create medical, test-like, or diagnostic questions.
- Use only the information provided.
- Return ONLY valid JSON:
{{
    "questions": [
        {{
            "question": "Question text",
            "options": [
                "Option 1",
                "Option 2",
                "Option 3",
                "Option 4"
            ],
            "answer": "Correct option",
            "category": "memory",
            "difficulty": "{difficulty}"
        }}
    ]
}}
"""
            def call_gemini():
                model_candidates = ["gemini-3.1-flash-lite", "gemini-3.6-flash", "gemini-flash-latest", "gemini-3.5-flash"]
                for candidate in model_candidates:
                    try:
                        resp = client.models.generate_content(
                            model=candidate,
                            contents=prompt
                        )
                        if resp and hasattr(resp, "text") and resp.text:
                            return resp
                    except Exception as cand_err:
                        print(f"[Personalization] Candidate {candidate} error: {cand_err}")
                return None

            import threading

            def _run_with_timeout(func, timeout=12):
                res = [None]
                err = [None]
                def worker():
                    try:
                        res[0] = func()
                    except Exception as e:
                        err[0] = e
                t = threading.Thread(target=worker, daemon=True)
                t.start()
                t.join(timeout=timeout)
                if t.is_alive():
                    print(f"[Personalization] Gemini call timed out after {timeout}s")
                    return None
                if err[0]:
                    raise err[0]
                return res[0]

            response = _run_with_timeout(call_gemini, timeout=12)

            if response and hasattr(response, "text") and response.text:
                text = response.text.strip()
                if text.startswith("```"):
                    text = text.replace("```json", "")
                    text = text.replace("```", "")
                    text = text.strip()

                if "{" in text and "}" in text:
                    start_idx = text.find("{")
                    end_idx = text.rfind("}") + 1
                    text = text[start_idx:end_idx]

                result = json.loads(text)
                questions = result.get("questions", [])
                if questions and len(questions) > 0:
                    for idx, q in enumerate(questions, 1):
                        q["id"] = f"pq_{idx}"
                    return questions
        except Exception as e:
            print("[Personalization] Gemini API call failed, using template personalization:", e)

    # Fallback to direct personalization from user's provided info
    return generate_template_personalized_questions(patient_data, count=count)