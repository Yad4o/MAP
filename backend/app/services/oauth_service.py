"""
services/oauth_service.py
──────────────────────────
Provider-facing half of "Sign in with Google/GitHub".

This module only talks to the OAuth providers over HTTP — it never
touches the database. AuthService.login_with_oauth_profile() takes the
normalized profile this returns and does the find-or-create-user +
issue-JWT-tokens part, the same way AuthService.login() does for
password auth.

Flow (authorization-code grant, no extra deps — just httpx):
  1. GET  /api/v1/auth/oauth/{provider}/login
         → build_authorize_url() → 302 redirect to the provider
  2. Provider redirects back to
         GET /api/v1/auth/oauth/{provider}/callback?code=...&state=...
  3. exchange_code() trades the code for an access token, then fetches
     the provider's profile endpoint and normalizes it.
"""

import logging
from dataclasses import dataclass
from urllib.parse import urlencode

import httpx

from app.config import settings
from app.core.exceptions import OAuthError

logger = logging.getLogger(__name__)

GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"
GITHUB_EMAILS_URL = "https://api.github.com/user/emails"

SUPPORTED_PROVIDERS = ("google", "github")


@dataclass
class OAuthProfile:
    provider: str
    provider_user_id: str
    email: str
    name: str
    avatar_url: str | None


def _redirect_uri(provider: str) -> str:
    return f"{settings.BACKEND_URL.rstrip('/')}/api/v1/auth/oauth/{provider}/callback"


def _require_provider_configured(provider: str) -> None:
    if provider == "google" and not (settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET):
        raise OAuthError("Google sign-in isn't configured on this server yet.")
    if provider == "github" and not (settings.GITHUB_CLIENT_ID and settings.GITHUB_CLIENT_SECRET):
        raise OAuthError("GitHub sign-in isn't configured on this server yet.")


def build_authorize_url(provider: str, state: str) -> str:
    """Build the provider's consent-screen URL for this login attempt."""
    if provider not in SUPPORTED_PROVIDERS:
        raise OAuthError(f"Unsupported OAuth provider: {provider}")
    _require_provider_configured(provider)

    if provider == "google":
        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": _redirect_uri("google"),
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "access_type": "online",
            "prompt": "select_account",
        }
        return f"{GOOGLE_AUTHORIZE_URL}?{urlencode(params)}"

    params = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "redirect_uri": _redirect_uri("github"),
        "scope": "read:user user:email",
        "state": state,
        "allow_signup": "true",
    }
    return f"{GITHUB_AUTHORIZE_URL}?{urlencode(params)}"


async def exchange_code(provider: str, code: str) -> OAuthProfile:
    """Trade an authorization code for an access token, then fetch and
    normalize the provider's profile. Raises OAuthError on any failure."""
    if provider not in SUPPORTED_PROVIDERS:
        raise OAuthError(f"Unsupported OAuth provider: {provider}")
    _require_provider_configured(provider)

    async with httpx.AsyncClient(timeout=10.0) as client:
        if provider == "google":
            return await _exchange_google(client, code)
        return await _exchange_github(client, code)


async def _exchange_google(client: httpx.AsyncClient, code: str) -> OAuthProfile:
    try:
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "code": code,
                "redirect_uri": _redirect_uri("google"),
                "grant_type": "authorization_code",
            },
        )
        token_resp.raise_for_status()
        access_token = token_resp.json()["access_token"]

        profile_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        profile_resp.raise_for_status()
        data = profile_resp.json()
    except httpx.HTTPError as exc:
        logger.warning("Google OAuth exchange failed: %s", exc)
        raise OAuthError("Couldn't verify your Google account. Please try again.")

    email = data.get("email")
    if not email or not data.get("email_verified", True):
        raise OAuthError("Your Google account has no verified email address.")

    return OAuthProfile(
        provider="google",
        provider_user_id=data["sub"],
        email=email.lower().strip(),
        name=data.get("name") or email.split("@")[0],
        avatar_url=data.get("picture"),
    )


async def _exchange_github(client: httpx.AsyncClient, code: str) -> OAuthProfile:
    try:
        token_resp = await client.post(
            GITHUB_TOKEN_URL,
            data={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
                "redirect_uri": _redirect_uri("github"),
            },
            headers={"Accept": "application/json"},
        )
        token_resp.raise_for_status()
        token_data = token_resp.json()
        if "error" in token_data:
            raise OAuthError(token_data.get("error_description", "GitHub rejected the login."))
        access_token = token_data["access_token"]

        headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}
        user_resp = await client.get(GITHUB_USER_URL, headers=headers)
        user_resp.raise_for_status()
        user_data = user_resp.json()

        email = user_data.get("email")
        if not email:
            # GitHub only returns a public email if the user opted in — fall
            # back to the emails endpoint and take their primary verified one.
            emails_resp = await client.get(GITHUB_EMAILS_URL, headers=headers)
            emails_resp.raise_for_status()
            emails = emails_resp.json()
            primary = next((e for e in emails if e.get("primary") and e.get("verified")), None)
            if primary is None:
                primary = next((e for e in emails if e.get("verified")), None)
            email = primary["email"] if primary else None
    except httpx.HTTPError as exc:
        logger.warning("GitHub OAuth exchange failed: %s", exc)
        raise OAuthError("Couldn't verify your GitHub account. Please try again.")

    if not email:
        raise OAuthError("Your GitHub account has no verified email address.")

    return OAuthProfile(
        provider="github",
        provider_user_id=str(user_data["id"]),
        email=email.lower().strip(),
        name=user_data.get("name") or user_data.get("login") or email.split("@")[0],
        avatar_url=user_data.get("avatar_url"),
    )
