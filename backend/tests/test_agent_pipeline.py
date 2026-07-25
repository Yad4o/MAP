import pytest
import uuid
from unittest.mock import patch, MagicMock
from agents.controller.agent_controller import AgentController
from agents.shared.message import AgentMessage

@pytest.mark.asyncio
async def test_agent_controller_success():
    # Mock the agents
    task_id = uuid.uuid4()
    controller = AgentController(task_id, "Test task")
    
    # Mock planner
    mock_plan_msg = AgentMessage(
        message_id=uuid.uuid4(),
        task_id=task_id,
        sender="planner",
        recipient="controller",
        message_type="plan",
        payload={"plan": {"steps": [{"id": 1, "description": "Step 1"}]}}
    )
    
    # Mock memory (retrieve)
    mock_memory_msg = AgentMessage(
        message_id=uuid.uuid4(),
        task_id=task_id,
        sender="memory",
        recipient="controller",
        message_type="memory_context",
        payload={"memory_context": [{"text": "context"}]}
    )
    
    # Mock memory (store)
    mock_memory_store_msg = AgentMessage(
        message_id=uuid.uuid4(),
        task_id=task_id,
        sender="memory",
        recipient="controller",
        message_type="memory_stored",
        payload={"memory_stored": True}
    )
    
    # Mock executor — summary now comes straight from the executor's own
    # output on the fast path, since the Analyzer is skipped entirely.
    mock_exec_msg = AgentMessage(
        message_id=uuid.uuid4(),
        task_id=task_id,
        sender="executor",
        recipient="controller",
        message_type="step_result",
        payload={"step_result": {"status": "completed", "output": "Done", "summary": "Looks good"}}
    )
    
    # Analyzer mock — kept as a patch target but should NOT be called: a
    # single-step plan has nothing to cross-validate, so the fast path
    # (_build_fast_path_validation) skips the real Analyzer LLM call.
    mock_analyzer_msg = AgentMessage(
        message_id=uuid.uuid4(),
        task_id=task_id,
        sender="analyzer",
        recipient="controller",
        message_type="validation",
        payload={"validation_report": {"passed": True, "summary": "Looks good"}}
    )

    with patch.object(controller.planner, "run", return_value=mock_plan_msg), \
         patch.object(controller.memory, "run", side_effect=[mock_memory_msg, mock_memory_store_msg]), \
         patch.object(controller.executor, "run", return_value=mock_exec_msg), \
         patch.object(controller.analyzer, "run", return_value=mock_analyzer_msg) as mock_analyzer:
        
        result = await controller.run_pipeline()
        
        assert result["status"] == "COMPLETED"
        assert result["steps_completed"] == 1
        assert result["summary"] == "Looks good"
        assert "plan" in result
        assert "validation" in result
        # Fast path: single-step plans skip the Analyzer LLM call entirely
        assert mock_analyzer.call_count == 0

@pytest.mark.asyncio
async def test_agent_controller_planner_failure():
    task_id = uuid.uuid4()
    controller = AgentController(task_id, "Test task")
    
    # Mock planner returning an error
    mock_plan_msg = AgentMessage(
        message_id=uuid.uuid4(),
        task_id=task_id,
        sender="planner",
        recipient="controller",
        message_type="error",
        payload={"error": "Planner failed"}
    )
    with patch.object(controller.planner, "run", return_value=mock_plan_msg):
        result = await controller.run_pipeline()
        
        assert result["status"] == "FAILED"
        assert result["error"] == "Planner failed"

