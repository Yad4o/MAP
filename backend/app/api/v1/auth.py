"""
api/v1/auth.py
──────────────
Auth route handlers.

Phase 0: All routes defined and return 501 Not Implemented.
Phase 1 (Member building API routes): Fill in the implementations
         by calling auth_service methods.
"""

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_auth_service
from app.core.exceptions import EmailAlreadyRegistered
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
    raise NotImplementedError("Phase 1 — implement this")


@router.post("/refresh", response_model=TokenPair)
async def refresh_token(
    service: AuthService = Depends(get_auth_service),
):
    """Rotate refresh token and issue new access token."""
    raise NotImplementedError("Phase 1 — implement this")


@router.post("/logout", status_code=204)
async def logout(
    service: AuthService = Depends(get_auth_service),
):
    """Revoke the current session tokens."""
    raise NotImplementedError("Phase 1 — implement this")


@router.get("/me", response_model=UserResponse)
async def get_me(
    service: AuthService = Depends(get_auth_service),
):
    """Return the authenticated user's profile."""
    raise NotImplementedError("Phase 1 — implement this")


@router.patch("/me", response_model=UserResponse)
async def update_me(
    body: UpdateProfileRequest,
    service: AuthService = Depends(get_auth_service),
):
    raise NotImplementedError("Phase 1 — implement this")


@router.post("/change-password", status_code=204)
async def change_password(
    body: ChangePasswordRequest,
    service: AuthService = Depends(get_auth_service),
):
    raise NotImplementedError("Phase 1 — implement this")


@router.post("/reset-password", status_code=202, response_model=MessageResponse)
async def reset_password(body: ResetPasswordRequest):
    raise NotImplementedError("Phase 1 — implement this")
