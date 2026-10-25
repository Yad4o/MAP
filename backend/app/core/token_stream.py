"""
core/token_stream.py
─────────────────────
Live "typing" of the answer:  worker  →  Redis list  →  SSE endpoint  →  browser.

Why a list and not pub/sub: the browser usually connects *after* the worker has
already started producing text, and reconnects after network blips. A list can
be replayed from any offset (LRANGE), needs only non-blocking commands (so it
works on Upstash), and expires on its own.

Entry format (one JSON object per list element):
    {"k": "d", "s": <step>, "t": "<text>"}   text delta for a plan step
    {"k": "r", "s": <step>}                  discard everything streamed for that step
    {"k": "x"}                               stream finished (success or failure)

Everything on the worker side is best-effort: a Redis problem must never fail a
task. The normal result is still saved to the DB and picked up by polling.
"""

import asyncio
import json
import logging
import time
from typing import Any, AsyncIterator, Awaitable, Callable

from app.config import settings
from app.core.redis import is_test_mode
from app.core.redis_client import build_redis_client

logger = logging.getLogger(__name__)

STREAM_TTL_ACTIVE_S = 900   # safety net while a task is running
STREAM_TTL_DONE_S = 120     # keep just long enough for late/reconnecting clients
FLUSH_INTERVAL_S = 0.06     # batch tokens: ~16 Redis writes/sec max instead of one per token
FLUSH_MAX_CHARS = 120


def stream_key(task_id: Any) -> str:
    return f"task_stream:{task_id}"


def _dumps(entry: dict) -> str:
    return json.dumps(entry, separators=(",", ":"), ensure_ascii=False)


# ── Worker side ──────────────────────────────────────────────────────────────


class TokenStreamPublisher:
    """Batches text deltas for one task run into a Redis list. Never raises."""

    def __init__(
        self,
        task_id: Any,
        redis: Any = None,
        *,
        owns_client: bool = False,
        flush_interval: float = FLUSH_INTERVAL_S,
        flush_max_chars: int = FLUSH_MAX_CHARS,
        clock: Callable[[], float] = time.monotonic,
    ):
        self.task_id = task_id
        self._redis = redis
        self._owns_client = owns_client
        self._flush_interval = flush_interval
        self._flush_max_chars = flush_max_chars
        self._clock = clock
        self._enabled = redis is not None
        self._buf_step: int | None = None
        self._buf_text = ""
        self._last_flush = float("-inf")  # so the very first delta goes out immediately

    @property
    def enabled(self) -> bool:
        return self._enabled

    @classmethod
    async def open(cls, task_id: Any) -> "TokenStreamPublisher":
        """Connect (best effort) and clear any previous run's text. Returns a disabled no-op
        publisher when streaming isn't available (tests, no Redis, connection problems)."""
        if is_test_mode() or not settings.REDIS_URL:
            return cls(task_id, None)
        try:
            client = build_redis_client(socket_connect_timeout=1.0, socket_timeout=3.0)
        except Exception as exc:  # noqa: BLE001 — streaming must never break a task
            logger.warning("token stream disabled (client): %s", exc)
            return cls(task_id, None)
        pub = cls(task_id, client, owns_client=True)
        try:
            await client.delete(stream_key(task_id))
        except Exception as exc:  # noqa: BLE001
            pub._disable(exc)
        return pub

    def for_step(self, step: int) -> "StepStream":
        return StepStream(self, step)

    async def delta(self, step: int, text: str) -> None:
        if not self._enabled or not text:
            return
        if self._buf_step is not None and self._buf_step != step:
            await self._flush()
        self._buf_step = step
        self._buf_text += text
        if (
            len(self._buf_text) >= self._flush_max_chars
            or self._clock() - self._last_flush >= self._flush_interval
        ):
            await self._flush()

    async def reset(self, step: int) -> None:
        """Discard the text shown so far for `step` (e.g. narration before a tool call, or a retry)."""
        if not self._enabled:
            return
        self._buf_step, self._buf_text = None, ""
        await self._push([{"k": "r", "s": step}])

    async def flush(self) -> None:
        await self._flush()

    async def finish(self) -> None:
        if not self._enabled:
            return
        await self._flush()
        await self._push([{"k": "x"}], ttl=STREAM_TTL_DONE_S)

    async def close(self) -> None:
        if self._redis is not None and self._owns_client:
            try:
                await self._redis.aclose()
            except Exception:  # noqa: BLE001
                pass

    # ── internals ────────────────────────────────────────────────────────────

    async def _flush(self) -> None:
        if not self._enabled or self._buf_step is None or not self._buf_text:
            return
        entry = {"k": "d", "s": self._buf_step, "t": self._buf_text}
        self._buf_step, self._buf_text = None, ""
        await self._push([entry])
        self._last_flush = self._clock()

    async def _push(self, entries: list[dict], ttl: int = STREAM_TTL_ACTIVE_S) -> None:
        if not self._enabled:
            return
        try:
            key = stream_key(self.task_id)
            pipe = self._redis.pipeline(transaction=False)
            pipe.rpush(key, *[_dumps(e) for e in entries])
            pipe.expire(key, ttl)
            await pipe.execute()
        except Exception as exc:  # noqa: BLE001
            self._disable(exc)

    def _disable(self, exc: Exception) -> None:
        if self._enabled:
            logger.warning("token stream disabled for task %s: %s", self.task_id, exc)
        self._enabled = False


