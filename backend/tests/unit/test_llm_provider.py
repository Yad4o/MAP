"""
test_llm_provider.py
──────────────────────
Tests for core/llm_provider.py: which key/provider/model gets used for
a call, and that a user's own key always wins over the platform default
when one is configured.
"""

import pytest

from app.core import llm_provider
from app.core.crypto import encrypt_secret
from app.db.models.user import User


def _user_with_key(provider: str, api_key: str) -> User:
    return User(
        metadata_={
            "provider_keys": {
                provider: {
                    "key_encrypted": encrypt_secret(api_key),
                    "masked_key": "******xxxx",
                    "added_at": "2026-01-01T00:00:00+00:00",
                }
            }
        }
    )


class TestGetUserProviderKey:
    def test_returns_decrypted_key_when_present(self):
        user = _user_with_key("anthropic", "sk-ant-real-key")
        assert llm_provider.get_user_provider_key(user, "anthropic") == "sk-ant-real-key"

    def test_returns_none_when_no_key_for_that_provider(self):
        user = _user_with_key("anthropic", "sk-ant-real-key")
        assert llm_provider.get_user_provider_key(user, "openai") is None

    def test_returns_none_for_no_user(self):
        assert llm_provider.get_user_provider_key(None, "anthropic") is None

    def test_returns_none_for_user_with_no_metadata(self):
        assert llm_provider.get_user_provider_key(User(metadata_=None), "anthropic") is None


class TestResolveCredentials:
    def test_byok_wins_over_platform_default(self, monkeypatch):
        monkeypatch.setattr(llm_provider.settings, "GROQ_API_KEY", "gsk_platform_key")
        user = _user_with_key("anthropic", "sk-ant-users-own-key")

        creds = llm_provider.resolve_credentials(user=user, provider="anthropic")

        assert creds.provider == "anthropic"
        assert creds.api_key == "sk-ant-users-own-key"
        assert creds.is_byok is True

    def test_falls_back_to_platform_key_when_user_has_no_key_for_provider(self, monkeypatch):
        monkeypatch.setattr(llm_provider.settings, "OPENAI_API_KEY", "sk-platform-openai")
        user = _user_with_key("anthropic", "sk-ant-users-own-key")

        creds = llm_provider.resolve_credentials(user=user, provider="openai")

        assert creds.provider == "openai"
        assert creds.api_key == "sk-platform-openai"
        assert creds.is_byok is False

    def test_no_provider_specified_uses_users_first_byok_provider(self):
        user = _user_with_key("anthropic", "sk-ant-users-own-key")

        creds = llm_provider.resolve_credentials(user=user)

        assert creds.provider == "anthropic"
        assert creds.is_byok is True

    def test_no_provider_no_user_falls_back_to_groq_platform_default(self, monkeypatch):
        monkeypatch.setattr(llm_provider.settings, "GROQ_API_KEY", "gsk_platform_key")

        creds = llm_provider.resolve_credentials()

        assert creds.provider == "groq"
        assert creds.is_byok is False

    def test_no_groq_key_falls_back_to_openai_platform_default(self, monkeypatch):
        monkeypatch.setattr(llm_provider.settings, "GROQ_API_KEY", "")
        monkeypatch.setattr(llm_provider.settings, "OPENAI_API_KEY", "sk-platform-openai")

        creds = llm_provider.resolve_credentials()

        assert creds.provider == "openai"

    def test_no_keys_configured_anywhere_raises(self, monkeypatch):
        monkeypatch.setattr(llm_provider.settings, "GROQ_API_KEY", "")
        monkeypatch.setattr(llm_provider.settings, "OPENAI_API_KEY", "")

        with pytest.raises(RuntimeError):
            llm_provider.resolve_credentials()

    def test_platform_has_no_anthropic_key_requires_byok(self, monkeypatch):
        # Anthropic is BYOK-only in this app — there's no platform Claude key.
        with pytest.raises(RuntimeError):
            llm_provider.resolve_credentials(user=None, provider="anthropic")

    def test_unknown_provider_raises_value_error(self):
        with pytest.raises(ValueError):
            llm_provider.resolve_credentials(provider="not-a-real-provider")


class TestResolveCredentialsWithFallback:
    def test_secondary_groq_key_is_first_fallback_candidate(self, monkeypatch):
        monkeypatch.setattr(llm_provider.settings, "GROQ_API_KEY", "gsk_primary")
        monkeypatch.setattr(llm_provider.settings, "GROQ_API_KEY_SECONDARY", "gsk_secondary")
        monkeypatch.setattr(llm_provider.settings, "OPENAI_API_KEY", "sk-platform-openai")

        candidates = llm_provider.resolve_credentials_with_fallback()

        assert [c.provider for c in candidates] == ["groq", "groq", "openai"]
        assert candidates[0].api_key == "gsk_primary"
        assert candidates[1].api_key == "gsk_secondary"
        assert candidates[1].is_byok is False

    def test_no_secondary_groq_key_skips_straight_to_openai(self, monkeypatch):
        monkeypatch.setattr(llm_provider.settings, "GROQ_API_KEY", "gsk_primary")
        monkeypatch.setattr(llm_provider.settings, "GROQ_API_KEY_SECONDARY", "")
        monkeypatch.setattr(llm_provider.settings, "OPENAI_API_KEY", "sk-platform-openai")

        candidates = llm_provider.resolve_credentials_with_fallback()

        assert [c.provider for c in candidates] == ["groq", "openai"]

    def test_secondary_groq_key_not_used_when_primary_provider_isnt_groq(self, monkeypatch):
        monkeypatch.setattr(llm_provider.settings, "GROQ_API_KEY_SECONDARY", "gsk_secondary")
        user = _user_with_key("anthropic", "sk-ant-users-own-key")

        candidates = llm_provider.resolve_credentials_with_fallback(user=user, provider="anthropic")

        assert all(c.api_key != "gsk_secondary" for c in candidates)

    def test_primary_only_when_no_fallback_keys_configured(self, monkeypatch):
        monkeypatch.setattr(llm_provider.settings, "GROQ_API_KEY", "gsk_primary")
        monkeypatch.setattr(llm_provider.settings, "GROQ_API_KEY_SECONDARY", "")
        monkeypatch.setattr(llm_provider.settings, "OPENAI_API_KEY", "")

        candidates = llm_provider.resolve_credentials_with_fallback()

        assert [c.provider for c in candidates] == ["groq"]


class TestBuildChatModel:
    def test_openai_compatible_provider_builds_chat_openai(self, monkeypatch):
        monkeypatch.setattr(llm_provider.settings, "GROQ_API_KEY", "gsk_test")
        creds = llm_provider.resolve_credentials(provider="groq")

        llm = llm_provider.build_chat_model(creds, temperature=0.2)

        from langchain_openai import ChatOpenAI
        assert isinstance(llm, ChatOpenAI)

    def test_anthropic_provider_builds_chat_anthropic(self):
        user = _user_with_key("anthropic", "sk-ant-real-key")
        creds = llm_provider.resolve_credentials(user=user, provider="anthropic")

        llm = llm_provider.build_chat_model(creds, temperature=0.2)

        from langchain_anthropic import ChatAnthropic
        assert isinstance(llm, ChatAnthropic)
