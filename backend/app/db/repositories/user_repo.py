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
from datetime import datetime


from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from app.db.models.user import Session, User


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, email: str, username: str, password_hash: str) -> User:

        """Create a new user. Returns the created User instance."""
        new_user = User(
            email=email,
            username=username,
            password_hash=password_hash,
            role="USER",
            tier="free",
            is_active=True,
            email_verified=False,
        )
        self.db.add(new_user)
        await self.db.flush()
        await self.db.refresh(new_user)
        return new_user

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        """Fetch user by UUID. Returns None if not found."""

        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:

        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()
    

    async def update_last_login(self, user_id: uuid.UUID) -> None:
        """Set last_login_at to now."""
        await self.db.execute(
            update(User)
            .where(User.id == user_id)
            .values(last_login_at=datetime.utcnow())
        )
        

    async def deactivate(self, user_id: uuid.UUID) -> None:
        """Set is_active=False."""
        await self.db.execute(
            update(User)
            .where(User.id == user_id)
            .values(is_active=False)
        )
        

        
    async def list_all(self, page: int = 1, page_size: int = 20) -> tuple[list[User], int]:
        """Return (users, total_count) for admin list endpoint."""
        result = await self.db.execute(
            select(User).offset((page - 1) * page_size).limit(page_size))
        users = result.scalars().all()

        count_result = await self.db.execute(select(func.count(User.id)))
        total = count_result.scalar()

        return (list(users), total)

    
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
    ) -> Session:
        new_session = Session(
            user_id=user_id,
            refresh_token_hash=refresh_token_hash,
            access_jti=access_jti,
            expires_at=expires_at,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.db.add(new_session)
        await self.db.flush()
        await self.db.refresh(new_session)
        return new_session

    async def get_active_by_user(self, user_id: uuid.UUID) -> Session | None:
        result = await self.db.execute(
            select(Session).where(
                Session.user_id == user_id,
                Session.revoked_at == None,  # noqa: E711
                Session.expires_at > datetime.utcnow(),
            )
        )
        return result.scalar_one_or_none()

    async def revoke(self, session_id: uuid.UUID) -> None:
        raise NotImplementedError("Phase 1 — implement this")

    async def revoke_all_for_user(self, user_id: uuid.UUID) -> None:
        raise NotImplementedError("Phase 1 — implement this")



