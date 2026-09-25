from flask import Blueprint, request, g

from app.middleware.auth_middleware import token_required

from app.models.patient_model import find_patient_by_id
from app.models.game_result_model import find_results_by_patient
from app.models.reminder_model import find_reminders_by_patient
from app.models.memory_model import find_memories_by_patient

from app.services.adaptive_service import get_next_difficulty


caregiver_bp = Blueprint("caregiver", __name__)


# ==========================================
# CAREGIVER DASHBOARD
# ==========================================

@caregiver_bp.route("/dashboard/<patient_id>", methods=["GET"])
@token_required
def get_dashboard(patient_id):

    # ------------------------------------------
    # Find patient
    # ------------------------------------------

    patient = find_patient_by_id(patient_id)
    if not patient:
        from app.models.patient_model import find_patient_by_user_id
        patient = find_patient_by_user_id(patient_id)

    if not patient:
        return {
            "status": "error",
            "message": "Patient not found"
        }, 404

    # ------------------------------------------
    # Check authorization (Caregiver or Patient self)
    # ------------------------------------------
    caller_id = str(g.user["user_id"])
    is_caregiver = str(patient.get("caregiver_id", "")) == caller_id
    is_patient = str(patient.get("user_id", "")) == caller_id
    is_patient_self = str(patient.get("_id", "")) == caller_id

    # If caller is caregiver and patient has no caregiver yet, auto-link
    if not is_caregiver and not is_patient and not is_patient_self:
        if g.user.get("role") == "caregiver" and not patient.get("caregiver_id"):
            from app.models.patient_model import update_patient
            from bson import ObjectId
            update_patient(str(patient["_id"]), {"caregiver_id": ObjectId(caller_id)})
            is_caregiver = True
        else:
            return {
                "status": "error",
                "message": "You are not authorized for this patient"
            }, 403

    try:
        actual_patient_id = str(patient["_id"])

        # ==========================================
        # PATIENT INFORMATION
        # ==========================================

        patient_data = {
            "id": actual_patient_id,
            "user_id": str(patient.get("user_id", "")),
            "preferred_name": patient.get("preferred_name", ""),
            "age": patient.get("age"),
            "preferred_language": patient.get("preferred_language", "English"),
            "family": patient.get("family", []),
            "favorite_things": patient.get("favorite_things", []),
            "daily_routine": patient.get("daily_routine", []),
            "important_places": patient.get("important_places", []),
            "personal_memories": patient.get("personal_memories", [])
        }

        # ==========================================
        # GAME RESULTS
        # ==========================================

        results = find_results_by_patient(actual_patient_id)

        game_results = []

        for result in results:
            created_at_val = result.get("created_at")
            created_at_str = created_at_val.isoformat() if hasattr(created_at_val, "isoformat") else str(created_at_val or "")

            game_results.append({
                "id": str(result["_id"]),
                "game_id": result.get("game_id", "brain-boost"),
                "score": result.get("score", 0),
                "accuracy": result.get("accuracy", 0),
                "time_taken": result.get("time_taken", 0),
                "difficulty": result.get("difficulty", "easy"),
                "created_at": created_at_str
            })

        # ==========================================
        # GAME STATISTICS + ADAPTIVE DIFFICULTY
        # ==========================================

        if results:
            latest_result = results[0]

            current_difficulty = latest_result.get("difficulty", "easy")
            accuracy = latest_result.get("accuracy")

            next_difficulty = get_next_difficulty(
                current_difficulty,
                accuracy if accuracy is not None else 70
            )

            total_games = len(results)

            valid_accuracies = [
                r["accuracy"]
                for r in results
                if r.get("accuracy") is not None
            ]
            average_accuracy = (
                sum(valid_accuracies) / len(valid_accuracies)
                if valid_accuracies else None
            )

            valid_scores = [
                r["score"]
                for r in results
                if r.get("score") is not None
            ]
            highest_score = max(valid_scores) if valid_scores else 0

        else:
            current_difficulty = "easy"
            accuracy = None
            next_difficulty = "easy"

            total_games = 0
            average_accuracy = None
            highest_score = None

        # ==========================================
        # REMINDERS
        # ==========================================

        reminders = find_reminders_by_patient(actual_patient_id)

        reminder_list = []

        for reminder in reminders:
            reminder_list.append({
                "id": str(reminder["_id"]),
                "title": reminder.get("title", ""),
                "category": reminder.get("category", "medicine"),
                "scheduled_time": reminder.get("scheduled_time", ""),
                "completed": reminder.get("completed", False)
            })

        # ==========================================
        # MEMORY
        # ==========================================

        memories = find_memories_by_patient(actual_patient_id)

        memory_list = []

        for memory in memories:
            memory_list.append({
                "id": str(memory["_id"]),
                "title": memory.get("title", ""),
                "description": memory.get("description", ""),
                "category": memory.get("category", "family"),
                "image_url": memory.get("image_url")
            })

        # ==========================================
        # ALERTS (< 30% Score Cognitive Alerts)
        # ==========================================

        from app.models.alert_model import find_alerts_by_patient
        raw_alerts = find_alerts_by_patient(actual_patient_id)

        alert_list = []
        for a in raw_alerts:
            created_at_val = a.get("created_at")
            created_at_str = created_at_val.isoformat() if hasattr(created_at_val, "isoformat") else str(created_at_val or "")
            alert_list.append({
                "id": str(a["_id"]),
                "patient_id": str(a.get("patient_id", "")),
                "patient_name": a.get("patient_name", ""),
                "game_id": a.get("game_id", ""),
                "score": a.get("score", 0),
                "accuracy": a.get("accuracy", 0),
                "message": a.get("message", ""),
                "severity": a.get("severity", "warning"),
                "read": a.get("read", False),
                "created_at": created_at_str
            })

    except Exception as e:
        return {
            "status": "error",
            "message": f"Error loading patient dashboard: {str(e)}"
        }, 500

    # ==========================================
    # DASHBOARD RESPONSE
    # ==========================================

    return {

        "status": "success",

        "dashboard": {

            # ----------------------------------
            # Patient
            # ----------------------------------

            "patient": patient_data,

            # ----------------------------------
            # Games
            # ----------------------------------

            "games": {

                "total_games": total_games,

                "average_accuracy": (
                    round(average_accuracy, 2)
                    if average_accuracy is not None
                    else None
                ),

                "highest_score": highest_score,

                "latest_accuracy": accuracy,

                "current_difficulty": current_difficulty,

                "next_difficulty": next_difficulty,

                "results": game_results
            },

            # ----------------------------------
            # Reminders
            # ----------------------------------

            "reminders": {

                "count": len(reminder_list),

                "items": reminder_list
            },

            # ----------------------------------
            # Memories
            # ----------------------------------

            "memories": {

                "count": len(memory_list),

                "items": memory_list
            },

            # ----------------------------------
            # Alerts (< 30% Score)
            # ----------------------------------

            "alerts": {

                "count": len(alert_list),

                "unread_count": len([a for a in alert_list if not a.get("read")]),

                "items": alert_list
            }
        }

    }, 200


