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
from typing import List, Dict, Any, Tuple
from openai import AsyncOpenAI
from backend.app.config import settings

logger = logging.getLogger(__name__)


class CircuitBreaker:
    """Thread-safe circuit breaker implementation."""
    
    def __init__(self, failure_threshold: int = 5, timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
        self._lock = asyncio.Lock()
    
    async def is_available(self) -> bool:
        """Check if the circuit breaker allows requests."""
        async with self._lock:
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
    
    async def record_success(self):
        """Record a successful call."""
        async with self._lock:
            if self.state == "HALF_OPEN":
                self.state = "CLOSED"
                logger.info("Circuit breaker closing after successful call")
            self.failure_count = 0
    
    async def record_failure(self):
        """Record a failed call."""
        async with self._lock:
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
        # Generate request ID for logging
        request_id = f"req_{int(time.time() * 1000)}_{hash(str(messages)) % 10000}"
        
        # Check if circuit breaker allows primary calls
        if not await self.breaker.is_available():
            logger.warning(f"[{request_id}] Circuit breaker is OPEN, using fallback model directly")
            content, tokens_in, tokens_out = await self._call_fallback(messages, temperature, max_tokens)
            return content, True, tokens_in, tokens_out
        
        # Try primary model first
        try:
            logger.info(f"[{request_id}] Calling primary model: {model}")
            content, tokens_in, tokens_out = await self._call_primary(messages, model, temperature, max_tokens)
            await self.breaker.record_success()
            logger.info(f"[{request_id}] Primary model succeeded, tokens: {tokens_in}+{tokens_out}")
            return content, False, tokens_in, tokens_out
        except Exception as primary_error:
            logger.error(f"[{request_id}] Primary model call failed: {primary_error}")
            await self.breaker.record_failure()
            # Fall back to fallback model
            try:
                logger.info(f"[{request_id}] Falling back to model: {settings.FALLBACK_MODEL}")
                content, tokens_in, tokens_out = await self._call_fallback(messages, temperature, max_tokens)
                logger.info(f"[{request_id}] Fallback model succeeded, tokens: {tokens_in}+{tokens_out}")
                return content, True, tokens_in, tokens_out
            except Exception as fallback_error:
                logger.error(f"[{request_id}] Fallback model also failed: {fallback_error}")
                raise Exception(f"Primary: {primary_error}, Fallback: {fallback_error}")
    
    async def _call_primary(
        self,
        messages: List[Dict[str, str]],
        model: str,
        temperature: float,
        max_tokens: int | None = None
    ) -> Tuple[str, int, int]:
        """Call the primary model with timeout."""
        response = await asyncio.wait_for(
            self.client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            ),
            timeout=30
        )
        usage = response.usage
        return response.choices[0].message.content, usage.prompt_tokens, usage.completion_tokens
    
    async def _call_fallback(
        self,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int | None = None
    ) -> Tuple[str, int, int]:
        """Call the fallback model with timeout."""
        response = await asyncio.wait_for(
            self.client.chat.completions.create(
                model=settings.FALLBACK_MODEL,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            ),
            timeout=30
        )
        usage = response.usage
        return response.choices[0].message.content, usage.prompt_tokens, usage.completion_tokens


# Module-level singleton
fallback_engine = FallbackEngine()
