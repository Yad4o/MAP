"""
test_token_stream.py
--------------------
Live answer streaming, worker side and API side:

  * TokenStreamPublisher batches LLM text deltas into a Redis list and must
    NEVER raise into the pipeline (a Redis hiccup can't fail a task).
  * stream_task_events replays that list as Server-Sent Events from an offset.
"""

import json
import pytest

from app.core.token_stream import (
    TokenStreamPublisher,
    clear_task_stream,
    stream_key,
    stream_task_events,
)

TASK_ID = "11111111-1111-1111-1111-111111111111"


class FakePipeline:
    def __init__(self, redis):
        self.redis, self.ops = redis, []

    def rpush(self, key, *values):
        self.ops.append(("rpush", key, values))
        return self

    def expire(self, key, ttl):
        self.ops.append(("expire", key, ttl))
        return self

    async def execute(self):
        if self.redis.fail:
            raise ConnectionError("redis down")
        for op in self.ops:
            if op[0] == "rpush":
                self.redis.lists.setdefault(op[1], []).extend(op[2])
            else:
                self.redis.ttls[op[1]] = op[2]


class FakeRedis:
    def __init__(self, fail=False):
        self.lists, self.ttls, self.fail, self.closed = {}, {}, fail, False

    def pipeline(self, transaction=False):
        return FakePipeline(self)

    async def lrange(self, key, start, end):
        if self.fail:
            raise ConnectionError("redis down")
        items = self.lists.get(key, [])
        return items[start:] if end == -1 else items[start:end + 1]

    async def delete(self, key):
        if self.fail:
            raise ConnectionError("redis down")
        self.lists.pop(key, None)

    async def aclose(self):
        self.closed = True

    def entries(self):
        return [json.loads(x) for x in self.lists.get(stream_key(TASK_ID), [])]


class Clock:
    def __init__(self):
        self.t = 100.0

    def __call__(self):
        return self.t

    async def sleep(self, seconds):
        self.t += seconds


# ── Publisher ────────────────────────────────────────────────────────────────


class TestPublisher:
    @pytest.mark.asyncio
    async def test_small_deltas_are_batched_within_the_flush_interval(self):
        redis, clock = FakeRedis(), Clock()
        pub = TokenStreamPublisher(TASK_ID, redis, flush_interval=0.06, clock=clock)

        await pub.delta(0, "Hel")   # first delta flushes immediately
        clock.t += 0.01
        await pub.delta(0, "lo ")
        clock.t += 0.01
        await pub.delta(0, "wor")
        assert redis.entries() == [{"k": "d", "s": 0, "t": "Hel"}]

        clock.t += 0.1
        await pub.delta(0, "ld")    # interval elapsed -> one merged entry
        assert redis.entries()[-1] == {"k": "d", "s": 0, "t": "lo world"}

    @pytest.mark.asyncio
    async def test_flushes_when_buffer_is_large(self):
        redis, clock = FakeRedis(), Clock()
        pub = TokenStreamPublisher(TASK_ID, redis, flush_interval=60, flush_max_chars=10, clock=clock)
        await pub.delta(0, "a")                 # immediate (first)
        await pub.delta(0, "b" * 12)            # >= max chars
        assert [e["t"] for e in redis.entries()] == ["a", "b" * 12]

    @pytest.mark.asyncio
    async def test_explicit_flush_and_step_change_flush_pending_text(self):
        redis, clock = FakeRedis(), Clock()
        pub = TokenStreamPublisher(TASK_ID, redis, flush_interval=60, clock=clock)
        await pub.delta(0, "first ")     # immediate
        await pub.delta(0, "tail")       # buffered
        await pub.delta(1, "second")     # step change flushes step 0 tail first
        await pub.flush()
        assert redis.entries() == [
            {"k": "d", "s": 0, "t": "first "},
            {"k": "d", "s": 0, "t": "tail"},
            {"k": "d", "s": 1, "t": "second"},
        ]

    @pytest.mark.asyncio
    async def test_reset_drops_buffered_text_and_marks_the_step(self):
        redis, clock = FakeRedis(), Clock()
        pub = TokenStreamPublisher(TASK_ID, redis, flush_interval=60, clock=clock)
        await pub.delta(2, "Let me check")   # immediate
        await pub.delta(2, " pending")       # buffered, must be discarded
        await pub.reset(2)
        await pub.flush()
        assert redis.entries() == [{"k": "d", "s": 2, "t": "Let me check"}, {"k": "r", "s": 2}]

    @pytest.mark.asyncio
    async def test_finish_flushes_marks_done_and_shortens_ttl(self):
        redis, clock = FakeRedis(), Clock()
        pub = TokenStreamPublisher(TASK_ID, redis, flush_interval=60, clock=clock)
        await pub.delta(0, "a")
        await pub.delta(0, "b")
        await pub.finish()
        assert redis.entries()[-2:] == [{"k": "d", "s": 0, "t": "b"}, {"k": "x"}]
        assert redis.ttls[stream_key(TASK_ID)] <= 300

    @pytest.mark.asyncio
    async def test_redis_failure_never_raises_and_disables_the_publisher(self):
        redis = FakeRedis(fail=True)
        pub = TokenStreamPublisher(TASK_ID, redis, clock=Clock())
        await pub.delta(0, "x")          # must not raise
        await pub.reset(0)
        await pub.finish()
        assert pub.enabled is False
        redis.fail = False
        await pub.delta(0, "after")      # stays disabled, nothing written
        assert redis.entries() == []

    @pytest.mark.asyncio
    async def test_publisher_without_redis_is_a_noop(self):
        pub = TokenStreamPublisher(TASK_ID, None)
        await pub.delta(0, "x")
        await pub.finish()
        await pub.close()
        assert pub.enabled is False

    @pytest.mark.asyncio
    async def test_open_is_disabled_in_test_mode(self):
        pub = await TokenStreamPublisher.open(TASK_ID)
        assert pub.enabled is False

    @pytest.mark.asyncio
    async def test_step_stream_binds_the_step_index(self):
        redis, clock = FakeRedis(), Clock()
        pub = TokenStreamPublisher(TASK_ID, redis, clock=clock)
        step = pub.for_step(3)
        await step.delta("hi")
        await step.flush()
        assert redis.entries() == [{"k": "d", "s": 3, "t": "hi"}]

    @pytest.mark.asyncio
    async def test_close_closes_an_owned_client(self):
        redis = FakeRedis()
        pub = TokenStreamPublisher(TASK_ID, redis, owns_client=True)
        await pub.close()
        assert redis.closed is True