# ==========================================
# LINK EXISTING PATIENT TO CAREGIVER
# ==========================================

@caregiver_bp.route("/link-patient", methods=["POST"])
@token_required
def link_existing_patient():

    if g.user["role"] != "caregiver":
        return {
            "status": "error",
            "message": "Only caregivers can link patients"
        }, 403

    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()

    if not email:
        return {
            "status": "error",
            "message": "Patient email is required"
        }, 400

    from app.models.user_model import find_user_by_email
    from app.models.patient_model import patients_collection
    from bson import ObjectId
    from datetime import datetime, timezone

    patient_user = find_user_by_email(email)

    if not patient_user:
        return {
            "status": "error",
            "message": f"No account found with email '{email}'. Please check the spelling or ask the patient to register."
        }, 404

    if patient_user.get("role") == "caregiver":
        return {
            "status": "error",
            "message": f"Account with email '{email}' is registered as a Caregiver, not a Patient."
        }, 400

    caregiver_oid = ObjectId(g.user["user_id"])
    patient_user_oid = patient_user["_id"]

    patient_doc = patients_collection.find_one({"user_id": patient_user_oid})

    if not patient_doc:
        res = patients_collection.insert_one({
            "user_id": patient_user_oid,
            "preferred_name": patient_user.get("name", "Elder Friend"),
            "age": None,
            "preferred_language": "English",
            "caregiver_id": caregiver_oid,
            "family": [],
            "favorite_things": [],
            "daily_routine": [],
            "important_places": [],
            "personal_memories": [],
            "created_at": datetime.now(timezone.utc)
        })
        patient_id = str(res.inserted_id)
        preferred_name = patient_user.get("name", "Elder Friend")
    else:
        patients_collection.update_one(
            {"_id": patient_doc["_id"]},
            {"$set": {"caregiver_id": caregiver_oid}}
        )
        patient_id = str(patient_doc["_id"])
        preferred_name = patient_doc.get("preferred_name") or patient_user.get("name", "Elder Friend")

    return {
        "status": "success",
        "message": f"Successfully linked {preferred_name} ({email}) to your caregiver account!",
        "patient_id": patient_id,
        "patient": {
            "id": patient_id,
            "patient_id": patient_id,
            "user_id": str(patient_user_oid),
            "preferred_name": preferred_name,
            "email": email
        }
    }, 200


# ==========================================
# GET CAREGIVER ALERTS
# ==========================================

@caregiver_bp.route("/alerts", methods=["GET"])
@token_required
def get_caregiver_alerts():
    if g.user["role"] != "caregiver":
        return {
            "status": "error",
            "message": "Only caregivers can access alerts"
        }, 403

    from app.models.alert_model import find_alerts_by_caregiver
    raw_alerts = find_alerts_by_caregiver(g.user["user_id"])

    alerts = []
    for a in raw_alerts:
        created_at_val = a.get("created_at")
        created_at_str = created_at_val.isoformat() if hasattr(created_at_val, "isoformat") else str(created_at_val or "")
        alerts.append({
            "id": str(a["_id"]),
            "patient_id": str(a.get("patient_id", "")),
            "patient_name": a.get("patient_name", ""),
            "game_id": a.get("game_id", ""),
            "score": a.get("score", 0),
            "accuracy": a.get("accuracy", 0),
            "message": a.get("message", ""),
            "severity": a.get("severity", "warning"),
            "read": a.get("read", False),
            "created_at": created_at_str
        })

    return {
        "status": "success",
        "alerts": alerts,
        "unread_count": len([a for a in alerts if not a.get("read")])
    }, 200


# ==========================================
# DISMISS CAREGIVER ALERT
# ==========================================

@caregiver_bp.route("/alerts/<alert_id>/dismiss", methods=["POST"])
@token_required
def dismiss_caregiver_alert(alert_id):
    if g.user["role"] != "caregiver":
        return {
            "status": "error",
            "message": "Only caregivers can dismiss alerts"
        }, 403

    from app.models.alert_model import dismiss_alert
    success = dismiss_alert(alert_id)
    if success:
        return {
            "status": "success",
            "message": "Alert acknowledged and dismissed"
        }, 200
    return {
        "status": "error",
        "message": "Alert not found or already dismissed"
    }, 404