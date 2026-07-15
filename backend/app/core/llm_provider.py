"""
core/llm_provider.py
─────────────────────
Single place that decides which AI provider/key/model to use for a call,
and builds the matching LangChain chat model.

Every agent used to hardcode Groq lookup logic separately (executor_agent,
planner_agent via fallback_engine). Now they all go through here.

Key resolution order, per call:
  1. The user's own key for the requested provider (if they added one)
  2. The platform's default key for that provider (from settings)

A user's own key is stored encrypted (see core/crypto.py) and never
touches a log line or exception message.
"""

import logging
from dataclasses import dataclass

from app.config import settings
from app.core.crypto import decrypt_secret
from app.db.models.user import User

logger = logging.getLogger(__name__)

# Providers we support, each either OpenAI-wire-compatible (Groq, Gemini,
# OpenAI itself) or Anthropic's own format (Claude).
# Providers we support, each either OpenAI-wire-compatible (Groq, Gemini,
# OpenAI itself) or Anthropic's own format (Claude). base_url is resolved
# live in _credentials() where needed (settings.GROQ_BASE_URL can change
# at runtime/in tests) rather than baked in here at import time.
PROVIDERS = {
    "groq": {"kind": "openai_compatible", "default_model": "llama-3.3-70b-versatile"},
    "openai": {"kind": "openai_compatible", "default_model": "gpt-4o"},
    "gemini": {"kind": "openai_compatible", "default_model": "gemini-1.5-pro"},
    "anthropic": {"kind": "anthropic", "default_model": "claude-sonnet-4-5"},
}

_GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"


@dataclass
class ProviderCredentials:
    provider: str
    api_key: str
    base_url: str | None
    model: str
    is_byok: bool  # True if this came from the user's own key


def get_user_provider_key(user: User | None, provider: str) -> str | None:
    """Return the user's decrypted key for `provider`, if they've added one."""
    if user is None or not user.metadata_:
        return None
    stored = user.metadata_.get("provider_keys", {}).get(provider)
    if not stored:
        return None
    return decrypt_secret(stored["key_encrypted"])


def resolve_credentials(user: User | None = None, provider: str | None = None) -> ProviderCredentials:
    """
    Work out which provider/key/model to actually call.

    If `provider` is given, use it (BYOK if the user has a key for it,
    otherwise the platform default for it). If not given, use the user's
    first configured BYOK provider, falling back to the platform default
    (Groq, or OpenAI if no Groq key is set).
    """
    if provider:
        if provider not in PROVIDERS:
            raise ValueError(f"Unknown AI provider: {provider}. Supported: {list(PROVIDERS)}")
        user_key = get_user_provider_key(user, provider)
        if user_key:
            return _credentials(provider, user_key, is_byok=True)
        return _platform_credentials(provider)

    if user and user.metadata_:
        configured = list(user.metadata_.get("provider_keys", {}).keys())
        if configured:
            byok_provider = configured[0]
            return _credentials(byok_provider, get_user_provider_key(user, byok_provider), is_byok=True)

    return _platform_default()


def _base_url(provider: str) -> str | None:
    """Resolve base_url from live settings (not baked in at import time)."""
    if provider == "groq":
        return settings.GROQ_BASE_URL
    if provider == "gemini":
        return _GEMINI_BASE_URL
    return None


def _credentials(provider: str, api_key: str, is_byok: bool) -> ProviderCredentials:
    cfg = PROVIDERS[provider]
    return ProviderCredentials(
        provider=provider,
        api_key=api_key,
        base_url=_base_url(provider),
        model=settings.DEFAULT_MODEL if provider in ("groq", "openai") else cfg["default_model"],
        is_byok=is_byok,
    )


def _platform_credentials(provider: str) -> ProviderCredentials:
    """Platform's own key for a specific provider (no BYOK)."""
    key_by_provider = {
        "groq": settings.GROQ_API_KEY,
        "openai": settings.OPENAI_API_KEY,
        "gemini": settings.GEMINI_API_KEY,
        "anthropic": "",  # platform doesn't run its own Claude key — BYOK only
    }
    api_key = key_by_provider.get(provider, "")
    if not api_key:
        raise RuntimeError(f"No platform API key configured for '{provider}', and no user key was provided.")
    return _credentials(provider, api_key, is_byok=False)


def _platform_default() -> ProviderCredentials:
    """The historical default: Groq if configured, else OpenAI."""
    if settings.GROQ_API_KEY:
        return _credentials("groq", settings.GROQ_API_KEY, is_byok=False)
    if settings.OPENAI_API_KEY:
        return _credentials("openai", settings.OPENAI_API_KEY, is_byok=False)
    raise RuntimeError("No AI provider is configured — set GROQ_API_KEY/OPENAI_API_KEY or add a personal key.")


def build_chat_model(
    creds: ProviderCredentials,
    temperature: float,
    max_tokens: int | None = None,
    max_retries: int = 3,
    request_timeout: float = 60.0,
):
    """Build the LangChain chat model for these credentials.

    max_retries/request_timeout are passed straight into the LangChain
    client so transient 429s/timeouts are retried with backoff *before*
    ever reaching our own agent-level error handling. Without this the
    client fails on the first hiccup and the caller has no way to tell
    a rate limit apart from a real error.
    """
    kind = PROVIDERS[creds.provider]["kind"]

    if kind == "anthropic":
        from langchain_anthropic import ChatAnthropic

        return ChatAnthropic(
            api_key=creds.api_key,
            model=creds.model,
            temperature=temperature,
            max_tokens=max_tokens or settings.MAX_TOKENS,
            max_retries=max_retries,
            timeout=request_timeout,
        )

    from langchain_openai import ChatOpenAI

    return ChatOpenAI(
        api_key=creds.api_key,
        base_url=creds.base_url,
        model=creds.model,
        temperature=temperature,
        max_tokens=max_tokens,
        max_retries=max_retries,
        timeout=request_timeout,
    )


def resolve_credentials_with_fallback(
    user: User | None = None, provider: str | None = None
) -> list[ProviderCredentials]:
    """
    Return an ordered list of credentials to try: the requested/primary
    provider first, then a platform fallback provider if one is available
    and distinct from the primary.

    Used so a 429 on Groq (tight free-tier limits) can fall through to
    OpenAI instead of failing the whole task outright.
    """
    primary = resolve_credentials(user=user, provider=provider)
    candidates = [primary]

    fallback_order = ["groq", "openai"]
    for fb_provider in fallback_order:
        if fb_provider == primary.provider:
            continue
        try:
            candidates.append(_platform_credentials(fb_provider))
        except RuntimeError:
            continue
        break  # only ever add one fallback

    return candidates
