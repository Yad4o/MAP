import pytest
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from httpx import AsyncClient

from app.db.base import Base
from app.main import app
from app.dependencies import get_db


# ---------------------------------------------------------------------------
# 1. Test database URL — SQLite so no real Neon DB is needed during tests
# ---------------------------------------------------------------------------
@pytest.fixture
def test_db_url():
    return "sqlite+aiosqlite:///./test.db"


# ---------------------------------------------------------------------------
# 2. Engine — creates all tables before each test, drops them after
#    Scoped to "function" so every test gets a completely clean database
# ---------------------------------------------------------------------------
@pytest.fixture
async def engine(test_db_url):
    engine = create_async_engine(test_db_url, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


# ---------------------------------------------------------------------------
# 3. db_session — provides a real AsyncSession backed by the test engine
#    Rolls back after each test so no data leaks between tests
# ---------------------------------------------------------------------------
@pytest.fixture
async def db_session(engine):
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session
        await session.rollback()


# ---------------------------------------------------------------------------
# 4. client — AsyncClient with get_db overridden to use the test db_session
#    Use this fixture in any test that calls an API endpoint
# ---------------------------------------------------------------------------
@pytest.fixture
async def client(db_session):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# 5. auth_headers — registers and logs in a test user, returns Bearer token
#    Use this fixture in any test that requires authentication
# ---------------------------------------------------------------------------
@pytest.fixture
async def auth_headers(client):
    await client.post("/api/v1/auth/register", json={
        "email": "test@map.com",
        "username": "testuser",
        "password": "testpassword123"
    })
    response = await client.post("/api/v1/auth/login", json={
        "email": "test@map.com",
        "password": "testpassword123"
    })
    access_token = response.json()["access_token"]
    return {"Authorization": f"Bearer {access_token}"}


# ---------------------------------------------------------------------------
# 6. test_user_data — returns the test user's credentials as a plain dict
#    Use when a test needs to know what the test user's details are
# ---------------------------------------------------------------------------
@pytest.fixture
def test_user_data():
    return {
        "email": "test@map.com",
        "username": "testuser",
        "password": "testpassword123"
    }
    