"""
core/fallback_engine.py
────────────────────────
Chat completion entry point used by the planner (and anything else that
just wants a text response, no tool binding).

Provider/key selection is delegated to llm_provider.resolve_credentials —
this file no longer hardcodes Groq lookup logic. Pass `user` to let a
user's own key (Claude, OpenAI, etc.) be used instead of the platform
default.
"""

import asyncio
import logging
import uuid
from typing import Dict, List, Tuple

from anthropic import AsyncAnthropic
from openai import AsyncOpenAI

from app.core.llm_provider import resolve_credentials, resolve_credentials_with_fallback
from app.db.models.user import User

logger = logging.getLogger(__name__)


def _is_rate_limit_error(exc: Exception) -> bool:
    """True if `exc` looks like a provider rate-limit error (HTTP 429 etc.)."""
    msg = str(exc).lower()
    return "rate limit" in msg or "429" in msg or "ratelimit" in msg


class FallbackEngine:
    """Kept the name for backward compatibility with existing imports."""

    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int | None = None,
        user: User | None = None,
        provider: str | None = None,
    ) -> Tuple[str, bool, int, int]:
        """
        Run a chat completion, trying the resolved provider first and then
        falling through to a platform fallback provider (e.g. Groq -> OpenAI)
        if the primary hits a rate limit. Mirrors the fallback behavior the
        executor agent already has via resolve_credentials_with_fallback,
        which this previously did not use — meaning a Groq daily-token-limit
        429 here used to kill the whole planning step instead of quietly
        switching providers.

        Returns (content, fallback_used, tokens_in, tokens_out).
        `fallback_used` is True iff a non-primary candidate was the one that
        actually succeeded.
        """
        request_id = str(uuid.uuid4())[:8]
        creds_candidates = resolve_credentials_with_fallback(user=user, provider=provider)

        last_error: Exception | None = None
        for i, creds in enumerate(creds_candidates):
            call_model = model or creds.model
            logger.info(
                f"[{request_id}] {creds.provider} ({'byok' if creds.is_byok else 'platform'}) -> {call_model} "
                f"(candidate {i + 1}/{len(creds_candidates)})"
            )
            try:
                if creds.provider == "anthropic":
                    content, tokens_in, tokens_out = await self._call_anthropic(
                        creds, call_model, messages, temperature, max_tokens
                    )
                else:
                    content, tokens_in, tokens_out = await self._call_openai_compatible(
                        creds, call_model, messages, temperature, max_tokens
                    )
                logger.info(f"[{request_id}] succeeded, tokens: {tokens_in}+{tokens_out}")
                return content, i > 0, tokens_in, tokens_out
            except Exception as error:
                last_error = error
                if _is_rate_limit_error(error) and i + 1 < len(creds_candidates):
                    logger.warning(
                        f"[{request_id}] rate limit on provider={creds.provider}; trying fallback provider."
                    )
                    continue
                logger.error(f"[{request_id}] call failed: {error}")
                raise

        # Should be unreachable (loop either returns or raises), but keeps
        # mypy/type-checkers happy and fails loudly if it ever isn't.
        raise last_error or RuntimeError("chat_completion: no credential candidates available")

    async def _call_openai_compatible(self, creds, model, messages, temperature, max_tokens) -> Tuple[str, int, int]:
        client = AsyncOpenAI(api_key=creds.api_key, base_url=creds.base_url)
        response = await asyncio.wait_for(
            client.chat.completions.create(
                model=model, messages=messages, temperature=temperature, max_tokens=max_tokens
            ),
            timeout=60,
        )
        usage = response.usage
        return (
            response.choices[0].message.content,
            usage.prompt_tokens if usage else 0,
            usage.completion_tokens if usage else 0,
        )

    async def _call_anthropic(self, creds, model, messages, temperature, max_tokens) -> Tuple[str, int, int]:
        # Anthropic takes the system prompt separately, not as a message.
        system = "\n".join(m["content"] for m in messages if m["role"] == "system")
        turns = [m for m in messages if m["role"] != "system"]

        client = AsyncAnthropic(api_key=creds.api_key)
        response = await asyncio.wait_for(
            client.messages.create(
                model=model,
                system=system or None,
                messages=turns,
                temperature=temperature,
                max_tokens=max_tokens or 4000,
            ),
            timeout=60,
        )
        content = "".join(block.text for block in response.content if block.type == "text")
        return content, response.usage.input_tokens, response.usage.output_tokens


# Module-level singleton
fallback_engine = FallbackEngine()
