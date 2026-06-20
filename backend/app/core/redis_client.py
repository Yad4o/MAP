import ssl
import redis.asyncio as aioredis
from app.config import settings

_redis_client = None

async def init_redis():
    """Call once from lifespan before yielding."""
    global _redis_client
    if not settings.REDIS_URL:
        raise RuntimeError("REDIS_URL is not set in settings. Cannot initialise Redis.")
    # Connect to the Upstash URL from settings with SSL cert reqs set to None and decode responses as UTF-8
    # We use ssl.CERT_NONE for ssl_cert_reqs per redis-py API
    kwargs = {"decode_responses": True}
    if settings.REDIS_URL.startswith("rediss://"):
        kwargs["ssl_cert_reqs"] = ssl.CERT_NONE

    _redis_client = aioredis.from_url(
        settings.REDIS_URL,
        **kwargs
    )

async def get_redis():
    if _redis_client is None:
        raise RuntimeError("Redis not initialised. Call init_redis() in lifespan.")
    return _redis_client

async def close_redis():
    global _redis_client
    if _redis_client is not None:
        await _redis_client.aclose()
        _redis_client = None
