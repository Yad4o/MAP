"""
services/auth_service.py
─────────────────────────
Business logic for authentication.

Phase 0: Method signatures only.
Phase 1: Implement using UserRepository + security utilities.

The service layer sits between routes and repositories.
Routes should never call repositories directly.
"""

import logging
import secrets
import uuid
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.constants import REDIS_REVOKED_TOKEN_KEY_PREFIX, REDIS_PASSWORD_RESET_KEY_PREFIX
from app.core.exceptions import EmailAlreadyRegistered, InvalidCredentials, UserNotFound
from app.core.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    verify_password,
)
# SessionRepository was consolidated into user_repo.py to co-locate all user-related data access 
from app.db.repositories.user_repo import SessionRepository
from app.db.repositories.user_repo import UserRepository
from app.schemas.auth import RegisterRequest, TokenPair, UserResponse, UpdateProfileRequest
from app.core.redis import get_redis
from app.services.email_service import EmailService
from app.services.email_templates import welcome_email, password_reset_email

logger = logging.getLogger(__name__)


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

        # Best-effort welcome email — a delivery failure here must never
        # block account creation.
        try:
            await EmailService().send(
                to=user.email,
                subject="Welcome to MAP",
                html=welcome_email(user.username),
            )
        except Exception as exc:
            logger.warning("Failed to send welcome email to %s: %s", user.email, exc)

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
        if not password:
            raise InvalidCredentials()

        user = await self.user_repo.get_by_email(email.lower().strip())
        if user is None:
            logger.warning("Login attempt with non-existent email: %s", email)
            raise InvalidCredentials()

        if not verify_password(password, user.password_hash):
            logger.warning("Failed login attempt for user %s", user.id)
            raise InvalidCredentials()

        session_repo = SessionRepository(self.db)
        session_expires = datetime.utcnow() + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
        raw_refresh_token, refresh_token_hash = generate_refresh_token()
        access_token, jti, access_expires_at = create_access_token(user.id, user.role)
        session = await session_repo.create(
            user_id=user.id,
            refresh_token_hash=refresh_token_hash,
            access_jti=jti,
            expires_at=session_expires,
        )
        await self.user_repo.update_last_login(user.id)
        logger.info("User %s logged in successfully", user.id)

        return TokenPair(
            access_token=access_token,
            refresh_token=raw_refresh_token,
            token_type="bearer",
            expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    async def refresh(self, refresh_token: str) -> TokenPair:
        """
        1. Find session whose hash matches the incoming raw refresh token.
        2. Verify it is neither revoked nor expired.
        3. Revoke the old session (token rotation).
        4. Issue fresh access + refresh tokens.
        """
        from app.core.exceptions import InvalidCredentials

        session_repo = SessionRepository(self.db)

        # Brute-force search: iterate active sessions for the token match.
        # For large-scale deployments, store a short prefix index instead.
        from sqlalchemy import select
        from app.db.models.user import Session as SessionModel
        from sqlalchemy.orm import selectinload

        result = await self.db.execute(
            select(SessionModel)
            .where(
                SessionModel.revoked_at == None,  # noqa: E711
                SessionModel.expires_at > datetime.utcnow(),
            )
            .options(selectinload(SessionModel.user))
        )
        sessions = result.scalars().all()

        matched_session = None
        for s in sessions:
            if verify_password(refresh_token, s.refresh_token_hash):
                matched_session = s
                break

        if not matched_session:
            raise InvalidCredentials()

        user = matched_session.user

        # Revoke old session
        await session_repo.revoke(matched_session.id)

        # Issue new tokens
        raw_refresh_token, refresh_token_hash = generate_refresh_token()
        access_token, jti, access_expires_at = create_access_token(user.id, user.role)

        session_expires = datetime.utcnow() + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
        await session_repo.create(
            user_id=user.id,
            refresh_token_hash=refresh_token_hash,
            access_jti=jti,
            expires_at=session_expires,
        )

        return TokenPair(
            access_token=access_token,
            refresh_token=raw_refresh_token,
            token_type="bearer",
            expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    async def logout(self, user_id: uuid.UUID, access_jti: str) -> None:
        """
        1. Revoke session in DB
        2. Add access JTI to Redis revocation set
        """
        session_repo = SessionRepository(self.db)
        session = await session_repo.get_active_by_user(user_id)
        if session:
            await session_repo.revoke(session.id)
            
        redis = await get_redis()
        ttl = settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
        key = f"{REDIS_REVOKED_TOKEN_KEY_PREFIX}:{access_jti}"
        await redis.setex(key, ttl, "1")

        logger.info("User %s logged out", user_id)

    async def get_current_user(self, user_id: uuid.UUID) -> UserResponse:
        user = await self.user_repo.get_by_id(user_id)
        if user is None:
            raise UserNotFound(str(user_id))
        return UserResponse.model_validate(user)


    async def update_me(self, user_id: uuid.UUID, data: UpdateProfileRequest) -> UserResponse:
        """Update current user profile info."""
        # Convert Pydantic fields to a dict, excluding unset fields
        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            # Nothing to update, just return current profile
            return await self.get_current_user(user_id)

        user = await self.user_repo.update(user_id, **update_data)
        if user is None:
            raise UserNotFound(str(user_id))

        return UserResponse.model_validate(user)

    async def request_password_reset(self, email: str) -> None:
        """
        Generate a short-lived reset token and email it to the user.

        Always succeeds from the caller's perspective (no user-existence
        leak) — if the email isn't registered, this is a silent no-op.
        """
        user = await self.user_repo.get_by_email(email.lower().strip())
        if user is None:
            logger.info("Password reset requested for unknown email: %s", email)
            return

        raw_token = secrets.token_urlsafe(32)
        redis = await get_redis()
        key = f"{REDIS_PASSWORD_RESET_KEY_PREFIX}:{raw_token}"
        await redis.setex(key, 60 * 30, str(user.id))  # 30 minute expiry

        reset_link = f"{settings.FRONTEND_URL}/reset-password?token={raw_token}"

        try:
            await EmailService().send(
                to=user.email,
                subject="Reset your MAP password",
                html=password_reset_email(reset_link),
            )
        except Exception as exc:
            logger.warning("Failed to send password reset email to %s: %s", user.email, exc)

    async def confirm_password_reset(self, token: str, new_password: str) -> None:
        """Validate a reset token and set the new password."""
        redis = await get_redis()
        key = f"{REDIS_PASSWORD_RESET_KEY_PREFIX}:{token}"
        user_id_raw = await redis.get(key)
        if user_id_raw is None:
            raise InvalidCredentials()

        user_id = uuid.UUID(user_id_raw.decode() if isinstance(user_id_raw, bytes) else user_id_raw)
        new_hash = hash_password(new_password)
        user = await self.user_repo.update(user_id, password_hash=new_hash)
        if user is None:
            raise UserNotFound(str(user_id))

        await redis.delete(key)
        logger.info("Password reset completed for user %s", user_id)
