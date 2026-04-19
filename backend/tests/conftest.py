import os
import subprocess
import sys
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings
from app.db.base import Base
from app.core.redis import set_test_mode

# Define absolute paths relative to the backend directory
BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DB_PATH = os.path.join(BACKEND_DIR, "test_integration.db")
TEST_DB_URL = f"sqlite+aiosqlite:///{DB_PATH}"

# Set environment variable early for all imports to pick it up
os.environ["DATABASE_URL"] = TEST_DB_URL
# Set dummy OpenAI key for tests
os.environ["OPENAI_API_KEY"] = "sk-mock-key-for-tests-12345"

@pytest.fixture(scope="session", autouse=True)
def setup_test_mode():
    set_test_mode(True)

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
    async with engine.connect() as conn:
        session = AsyncSession(bind=conn, expire_on_commit=False)
        yield session
        await conn.rollback()

@pytest_asyncio.fixture(scope="function", loop_scope="session")
async def test_user(db_session):
    """Create a test user and return their UUID."""
    from app.db.models.user import User
    import uuid
    user = User(
        email=f"test_{uuid.uuid4().hex[:8]}@map.com",
        username=f"testuser_{uuid.uuid4().hex[:8]}",
        password_hash="hashed123"
    )
    db_session.add(user)
    await db_session.flush()
    await db_session.refresh(user)
    return user.id

@pytest.fixture
def test_user_data():
    return {
        "email": "test@map.com",
        "username": "testuser",
        "password": "testpassword123"
    }
