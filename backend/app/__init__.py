from flask import Flask
from flask_cors import CORS

from app.routes.auth_routes import auth_bp
from app.routes.patient_routes import patient_bp
from app.routes.game_routes import game_bp
from app.routes.game_result_routes import game_result_bp
from app.routes.reminder_routes import reminder_bp
from app.routes.memory_routes import memory_bp
from app.routes.caregiver_routes import caregiver_bp
from app.routes.question_routes import question_bp
from app.routes.quiz_routes import quiz_bp
from app.routes.game_session_routes import game_session_bp
from app.routes.ai_test_routes import ai_test_bp
from app.routes.companion_routes import companion_bp
from app.middleware.error_handler import register_error_handlers


def create_app():
    app = Flask(__name__)

    CORS(app)
    register_error_handlers(app)

    app.register_blueprint(
        auth_bp,
        url_prefix="/api/auth"
    )

    app.register_blueprint(
        patient_bp,
        url_prefix="/api/patients"
    )

    app.register_blueprint(
        game_bp,
        url_prefix="/api/games"
    )

    app.register_blueprint(
        game_result_bp,
        url_prefix="/api/game-results"
    )

    app.register_blueprint(
        reminder_bp,
        url_prefix="/api/reminders"
    )

    app.register_blueprint(
        memory_bp,
        url_prefix="/api/memories"
    )

    app.register_blueprint(
        caregiver_bp,
        url_prefix="/api/caregiver"
    )

    app.register_blueprint(
        question_bp,
        url_prefix="/api/questions"
    )

    app.register_blueprint(
        quiz_bp,
        url_prefix="/api/quiz"
    )

    app.register_blueprint(
        game_session_bp,
        url_prefix="/api/game-session"
    )

    app.register_blueprint(
        ai_test_bp,
        url_prefix="/api/ai"
    )

    app.register_blueprint(
        companion_bp,
        url_prefix="/api/companion"
    )

    @app.route("/api/health", methods=["GET"])
    def health_check():
        from app.config.database import client, db
        db_status = "connected"
        db_name = db.name if db is not None else "unknown"
        error_detail = None
        try:
            client.admin.command("ping")
        except Exception as e:
            db_status = "disconnected"
            error_detail = str(e)

        return {
            "status": "success",
            "message": "SmritiRoots backend is running",
            "database": {
                "status": db_status,
                "name": db_name,
                "error": error_detail
            }
        }, 200

    return app