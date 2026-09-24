import os
from app.providers.base_provider import BaseAIProvider


class GroqProvider(BaseAIProvider):
    """
    Optional secondary provider using Groq API if GROQ_API_KEY is configured.
    """

    def __init__(self, api_key=None):
        self.api_key = api_key or os.getenv("GROQ_API_KEY")

    def generate(
        self,
        system_instruction: str,
        context_facts: list,
        recent_messages: list,
        current_message: str,
        language: str = "en-IN"
    ) -> str:
        if not self.api_key:
            raise NotImplementedError("GROQ_API_KEY is not configured on the server")

        # In production with groq installed, can call groq client
        raise NotImplementedError("Groq provider is currently a secondary stub; primary is Gemini")
