import redis.asyncio as aioredis
from app.config import settings

_redis_client = None

def build_redis_client(**overrides):
    """Create a Redis client from settings.REDIS_URL (decode_responses, Upstash-friendly TLS).

    Used by init_redis() for the API process and directly by Celery workers, which run each
    task in its own event loop and so can't share the API's long-lived client.
    """
    if not settings.REDIS_URL:
        raise RuntimeError("REDIS_URL is not set in settings. Cannot initialise Redis.")
    # Connect to the Upstash URL from settings with SSL cert reqs set to "none"
    # and decode responses as UTF-8.
    #
    # ssl_cert_reqs MUST be a string ("none"/"optional"/"required"), not the
    # ssl module's enum (ssl.CERT_NONE etc). redis-py's RedisSSLContext only
    # handles cert_reqs is None or isinstance(cert_reqs, str) - anything else
    # (including the enum) falls through both branches and self.cert_reqs is
    # never set at all, raising AttributeError the first time it's read:
    # 'RedisSSLContext' object has no attribute 'cert_reqs'. Confirmed by
    # reproducing directly against the pinned redis==5.0.8.
    kwargs = {"decode_responses": True}
    if settings.REDIS_URL.startswith("rediss://"):
        kwargs["ssl_cert_reqs"] = "none"
    kwargs.update(overrides)
    return aioredis.from_url(settings.REDIS_URL, **kwargs)


async def init_redis():
    """Call once from lifespan before yielding."""
    global _redis_client
    _redis_client = build_redis_client()

async def get_redis():
    if _redis_client is None:
        raise RuntimeError("Redis not initialised. Call init_redis() in lifespan.")
    return _redis_client

async def close_redis():
    global _redis_client
    if _redis_client is not None:
        await _redis_client.aclose()
        _redis_client = None
