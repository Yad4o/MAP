"""
db/base.py
──────────
SQLAlchemy async engine, session factory, and base model class.
Everything in db/models/ imports DeclarativeBase from here.

Phase 0: File exists but engine is not started yet.
Phase 1: Uncomment get_db and wire it into FastAPI dependencies.
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import JSONB, INET
from sqlalchemy import JSON
from sqlalchemy.sql import functions

@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"

@compiles(INET, "sqlite")
def compile_inet_sqlite(type_, compiler, **kw):
    return "TEXT"

@compiles(functions.now, "sqlite")
def compile_now_sqlite(element, compiler, **kw):
    return "CURRENT_TIMESTAMP"

# ── Engine ────────────────────────────────────────────────────
# Created once at module load. Shared across all requests.

# Determine if we're using SQLite for testing
is_sqlite = settings.DATABASE_URL.startswith("sqlite+aiosqlite://")

engine_kwargs = {
    "echo": settings.DEBUG,
    "future": True,
}

# Only add pool settings for non-SQLite databases
if not is_sqlite:
    engine_kwargs.update({
        "pool_size": settings.DB_POOL_SIZE,
        "max_overflow": settings.DB_MAX_OVERFLOW,
    })

engine = create_async_engine(settings.DATABASE_URL, **engine_kwargs)

# ── Session Factory ───────────────────────────────────────────
# Use this to create sessions. Never instantiate AsyncSession directly.

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# ── Base Model ────────────────────────────────────────────────
# All ORM models inherit from this.

class Base(DeclarativeBase):
    pass


# ── FastAPI Dependency ────────────────────────────────────────
# Yields a DB session for each request, closes it after.
# Usage in routes:
#   async def my_route(db: AsyncSession = Depends(get_db)):

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
