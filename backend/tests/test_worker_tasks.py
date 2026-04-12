"""
Unit tests for Celery worker tasks.
"""

import pytest
import uuid
from unittest.mock import patch, MagicMock, AsyncMock
from app.worker.tasks import process_task
from app.schemas.task import TaskStatus

@pytest.fixture
def mock_repo():
    """Mock TaskRepository for worker tasks."""
    with patch("app.worker.tasks.TaskRepository") as mock:
        repo_instance = MagicMock()
        repo_instance.update_status = AsyncMock()
        repo_instance.set_result = AsyncMock()
        repo_instance.set_error = AsyncMock()
        mock.return_value = repo_instance
        yield repo_instance

@pytest.fixture
def mock_session():
    """Mock database session for worker tasks."""
    with patch("app.worker.tasks.AsyncSessionLocal") as mock:
        session_instance = AsyncMock()
        mock.return_value.__aenter__ = AsyncMock(return_value=session_instance)
        mock.return_value.__aexit__ = AsyncMock(return_value=False)
        yield session_instance

@pytest.fixture
def mock_agent_runner():
    """Mock AgentRunner for worker tasks."""
    with patch("app.worker.tasks.AgentRunner") as mock:
        runner_instance = MagicMock()
        runner_instance.run = AsyncMock()
        mock.return_value = runner_instance
        yield runner_instance

def test_process_task_sets_processing_then_completed(mock_session, mock_repo, mock_agent_runner):
    """Verify status transitions PROCESSING -> COMPLETED on success."""
    task_id = str(uuid.uuid4())
    mock_agent_runner.run.return_value = {"result": "ok"}
    
    # apply() runs the task synchronously in eager mode or just as a normal function
    process_task.apply(args=[task_id])
    
    # Check status updates
    tid = uuid.UUID(task_id)
    mock_repo.update_status.assert_any_call(tid, TaskStatus.PROCESSING)
    mock_repo.set_result.assert_called_once_with(tid, {"result": "ok"})
    mock_repo.update_status.assert_any_call(tid, TaskStatus.COMPLETED)

def test_process_task_sets_failed_on_agent_error(mock_session, mock_repo, mock_agent_runner):
    """Verify status is set to FAILED if AgentRunner fails."""
    task_id = str(uuid.uuid4())
    mock_agent_runner.run.side_effect = Exception("Agent failed")
    
    # In eager mode/apply(), the exception will propagate after status is updated
    try:
        process_task.apply(args=[task_id])
    except Exception:
        pass
    
    tid = uuid.UUID(task_id)
    mock_repo.set_error.assert_called_once()
    mock_repo.update_status.assert_any_call(tid, TaskStatus.FAILED)

def test_process_task_retries_before_failing():
    """Verify that the task calls self.retry on exception before reaching max retries."""
    task_id = str(uuid.uuid4())
    
    # We mock _run_async to simulate a failure during async execution
    def mock_run_async_impl(coro):
        if hasattr(coro, "close"):
            coro.close()
        raise Exception("Transient failure")

    with patch("app.worker.tasks._run_async", side_effect=mock_run_async_impl) as mock_run_async:
        
        # We need to mock the bound 'self' object for the task
        # In this case, 'self' will be the process_task instance itself when calling .run()
        with patch.object(process_task, "retry") as mock_retry:
            process_task.request.retries = 0
            process_task.max_retries = 3
            mock_retry.side_effect = Exception("Retry called") # Stop execution
            
            with pytest.raises(Exception, match="Retry called"):
                process_task.run(task_id)
            
            mock_retry.assert_called_once()
