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
from datetime import datetime, timedelta

import redis.asyncio as aioredis
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.exceptions import EmailAlreadyRegistered, InvalidCredentials, UserNotFound
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    verify_password,
)
from app.db.repositories.session_repo import SessionRepository
from app.db.repositories.user_repo import UserRepository
from app.schemas.auth import RegisterRequest, TokenPair, UserResponse


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(self.db)

    async def register(self, data: RegisterRequest) -> UserResponse:
        email = data.email.lower().strip()
        existing = await self.user_repo.get_by_email(email)
        if existing is not None:
            raise EmailAlreadyRegistered(email)
        password_hash = hash_password(data.password)
        user = await self.user_repo.create(
            email=email,
            username=data.username,
            password_hash=password_hash,
        )
        return UserResponse.model_validate(user)

    async def login(self, email: str, password: str) -> TokenPair:
        """
        1. Fetch user by email
        2. Verify bcrypt hash
        3. Generate RS256 access token (15 min)
        4. Generate opaque refresh token (30 days), store hash in DB
        5. Update last_login_at
        6. Return TokenPair
        """
        user = await self.user_repo.get_by_email(email.lower().strip())
        if user is None:
            raise InvalidCredentials()
        if not verify_password(password, user.password_hash):
            raise InvalidCredentials()
        access_token, jti, expires_at = create_access_token(user.id, user.role)
        raw_refresh_token, refresh_token_hash = generate_refresh_token()
        session_repo = SessionRepository(self.db)
        session_expires = datetime.utcnow() + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
        await session_repo.create(
            user_id=user.id,
            refresh_token_hash=refresh_token_hash,
            access_jti=jti,
            expires_at=session_expires,
        )
        await self.user_repo.update_last_login(user.id)
        return TokenPair(
            access_token=access_token,
            refresh_token=raw_refresh_token,
            token_type="bearer",
            expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

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
        session_repo = SessionRepository(self.db)
        session = await session_repo.get_active_by_user(user_id)
        if session:
            await session_repo.revoke(session.id)
        redis = aioredis.from_url(settings.REDIS_URL, ssl_cert_reqs=None)
        try:
            ttl = settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
            await redis.set(f"revoked:{access_jti}", "1", ex=ttl)
        finally:
            await redis.aclose()

    async def get_current_user(self, user_id: uuid.UUID) -> UserResponse:
        user = await self.user_repo.get_by_id(user_id)
        if user is None:
            raise UserNotFound(str(user_id))
        return UserResponse.model_validate(user)
       