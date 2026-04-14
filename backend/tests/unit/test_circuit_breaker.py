import pytest
import time
from unittest.mock import AsyncMock, MagicMock, patch
from app.core.circuit_breaker import CircuitBreaker

@pytest.fixture
def mock_redis():
    redis = AsyncMock()
    # storage for mock redis data
    data = {}
    
    async def mock_get(key):
        val = data.get(key)
        if val is None:
            return None
        if isinstance(val, bytes):
            return val
        return str(val).encode("utf-8")
    
    async def mock_set(key, value, ex=None):
        data[key] = value
        return True
    
    async def mock_delete(*keys):
        deleted = 0
        for k in keys:
            if k in data:
                del data[k]
                deleted += 1
        return deleted
    
    async def mock_exists(key):
        return key in data

    async def mock_eval(script, num_keys, *args):
        # Very basic simulation of the record_success script
        if "-- record_success" in script:
            state_key = args[0]
            failures_key = args[1]
            last_failure_key = args[2]
            data[state_key] = "CLOSED"
            if failures_key in data: del data[failures_key]
            if last_failure_key in data: del data[last_failure_key]
        return 1

    redis.get.side_effect = mock_get
    redis.set.side_effect = mock_set
    redis.delete.side_effect = mock_delete
    redis.exists.side_effect = mock_exists
    redis.eval.side_effect = mock_eval
    
    # Mock pipeline
    class MockPipeline:
        def __init__(self, transaction=True):
            self.cmds = []
            self.cmds_log = []
            self.transaction = transaction
            
        def set(self, key, val, ex=None):
            self.cmds.append(("set", key, val, ex))
            return self
            
        def delete(self, *keys):
            self.cmds.append(("delete", keys))
            return self
            
        def incr(self, key):
            self.cmds.append(("incr", key))
            return self
            
        def expire(self, key, ttl):
            self.cmds.append(("expire", key, ttl))
            return self
            
        async def execute(self):
            self.cmds_log.extend(self.cmds)
            results = []
            for cmd in self.cmds:
                if cmd[0] == "set":
                    data[cmd[1]] = cmd[2]
                    results.append(True)
                elif cmd[0] == "delete":
                    deleted = 0
                    for k in cmd[1]:
                        if k in data:
                            del data[k]
                            deleted += 1
                    results.append(deleted)
                elif cmd[0] == "incr":
                    val = int(data.get(cmd[1], 0)) + 1
                    data[cmd[1]] = str(val)
                    results.append(val)
                elif cmd[0] == "expire":
                    results.append(True)
            self.cmds = [] # Clear for next use
            return results
            
        async def __aenter__(self):
            return self
            
        async def __aexit__(self, exc_type, exc_val, exc_tb):
            pass

    # pipeline() is a sync call in redis-py
    created_pipelines = []
    def get_pipeline(transaction=True):
        p = MockPipeline(transaction=transaction)
        created_pipelines.append(p)
        return p
    redis.pipeline = MagicMock(side_effect=get_pipeline)
    return redis, data, created_pipelines

@pytest.mark.asyncio
async def test_circuit_breaker_initial_state(mock_redis):
    redis, _, _ = mock_redis
    cb = CircuitBreaker("test", redis)
    assert await cb.get_state() == "CLOSED"
    assert await cb.is_available() is True

@pytest.mark.asyncio
async def test_circuit_breaker_transitions_to_open(mock_redis):
    redis, _, _ = mock_redis
    cb = CircuitBreaker("test", redis)
    
    # Record failures
    await cb.record_failure()
    await cb.record_failure()
    await cb.record_failure()
    
    assert await cb.get_state() == "OPEN"
    assert await cb.is_available() is False

@pytest.mark.asyncio
async def test_circuit_breaker_half_open_recovery(mock_redis):
    redis, data, _ = mock_redis
    cb = CircuitBreaker("test", redis)
    
    # Force OPEN
    data[cb.state_key] = "OPEN"
    # Set last failure to 130s ago
    data[cb.last_failure_key] = str(time.time() - 130)
    
    assert await cb.get_state() == "HALF_OPEN"
    assert await cb.is_available() is True
    # Verify state was updated in Redis
    assert data[cb.state_key] == "HALF_OPEN"

@pytest.mark.asyncio
async def test_circuit_breaker_success_resets_counters(mock_redis):
    redis, data, _ = mock_redis
    cb = CircuitBreaker("test", redis)
    
    # Record some failures but not enough to trip
    await cb.record_failure()
    await cb.record_failure()
    assert data[cb.failures_key] == "2"
    
    # Record success
    await cb.record_success()
    assert cb.failures_key not in data
    assert cb.last_failure_key not in data
    assert await cb.get_state() == "CLOSED"

@pytest.mark.asyncio
async def test_circuit_breaker_success_in_open_resets(mock_redis):
    redis, data, _ = mock_redis
    cb = CircuitBreaker("test", redis)
    
    data[cb.state_key] = "OPEN"
    await cb.record_success()
    assert data[cb.state_key] == "CLOSED"

@pytest.mark.asyncio
async def test_circuit_breaker_reset_clears_all(mock_redis):
    redis, data, _ = mock_redis
    cb = CircuitBreaker("test", redis)
    
    await cb.record_failure()
    await cb.reset()
    assert len(data) == 0

@pytest.mark.asyncio
async def test_circuit_breaker_decodes_bytes(mock_redis):
    redis, data, _ = mock_redis
    cb = CircuitBreaker("test", redis)
    
    # Simulate Redis returning bytes
    data[cb.state_key] = b"OPEN"
    data[cb.last_failure_key] = str(time.time() - 130).encode("utf-8")
    
    # Should decode and transition
    assert await cb.get_state() == "HALF_OPEN"
    assert data[cb.state_key] == "HALF_OPEN"

@pytest.mark.asyncio
async def test_circuit_breaker_half_open_has_ttl(mock_redis):
    redis, _, _ = mock_redis
    cb = CircuitBreaker("test", redis)
    
    # Setup state as OPEN and last failure in the past
    await redis.set(cb.state_key, "OPEN")
    await redis.set(cb.last_failure_key, str(time.time() - 130))
    
    # This should trigger transition with TTL
    await cb.get_state()
    
    # Verify last call to set included ex
    redis.set.assert_any_call(cb.state_key, "HALF_OPEN", ex=cb.OPEN_STATE_TTL)

@pytest.mark.asyncio
async def test_circuit_breaker_record_failure_sets_ttl(mock_redis):
    redis, _, pipelines = mock_redis
    cb = CircuitBreaker("test", redis)
    
    await cb.record_failure()
    
    # Verify expire was called in the pipeline
    pipe = pipelines[-1]
    assert pipe.transaction is False
    assert any(cmd[0] == "expire" and cmd[1] == cb.failures_key for cmd in pipe.cmds_log)

@pytest.mark.asyncio
async def test_get_circuit_breaker_error_handling():
    from app.core.circuit_breaker import get_circuit_breaker
    with patch("app.core.circuit_breaker.get_redis", side_effect=Exception("Redis down")):
        with pytest.raises(RuntimeError) as exc:
            await get_circuit_breaker("test")
        assert "failed to acquire Redis for 'test'" in str(exc.value)

@pytest.mark.asyncio
async def test_circuit_breaker_corrupted_timestamp_stays_open(mock_redis):
    redis, data, _ = mock_redis
    cb = CircuitBreaker("test", redis)
    data[cb.state_key] = "OPEN"
    data[cb.last_failure_key] = "not-a-timestamp"
    # Should safely catch the ValueError/TypeError and stay OPEN
    assert await cb.get_state() == "OPEN"
