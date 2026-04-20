"""
api/v1/auth.py
──────────────
Auth route handlers.

Phase 0: All routes defined and return 501 Not Implemented.
Phase 1 (Member building API routes): Fill in the implementations
         by calling auth_service methods.
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.api.deps import get_auth_service
from app.core.exceptions import EmailAlreadyRegistered, InvalidCredentials
from app.dependencies import get_current_user, get_token_payload
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenPair,
    UpdateProfileRequest,
    UserResponse,
)
from app.schemas.common import MessageResponse
from app.services.auth_service import AuthService

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
async def reset_password(body: ResetPasswordRequest):
    raise NotImplementedError("Phase 1 — implement this")