@pytest.mark.asyncio
async def test_agent_controller_analyzer_failure():
    """
    Single-step plan where the executor itself fails (returns an error
    instead of a step_result). The fast path (_build_fast_path_validation)
    catches this without an initial real Analyzer call — there's nothing
    to cross-validate on a single step, and an executor-level error is
    unambiguous — then the standard retry loop kicks in and DOES use the
    real Analyzer on each retry pass, retries up to 2 times, then
    surfaces FAILED. Memory.retrieve is called once per execution
    (initial + 2 retries = 3 retrieves) and store is called once at the end.
    """
    task_id = uuid.uuid4()
    controller = AgentController(task_id, "Test task")

    # Mock planner
    mock_plan_msg = AgentMessage(
        message_id=uuid.uuid4(),
        task_id=task_id,
        sender="planner",
        recipient="controller",
        message_type="plan",
        payload={"plan": {"steps": [{"id": 1, "description": "Step 1"}]}}
    )

    # Memory mock: 3 retrieve calls (initial + 2 retries) + 1 store = 4 total
    mock_memory_retrieve = AgentMessage(
        message_id=uuid.uuid4(),
        task_id=task_id,
        sender="memory",
        recipient="controller",
        message_type="memory_context",
        payload={"memory_context": [{"text": "context"}]}
    )
    mock_memory_store_msg = AgentMessage(
        message_id=uuid.uuid4(),
        task_id=task_id,
        sender="memory",
        recipient="controller",
        message_type="memory_stored",
        payload={"memory_stored": True}
    )

    # Executor always errors out (return_value handles multiple calls) —
    # this is what actually triggers the fast path's failure branch.
    mock_exec_msg = AgentMessage(
        message_id=uuid.uuid4(),
        task_id=task_id,
        sender="executor",
        recipient="controller",
        message_type="error",
        payload={"error": "Executor crashed"}
    )

    # Real analyzer, used only during retries — still failing
    mock_analyzer_msg = AgentMessage(
        message_id=uuid.uuid4(),
        task_id=task_id,
        sender="analyzer",
        recipient="controller",
        message_type="validation",
        payload={"validation_report": {"passed": False, "summary": "Failed validation", "failed_steps": ["1"]}}
    )

    with patch.object(controller.planner, "run", return_value=mock_plan_msg), \
         patch.object(controller.memory, "run", side_effect=[
            mock_memory_retrieve,   # initial execute_step
            mock_memory_retrieve,   # retry 1 execute_step
            mock_memory_retrieve,   # retry 2 execute_step
            mock_memory_store_msg,  # _run_memory store
         ]), \
         patch.object(controller.executor, "run", return_value=mock_exec_msg) as mock_exec, \
         patch.object(controller.analyzer, "run", return_value=mock_analyzer_msg) as mock_analyzer:

        result = await controller.run_pipeline()

        assert result["status"] == "FAILED"
        assert result["steps_completed"] == 1
        assert result["summary"] == "Failed validation"
        # Confirm retries fired: executor called 3 times (initial + 2 retries)
        assert mock_exec.call_count == 3
        # Analyzer called only during the 2 retries — the initial check
        # is the fast path, which never calls the real Analyzer LLM.
        assert mock_analyzer.call_count == 2

@pytest.mark.asyncio
async def test_agent_controller_partial_retry():
    """
    Test that when the analyzer specifies 'failed_steps' with specific step IDs,
    only those specific steps are retried.
    """
    task_id = uuid.uuid4()
    controller = AgentController(task_id, "Test task")

    # 2-step plan
    mock_plan_msg = AgentMessage(
        message_id=uuid.uuid4(),
        task_id=task_id,
        sender="planner",
        recipient="controller",
        message_type="plan",
        payload={"plan": {"steps": [{"id": "1", "description": "Step 1"}, {"id": "2", "description": "Step 2"}]}}
    )

    # Memory retrieve/store
    mock_memory_msg = AgentMessage(
        message_id=uuid.uuid4(),
        task_id=task_id,
        sender="memory",
        recipient="controller",
        message_type="memory_context",
        payload={"memory_context": []}
    )

    # Executor returns success
    mock_exec_msg = AgentMessage(
        message_id=uuid.uuid4(),
        task_id=task_id,
        sender="executor",
        recipient="controller",
        message_type="step_result",
        payload={"step_result": {"status": "completed", "output": "Done"}}
    )

    # Analyzer fails ONLY step 2 on the first pass, then passes on the second pass
    mock_analyzer_msg_fail = AgentMessage(
        message_id=uuid.uuid4(),
        task_id=task_id,
        sender="analyzer",
        recipient="controller",
        message_type="validation",
        payload={"validation_report": {"passed": False, "summary": "Step 2 failed", "failed_steps": ["2"]}}
    )
    mock_analyzer_msg_pass = AgentMessage(
        message_id=uuid.uuid4(),
        task_id=task_id,
        sender="analyzer",
        recipient="controller",
        message_type="validation",
        payload={"validation_report": {"passed": True, "summary": "All good", "failed_steps": []}}
    )

    with patch.object(controller.planner, "run", return_value=mock_plan_msg), \
         patch.object(controller.memory, "run", return_value=mock_memory_msg), \
         patch.object(controller.executor, "run", return_value=mock_exec_msg) as mock_exec, \
         patch.object(controller.analyzer, "run", side_effect=[mock_analyzer_msg_fail, mock_analyzer_msg_pass]):

        result = await controller.run_pipeline()

        assert result["status"] == "COMPLETED"
        
        # 2 initial steps + 1 retry of step 2 = 3 executor calls
        assert mock_exec.call_count == 3
        
        # Verify the 3rd call was specifically for step 2
        retry_call = mock_exec.call_args_list[2][0][0]
        assert str(retry_call.payload["step"]["id"]) == "2"

