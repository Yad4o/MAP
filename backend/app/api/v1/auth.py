"""
api/v1/auth.py
──────────────
Auth route handlers.

Phase 0: All routes defined and return 501 Not Implemented.
Phase 1 (Member building API routes): Fill in the implementations
         by calling auth_service methods.
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import secrets

from app.api.deps import get_auth_service
from app.config import settings
from app.core.constants import REDIS_OAUTH_STATE_KEY_PREFIX
from app.core.exceptions import EmailAlreadyRegistered, InvalidCredentials, OAuthError
from app.core.redis import get_redis
from app.dependencies import get_current_user, get_token_payload
from app.schemas.auth import (
    ChangePasswordRequest,
    ConfirmResetPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenPair,
    UpdateProfileRequest,
    UserResponse,
)
from app.schemas.common import MessageResponse
from app.services.auth_service import AuthService
from app.services import oauth_service

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(
    body: RegisterRequest,
    service: AuthService = Depends(get_auth_service),
):
    """Create a new user account."""
    try:
        return await service.register(body)
    except EmailAlreadyRegistered:
        raise HTTPException(status_code=400, detail="Email already registered")


@router.post("/login", response_model=TokenPair)
async def login(
    body: LoginRequest,
    service: AuthService = Depends(get_auth_service),
):
    """Authenticate and receive JWT access + refresh tokens."""
    try:
        return await service.login(body.email, body.password)
    except InvalidCredentials:
        raise HTTPException(status_code=401, detail="Invalid email or password")


@router.post("/refresh", response_model=TokenPair)
async def refresh_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(HTTPBearer(auto_error=False)),
    service: AuthService = Depends(get_auth_service),
):
    """Rotate refresh token and issue a new access token.

    The caller must send the raw refresh token in the Authorization header
    as: ``Authorization: Bearer <refresh_token>``.
    """
    from fastapi import HTTPException
    from app.core.exceptions import InvalidCredentials

    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Refresh token required")
    try:
        return await service.refresh(credentials.credentials)
    except (InvalidCredentials, NotImplementedError):
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")


@router.post("/logout", status_code=204)
async def logout(
    payload: dict = Depends(get_token_payload),
    current_user: UserResponse = Depends(get_current_user),
    service: AuthService = Depends(get_auth_service),
):
    """Revoke the current session tokens."""
    jti = payload.get("jti")
    if not jti:
        raise HTTPException(status_code=401, detail="Token missing jti claim")
    await service.logout(current_user.id, jti)


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: UserResponse = Depends(get_current_user),
):
    """Return the authenticated user's profile."""
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_me(
    body: UpdateProfileRequest,
    current_user: UserResponse = Depends(get_current_user),
    service: AuthService = Depends(get_auth_service),
):
    """Update the authenticated user's profile info (e.g. username)."""
    return await service.update_me(current_user.id, body)


@router.post("/change-password", status_code=204)
async def change_password(
    body: ChangePasswordRequest,
    service: AuthService = Depends(get_auth_service),
):
    raise NotImplementedError("Phase 1 — implement this")


@router.post("/reset-password", status_code=202, response_model=MessageResponse)
async def reset_password(
    body: ResetPasswordRequest,
    service: AuthService = Depends(get_auth_service),
):
    """Request a password reset email. Always returns a generic message
    (never reveals whether the email is registered)."""
    await service.request_password_reset(body.email)
    return MessageResponse(message="If that email is registered, a reset link has been sent.")


@router.post("/reset-password/confirm", status_code=200, response_model=MessageResponse)
async def confirm_reset_password(
    body: ConfirmResetPasswordRequest,
    service: AuthService = Depends(get_auth_service),
):
    """Complete a password reset using the token emailed to the user."""
    try:
        await service.confirm_password_reset(body.token, body.new_password)
    except InvalidCredentials:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    return MessageResponse(message="Password has been reset successfully.")


@router.get("/oauth/{provider}/login")
async def oauth_login(provider: str):
    """Start the OAuth flow: redirect the browser to Google/GitHub's
    consent screen. Meant to be hit as a full page navigation
    (window.location.href = ...), not an XHR/fetch call."""
    if provider not in oauth_service.SUPPORTED_PROVIDERS:
        raise HTTPException(status_code=404, detail="Unknown OAuth provider")

    state = secrets.token_urlsafe(24)
    redis = await get_redis()
    await redis.setex(f"{REDIS_OAUTH_STATE_KEY_PREFIX}:{state}", 600, provider)  # 10 min to complete login

    try:
        url = oauth_service.build_authorize_url(provider, state)
    except OAuthError as exc:
        # Provider not configured — send the user back to the frontend with
        # an error instead of a bare 500.
        return RedirectResponse(
            f"{settings.FRONTEND_URL}/?oauth_error={exc.detail}"
        )

    return RedirectResponse(url)


@router.get("/oauth/{provider}/callback")
async def oauth_callback(
    provider: str,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    service: AuthService = Depends(get_auth_service),
):
    """Provider redirects here after the user approves/denies access.
    On success, redirects to the frontend with a one-time token pair in
    the query string; the frontend's /oauth/callback route picks these up
    and immediately clears them from the URL/history."""
    if provider not in oauth_service.SUPPORTED_PROVIDERS:
        raise HTTPException(status_code=404, detail="Unknown OAuth provider")

    def _fail(message: str) -> RedirectResponse:
        return RedirectResponse(f"{settings.FRONTEND_URL}/?oauth_error={message}")

    if error:
        return _fail("access_denied")
    if not code or not state:
        return _fail("missing_code")

    redis = await get_redis()
    state_key = f"{REDIS_OAUTH_STATE_KEY_PREFIX}:{state}"
    stored_provider_raw = await redis.get(state_key)
    if stored_provider_raw is None:
        return _fail("invalid_state")
    stored_provider = (
        stored_provider_raw.decode() if isinstance(stored_provider_raw, bytes) else stored_provider_raw
    )
    if stored_provider != provider:
        return _fail("invalid_state")
    await redis.delete(state_key)

    try:
        profile = await oauth_service.exchange_code(provider, code)
        tokens = await service.login_with_oauth_profile(profile)
    except OAuthError as exc:
        return _fail(exc.detail)

    return RedirectResponse(
        f"{settings.FRONTEND_URL}/oauth/callback"
        f"?access_token={tokens.access_token}"
        f"&refresh_token={tokens.refresh_token}"
    )
