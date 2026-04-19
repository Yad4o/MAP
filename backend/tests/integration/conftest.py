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

# Define absolute paths relative to the backend directory
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DB_PATH = os.path.join(BACKEND_DIR, "test_integration.db")
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
            
    # Run alembic upgrade head using BACKEND_DIR as both cwd and PYTHONPATH
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        env={**os.environ, "PYTHONPATH": BACKEND_DIR},
        cwd=BACKEND_DIR,
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

@pytest_asyncio.fixture(scope="session", loop_scope="session")
async def engine(test_db_url, setup_database):
    engine = create_async_engine(
        test_db_url, 
        echo=False, 
        poolclass=StaticPool,
        connect_args={"check_same_thread": False}
    )
    
    yield engine
    await engine.dispose()

@pytest_asyncio.fixture(scope="function", loop_scope="session")
async def db_session(engine):
    # Use engine.connect() (not engine.begin()) so we own the full transaction
    # lifecycle. engine.begin() auto-commits on clean exit, which conflicts with
    # our explicit rollback and raises PendingRollbackError / InvalidRequestError
    # on every test's teardown.
    async with engine.connect() as conn:
        await conn.begin()
        session = AsyncSession(bind=conn, expire_on_commit=False)
        yield session
        # Roll back all DB changes made during the test — leaves DB clean for next test.
        await conn.rollback()
    # engine.connect().__aexit__ closes the connection cleanly after rollback.

@pytest_asyncio.fixture(scope="function", loop_scope="session")
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

@pytest_asyncio.fixture(scope="function", loop_scope="session")
async def create_test_user(client, test_user_data: dict):
    """registers a user via API, logs in, returns auth headers dict"""
    await client.post("/api/v1/auth/register", json=test_user_data)
    response = await client.post("/api/v1/auth/login", json={
        "email": test_user_data["email"],
        "password": test_user_data["password"]
    })
    access_token = response.json()["access_token"]
    return {"Authorization": f"Bearer {access_token}"}

@pytest_asyncio.fixture(scope="function", loop_scope="session")
async def auth_headers(create_test_user):
    return create_test_user

@pytest_asyncio.fixture(scope="function", loop_scope="session")
async def test_user(db_session):
    """Create a test user and return their UUID as string."""
    from app.db.models import User
    user = User(
        email="test@map.com",
        username="testuser",
        password_hash="hashed123"
    )
    db_session.add(user)
    # flush() sends the INSERT to the DB engine so the row gets a PK and is
    # visible within this session — but does NOT commit the connection-level
    # transaction. The rollback in db_session.__aexit__ will still erase this
    # row after the test, preserving full isolation.
    # commit() here would punch through the rollback boundary and permanently
    # write to the SQLite file before the fixture teardown could clean up.
    await db_session.flush()
    await db_session.refresh(user)
    return user.id
