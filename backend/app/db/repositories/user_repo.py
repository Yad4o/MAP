"""
db/repositories/user_repo.py
─────────────────────────────
Data access layer for users and sessions.

Phase 0: Method signatures only — all raise NotImplementedError.
Phase 1 (Member building DB layer): Fill in the implementations.

Pattern: repositories never receive raw SQL. All queries go here.
Services call repositories. Routes call services.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.user import User, Session


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        email: str,
        username: str,
        password_hash: str | None = None,
        oauth_provider: str | None = None,
        oauth_id: str | None = None,
        avatar_url: str | None = None,
    ):
        """Create a new user. Returns the created User instance."""
        new_user = User(
            email=email,
            username=username,
            password_hash=password_hash,
            oauth_provider=oauth_provider,
            oauth_id=oauth_id,
            avatar_url=avatar_url,
        )
        self.db.add(new_user)
        await self.db.flush()
        await self.db.refresh(new_user)
        return new_user

    async def get_by_oauth(self, provider: str, oauth_id: str):
        """Fetch user by OAuth provider + provider-side id. Returns None if not found."""
        result = await self.db.execute(
            select(User).where(
                User.oauth_provider == provider,
                User.oauth_id == oauth_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: uuid.UUID):
        """Fetch user by UUID. Returns None if not found."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str):
        """Fetch user by email. Returns None if not found."""
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_by_username(self, username: str):
        """Fetch user by username. Returns None if not found."""
        result = await self.db.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()


    async def update(self, user_id: uuid.UUID, **kwargs) -> User | None:
        """Update user record. Returns updated User or None if not found."""
        query = (
            update(User)
            .where(User.id == user_id)
            .values(**kwargs)
            .returning(User)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()


    async def update_last_login(self, user_id: uuid.UUID) -> None:
        """Set last_login_at to now."""
        stmt = update(User).where(User.id == user_id).values(last_login_at=func.now())
        await self.db.execute(stmt)

    async def deactivate(self, user_id: uuid.UUID) -> None:
        """Set is_active=False."""
        stmt = update(User).where(User.id == user_id).values(is_active=False)
        await self.db.execute(stmt)

    async def list_all(self, page: int = 1, page_size: int = 20):
        """Return (users, total_count) for admin list endpoint."""
        offset = (page - 1) * page_size
        
        # Get total count
        count_result = await self.db.execute(select(func.count(User.id)))
        total_count = count_result.scalar()
        
        # Get paginated users
        users_result = await self.db.execute(
            select(User).offset(offset).limit(page_size).order_by(User.created_at.desc())
        )
        users = users_result.scalars().all()
        
        return users, total_count


class SessionRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        user_id: uuid.UUID,
        refresh_token_hash: str,
        access_jti: str,
        expires_at: datetime,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ):
        """Create a new session."""
        new_session = Session(
            user_id=user_id,
            refresh_token_hash=refresh_token_hash,
            access_jti=access_jti,
            expires_at=expires_at,
            ip_address=ip_address,
            user_agent=user_agent
        )
        self.db.add(new_session)
        await self.db.flush()
        await self.db.refresh(new_session)
        return new_session

    async def get_active_by_user(self, user_id: uuid.UUID):
        """Get active session for user."""
        result = await self.db.execute(
            select(Session).where(
                Session.user_id == user_id,
                Session.revoked_at == None,  # noqa: E711
                Session.expires_at > func.now()
            )
        )
        return result.scalar_one_or_none()

    async def revoke(self, session_id: uuid.UUID) -> None:
        """Revoke a session."""
        stmt = update(Session).where(Session.id == session_id).values(
            revoked_at=func.now()
        )
        await self.db.execute(stmt)
        await self.db.flush()

    async def revoke_all_for_user(self, user_id: uuid.UUID) -> None:
        """Revoke all sessions for user."""
        stmt = update(Session).where(
            Session.user_id == user_id,
            Session.revoked_at == None  # noqa: E711
        ).values(
            revoked_at=func.now()
        )
        await self.db.execute(stmt)
        await self.db.flush()
