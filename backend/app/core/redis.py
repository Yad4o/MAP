import redis.asyncio as aioredis
from app.config import settings

_redis_client = None
_TEST_MODE = False

def set_test_mode(enabled: bool) -> None:
    global _TEST_MODE
    _TEST_MODE = enabled

async def get_redis() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None and not _TEST_MODE:
        _redis_client = aioredis.from_url(settings.REDIS_URL, ssl_cert_reqs=None)
    return _redis_client


async def close_redis() -> None:
    global _redis_client
    if _redis_client is not None:
        await _redis_client.aclose()
        _redis_client = None


def override_redis_client(client) -> None:
    """For use in tests only."""
    global _redis_client
    _redis_client = client

