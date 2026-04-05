import redis.asyncio as aioredis
from app.config import settings

_redis_client = None

async def get_redis() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(settings.REDIS_URL, ssl_cert_reqs=None)
    return _redis_client
