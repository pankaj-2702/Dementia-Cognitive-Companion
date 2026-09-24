import os
from app.providers.base_provider import BaseAIProvider
from app.providers.gemini_provider import GeminiProvider
from app.providers.groq_provider import GroqProvider


def get_ai_provider() -> BaseAIProvider:
    """
    Factory to return the active AI provider based on environment setting.
    Defaults to GeminiProvider using existing GEMINI_API_KEY.
    """
    provider_name = os.getenv("AI_PROVIDER", "gemini").lower()

    if provider_name == "groq":
        return GroqProvider()

    # Default to Gemini
    return GeminiProvider()
