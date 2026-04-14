import time
from typing import Optional
import redis.asyncio as aioredis
from app.core.redis_client import get_redis

class CircuitBreaker:
    """
    Circuit Breaker implementation with 3 states: CLOSED, OPEN, HALF_OPEN.
    
    States:
    - CLOSED: Normal operation, requests are allowed.
    - OPEN: Failures exceeded threshold, requests are blocked for a recovery period.
    - HALF_OPEN: Recovery period passed, testing if the provider is back online.
    """
    STATE_CLOSED = "CLOSED"
    STATE_OPEN = "OPEN"
    STATE_HALF_OPEN = "HALF_OPEN"
    
    FAILURE_THRESHOLD = 3
    RECOVERY_TIMEOUT = 120  # seconds before transitioning from OPEN to HALF_OPEN
    OPEN_STATE_TTL = 600    # seconds before the OPEN state key expires in Redis
    
    def __init__(self, provider: str, redis_client: aioredis.Redis):
        self.provider = provider
        self.redis = redis_client
        self.state_key = f"circuit:{provider}:state"
        self.failures_key = f"circuit:{provider}:failures"
        self.last_failure_key = f"circuit:{provider}:last_failure"

    async def get_state(self) -> str:
        """
        Reads state from Redis.
        If the state is OPEN and the recovery_timeout has passed, switches to HALF_OPEN.
        """
        state = await self.redis.get(self.state_key)
        if not state:
            return self.STATE_CLOSED
        
        if state == self.STATE_OPEN:
            last_failure = await self.redis.get(self.last_failure_key)
            if last_failure:
                try:
                    last_failure_time = float(last_failure)
                    if time.time() - last_failure_time > self.RECOVERY_TIMEOUT:
                        # Transition to HALF_OPEN state
                        await self.redis.set(self.state_key, self.STATE_HALF_OPEN)
                        return self.STATE_HALF_OPEN
                except (ValueError, TypeError):
                    # If the timestamp is corrupted, we treat it as still OPEN or rely on TTL
                    pass
        
        return state

    async def record_success(self) -> None:
        """
        If the state is OPEN or HALF_OPEN, resets the circuit to CLOSED and deletes the failure counter.
        """
        state = await self.get_state()
        if state in [self.STATE_OPEN, self.STATE_HALF_OPEN]:
            await self.redis.set(self.state_key, self.STATE_CLOSED)
            await self.redis.delete(self.failures_key)
            await self.redis.delete(self.last_failure_key)

    async def record_failure(self) -> None:
        """
        Increments the failure counter.
        If failures reached the threshold, sets the state to OPEN with a 600s TTL.
        """
        failures = await self.redis.incr(self.failures_key)
        now = time.time()
        await self.redis.set(self.last_failure_key, str(now))
        
        if int(failures) >= self.FAILURE_THRESHOLD:
            await self.redis.set(self.state_key, self.STATE_OPEN, ex=self.OPEN_STATE_TTL)

    async def is_available(self) -> bool:
        """
        Returns True if the circuit is in CLOSED or HALF_OPEN state.
        """
        state = await self.get_state()
        return state in [self.STATE_CLOSED, self.STATE_HALF_OPEN]

    async def reset(self) -> None:
        """
        Deletes all Redis keys associated with this provider's circuit breaker.
        """
        await self.redis.delete(self.state_key, self.failures_key, self.last_failure_key)

async def get_circuit_breaker(provider: str) -> CircuitBreaker:
    """
    Factory function to create or get a CircuitBreaker instance for a specific provider.
    """
    redis = await get_redis()
    return CircuitBreaker(provider, redis)
