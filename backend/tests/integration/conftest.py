import os
import subprocess
import sys
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from httpx import AsyncClient, ASGITransport

from app.config import settings
from app.main import app
from app.dependencies import get_db
from app.db.base import Base
from app.core.redis import override_redis_client

# Define absolute path for the test database
DB_PATH = os.path.abspath(os.path.join(os.getcwd(), "test_integration.db"))
TEST_DB_URL = f"sqlite+aiosqlite:///{DB_PATH}"

# Set environment variable early for all imports to pick it up
os.environ["DATABASE_URL"] = TEST_DB_URL

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    # Final check: settings.DATABASE_URL should match TEST_DB_URL
    settings.DATABASE_URL = TEST_DB_URL
    
    if os.path.exists(DB_PATH):
        try:
            os.remove(DB_PATH)
        except PermissionError:
            pass
            
    # Run alembic upgrade head once to ensure migrations are compatible and applied
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        env={**os.environ, "PYTHONPATH": "."},
        cwd="backend",
        check=True
    )
    
    yield TEST_DB_URL
    
    # Cleanup after session
    try:
        if os.path.exists(DB_PATH):
            os.remove(DB_PATH)
    except PermissionError:
        pass

@pytest.fixture(scope="session")
def test_db_url(setup_database):
    return setup_database

@pytest_asyncio.fixture(scope="session")
async def engine(test_db_url, setup_database):
    engine = create_async_engine(
        test_db_url, 
        echo=False, 
        poolclass=StaticPool,
        connect_args={"check_same_thread": False}
    )
    
    yield engine
    await engine.dispose()

@pytest.fixture
async def db_session(engine):
    async with engine.connect() as conn:
        trans = await conn.begin()
        async_session = AsyncSession(bind=conn, expire_on_commit=False)
        yield async_session
        await trans.rollback()

@pytest_asyncio.fixture(scope="function")
async def client(db_session):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    
    # Use the shared MockRedis from utils
    from tests.utils import MockRedis
    mock_redis = MockRedis()
    override_redis_client(mock_redis)
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
        
    app.dependency_overrides.clear()
    override_redis_client(None)

@pytest_asyncio.fixture(scope="function")
async def create_test_user(client, test_user_data: dict):
    """registers a user via API, logs in, returns auth headers dict"""
    await client.post("/api/v1/auth/register", json=test_user_data)
    response = await client.post("/api/v1/auth/login", json={
        "email": test_user_data["email"],
        "password": test_user_data["password"]
    })
    access_token = response.json()["access_token"]
    return {"Authorization": f"Bearer {access_token}"}

@pytest_asyncio.fixture(scope="function")
async def auth_headers(create_test_user):
    return create_test_user

@pytest.fixture
async def test_user(db_session):
    """Create a test user and return their UUID as string."""
    from app.db.models import User
    user = User(
        email="test@map.com",
        username="testuser",
        password_hash="hashed123"
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user.id