# ── SSE reader ───────────────────────────────────────────────────────────────


def _seed(redis, *entries):
    redis.lists[stream_key(TASK_ID)] = [json.dumps(e) if isinstance(e, dict) else e for e in entries]


async def _collect(gen):
    return [chunk async for chunk in gen]


class TestEventStream:
    @pytest.mark.asyncio
    async def test_replays_from_offset_and_stops_at_done(self):
        redis, clock = FakeRedis(), Clock()
        _seed(redis, {"k": "d", "s": 0, "t": "a"}, {"k": "d", "s": 0, "t": "b"}, {"k": "x"})
        out = await _collect(stream_task_events(redis, TASK_ID, offset=1, sleep=clock.sleep, clock=clock))
        assert out[0] == 'id: 1\ndata: {"k":"d","s":0,"t":"b"}\n\n'
        assert out[1] == 'id: 2\ndata: {"k":"x"}\n\n'
        assert len(out) == 2

    @pytest.mark.asyncio
    async def test_malformed_entries_are_skipped_but_offsets_stay_aligned(self):
        redis, clock = FakeRedis(), Clock()
        _seed(redis, "not json", {"k": "d", "s": 0, "t": "ok"}, {"k": "x"})
        out = await _collect(stream_task_events(redis, TASK_ID, sleep=clock.sleep, clock=clock))
        assert out[0].startswith("id: 1\n")

    @pytest.mark.asyncio
    async def test_emits_synthetic_done_when_task_already_finished(self):
        redis, clock = FakeRedis(), Clock()

        async def finished():
            return True

        out = await _collect(stream_task_events(
            redis, TASK_ID, is_task_finished=finished, finished_check_every=0,
            sleep=clock.sleep, clock=clock,
        ))
        assert out == ['id: 0\ndata: {"k":"x"}\n\n']

    @pytest.mark.asyncio
    async def test_idle_timeout_ends_the_stream(self):
        redis, clock = FakeRedis(), Clock()
        out = await _collect(stream_task_events(
            redis, TASK_ID, idle_timeout=5, heartbeat=100, sleep=clock.sleep, clock=clock,
        ))
        assert out == ["event: timeout\ndata: {}\n\n"]

    @pytest.mark.asyncio
    async def test_heartbeat_comments_keep_idle_connections_alive(self):
        redis, clock = FakeRedis(), Clock()
        out = await _collect(stream_task_events(
            redis, TASK_ID, idle_timeout=10, heartbeat=2, poll_idle=1, sleep=clock.sleep, clock=clock,
        ))
        assert ": ping\n\n" in out

    @pytest.mark.asyncio
    async def test_stops_when_client_disconnects(self):
        redis, clock = FakeRedis(), Clock()
        _seed(redis, {"k": "d", "s": 0, "t": "a"})

        async def gone():
            return True

        out = await _collect(stream_task_events(
            redis, TASK_ID, is_disconnected=gone, sleep=clock.sleep, clock=clock,
        ))
        assert out == []

    @pytest.mark.asyncio
    async def test_redis_error_ends_the_stream_instead_of_raising(self):
        redis, clock = FakeRedis(fail=True), Clock()
        out = await _collect(stream_task_events(redis, TASK_ID, sleep=clock.sleep, clock=clock))
        assert out == ["event: error\ndata: {}\n\n"]


class TestClearStream:
    @pytest.mark.asyncio
    async def test_clear_deletes_the_key(self):
        redis = FakeRedis()
        _seed(redis, {"k": "x"})
        await clear_task_stream(redis, TASK_ID)
        assert redis.lists.get(stream_key(TASK_ID)) is None

    @pytest.mark.asyncio
    async def test_clear_swallows_redis_errors(self):
        await clear_task_stream(FakeRedis(fail=True), TASK_ID)   # must not raise
