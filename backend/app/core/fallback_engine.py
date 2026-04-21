"""
fallback_engine.py
-----------------
Fallback LLM engine with circuit breaker pattern.

Provides automatic fallback to the configured fallback model when the primary model
fails or when the circuit breaker is open.

Usage:
    from backend.app.core.fallback_engine import fallback_engine
    content, fallback_used, tokens_in, tokens_out = await fallback_engine.chat_completion(
        messages=[{"role": "system", "content": "..."}, {"role": "user", "content": "..."}],
        model="gpt-4o",
        temperature=0.7,
    )
"""

import asyncio
import logging
import time
import uuid
from typing import List, Dict, Any, Tuple
from openai import AsyncOpenAI
from app.config import settings

logger = logging.getLogger(__name__)

class FallbackEngine:
    """
    Simplified LLM engine that directly calls the primary model (Groq).
    Keeps the name FallbackEngine for backward compatibility with imports.
    """

    def __init__(self):
        """Initialize with lazy client creation."""
        self._client = None
        self._lock = asyncio.Lock()

    @property
    async def client(self) -> AsyncOpenAI:
        """Lazy initialization of the Groq client."""
        if self._client is None:
            async with self._lock:
                if self._client is None:
                    api_key = settings.GROQ_API_KEY
                    base_url = settings.GROQ_BASE_URL

                    # If no explicit GROQ_API_KEY, fallback to OPENAI_API_KEY if it's a Groq key
                    if not api_key and settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.startswith("gsk_"):
                        api_key = settings.OPENAI_API_KEY

                    if not api_key:
                        raise RuntimeError(
                            "GROQ_API_KEY is not set. Please set it in your environment or .env file. "
                            "You can get one at https://console.groq.com/keys"
                        )

                    self._client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        return self._client
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float,
        max_tokens: int | None = None
    ) -> Tuple[str, bool, int, int]:
        """
        Perform chat completion directly using Groq API.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Primary model to use
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate (optional)
            
        Returns:
            Tuple of (response_content, fallback_used (always False), tokens_in, tokens_out)
        """
        request_id = str(uuid.uuid4())[:8]
        logger.info(f"[{request_id}] Calling model directly: {model}")

        try:
            client = await self.client
            response = await asyncio.wait_for(
                client.chat.completions.create(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens
                ),
                timeout=60
            )
            usage = response.usage
            tokens_in = usage.prompt_tokens if usage else 0
            tokens_out = usage.completion_tokens if usage else 0
            logger.info(f"[{request_id}] Model succeeded, tokens: {tokens_in}+{tokens_out}")
            return response.choices[0].message.content, False, tokens_in, tokens_out
        except Exception as error:
            logger.error(f"[{request_id}] Model call failed: {error}")
            raise error

# Module-level singleton
fallback_engine = FallbackEngine()
