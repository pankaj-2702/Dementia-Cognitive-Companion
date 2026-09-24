from flask import Blueprint, request, g
from app.middleware.auth_middleware import token_required
from app.models.patient_model import find_patient_by_user_id, find_patient_by_id
from app.models.conversation_model import (
    create_conversation,
    get_conversation_by_id,
    find_conversations_by_patient
)
from app.models.message_model import get_all_messages_for_conversation
from app.services.companion_service import process_companion_message


companion_bp = Blueprint("companion", __name__)


def _resolve_patient():
    """
    Resolve patient from authenticated JWT identity or query/body patient_id.
    """
    user_id = g.user.get("user_id")
    role = g.user.get("role")

    try:
        if role == "patient":
            patient = find_patient_by_user_id(user_id)
            if patient:
                return patient
            return find_patient_by_id(user_id)

        # For caregiver inspecting a patient's companion
        body = request.get_json(silent=True) or {}
        patient_id = body.get("patient_id") or request.args.get("patient_id")
        if patient_id:
            return find_patient_by_id(patient_id) or find_patient_by_user_id(patient_id)
    except Exception as e:
        print(f"[CompanionRoutes] Patient resolution DB warning: {e}")

    return None


@companion_bp.route("/message", methods=["POST"])
@token_required
def send_message():
    """
    POST /api/companion/message
    Handles incoming elder speech/text message and returns AI companion voice-ready response.
    """
    body = request.get_json(silent=True) or {}
    message_text = body.get("message", "").strip()
    conversation_id = body.get("conversation_id")
    language = body.get("language") or "en-IN"

    if not message_text:
        return {
            "status": "error",
            "message": "Message text is required"
        }, 400

    patient = _resolve_patient()
    if not patient:
        # Fallback minimal mock patient object for interactive preview mode
        patient = {
            "_id": "preview_patient",
            "preferred_name": "Friend",
            "family": [],
            "daily_routine": [],
            "favorite_things": [],
            "important_places": []
        }

    try:
        result = process_companion_message(
            patient_data=patient,
            message_text=message_text,
            conversation_id=conversation_id,
            language=language
        )
        return {
            "status": "success",
            "conversation_id": result["conversation_id"],
            "reply": result["reply"],
            "language": result["language"]
        }, 200
    except Exception as e:
        print(f"[CompanionRoutes] Message error: {e}")
        return {
            "status": "error",
            "message": "Could not process companion message at this time"
        }, 500


@companion_bp.route("/conversations/<conversation_id>", methods=["GET"])
@token_required
def get_conversation(conversation_id):
    """
    GET /api/companion/conversations/:id
    Load conversation metadata and chronological message history.
    """
    conv = get_conversation_by_id(conversation_id)
    if not conv:
        return {
            "status": "error",
            "message": "Conversation not found"
        }, 404

    messages_raw = get_all_messages_for_conversation(conversation_id)
    formatted_messages = []
    for m in messages_raw:
        created_val = m.get("created_at")
        created_str = created_val.isoformat() if hasattr(created_val, "isoformat") else str(created_val or "")
        formatted_messages.append({
            "id": str(m["_id"]),
            "role": m.get("role", "user"),
            "text": m.get("text", ""),
            "language": m.get("language", conv.get("language", "en-IN")),
            "created_at": created_str
        })

    return {
        "status": "success",
        "conversation": {
            "id": str(conv["_id"]),
            "language": conv.get("language", "en-IN"),
            "messages": formatted_messages
        }
    }, 200


@companion_bp.route("/conversations", methods=["POST"])
@token_required
def create_new_conversation():
    """
    POST /api/companion/conversations
    Create a new conversation session.
    """
    body = request.get_json(silent=True) or {}
    language = body.get("language") or "en-IN"

    patient = _resolve_patient()
    patient_id = str(patient["_id"]) if patient else "preview_patient"

    conv_id = create_conversation(patient_id=patient_id, language=language)

    return {
        "status": "success",
        "conversation_id": conv_id,
        "language": language
    }, 201


@companion_bp.route("/conversations", methods=["GET"])
@token_required
def list_conversations():
    """
    GET /api/companion/conversations
    List recent conversations for the authenticated patient.
    """
    patient = _resolve_patient()
    if not patient:
        return {
            "status": "success",
            "conversations": []
        }, 200

    patient_id = str(patient["_id"])
    convs = find_conversations_by_patient(patient_id=patient_id, limit=10)

    conv_list = []
    for c in convs:
        created_val = c.get("created_at")
        updated_val = c.get("updated_at")
        conv_list.append({
            "id": str(c["_id"]),
            "language": c.get("language", "en-IN"),
            "created_at": created_val.isoformat() if hasattr(created_val, "isoformat") else str(created_val or ""),
            "updated_at": updated_val.isoformat() if hasattr(updated_val, "isoformat") else str(updated_val or "")
        })

    return {
        "status": "success",
        "conversations": conv_list
    }, 200
