import asyncio
import ssl
import redis.asyncio as aioredis
from app.config import settings

_redis_client = None
_redis_lock: asyncio.Lock | None = None

async def get_redis():
    global _redis_client, _redis_lock
    if _redis_lock is None:
        _redis_lock = asyncio.Lock()
    if _redis_client is None:
        async with _redis_lock:
            if _redis_client is None:
                # Connect to the Upstash URL from settings with SSL cert reqs set to None and decode responses as UTF-8
                _redis_client = aioredis.from_url(
                    settings.REDIS_URL,
                    ssl_cert_reqs=ssl.CERT_NONE,
                    decode_responses=True
                )
    return _redis_client

async def close_redis():
    global _redis_client, _redis_lock
    if _redis_lock is None:
        return
    async with _redis_lock:
        if _redis_client is not None:
            await _redis_client.aclose()
            _redis_client = None