@pytest.mark.asyncio
async def test_agent_controller_multi_step_success():
    task_id = uuid.uuid4()
    controller = AgentController(task_id, "Test task")

    mock_plan_msg = AgentMessage(
        message_id=uuid.uuid4(), task_id=task_id, sender="planner", recipient="controller",
        message_type="plan", payload={"plan": {"steps": [{"id": 1, "description": "Step 1"}, {"id": 2, "description": "Step 2"}]}}
    )

    mock_memory_msg_1 = AgentMessage(
        message_id=uuid.uuid4(), task_id=task_id, sender="memory", recipient="controller",
        message_type="memory_context", payload={"memory_context": [{"text": "context 1"}]}
    )
    mock_memory_msg_2 = AgentMessage(
        message_id=uuid.uuid4(), task_id=task_id, sender="memory", recipient="controller",
        message_type="memory_context", payload={"memory_context": [{"text": "context 2"}]}
    )
    mock_store_msg = AgentMessage(
        message_id=uuid.uuid4(), task_id=task_id, sender="memory", recipient="controller",
        message_type="memory_stored", payload={"memory_stored": True}
    )

    mock_exec_msg_1 = AgentMessage(
        message_id=uuid.uuid4(), task_id=task_id, sender="executor", recipient="controller",
        message_type="step_result", payload={"step_result": {"status": "completed", "output": "Done 1"}}
    )
    mock_exec_msg_2 = AgentMessage(
        message_id=uuid.uuid4(), task_id=task_id, sender="executor", recipient="controller",
        message_type="step_result", payload={"step_result": {"status": "completed", "output": "Done 2"}}
    )

    mock_analyzer_msg = AgentMessage(
        message_id=uuid.uuid4(), task_id=task_id, sender="analyzer", recipient="controller",
        message_type="validation", payload={"validation_report": {"passed": True, "summary": "All good", "failed_steps": []}}
    )

    with patch.object(controller.planner, "run", return_value=mock_plan_msg), \
         patch.object(controller.memory, "run", side_effect=[mock_memory_msg_1, mock_memory_msg_2, mock_store_msg]) as mock_memory, \
         patch.object(controller.executor, "run", side_effect=[mock_exec_msg_1, mock_exec_msg_2]) as mock_exec, \
         patch.object(controller.analyzer, "run", return_value=mock_analyzer_msg) as mock_analyzer:

        result = await controller.run_pipeline()

        assert result["steps_completed"] == 2
        assert mock_memory.call_count == 3
        
        retrieve_calls = [call for call in mock_memory.call_args_list if call[0][0].message_type == "retrieve"]
        assert len(retrieve_calls) == 2
        
        assert mock_exec.call_count == 2
        exec_call_1 = mock_exec.call_args_list[0][0][0]
        assert exec_call_1.message_type == "execute_step"
        assert exec_call_1.payload["step"]["description"] == "Step 1"
        assert exec_call_1.payload["context"] == [{"text": "context 1"}]

        exec_call_2 = mock_exec.call_args_list[1][0][0]
        assert exec_call_2.payload["step"]["description"] == "Step 2"
        assert exec_call_2.payload["context"] == [{"text": "context 2"}]

        assert mock_analyzer.call_count == 1

        store_call = mock_memory.call_args_list[2][0][0]
        assert store_call.message_type == "store"
        assert store_call.payload["text"] == "All good"

