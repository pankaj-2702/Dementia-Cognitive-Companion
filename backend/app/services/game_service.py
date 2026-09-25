from app.models.game_model import get_game_by_id
from app.models.game_result_model import create_game_result
from app.models.patient_model import find_patient_by_id, find_patient_by_user_id


def save_game_result(
    patient_id,
    game_id,
    score,
    accuracy,
    time_taken,
    difficulty
):
    # Check that the patient exists
    patient = find_patient_by_id(patient_id)
    if not patient:
        patient = find_patient_by_user_id(patient_id)

    if not patient:
        return None, "Patient not found"

    # Check that the game exists
    game = get_game_by_id(game_id)
    # Allow brain-boost or personalized quiz ids even if not in static game catalog
    if not game and game_id not in ["brain-boost", "family-quiz", "routine-quiz", "memory-match"]:
        pass  # Proceed gracefully for personalized quiz categories

    # Validate score
    if score < 0:
        return None, "Score cannot be negative"

    # Validate accuracy
    if accuracy < 0 or accuracy > 100:
        return None, "Accuracy must be between 0 and 100"

    # Validate time
    if time_taken < 0:
        return None, "Time taken cannot be negative"

    # Validate difficulty
    allowed_difficulties = [
        "easy",
        "medium",
        "hard"
    ]

    if difficulty not in allowed_difficulties:
        difficulty = "easy"

    result_id = create_game_result(
        patient_id=str(patient["_id"]),
        game_id=game_id,
        score=score,
        accuracy=accuracy,
        time_taken=time_taken,
        difficulty=difficulty
    )

    # ----------------------------------------------------
    # Check if score < 30%: Trigger Caregiver Alert
    # ----------------------------------------------------
    alert_triggered = False
    alert_id = None

    if score < 30 or accuracy < 30:
        caregiver_id = patient.get("caregiver_id")
        if caregiver_id:
            try:
                from app.models.alert_model import create_alert
                patient_name = patient.get("preferred_name") or "Patient"
                alert_id = create_alert(
                    caregiver_id=caregiver_id,
                    patient_id=patient["_id"],
                    patient_name=patient_name,
                    game_id=game_id,
                    score=score,
                    accuracy=accuracy,
                    message=f"Cognitive Alert: {patient_name} scored {score}% in '{game_id}' (below 30% safety threshold). Caregiver check-in recommended."
                )
                alert_triggered = True
                print(f"[GameService] Low score alert triggered for caregiver {caregiver_id}: {patient_name} scored {score}%")
            except Exception as alert_err:
                print(f"[GameService] Failed to create caregiver alert: {alert_err}")

    return {
        "result_id": result_id,
        "alert_triggered": alert_triggered,
        "alert_id": alert_id
    }, None