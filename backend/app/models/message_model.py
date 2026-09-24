from datetime import datetime
from bson import ObjectId

from app.config.database import db


messages_collection = db["messages"]


def create_message(conversation_id, patient_id, role, text, language="en-IN"):
    """
    Store a message (user or assistant) for a conversation.
    """
    cid = ObjectId(str(conversation_id)) if ObjectId.is_valid(str(conversation_id)) else str(conversation_id)
    pid = ObjectId(str(patient_id)) if ObjectId.is_valid(str(patient_id)) else str(patient_id)

    message = {
        "conversation_id": cid,
        "patient_id": pid,
        "role": role,  # "user" | "assistant"
        "text": text,
        "language": language,
        "created_at": datetime.utcnow()
    }

    result = messages_collection.insert_one(message)
    return str(result.inserted_id)


def get_recent_messages(conversation_id, limit=10):
    """
    Retrieve the most recent messages for AI context window (chronological order).
    """
    try:
        if not conversation_id:
            return []

        sid = str(conversation_id)
        ids = [sid]
        if ObjectId.is_valid(sid):
            ids.append(ObjectId(sid))

        # Query latest `limit` messages sorted descending, then reverse for chronological order
        cursor = messages_collection.find(
            {"conversation_id": {"$in": ids}}
        ).sort("created_at", -1).limit(limit)

        messages = list(cursor)
        messages.reverse()
        return messages
    except Exception as e:
        print(f"[MessageModel] get_recent_messages error: {e}")
        return []


def get_all_messages_for_conversation(conversation_id, limit=100):
    """
    Retrieve all conversation messages in chronological order for UI display.
    """
    try:
        if not conversation_id:
            return []

        sid = str(conversation_id)
        ids = [sid]
        if ObjectId.is_valid(sid):
            ids.append(ObjectId(sid))

        cursor = messages_collection.find(
            {"conversation_id": {"$in": ids}}
        ).sort("created_at", 1).limit(limit)

        return list(cursor)
    except Exception as e:
        print(f"[MessageModel] get_all_messages_for_conversation error: {e}")
        return []
