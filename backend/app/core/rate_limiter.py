import time
from fastapi import Request, HTTPException, Depends
from app.config import settings
from app.core.redis_client import get_redis

async def rate_limited(request: Request, current_user=Depends("app.dependencies.get_current_user")):
    # Wait, need to avoid circular dependencies for get_current_user if imported top-level
    pass

# Actually I'd better do standard import but be careful of circular dependencies:
from app.dependencies import get_current_user
from app.db.models.user import User

async def rate_limiter(request: Request, current_user: User = Depends(get_current_user)):
    redis = await get_redis()
    current_minute = int(time.time() // 60)
    key = f"rate_limit:{current_user.id}:{current_minute}"
    
    tier = str(current_user.tier).upper() if current_user.tier else "FREE"
    
    if tier == "ENTERPRISE":
        limit = settings.RATE_LIMIT_ENTERPRISE_RPM
    elif tier == "PRO":
        limit = settings.RATE_LIMIT_PRO_RPM
    else:
        limit = settings.RATE_LIMIT_FREE_RPM
        
    requests = await redis.incr(key)
    if requests == 1:
        await redis.expire(key, 120)
        
    if requests > limit:
        raise HTTPException(
            status_code=429, 
            detail="Rate limit exceeded", 
            headers={"Retry-After": "60"}
        )
        
    return True
