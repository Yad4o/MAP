import time
from fastapi import HTTPException, Depends
from app.config import settings
from app.core.redis_client import get_redis

from app.db.models.user import User

async def rate_limiter(current_user: User):
    redis = await get_redis()
    current_minute = int(time.time() // 60)
    key = f"rate_limit:{current_user.id}:{current_minute}"
    
    tier = current_user.tier.value.upper() if hasattr(current_user.tier, "value") else str(current_user.tier).upper()
    
    if tier == "ENTERPRISE":
        limit = settings.RATE_LIMIT_ENTERPRISE_RPM
    elif tier == "PRO":
        limit = settings.RATE_LIMIT_PRO_RPM
    else:
        limit = settings.RATE_LIMIT_FREE_RPM
        
    lua = """
    local current = redis.call('INCR', KEYS[1])
    if current == 1 then
        redis.call('EXPIRE', KEYS[1], 65)
    end
    return current
    """
    requests = await redis.eval(lua, 1, key)
        
    if requests > limit:
        raise HTTPException(
            status_code=429, 
            detail="Rate limit exceeded", 
            headers={"Retry-After": "60"}
        )
        
    return True
