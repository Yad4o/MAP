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

# ── Engine ────────────────────────────────────────────────────
# Created once at module load. Shared across all requests.

engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    echo=settings.DEBUG,           # logs all SQL in development
    future=True,
)

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
