from datetime import datetime
from bson import ObjectId

from app.config.database import db


conversations_collection = db["conversations"]


def create_conversation(patient_id, language="en-IN"):
    """
    Create a new conversation session for a patient.
    """
    pid = ObjectId(str(patient_id)) if ObjectId.is_valid(str(patient_id)) else str(patient_id)
    now = datetime.utcnow()

    conversation = {
        "patient_id": pid,
        "language": language,
        "created_at": now,
        "updated_at": now
    }

    result = conversations_collection.insert_one(conversation)
    return str(result.inserted_id)


def get_conversation_by_id(conversation_id):
    """
    Retrieve conversation metadata by ID.
    """
    try:
        if not conversation_id:
            return None
        sid = str(conversation_id)
        if ObjectId.is_valid(sid):
            conv = conversations_collection.find_one({"_id": ObjectId(sid)})
            if conv:
                return conv
        return conversations_collection.find_one({"_id": sid})
    except Exception as e:
        print(f"[ConversationModel] get_conversation_by_id error: {e}")
        return None


def find_conversations_by_patient(patient_id, limit=20):
    """
    Find recent conversations for a patient ordered by updated_at descending.
    """
    try:
        if not patient_id:
            return []

        sid = str(patient_id)
        ids = [sid]
        if ObjectId.is_valid(sid):
            ids.append(ObjectId(sid))

        cursor = conversations_collection.find(
            {"patient_id": {"$in": ids}}
        ).sort("updated_at", -1).limit(limit)

        return list(cursor)
    except Exception as e:
        print(f"[ConversationModel] find_conversations_by_patient error: {e}")
        return []


def update_conversation_timestamp(conversation_id, language=None):
    """
    Update conversation updated_at and optionally current active language.
    """
    try:
        if not conversation_id:
            return False

        sid = str(conversation_id)
        query = {"_id": ObjectId(sid)} if ObjectId.is_valid(sid) else {"_id": sid}

        update_fields = {"updated_at": datetime.utcnow()}
        if language:
            update_fields["language"] = language

        conversations_collection.update_one(query, {"$set": update_fields})
        return True
    except Exception as e:
        print(f"[ConversationModel] update_conversation_timestamp error: {e}")
        return False
