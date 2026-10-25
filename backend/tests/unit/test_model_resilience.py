"""
test_model_resilience.py
------------------------
A retired/renamed model ID must never take the whole pipeline down.

Two layers of protection:
  1. Config: known-retired model IDs coming from the environment (e.g. a stale
     value left in the Render dashboard) are remapped to their replacements.
  2. FallbackEngine: if a provider still answers "model not found", retry once
     on the configured FALLBACK_MODEL instead of failing the task.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.config import Settings
from app.core.fallback_engine import FallbackEngine, _is_model_not_found_error

MODEL_NOT_FOUND = (
    "Error code: 404 - {'error': {'message': 'The model `llama-3.3-70b-versatile` "
    "does not exist or you do not have access to it.', "
    "'type': 'invalid_request_error', 'code': 'model_not_found'}}"
)


class TestRetiredModelRemap:
    def test_retired_default_model_is_remapped(self):
        assert Settings(DEFAULT_MODEL="llama-3.3-70b-versatile").DEFAULT_MODEL == "openai/gpt-oss-120b"

    def test_retired_small_model_is_remapped_for_fallback(self):
        assert Settings(FALLBACK_MODEL="llama-3.1-8b-instant").FALLBACK_MODEL == "openai/gpt-oss-20b"

    def test_current_models_are_untouched(self):
        s = Settings(DEFAULT_MODEL="gpt-4o", FALLBACK_MODEL="openai/gpt-oss-20b")
        assert s.DEFAULT_MODEL == "gpt-4o"
        assert s.FALLBACK_MODEL == "openai/gpt-oss-20b"

    def test_whitespace_and_case_are_tolerated(self):
        assert Settings(DEFAULT_MODEL="  Llama-3.3-70B-Versatile ").DEFAULT_MODEL == "openai/gpt-oss-120b"


class TestModelNotFoundDetection:
    def test_detects_groq_404_model_not_found(self):
        assert _is_model_not_found_error(Exception(MODEL_NOT_FOUND))

    def test_ignores_unrelated_errors(self):
        assert not _is_model_not_found_error(Exception("API Error"))
        assert not _is_model_not_found_error(Exception("Error code: 429 - rate limit"))


def _ok_response():
    response = MagicMock()
    response.choices = [MagicMock(message=MagicMock(content="plan"))]
    response.usage = MagicMock(prompt_tokens=7, completion_tokens=3)
    return response


def _patches():
    return (
        patch("app.core.fallback_engine.AsyncOpenAI"),
        patch("app.core.llm_provider.settings"),
        patch("app.core.fallback_engine.settings"),
    )


class TestFallbackOnModelNotFound:
    @pytest.mark.asyncio
    async def test_retries_once_on_fallback_model(self):
        p_client, p_provider, p_engine = _patches()
        with p_client as mock_cls, p_provider as prov, p_engine as eng:
            prov.GROQ_API_KEY = "gsk_test"
            prov.GROQ_API_KEY_SECONDARY = ""
            prov.OPENAI_API_KEY = ""
            prov.GROQ_BASE_URL = "https://api.groq.com/openai/v1"
            prov.DEFAULT_MODEL = "openai/gpt-oss-120b"
            eng.FALLBACK_MODEL = "openai/gpt-oss-20b"

            client = AsyncMock()
            client.chat.completions.create.side_effect = [Exception(MODEL_NOT_FOUND), _ok_response()]
            mock_cls.return_value = client

            content, fallback_used, tin, tout = await FallbackEngine().chat_completion(
                messages=[{"role": "user", "content": "Hello"}],
                model="llama-3.3-70b-versatile",
            )

            assert content == "plan"
            assert fallback_used is True
            assert (tin, tout) == (7, 3)
            models = [c.kwargs["model"] for c in client.chat.completions.create.call_args_list]
            assert models == ["llama-3.3-70b-versatile", "openai/gpt-oss-20b"]

    @pytest.mark.asyncio
    async def test_raises_if_fallback_model_is_also_missing(self):
        p_client, p_provider, p_engine = _patches()
        with p_client as mock_cls, p_provider as prov, p_engine as eng:
            prov.GROQ_API_KEY = "gsk_test"
            prov.GROQ_API_KEY_SECONDARY = ""
            prov.OPENAI_API_KEY = ""
            prov.GROQ_BASE_URL = "https://api.groq.com/openai/v1"
            prov.DEFAULT_MODEL = "openai/gpt-oss-120b"
            eng.FALLBACK_MODEL = "openai/gpt-oss-20b"

            client = AsyncMock()
            client.chat.completions.create.side_effect = Exception(MODEL_NOT_FOUND)
            mock_cls.return_value = client

            with pytest.raises(Exception, match="model_not_found"):
                await FallbackEngine().chat_completion(
                    messages=[{"role": "user", "content": "Hello"}], model="gone-model"
                )
            assert client.chat.completions.create.call_count == 2  # original + one fallback, no loop

    @pytest.mark.asyncio
    async def test_no_model_retry_when_already_on_fallback_model(self):
        p_client, p_provider, p_engine = _patches()
        with p_client as mock_cls, p_provider as prov, p_engine as eng:
            prov.GROQ_API_KEY = "gsk_test"
            prov.GROQ_API_KEY_SECONDARY = ""
            prov.OPENAI_API_KEY = ""
            prov.GROQ_BASE_URL = "https://api.groq.com/openai/v1"
            prov.DEFAULT_MODEL = "openai/gpt-oss-20b"
            eng.FALLBACK_MODEL = "openai/gpt-oss-20b"

            client = AsyncMock()
            client.chat.completions.create.side_effect = Exception(MODEL_NOT_FOUND)
            mock_cls.return_value = client

            with pytest.raises(Exception, match="model_not_found"):
                await FallbackEngine().chat_completion(
                    messages=[{"role": "user", "content": "Hello"}], model="openai/gpt-oss-20b"
                )
            assert client.chat.completions.create.call_count == 1
