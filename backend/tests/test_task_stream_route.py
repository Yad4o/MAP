"""
Route tests for GET /api/v1/tasks/{id}/stream (Server-Sent Events).
"""

import json
import uuid
from unittest.mock import Mock, patch

import pytest
from fastapi.testclient import TestClient

from app.core.exceptions import TaskNotFoundError
from app.core.token_stream import stream_key
from app.dependencies import get_current_user
from app.main import app
from app.routes.tasks import get_stream_redis, get_task_service
from tests.unit.test_token_stream import FakeRedis

mock_user = Mock()
mock_user.id = uuid.UUID("12345678-1234-5678-9abc-123456789abc")
TASK_ID = uuid.uuid4()


class StatusService:
    def __init__(self, missing=False):
        self.missing = missing

    async def get_task_status(self, task_id, user_id):
        if self.missing:
            raise TaskNotFoundError(task_id)
        return Mock(status="PROCESSING")


@pytest.fixture
def make_client():
    def _make(redis, missing=False):
        app.dependency_overrides[get_task_service] = lambda: StatusService(missing)
        app.dependency_overrides[get_current_user] = lambda: mock_user
        app.dependency_overrides[get_stream_redis] = lambda: redis
        return TestClient(app)

    yield _make
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def _no_celery():
    with patch("app.routes.tasks.process_task.apply_async"):
        yield


def _redis_with(*entries):
    redis = FakeRedis()
    redis.lists[stream_key(TASK_ID)] = [json.dumps(e) for e in entries]
    return redis


def test_streams_events_as_sse_until_done(make_client):
    redis = _redis_with({"k": "d", "s": 0, "t": "Hel"}, {"k": "d", "s": 0, "t": "lo"}, {"k": "x"})
    with make_client(redis) as client:
        with client.stream("GET", f"/api/v1/tasks/{TASK_ID}/stream") as resp:
            assert resp.status_code == 200
            assert resp.headers["content-type"].startswith("text/event-stream")
            assert resp.headers["cache-control"] == "no-cache"
            assert resp.headers["x-accel-buffering"] == "no"
            body = "".join(resp.iter_text())
    assert 'data: {"k":"d","s":0,"t":"Hel"}' in body
    assert 'data: {"k":"d","s":0,"t":"lo"}' in body
    assert body.rstrip().endswith('data: {"k":"x"}')


def test_offset_query_param_resumes_a_dropped_stream(make_client):
    redis = _redis_with({"k": "d", "s": 0, "t": "one"}, {"k": "d", "s": 0, "t": "two"}, {"k": "x"})
    with make_client(redis) as client:
        with client.stream("GET", f"/api/v1/tasks/{TASK_ID}/stream?offset=1") as resp:
            body = "".join(resp.iter_text())
    assert "one" not in body
    assert "two" in body
    assert "id: 1\n" in body


def test_other_users_or_missing_tasks_get_404(make_client):
    with make_client(_redis_with({"k": "x"}), missing=True) as client:
        resp = client.get(f"/api/v1/tasks/{TASK_ID}/stream")
    assert resp.status_code == 404


def test_negative_offset_is_rejected(make_client):
    with make_client(_redis_with({"k": "x"})) as client:
        resp = client.get(f"/api/v1/tasks/{TASK_ID}/stream?offset=-1")
    assert resp.status_code == 422


# ── Re-queued tasks must not replay the previous run's text ──────────────────

from unittest.mock import AsyncMock

from app.schemas.task import TaskCreateRequest, TaskStatus
from tests.mocks.task_service import MockTaskService

_NEW_TASK = {"title": "T", "description": "A reasonably long description", "status": "PENDING", "priority": 5}


class RequeueService(MockTaskService):
    """Just enough of TaskService for the follow-up and retry routes."""

    def __init__(self):
        super().__init__()
        self.repo = Mock()
        self.repo.update_status = AsyncMock()
        self._gets = 0

    async def add_message(self, task_id, user_id, content):
        return await self.create_task(user_id, TaskCreateRequest(**_NEW_TASK))

    async def get_task(self, task_id, user_id):
        self._gets += 1
        if self._gets == 1:  # the retry route first checks the task is retryable
            return Mock(status=TaskStatus.FAILED)
        return await self.create_task(user_id, TaskCreateRequest(**_NEW_TASK))


@pytest.fixture
def requeue_client():
    app.dependency_overrides[get_task_service] = lambda: RequeueService()
    app.dependency_overrides[get_current_user] = lambda: mock_user
    with patch("app.routes.tasks._clear_stream", new=AsyncMock()) as cleared:
        with TestClient(app) as client:
            yield client, cleared
    app.dependency_overrides.clear()


def test_follow_up_message_clears_the_previous_runs_stream(requeue_client):
    client, cleared = requeue_client
    resp = client.post(f"/api/v1/tasks/{TASK_ID}/messages", json={"content": "and now explain it"})
    assert resp.status_code == 202
    cleared.assert_awaited_once_with(TASK_ID)


def test_retry_clears_the_previous_runs_stream(requeue_client):
    client, cleared = requeue_client
    resp = client.post(f"/api/v1/tasks/{TASK_ID}/retry")
    assert resp.status_code == 202
    cleared.assert_awaited_once_with(TASK_ID)


@pytest.mark.asyncio
async def test_clear_stream_helper_never_raises_when_redis_is_unavailable():
    from app.routes.tasks import _clear_stream
    with patch("app.routes.tasks.get_redis", AsyncMock(side_effect=RuntimeError("Redis not initialised"))):
        await _clear_stream(TASK_ID)  # must not raise
