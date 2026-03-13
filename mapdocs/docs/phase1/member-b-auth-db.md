# Phase 1 — Member B: Auth Database Models & Repositories

> **Layer:** SQLAlchemy ORM models + Repository implementations + Alembic migration
> **Files you will work in:**
> - `backend/app/db/models/user.py`
> - `backend/app/db/repositories/user_repo.py`
> - `backend/app/db/migrations/versions/` (create new migration file)

---

## What You Are Building

You are building the data layer for authentication. This means:

- The `users` table stores all user accounts with hashed passwords
- The `sessions` table stores refresh token hashes for each login
- The repositories provide clean async methods that the service layer calls
- An Alembic migration creates these tables in the Neon database

The repository pattern means that all SQL is isolated here. The service layer never writes raw queries — it just calls methods like `user_repo.get_by_email(email)`.

---

## Windsurf Prompt

```
I am building the database layer for a FastAPI authentication system for a project called MAP.

My project uses SQLAlchemy 2.0 with async sessions and PostgreSQL (hosted on Neon).

1. Complete backend/app/db/models/user.py
The User and Session models are already defined with columns. Add the following:
- Add ForeignKey to Session.user_id: ForeignKey("users.id", ondelete="CASCADE")
- Add relationship to User: sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
- Add back_populates to Session: user = relationship("User", back_populates="sessions")
- Add __repr__ methods to both classes if not already there
- Make sure all imports are correct

2. Complete backend/app/db/repositories/user_repo.py
Implement ALL methods in UserRepository and SessionRepository using SQLAlchemy 2.0 async style.

UserRepository methods:
- create(email, username, password_hash) -> User
  Create User ORM object, add to session, flush, refresh, return
- get_by_id(user_id: uuid.UUID) -> User | None
  Use select(User).where(User.id == user_id), return scalar_one_or_none()
- get_by_email(email: str) -> User | None
  Use select(User).where(User.email == email), return scalar_one_or_none()
- update_last_login(user_id: uuid.UUID) -> None
  Use update(User).where(User.id == user_id).values(last_login_at=datetime.utcnow())
- deactivate(user_id: uuid.UUID) -> None
  Use update(User).where().values(is_active=False)
- list_all(page, page_size) -> tuple[list[User], int]
  Use select(User).offset((page-1)*page_size).limit(page_size) for items
  Use select(func.count(User.id)) for total count
  Return (list_of_users, total_count)

SessionRepository methods:
- create(user_id, refresh_token_hash, access_jti, expires_at, ip_address, user_agent) -> Session
  Create Session ORM object, add, flush, refresh, return
- get_active_by_user(user_id: uuid.UUID) -> Session | None
  Select session where user_id matches AND revoked_at IS NULL AND expires_at > now()
- revoke(session_id: uuid.UUID) -> None
  Update session set revoked_at = datetime.utcnow() where id = session_id
- revoke_all_for_user(user_id: uuid.UUID) -> None
  Update all sessions for user set revoked_at = now() where revoked_at is null

3. Create an Alembic migration
Run this command in the backend folder (with venv activated):
alembic revision --autogenerate -m "create_users_and_sessions"

Then edit the generated file in app/db/migrations/versions/ to ensure it creates:
- users table with all columns from the model
- sessions table with all columns and foreign key to users
- indexes: idx_users_email, idx_users_username, idx_sessions_user_id

4. Run the migration:
alembic upgrade head

All imports should use:
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone
Use await self.db.execute() for all queries.
Use await self.db.flush() after adding objects.
Use await self.db.refresh(obj) before returning objects.
```

---

## How It Should Be Done

### Why Repository Pattern

The repository pattern means the rest of the application never writes SQL. This has big advantages:

- If you switch from PostgreSQL to MySQL, you only change the repository files
- You can test service logic by providing a fake repository that returns mock data
- SQL bugs are always in one place and easy to find

Every method in the repository follows the same pattern:

```python
async def get_by_email(self, email: str) -> User | None:
    result = await self.db.execute(
        select(User).where(User.email == email)
    )
    return result.scalar_one_or_none()
```

### SQLAlchemy 2.0 Async Style

The key difference from older SQLAlchemy is that every database operation needs `await`:

```python
# Adding a new record
self.db.add(new_user)
await self.db.flush()      # sends INSERT to DB without committing
await self.db.refresh(new_user)  # reloads the record including server defaults
return new_user
```

The `get_db` dependency in `db/base.py` handles the commit and rollback automatically, so you never call `commit()` in a repository.

### Alembic Migration

When you run `alembic revision --autogenerate`, Alembic compares your SQLAlchemy models to the current database state and generates a migration file. The file will be in `app/db/migrations/versions/` with a name like `abc123_create_users_and_sessions.py`.

After running `alembic upgrade head`, go to the Neon dashboard and verify the tables exist.

---

## Acceptance Criteria

- [ ] `alembic upgrade head` runs without errors
- [ ] `users` and `sessions` tables visible in Neon dashboard with all columns
- [ ] All `UserRepository` methods implemented (no `NotImplementedError` remaining)
- [ ] All `SessionRepository` methods implemented
- [ ] `User.sessions` relationship works (can access `user.sessions`)
- [ ] `Session.user` relationship works (can access `session.user`)
- [ ] All methods use `await` correctly — no sync database calls
