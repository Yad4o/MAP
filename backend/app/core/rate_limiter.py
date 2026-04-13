import time
import textwrap
from fastapi import HTTPException, Depends
from app.config import settings
from app.core.redis_client import get_redis

from app.dependencies import get_current_user
from app.db.models.user import User

async def rate_limiter(current_user: User = Depends(get_current_user)):
    redis = await get_redis()
    # Note: bucket is wall-clock minute; minor over-counting possible across NTP corrections
    current_minute = int(time.time() // 60)
    key = f"rate_limit:{current_user.id}:{current_minute}"
    
    tier = current_user.tier.value.upper() if hasattr(current_user.tier, "value") else str(current_user.tier).upper()
    
    if tier == "ENTERPRISE":
        limit = settings.RATE_LIMIT_ENTERPRISE_RPM
    elif tier == "PRO":
        limit = settings.RATE_LIMIT_PRO_RPM
    else:
        limit = settings.RATE_LIMIT_FREE_RPM
        
    lua = textwrap.dedent("""
        local current = redis.call('INCR', KEYS[1])
        if current == 1 then
            -- TTL is 120s (2x the window) so the key survives the full minute
            redis.call('EXPIRE', KEYS[1], 120)
        end
        return current
    """).strip()
    requests = await redis.eval(lua, 1, key)
        
    if requests > limit:
        raise HTTPException(
            status_code=429, 
            detail="Rate limit exceeded", 
            headers={"Retry-After": "60"}
        )
        
    return True
