from flask import Blueprint, request, g

from app.models.patient_model import find_patient_by_id
from app.models.game_result_model import create_game_result
from app.models.game_session_model import (
    create_game_session,
    find_game_session,
    complete_game_session
)
from app.middleware.auth_middleware import token_required
from app.services.adaptive_service import get_next_difficulty
from app.services.personalization_service import generate_personalized_questions


game_session_bp = Blueprint("game_session", __name__)


# ============================================================
# GENERATE PERSONALIZED GAME
# ============================================================

@game_session_bp.route("/personalized", methods=["POST"])
@token_required
def get_personalized_game():

    data = request.get_json()

    if not data:
        return {
            "status": "error",
            "message": "Request body is required"
        }, 400

    patient_id = data.get("patient_id")
    difficulty = data.get("difficulty", "easy")
    count = data.get("count", 5)

    # --------------------------------------------------------
    # Check patient ID
    # --------------------------------------------------------

    if not patient_id:
        return {
            "status": "error",
            "message": "patient_id is required"
        }, 400

    # --------------------------------------------------------
    # Find patient
    # --------------------------------------------------------

    patient = find_patient_by_id(patient_id)

    if not patient:
        return {
            "status": "error",
            "message": "Patient not found"
        }, 404

    # --------------------------------------------------------
    # Check patient ownership
    # --------------------------------------------------------

    is_caregiver = str(patient["caregiver_id"]) == g.user["user_id"]
    is_patient = str(patient["user_id"]) == g.user["user_id"]

    if not (is_caregiver or is_patient):
        return {
            "status": "error",
            "message": "You are not authorized for this patient"
        }, 403

    # --------------------------------------------------------
    # Check difficulty
    # --------------------------------------------------------

    if difficulty not in ["easy", "medium", "hard"]:
        return {
            "status": "error",
            "message": "Invalid difficulty"
        }, 400

    # --------------------------------------------------------
    # Check question count
    # --------------------------------------------------------

    try:
        count = int(count)
    except (ValueError, TypeError):
        return {
            "status": "error",
            "message": "count must be a number"
        }, 400

    if count < 1 or count > 10:
        return {
            "status": "error",
            "message": "count must be between 1 and 10"
        }, 400

    # --------------------------------------------------------
    # Prepare patient data
    # --------------------------------------------------------

    patient_data = {
        "preferred_name": patient.get("preferred_name"),
        "family": patient.get("family", []),
        "favorite_things": patient.get("favorite_things", []),
        "daily_routine": patient.get("daily_routine", []),
        "important_places": patient.get("important_places", []),
        "personal_memories": patient.get("personal_memories", [])
    }

    # --------------------------------------------------------
    # Generate questions using Gemini
    # --------------------------------------------------------

    try:

        questions = generate_personalized_questions(
            patient_data=patient_data,
            difficulty=difficulty,
            count=count
        )

        # ----------------------------------------------------
        # Add our own IDs BEFORE saving to MongoDB
        # ----------------------------------------------------

        for index, question in enumerate(questions, start=1):
            question["id"] = f"q{index}"

        # ----------------------------------------------------
        # Create game session
        # ----------------------------------------------------

        session_id = create_game_session(
            patient_id=patient_id,
            game_id="personalized-memory",
            difficulty=difficulty,
            questions=questions
        )

        # ----------------------------------------------------
        # Hide correct answers from frontend
        # ----------------------------------------------------

        safe_questions = []

        for question in questions:

            safe_questions.append({
                "question_id": question["id"],
                "question": question.get("question"),
                "options": question.get("options"),
                "category": question.get("category"),
                "difficulty": question.get("difficulty")
            })

        return {
            "status": "success",
            "session_id": session_id,
            "patient_id": patient_id,
            "difficulty": difficulty,
            "questions": safe_questions
        }, 201

    except Exception as e:

        return {
            "status": "error",
            "message": str(e)
        }, 500


# ============================================================
# SUBMIT GAME SESSION
# ============================================================

