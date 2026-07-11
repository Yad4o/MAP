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

from app.core.llm_provider import resolve_credentials
from app.db.models.user import User

logger = logging.getLogger(__name__)


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
        Run a chat completion against the resolved provider.

        Returns (content, fallback_used, tokens_in, tokens_out).
        `fallback_used` is always False — kept in the signature so
        existing callers don't need to change.
        """
        request_id = str(uuid.uuid4())[:8]
        creds = resolve_credentials(user=user, provider=provider)
        call_model = model or creds.model
        logger.info(f"[{request_id}] {creds.provider} ({'byok' if creds.is_byok else 'platform'}) -> {call_model}")

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
            return content, False, tokens_in, tokens_out
        except Exception as error:
            logger.error(f"[{request_id}] call failed: {error}")
            raise

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
