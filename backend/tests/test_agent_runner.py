"""
test_agent_runner.py
─────────────────────
Covers the task.error population fix in AgentRunner.run(): a failed
pipeline run must leave task.error as a structured {type, message} dict
so the frontend can show the real failure instead of falling back to
"Unknown error occurred."
"""

import uuid
import pytest
from unittest.mock import patch, MagicMock, AsyncMock

from app.worker.agent_runner import AgentRunner


def _mock_task(task_id):
    task = MagicMock()
    task.id = task_id
    task.description = "Test task"
    task.config = None
    task.error = None
    return task


@pytest.fixture
def mock_session():
    with patch("app.db.base.AsyncSessionLocal") as mock:
        session_instance = AsyncMock()
        mock.return_value.__aenter__ = AsyncMock(return_value=session_instance)
        mock.return_value.__aexit__ = AsyncMock(return_value=False)
        yield session_instance


@pytest.fixture
def mock_task_repo(task):
    with patch("app.db.repositories.task_repo.TaskRepository") as mock:
        repo_instance = MagicMock()
        repo_instance.get_by_id = AsyncMock(return_value=task)
        mock.return_value = repo_instance
        yield repo_instance


@pytest.fixture
def mock_message_repo():
    with patch("app.db.repositories.task_repo.TaskMessageRepository") as mock:
        repo_instance = MagicMock()
        repo_instance.list_by_task = AsyncMock(return_value=[])
        mock.return_value = repo_instance
        yield repo_instance


@pytest.fixture
def task():
    return _mock_task(uuid.uuid4())


@pytest.mark.asyncio
async def test_planner_rate_limit_failure_sets_structured_task_error(
    mock_session, mock_task_repo, mock_message_repo, task
):
    rate_limit_msg = (
        "Planner failed to generate a valid JSON plan after retries. "
        "Last error: LLM call failed: Error code: 429 - rate_limit_exceeded"
    )
    with patch("agents.controller.agent_controller.AgentController") as mock_controller_cls:
        controller_instance = MagicMock()
        controller_instance.run_pipeline = AsyncMock(
            return_value={"status": "FAILED", "error": rate_limit_msg}
        )
        mock_controller_cls.return_value = controller_instance

        runner = AgentRunner(task.id)
        result = await runner.run()

    assert result["status"] == "FAILED"
    assert task.status == "FAILED"
    assert task.error == {"type": "RateLimitError", "message": rate_limit_msg}


@pytest.mark.asyncio
async def test_non_rate_limit_failure_sets_pipeline_error_type(
    mock_session, mock_task_repo, mock_message_repo, task
):
    other_error = "Planner failed to generate a valid JSON plan after retries. Last error: invalid schema"
    with patch("agents.controller.agent_controller.AgentController") as mock_controller_cls:
        controller_instance = MagicMock()
        controller_instance.run_pipeline = AsyncMock(
            return_value={"status": "FAILED", "error": other_error}
        )
        mock_controller_cls.return_value = controller_instance

        runner = AgentRunner(task.id)
        await runner.run()

    assert task.error == {"type": "PipelineError", "message": other_error}


@pytest.mark.asyncio
async def test_successful_pipeline_leaves_task_error_none(
    mock_session, mock_task_repo, mock_message_repo, task
):
    with patch("agents.controller.agent_controller.AgentController") as mock_controller_cls:
        controller_instance = MagicMock()
        controller_instance.run_pipeline = AsyncMock(
            return_value={"status": "COMPLETED", "summary": "Done"}
        )
        mock_controller_cls.return_value = controller_instance

        runner = AgentRunner(task.id)
        await runner.run()

    assert task.status == "COMPLETED"
    assert task.error is None
