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

from app.db.models.user import Session, User


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, email: str, username: str, password_hash: str) -> User:
        """Create a new user. Returns the created User instance."""
        raise NotImplementedError("Phase 1 — implement this")

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        """Fetch user by UUID. Returns None if not found."""
        raise NotImplementedError("Phase 1 — implement this")

    async def get_by_email(self, email: str) -> User | None:
        """Fetch user by email. Returns None if not found."""
        raise NotImplementedError("Phase 1 — implement this")

    async def update_last_login(self, user_id: uuid.UUID) -> None:
        """Set last_login_at to now."""
        raise NotImplementedError("Phase 1 — implement this")

    async def deactivate(self, user_id: uuid.UUID) -> None:
        """Set is_active=False."""
        raise NotImplementedError("Phase 1 — implement this")

    async def list_all(self, page: int = 1, page_size: int = 20) -> tuple[list[User], int]:
        """Return (users, total_count) for admin list endpoint."""
        raise NotImplementedError("Phase 1 — implement this")


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
        raise NotImplementedError("Phase 1 — implement this")

    async def get_active_by_user(self, user_id: uuid.UUID) -> Session | None:
        raise NotImplementedError("Phase 1 — implement this")

    async def revoke(self, session_id: uuid.UUID) -> None:
        raise NotImplementedError("Phase 1 — implement this")

    async def revoke_all_for_user(self, user_id: uuid.UUID) -> None:
        raise NotImplementedError("Phase 1 — implement this")
