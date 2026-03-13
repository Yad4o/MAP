"""
services/auth_service.py
─────────────────────────
Business logic for authentication.

Phase 0: Method signatures only.
Phase 1: Implement using UserRepository + security utilities.

The service layer sits between routes and repositories.
Routes should never call repositories directly.
"""

import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.auth import RegisterRequest, TokenPair, UserResponse


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register(self, data: RegisterRequest) -> UserResponse:
        """
        1. Check email not already taken
        2. Hash password with bcrypt
        3. Create user via UserRepository
        4. Return UserResponse (no password hash)
        """
        raise NotImplementedError("Phase 1 — implement this")

    async def login(self, email: str, password: str) -> TokenPair:
        """
        1. Fetch user by email
        2. Verify bcrypt hash
        3. Generate RS256 access token (15 min)
        4. Generate opaque refresh token (30 days), store hash in DB
        5. Update last_login_at
        6. Return TokenPair
        """
        raise NotImplementedError("Phase 1 — implement this")

    async def refresh(self, refresh_token: str) -> TokenPair:
        """
        1. Look up session by refresh token hash
        2. Verify not revoked and not expired
        3. Revoke old session
        4. Issue new access + refresh tokens
        """
        raise NotImplementedError("Phase 1 — implement this")

    async def logout(self, user_id: uuid.UUID, access_jti: str) -> None:
        """
        1. Revoke session in DB
        2. Add access JTI to Redis revocation set
        """
        raise NotImplementedError("Phase 1 — implement this")

    async def get_current_user(self, user_id: uuid.UUID) -> UserResponse:
        raise NotImplementedError("Phase 1 — implement this")
