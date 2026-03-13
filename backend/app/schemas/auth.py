"""
schemas/auth.py
───────────────
Request and response schemas for the Auth module.

Phase 1: Member building auth routes uses these as the contract.
Member building the User DB model uses these to know what fields are needed.
Member building the frontend uses these to know what to send and expect.
"""

from uuid import UUID
from pydantic import BaseModel, EmailStr, Field


# ── Requests ──────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=80)
    password: str = Field(..., min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)


class ResetPasswordRequest(BaseModel):
    email: EmailStr


class UpdateProfileRequest(BaseModel):
    username: str | None = Field(default=None, min_length=3, max_length=80)


# ── Responses ─────────────────────────────────────────────────

class UserResponse(BaseModel):
    """Returned whenever user data is included in a response.
    Never includes password_hash."""
    id: UUID
    email: str
    username: str
    role: str
    tier: str
    is_active: bool
    email_verified: bool

    model_config = {"from_attributes": True}


class TokenPair(BaseModel):
    """Returned on login and token refresh."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int             # access token expiry in seconds
