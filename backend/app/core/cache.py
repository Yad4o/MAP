from typing import Any, Optional
from app.core.redis_client import get_redis

async def cache_set(key: str, value: Any, expire_seconds: Optional[int] = None) -> None:
    redis = await get_redis()
    if expire_seconds:
        await redis.set(key, value, ex=expire_seconds)
    else:
        await redis.set(key, value)
        
async def cache_get(key: str) -> Optional[str]:
    redis = await get_redis()
    return await redis.get(key)
    
async def cache_delete(key: str) -> None:
    redis = await get_redis()
    await redis.delete(key)
    
async def add_to_revoked_tokens(jti: str, expire_seconds: int) -> None:
    redis = await get_redis()
    await redis.set(f"revoked:{jti}", "1", ex=expire_seconds)
    
async def is_token_revoked(jti: str) -> bool:
    redis = await get_redis()
    exists = await redis.exists(f"revoked:{jti}")
    return exists > 0
