class BaseAIProvider:
    """
    Abstract interface for server-side AI providers powering the Voice AI Companion.
    """

    def generate(
        self,
        system_instruction: str,
        context_facts: list,
        recent_messages: list,
        current_message: str,
        language: str = "en-IN"
    ) -> str:
        """
        Generate a conversational reply grounded in verified context.
        Must return a string response or raise an exception upon failure.
        """
        raise NotImplementedError("AI Provider must implement generate()")