@game_session_bp.route("/submit", methods=["POST"])
@token_required
def submit_game():

    data = request.get_json()

    if not data:
        return {
            "status": "error",
            "message": "Request body is required"
        }, 400

    session_id = data.get("session_id")
    answers = data.get("answers")
    time_taken = data.get("time_taken", 0)

    # --------------------------------------------------------
    # Validate request
    # --------------------------------------------------------

    if not session_id or answers is None:
        return {
            "status": "error",
            "message": "session_id and answers are required"
        }, 400

    if not isinstance(answers, list):
        return {
            "status": "error",
            "message": "answers must be a list"
        }, 400

    if len(answers) == 0:
        return {
            "status": "error",
            "message": "At least one answer is required"
        }, 400

    # --------------------------------------------------------
    # Find game session
    # --------------------------------------------------------

    session = find_game_session(session_id)

    if not session:
        return {
            "status": "error",
            "message": "Game session not found"
        }, 404

    # --------------------------------------------------------
    # Prevent duplicate submission
    # --------------------------------------------------------

    if session.get("completed"):
        return {
            "status": "error",
            "message": "This game session has already been submitted"
        }, 400

    patient_id = str(session["patient_id"])

    # --------------------------------------------------------
    # Check patient
    # --------------------------------------------------------

    patient = find_patient_by_id(patient_id)

    if not patient:
        return {
            "status": "error",
            "message": "Patient not found"
        }, 404

    # --------------------------------------------------------
    # Check ownership
    # --------------------------------------------------------

    is_caregiver = str(patient["caregiver_id"]) == g.user["user_id"]
    is_patient = str(patient["user_id"]) == g.user["user_id"]

    if not (is_caregiver or is_patient):
        return {
            "status": "error",
            "message": "You are not authorized for this patient"
        }, 403

    # --------------------------------------------------------
    # Get session data
    # --------------------------------------------------------

    game_id = session["game_id"]
    difficulty = session["difficulty"]
    questions = session["questions"]

    # --------------------------------------------------------
    # Calculate score
    # --------------------------------------------------------

    total_questions = len(questions)
    correct_answers = 0

    for answer in answers:

        question_id = answer.get("question_id")
        selected_answer = answer.get("selected_answer")

        question = next(
            (
                q for q in questions
                if q.get("id") == question_id
            ),
            None
        )

        if not question:
            continue

        correct_answer = question.get("answer")

        if selected_answer == correct_answer:
            correct_answers += 1

    # --------------------------------------------------------
    # Accuracy and score
    # --------------------------------------------------------

    accuracy = (correct_answers / total_questions) * 100
    score = round(accuracy)

    # --------------------------------------------------------
    # Adaptive difficulty
    # --------------------------------------------------------

    next_difficulty = get_next_difficulty(
        current_difficulty=difficulty,
        accuracy=accuracy
    )

    # --------------------------------------------------------
    # Validate time
    # --------------------------------------------------------

    try:
        time_taken = int(time_taken)
    except (ValueError, TypeError):
        return {
            "status": "error",
            "message": "time_taken must be a valid number"
        }, 400

    if time_taken < 0:
        return {
            "status": "error",
            "message": "time_taken cannot be negative"
        }, 400

    # --------------------------------------------------------
    # Save game result
    # --------------------------------------------------------

    result_id = create_game_result(
        patient_id=patient_id,
        game_id=game_id,
        score=score,
        accuracy=accuracy,
        time_taken=time_taken,
        difficulty=difficulty
    )

    # --------------------------------------------------------
    # Check if score < 30%: Trigger Caregiver Alert
    # --------------------------------------------------------
    alert_triggered = False
    if score < 30 or accuracy < 30:
        try:
            from app.models.patient_model import find_patient_by_id, find_patient_by_user_id
            from app.models.alert_model import create_alert
            pat = find_patient_by_id(patient_id) or find_patient_by_user_id(patient_id)
            if pat and pat.get("caregiver_id"):
                p_name = pat.get("preferred_name") or "Patient"
                create_alert(
                    caregiver_id=pat["caregiver_id"],
                    patient_id=pat["_id"],
                    patient_name=p_name,
                    game_id=game_id,
                    score=score,
                    accuracy=accuracy,
                    message=f"Cognitive Alert: {p_name} scored {score}% in '{game_id}' (below 30% safety threshold). Caregiver check-in recommended."
                )
                alert_triggered = True
        except Exception as alert_err:
            print(f"[GameSessionRoutes] Alert dispatch error: {alert_err}")

    # --------------------------------------------------------
    # Mark session completed
    # --------------------------------------------------------

    complete_game_session(session_id)

    # --------------------------------------------------------
    # Return result
    # --------------------------------------------------------

    return {
        "status": "success",
        "message": "Game submitted successfully",
        "result": {
            "result_id": result_id,
            "session_id": session_id,
            "total_questions": total_questions,
            "correct_answers": correct_answers,
            "accuracy": round(accuracy, 2),
            "score": score,
            "difficulty": difficulty,
            "next_difficulty": next_difficulty,
            "time_taken": time_taken,
            "alert_triggered": alert_triggered
        }
    }, 201