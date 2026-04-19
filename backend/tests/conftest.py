import os
import pytest
from app.core.redis import set_test_mode

# Set dummy OpenAI key for tests
os.environ["OPENAI_API_KEY"] = "sk-mock-key-for-tests-12345"

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

@pytest.fixture
def test_user_data():
    return {
        "email": "test@map.com",
        "username": "testuser",
        "password": "testpassword123"
    }