class StepStream:
    """A publisher bound to one plan step — this is what the executor receives."""

    def __init__(self, publisher: TokenStreamPublisher, step: int):
        self._publisher = publisher
        self._step = step

    async def delta(self, text: str) -> None:
        await self._publisher.delta(self._step, text)

    async def reset(self) -> None:
        await self._publisher.reset(self._step)

    async def flush(self) -> None:
        await self._publisher.flush()


async def clear_task_stream(redis: Any, task_id: Any) -> None:
    """Drop any stale text for a task (called when it's re-queued). Best effort."""
    try:
        await redis.delete(stream_key(task_id))
    except Exception as exc:  # noqa: BLE001
        logger.debug("clear_task_stream ignored error: %s", exc)


# ── API side ─────────────────────────────────────────────────────────────────


def parse_entry(raw: Any) -> dict | None:
    try:
        if isinstance(raw, bytes):
            raw = raw.decode("utf-8")
        entry = json.loads(raw)
        return entry if isinstance(entry, dict) else None
    except (ValueError, UnicodeDecodeError):
        return None


def format_sse(event_id: int, entry: dict) -> str:
    return f"id: {event_id}\ndata: {_dumps(entry)}\n\n"


async def stream_task_events(
    redis: Any,
    task_id: Any,
    offset: int = 0,
    *,
    is_disconnected: Callable[[], Awaitable[bool]] | None = None,
    is_task_finished: Callable[[], Awaitable[bool]] | None = None,
    poll_active: float = 0.15,
    poll_idle: float = 0.5,
    heartbeat: float = 15.0,
    idle_timeout: float = 180.0,
    finished_check_every: float = 3.0,
    sleep: Callable[[float], Awaitable[None]] = asyncio.sleep,
    clock: Callable[[], float] = time.monotonic,
) -> AsyncIterator[str]:
    """Yield Server-Sent Events for a task's stream, starting at list index `offset`.

    Ends after the done marker, when the client disconnects, when the task is already finished
    and nothing more is coming (worker crashed / key expired), or after `idle_timeout` of silence
    (the client simply reconnects with its last offset if the task is still running).
    """
    key = stream_key(task_id)
    idx = max(0, offset)
    now = clock()
    last_activity = last_beat = last_status_check = now

    async def _read() -> list:
        return await redis.lrange(key, idx, -1)

    while True:
        if is_disconnected is not None and await is_disconnected():
            return
        try:
            raw_items = await _read()
        except Exception as exc:  # noqa: BLE001
            logger.warning("stream read failed for task %s: %s", task_id, exc)
            yield "event: error\ndata: {}\n\n"
            return

        if raw_items:
            for raw in raw_items:
                entry = parse_entry(raw)
                if entry is not None:
                    yield format_sse(idx, entry)
                idx += 1
                if entry is not None and entry.get("k") == "x":
                    return
            last_activity = clock()
            await sleep(poll_active)
            continue

        now = clock()
        if is_task_finished is not None and now - last_status_check >= finished_check_every:
            last_status_check = now
            if await is_task_finished():
                # Catch anything pushed between our read and the status flip, then close.
                try:
                    for raw in await _read():
                        entry = parse_entry(raw)
                        if entry is not None:
                            yield format_sse(idx, entry)
                        idx += 1
                except Exception:  # noqa: BLE001
                    pass
                yield format_sse(idx, {"k": "x"})
                return

        if now - last_activity >= idle_timeout:
            yield "event: timeout\ndata: {}\n\n"
            return
        if now - last_beat >= heartbeat:
            last_beat = now
            yield ": ping\n\n"
        await sleep(poll_idle)
