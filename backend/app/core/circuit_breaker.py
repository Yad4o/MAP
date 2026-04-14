import time
from typing import Optional, ClassVar
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
    STATE_CLOSED: ClassVar[str] = "CLOSED"
    STATE_OPEN: ClassVar[str] = "OPEN"
    STATE_HALF_OPEN: ClassVar[str] = "HALF_OPEN"
    
    FAILURE_THRESHOLD: ClassVar[int] = 3
    RECOVERY_TIMEOUT: ClassVar[int] = 120  # seconds before transitioning from OPEN to HALF_OPEN
    OPEN_STATE_TTL: ClassVar[int] = 600    # seconds before the OPEN state key expires in Redis
    
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
        
        # Ensure state is a string for comparison
        if isinstance(state, bytes):
            state = state.decode("utf-8")
        
        if state == self.STATE_OPEN:
            last_failure = await self.redis.get(self.last_failure_key)
            if last_failure:
                # Ensure last_failure is a string for conversion to float
                if isinstance(last_failure, bytes):
                    last_failure = last_failure.decode("utf-8")
                    
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
        Resets the failure counter on any success.
        If the state is OPEN or HALF_OPEN, also resets the circuit to CLOSED.
        """
        state = await self.get_state()
        async with self.redis.pipeline(transaction=True) as pipe:
            if state in [self.STATE_OPEN, self.STATE_HALF_OPEN]:
                pipe.set(self.state_key, self.STATE_CLOSED)
            
            # Always reset failure counter on any success
            pipe.delete(self.failures_key)
            pipe.delete(self.last_failure_key)
            await pipe.execute()

    async def record_failure(self) -> None:
        """
        Increments the failure counter.
        If failures reached the threshold, sets the state to OPEN with a 600s TTL.
        """
        now = time.time()
        async with self.redis.pipeline(transaction=True) as pipe:
            pipe.incr(self.failures_key)
            pipe.set(self.last_failure_key, str(now))
            results = await pipe.execute()
        
        failures = results[0]
        
        # Set TTL on first increment so the failure counter auto-expires if threshold not met
        if failures == 1:
            await self.redis.expire(self.failures_key, self.OPEN_STATE_TTL)
            
        if failures >= self.FAILURE_THRESHOLD:
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
    try:
        redis = await get_redis()
    except Exception as exc:
        raise RuntimeError(f"CircuitBreaker: failed to acquire Redis for '{provider}'") from exc
    return CircuitBreaker(provider, redis)
