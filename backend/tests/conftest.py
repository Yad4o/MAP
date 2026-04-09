import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from httpx import AsyncClient

from app.main import app
from app.dependencies import get_db
from app.db.base import Base
from app.core.redis import override_redis_client, set_test_mode

class MockRedis:
    def __init__(self):
        self.data = {}
    async def setex(self, key, time, value):
        self.data[key] = value
    async def set(self, key, value, ex=None):
        self.data[key] = value
    async def exists(self, key):
        return key in self.data
    async def close(self):
        pass  # no-op; mock has no connection to close

@pytest.fixture(scope="session", autouse=True)
def setup_test_mode():
    set_test_mode(True)

# ---------------------------------------------------------------------------
# 1. Test database URL — SQLite so no real Neon DB is needed during tests
# ---------------------------------------------------------------------------
@pytest.fixture
def test_db_url():
    return "sqlite+aiosqlite:///:memory:"


# ---------------------------------------------------------------------------
# 2. Engine — creates all tables before each test, drops them after
#    Scoped to "function" so every test gets a completely clean database
# ---------------------------------------------------------------------------
@pytest.fixture
async def engine(test_db_url):
    # Important: import models here or anywhere before create_all
    from app.db.models.user import User
    from app.db.models.task import Task, TaskStep
    
    engine = create_async_engine(
        test_db_url, 
        echo=False, 
        poolclass=StaticPool,
        connect_args={"check_same_thread": False}
    )
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
@pytest_asyncio.fixture(scope="function")  # must stay function-scoped — MockRedis is stateful
async def client(db_session):
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    
    mock_redis = MockRedis()
    override_redis_client(mock_redis)
    
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
        
    app.dependency_overrides.clear()
    override_redis_client(None)


# ---------------------------------------------------------------------------
# 5. auth_headers — registers and logs in a test user, returns Bearer token
#    Use this fixture in any test that requires authentication
# ---------------------------------------------------------------------------
@pytest_asyncio.fixture(scope="function")
async def auth_headers(client, test_user_data: dict):
    await client.post("/api/v1/auth/register", json=test_user_data)
    response = await client.post("/api/v1/auth/login", json={
        "email": test_user_data["email"],
        "password": test_user_data["password"]
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


# ---------------------------------------------------------------------------
# 7. test_user — creates and returns a test user UUID
#    Use this fixture in any test that needs a user ID
# ---------------------------------------------------------------------------
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

