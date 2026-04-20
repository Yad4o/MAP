import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.dependencies import get_db
from app.core.redis import override_redis_client

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
