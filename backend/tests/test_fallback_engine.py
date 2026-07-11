"""
test_fallback_engine.py
------------------------
Tests for FallbackEngine: provider resolution (platform default vs. a
user's own key) and both call paths (OpenAI-compatible, Anthropic).
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.core.fallback_engine import FallbackEngine


def _mock_openai_response(content="Response", tokens_in=10, tokens_out=5):
    response = MagicMock()
    response.choices = [MagicMock(message=MagicMock(content=content))]
    response.usage = MagicMock(prompt_tokens=tokens_in, completion_tokens=tokens_out)
    return response


def _mock_anthropic_response(text="Claude response", tokens_in=8, tokens_out=4):
    response = MagicMock()
    response.content = [MagicMock(type="text", text=text)]
    response.usage = MagicMock(input_tokens=tokens_in, output_tokens=tokens_out)
    return response


class TestOpenAICompatiblePath:
    """Groq/OpenAI/Gemini all go through the same OpenAI-wire-format call."""

    @pytest.mark.asyncio
    async def test_platform_default_success(self):
        engine = FallbackEngine()
        with patch("app.core.fallback_engine.AsyncOpenAI") as mock_cls, \
             patch("app.core.llm_provider.settings") as mock_settings:
            mock_settings.GROQ_API_KEY = "gsk_test"
            mock_settings.GROQ_BASE_URL = "https://api.groq.com/openai/v1"
            mock_settings.DEFAULT_MODEL = "llama-3.3-70b-versatile"
            mock_client = AsyncMock()
            mock_client.chat.completions.create.return_value = _mock_openai_response()
            mock_cls.return_value = mock_client

            content, fallback_used, tokens_in, tokens_out = await engine.chat_completion(
                messages=[{"role": "user", "content": "Hello"}],
                temperature=0.7,
            )

            assert content == "Response"
            assert fallback_used is False
            assert tokens_in == 10
            assert tokens_out == 5
            mock_cls.assert_called_once_with(api_key="gsk_test", base_url="https://api.groq.com/openai/v1")

    @pytest.mark.asyncio
    async def test_call_failure_propagates(self):
        engine = FallbackEngine()
        with patch("app.core.fallback_engine.AsyncOpenAI") as mock_cls, \
             patch("app.core.llm_provider.settings") as mock_settings:
            mock_settings.GROQ_API_KEY = "gsk_test"
            mock_settings.GROQ_BASE_URL = "https://api.groq.com/openai/v1"
            mock_settings.DEFAULT_MODEL = "llama-3.3-70b-versatile"
            mock_client = AsyncMock()
            mock_client.chat.completions.create.side_effect = Exception("API Error")
            mock_cls.return_value = mock_client

            with pytest.raises(Exception, match="API Error"):
                await engine.chat_completion(messages=[{"role": "user", "content": "Hi"}])

    @pytest.mark.asyncio
    async def test_max_tokens_passed_through(self):
        engine = FallbackEngine()
        with patch("app.core.fallback_engine.AsyncOpenAI") as mock_cls, \
             patch("app.core.llm_provider.settings") as mock_settings:
            mock_settings.GROQ_API_KEY = "gsk_test"
            mock_settings.GROQ_BASE_URL = "https://api.groq.com/openai/v1"
            mock_settings.DEFAULT_MODEL = "llama-3.3-70b-versatile"
            mock_client = AsyncMock()
            mock_client.chat.completions.create.return_value = _mock_openai_response(tokens_in=5, tokens_out=3)
            mock_cls.return_value = mock_client

            await engine.chat_completion(messages=[{"role": "user", "content": "Hi"}], max_tokens=100)

            call_kwargs = mock_client.chat.completions.create.call_args.kwargs
            assert call_kwargs["max_tokens"] == 100


class TestAnthropicPath:
    """A user's own Claude key routes through the Anthropic SDK, not OpenAI's."""

    @pytest.mark.asyncio
    async def test_byok_claude_call(self, monkeypatch):
        from app.db.models.user import User

        user = User(metadata_={"provider_keys": {"anthropic": {"key_encrypted": "enc-token"}}})

        engine = FallbackEngine()
        with patch("app.core.fallback_engine.AsyncAnthropic") as mock_cls, \
             patch("app.core.llm_provider.decrypt_secret", return_value="sk-ant-real-key"):
            mock_client = AsyncMock()
            mock_client.messages.create.return_value = _mock_anthropic_response()
            mock_cls.return_value = mock_client

            content, fallback_used, tokens_in, tokens_out = await engine.chat_completion(
                messages=[
                    {"role": "system", "content": "You are helpful."},
                    {"role": "user", "content": "Hello"},
                ],
                user=user,
                provider="anthropic",
            )

            assert content == "Claude response"
            assert tokens_in == 8
            assert tokens_out == 4
            mock_cls.assert_called_once_with(api_key="sk-ant-real-key")
            # System prompt is passed separately, not inside `messages`.
            call_kwargs = mock_client.messages.create.call_args.kwargs
            assert call_kwargs["system"] == "You are helpful."
            assert call_kwargs["messages"] == [{"role": "user", "content": "Hello"}]


class TestFallbackEngineSingleton:
    @pytest.mark.asyncio
    async def test_singleton_exists(self):
        from app.core.fallback_engine import fallback_engine

        assert isinstance(fallback_engine, FallbackEngine)
        assert hasattr(fallback_engine, "chat_completion")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
