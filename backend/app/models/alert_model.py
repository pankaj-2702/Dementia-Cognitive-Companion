from datetime import datetime, timezone
from bson import ObjectId

from app.config.database import db

alerts_collection = db["alerts"]


def create_alert(
    caregiver_id,
    patient_id,
    patient_name,
    game_id,
    score,
    accuracy,
    message=None,
    severity="warning"
):
    """
    Creates an alert record for a caregiver when a patient's cognitive score falls below 30%.
    """
    cid = ObjectId(str(caregiver_id)) if ObjectId.is_valid(str(caregiver_id)) else str(caregiver_id)
    pid = ObjectId(str(patient_id)) if ObjectId.is_valid(str(patient_id)) else str(patient_id)

    if not message:
        message = f"Alert: {patient_name} scored {score}% in '{game_id}', which is below the 30% cognitive threshold. Caregiver attention recommended."

    alert_doc = {
        "caregiver_id": cid,
        "patient_id": pid,
        "patient_name": patient_name,
        "game_id": game_id,
        "score": score,
        "accuracy": accuracy,
        "threshold": 30,
        "message": message,
        "severity": severity,
        "read": False,
        "dismissed": False,
        "created_at": datetime.now(timezone.utc)
    }

    result = alerts_collection.insert_one(alert_doc)
    print(f"[CaregiverAlert] Dispatched alert for patient {patient_name} (Score: {score}%): {message}")
    return str(result.inserted_id)


def find_alerts_by_caregiver(caregiver_id, unread_only=False, limit=50):
    """
    Finds alerts for a specific caregiver.
    """
    try:
        cid_str = str(caregiver_id)
        cid_val = ObjectId(cid_str) if ObjectId.is_valid(cid_str) else cid_str

        query = {
            "$or": [
                {"caregiver_id": cid_val},
                {"caregiver_id": cid_str}
            ],
            "dismissed": {"$ne": True}
        }

        if unread_only:
            query["read"] = False

        cursor = alerts_collection.find(query).sort("created_at", -1).limit(limit)
        return list(cursor)
    except Exception as e:
        print(f"[AlertModel] Error fetching caregiver alerts: {e}")
        return []


def find_alerts_by_patient(patient_id, limit=20):
    """
    Finds all alerts for a specific patient.
    """
    try:
        pid_str = str(patient_id)
        pid_val = ObjectId(pid_str) if ObjectId.is_valid(pid_str) else pid_str

        query = {
            "$or": [
                {"patient_id": pid_val},
                {"patient_id": pid_str}
            ],
            "dismissed": {"$ne": True}
        }

        cursor = alerts_collection.find(query).sort("created_at", -1).limit(limit)
        return list(cursor)
    except Exception as e:
        print(f"[AlertModel] Error fetching patient alerts: {e}")
        return []


def dismiss_alert(alert_id):
    """
    Marks an alert as dismissed by the caregiver.
    """
    try:
        aid_str = str(alert_id)
        aid_val = ObjectId(aid_str) if ObjectId.is_valid(aid_str) else aid_str

        result = alerts_collection.update_one(
            {"_id": aid_val},
            {"$set": {"dismissed": True, "read": True, "dismissed_at": datetime.now(timezone.utc)}}
        )
        return result.modified_count > 0
    except Exception as e:
        print(f"[AlertModel] Error dismissing alert: {e}")
        return False


def mark_alert_read(alert_id):
    """
    Marks an alert as read by the caregiver.
    """
    try:
        aid_str = str(alert_id)
        aid_val = ObjectId(aid_str) if ObjectId.is_valid(aid_str) else aid_str

        result = alerts_collection.update_one(
            {"_id": aid_val},
            {"$set": {"read": True}}
        )
        return result.modified_count > 0
    except Exception as e:
        print(f"[AlertModel] Error marking alert as read: {e}")
        return False
