"""
fallback_engine.py
-----------------
Fallback LLM engine with circuit breaker pattern.

Provides automatic fallback to gpt-4o-mini when the primary model
fails or when the circuit breaker is open due to repeated failures.

Usage:
    from app.core.fallback_engine import fallback_engine
    content, fallback_used = await fallback_engine.chat_completion(
        messages=[{"role": "system", "content": "..."}, {"role": "user", "content": "..."}],
        model="gpt-4o",
        temperature=0.7,
    )
"""

import asyncio
import logging
import time
from typing import List, Dict, Any, Tuple
from openai import AsyncOpenAI
from app.config import settings

logger = logging.getLogger(__name__)


class CircuitBreaker:
    """Simple circuit breaker implementation."""
    
    def __init__(self, failure_threshold: int = 5, timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
    
    def is_available(self) -> bool:
        """Check if the circuit breaker allows requests."""
        if self.state == "CLOSED":
            return True
        elif self.state == "OPEN":
            if time.time() - self.last_failure_time > self.timeout:
                self.state = "HALF_OPEN"
                logger.info("Circuit breaker transitioning to HALF_OPEN")
                return True
            return False
        else:  # HALF_OPEN
            return True
    
    def record_success(self):
        """Record a successful call."""
        if self.state == "HALF_OPEN":
            self.state = "CLOSED"
            logger.info("Circuit breaker closing after successful call")
        self.failure_count = 0
    
    def record_failure(self):
        """Record a failed call."""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"
            logger.warning(f"Circuit breaker opening after {self.failure_count} failures")


class FallbackEngine:
    """
    Fallback LLM engine with circuit breaker pattern.
    
    Tries primary model first, falls back to gpt-4o-mini on failures
    or when circuit breaker is open.
    """
    
    def __init__(self):
        # Initialize circuit breaker
        self.breaker = CircuitBreaker(failure_threshold=5, timeout=60)
        
        # Initialize OpenAI clients
        # Note: Both primary and fallback use the same client since they share the same API key and endpoint
        # If true isolation is needed (different keys/endpoints), this should be split into separate clients
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float,
        max_tokens: int | None = None
    ) -> Tuple[str, bool, int, int]:
        """
        Perform chat completion with fallback logic.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Primary model to use
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate (optional)
            
        Returns:
            Tuple of (response_content, fallback_used, tokens_in, tokens_out)
        """
        # Check if circuit breaker allows primary calls
        if not self.breaker.is_available():
            logger.warning("Circuit breaker is OPEN, using fallback model directly")
            content, tokens_in, tokens_out = await self._call_fallback(messages, temperature, max_tokens)
            return content, True, tokens_in, tokens_out
        
        # Try primary model first
        try:
            content, tokens_in, tokens_out = await self._call_primary(messages, model, temperature, max_tokens)
            self.breaker.record_success()
            return content, False, tokens_in, tokens_out
        except Exception as e:
            logger.error(f"Primary model call failed: {e}")
            self.breaker.record_failure()
            # Fall back to gpt-4o-mini
            try:
                content, tokens_in, tokens_out = await self._call_fallback(messages, temperature, max_tokens)
                return content, True, tokens_in, tokens_out
            except Exception as fallback_error:
                logger.error(f"Fallback model also failed: {fallback_error}")
                raise fallback_error
    
    async def _call_primary(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float,
        max_tokens: int | None = None
    ) -> Tuple[str, int, int]:
        """Call the primary model."""
        response = await self.client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens
        )
        usage = response.usage
        return response.choices[0].message.content, usage.prompt_tokens, usage.completion_tokens
    
    async def _call_fallback(
        self,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int | None = None
    ) -> Tuple[str, int, int]:
        """Call the fallback model (gpt-4o-mini)."""
        response = await self.client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens
        )
        usage = response.usage
        return response.choices[0].message.content, usage.prompt_tokens, usage.completion_tokens


# Module-level singleton
fallback_engine = FallbackEngine()