@pytest.mark.asyncio
async def test_agent_controller_memory_context_prior_task():
    task_id = uuid.uuid4()
    controller = AgentController(task_id, "Test task 2")

    mock_plan_msg = AgentMessage(
        message_id=uuid.uuid4(), task_id=task_id, sender="planner", recipient="controller",
        message_type="plan", payload={"plan": {"steps": [{"id": 1, "description": "Step 1"}]}}
    )

    mock_memory_msg = AgentMessage(
        message_id=uuid.uuid4(), task_id=task_id, sender="memory", recipient="controller",
        message_type="memory_context", payload={"memory_context": [{"text": "Past task result context"}]}
    )
    mock_store_msg = AgentMessage(
        message_id=uuid.uuid4(), task_id=task_id, sender="memory", recipient="controller",
        message_type="memory_stored", payload={"memory_stored": True}
    )

    mock_exec_msg = AgentMessage(
        message_id=uuid.uuid4(), task_id=task_id, sender="executor", recipient="controller",
        message_type="step_result", payload={"step_result": {"status": "completed", "output": "Done 1"}}
    )

    mock_analyzer_msg = AgentMessage(
        message_id=uuid.uuid4(), task_id=task_id, sender="analyzer", recipient="controller",
        message_type="validation", payload={"validation_report": {"passed": True, "summary": "Looks good"}}
    )

    with patch.object(controller.planner, "run", return_value=mock_plan_msg), \
         patch.object(controller.memory, "run", side_effect=[mock_memory_msg, mock_store_msg]), \
         patch.object(controller.executor, "run", return_value=mock_exec_msg) as mock_exec, \
         patch.object(controller.analyzer, "run", return_value=mock_analyzer_msg):

        result = await controller.run_pipeline()
        assert result["status"] == "COMPLETED"
        
        exec_call = mock_exec.call_args_list[0][0][0]
        assert exec_call.payload["context"] == [{"text": "Past task result context"}]

@pytest.mark.asyncio
async def test_end_to_end_task_status_transitions_and_retrieve(engine, db_session):
    """
    Integration tests 8 & 9 using the real test DB (SQLite via conftest fixtures).
    """
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy import select
    from app.db.models.user import User
    from app.db.models.task import Task
    from app.worker.agent_runner import AgentRunner
    from agents.controller.agent_controller import AgentController

    # 1. Seed
    user = User(email="runner_e2e@test.com", username="e2erunner", password_hash="hash")
    db_session.add(user)
    await db_session.flush()
    await db_session.refresh(user)

    task = Task(
        user_id=user.id,
        title="E2E Pipeline Task",
        description="Integration test description",
        status="PENDING",
    )
    db_session.add(task)
    await db_session.flush()
    await db_session.refresh(task)
    task_id = task.id

    from contextlib import asynccontextmanager

    @asynccontextmanager
    async def shared_session_manager():
        yield db_session

    status_at_pipeline_call = {}

    async def mock_run_pipeline(self):
        async with shared_session_manager() as s:
            row = (await s.execute(select(Task).where(Task.id == task_id))).scalar_one()
            status_at_pipeline_call["status"] = row.status
        return {
            "status": "COMPLETED",
            "steps_completed": 1,
            "summary": "E2E integration summary",
            "plan": {"steps": []},
            "step_results": [],
            "validation": {"passed": True},
        }

    with patch.object(AgentController, "run_pipeline", mock_run_pipeline), \
         patch.object(AgentController, "__init__", lambda self, task_id, task_description, config=None: None), \
         patch("app.db.base.AsyncSessionLocal", shared_session_manager):
        
        # Set task_id manually since we mocked __init__
        # Wait, AgentRunner instantiates AgentController(self.task_id, task.description)
        # If we mock __init__ to do nothing, we need to make sure it doesn't crash
        
        # Actually, let's just mock the parts we need instead of full __init__
        # Or better yet, don't mock __init__ but mock the agents it creates.
        
        runner = AgentRunner(task_id)
        result = await runner.run()
        
        # Refresh the task in the test session because the runner's session updated it
        await db_session.refresh(task)

        assert status_at_pipeline_call.get("status") == "PROCESSING"
        assert result["status"] == "COMPLETED"
        
        async with shared_session_manager() as verify:
            final_task = (await verify.execute(select(Task).where(Task.id == task_id))).scalar_one()
        assert final_task.status == "COMPLETED"
        assert final_task.result is not None
        assert final_task.result["status"] == "COMPLETED"
