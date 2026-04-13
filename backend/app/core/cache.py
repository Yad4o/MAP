from typing import Any, Optional
import json
from app.core.redis_client import get_redis

async def cache_set(key: str, value: Any, expire_seconds: Optional[int] = None) -> None:
    redis = await get_redis()
    serialised = json.dumps(value) if not isinstance(value, (str, bytes, int, float)) else value
    if expire_seconds is not None:
        await redis.set(key, serialised, ex=expire_seconds)
    else:
        await redis.set(key, serialised)
        
async def cache_get(key: str) -> Optional[Any]:
    redis = await get_redis()
    value = await redis.get(key)
    if value is None:
        return None
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return value
    
async def cache_delete(key: str) -> None:
    redis = await get_redis()
    await redis.delete(key)
    
async def add_to_revoked_tokens(jti: str, expire_seconds: int) -> None:
    redis = await get_redis()
    await redis.set(f"revoked:{jti}", "revoked", ex=expire_seconds)
    
async def is_token_revoked(jti: str) -> bool:
    redis = await get_redis()
    return await redis.exists(f"revoked:{jti}") > 0
