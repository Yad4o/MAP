"""
api/v1/auth.py
──────────────
Auth route handlers.

Phase 0: All routes defined and return 501 Not Implemented.
Phase 1 (Member building API routes): Fill in the implementations
         by calling auth_service methods.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import get_db
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

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Create a new user account."""
    raise NotImplementedError("Phase 1 — implement this")


@router.post("/login", response_model=TokenPair)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate and receive JWT access + refresh tokens."""
    raise NotImplementedError("Phase 1 — implement this")


@router.post("/refresh", response_model=TokenPair)
async def refresh_token(db: AsyncSession = Depends(get_db)):
    """Rotate refresh token and issue new access token."""
    raise NotImplementedError("Phase 1 — implement this")


@router.post("/logout", status_code=204)
async def logout(db: AsyncSession = Depends(get_db)):
    """Revoke the current session tokens."""
    raise NotImplementedError("Phase 1 — implement this")


@router.get("/me", response_model=UserResponse)
async def get_me(db: AsyncSession = Depends(get_db)):
    """Return the authenticated user's profile."""
    raise NotImplementedError("Phase 1 — implement this")


@router.patch("/me", response_model=UserResponse)
async def update_me(body: UpdateProfileRequest, db: AsyncSession = Depends(get_db)):
    raise NotImplementedError("Phase 1 — implement this")


@router.post("/change-password", status_code=204)
async def change_password(body: ChangePasswordRequest, db: AsyncSession = Depends(get_db)):
    raise NotImplementedError("Phase 1 — implement this")


@router.post("/reset-password", status_code=202, response_model=MessageResponse)
async def reset_password(body: ResetPasswordRequest):
    raise NotImplementedError("Phase 1 — implement this")
