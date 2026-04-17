import pytest
import uuid
from agents.controller.agent_controller import AgentController
from agents.shared.message import AgentMessage

@pytest.mark.asyncio
async def test_agent_controller_success(mocker):
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
    mocker.patch.object(controller.planner, "run", return_value=mock_plan_msg)
    
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
    
    mocker.patch.object(controller.memory, "run", side_effect=[mock_memory_msg, mock_memory_store_msg])
    
    # Mock executor
    mock_exec_msg = AgentMessage(
        message_id=uuid.uuid4(),
        task_id=task_id,
        sender="executor",
        recipient="controller",
        message_type="step_result",
        payload={"step_result": {"status": "completed", "output": "Done"}}
    )
    mocker.patch.object(controller.executor, "run", return_value=mock_exec_msg)
    
    # Mock analyzer
    mock_analyzer_msg = AgentMessage(
        message_id=uuid.uuid4(),
        task_id=task_id,
        sender="analyzer",
        recipient="controller",
        message_type="validation",
        payload={"validation_report": {"passed": True, "summary": "Looks good"}}
    )
    mocker.patch.object(controller.analyzer, "run", return_value=mock_analyzer_msg)
    
    result = await controller.run_pipeline()
    
    assert result["status"] == "COMPLETED"
    assert result["steps_completed"] == 1
    assert result["summary"] == "Looks good"
    assert "plan" in result
    assert "validation" in result

@pytest.mark.asyncio
async def test_agent_controller_planner_failure(mocker):
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
    mocker.patch.object(controller.planner, "run", return_value=mock_plan_msg)
    
    result = await controller.run_pipeline()
    
    assert result["status"] == "FAILED"
    assert result["error"] == "Planner failed"

@pytest.mark.asyncio
async def test_agent_controller_analyzer_failure(mocker):
    """
    When the analyzer returns passed=False the controller retries up to 2 times,
    then surfaces FAILED. Memory.retrieve is called once per execution (initial + 2
    retries = 3 retrieves) and store is called once at the end.
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
    mocker.patch.object(controller.planner, "run", return_value=mock_plan_msg)

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
    mocker.patch.object(
        controller.memory, "run",
        side_effect=[
            mock_memory_retrieve,   # initial execute_step
            mock_memory_retrieve,   # retry 1 execute_step
            mock_memory_retrieve,   # retry 2 execute_step
            mock_memory_store_msg,  # _run_memory store
        ]
    )

    # Executor uses return_value so unlimited calls succeed
    mock_exec_msg = AgentMessage(
        message_id=uuid.uuid4(),
        task_id=task_id,
        sender="executor",
        recipient="controller",
        message_type="step_result",
        payload={"step_result": {"status": "completed", "output": "Done"}}
    )
    mocker.patch.object(controller.executor, "run", return_value=mock_exec_msg)

    # Analyzer always returns failed (return_value handles multiple calls)
    mock_analyzer_msg = AgentMessage(
        message_id=uuid.uuid4(),
        task_id=task_id,
        sender="analyzer",
        recipient="controller",
        message_type="validation",
        payload={"validation_report": {"passed": False, "summary": "Failed validation"}}
    )
    mocker.patch.object(controller.analyzer, "run", return_value=mock_analyzer_msg)

    result = await controller.run_pipeline()

    assert result["status"] == "FAILED"
    assert result["steps_completed"] == 1
    assert result["summary"] == "Failed validation"
    # Confirm retries fired: executor called 3 times (initial + 2 retries)
    assert controller.executor.run.call_count == 3
    # Analyzer called 3 times (initial + 2 re-analyses)
    assert controller.analyzer.run.call_count == 3

@pytest.mark.asyncio
async def test_agent_controller_partial_retry(mocker):
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
    mocker.patch.object(controller.planner, "run", return_value=mock_plan_msg)

    # Memory retrieve/store
    mock_memory_msg = AgentMessage(
        message_id=uuid.uuid4(),
        task_id=task_id,
        sender="memory",
        recipient="controller",
        message_type="memory_context",
        payload={"memory_context": []}
    )
    mocker.patch.object(controller.memory, "run", return_value=mock_memory_msg)

    # Executor returns success
    mock_exec_msg = AgentMessage(
        message_id=uuid.uuid4(),
        task_id=task_id,
        sender="executor",
        recipient="controller",
        message_type="step_result",
        payload={"step_result": {"status": "completed", "output": "Done"}}
    )
    mocker.patch.object(controller.executor, "run", return_value=mock_exec_msg)

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
    mocker.patch.object(controller.analyzer, "run", side_effect=[mock_analyzer_msg_fail, mock_analyzer_msg_pass])

    result = await controller.run_pipeline()

    assert result["status"] == "COMPLETED"
    
    # 2 initial steps + 1 retry of step 2 = 3 executor calls
    assert controller.executor.run.call_count == 3
    
    # Verify the 3rd call was specifically for step 2
    retry_call = controller.executor.run.call_args_list[2][0][0]
    assert str(retry_call.payload["step"]["id"]) == "2"

@pytest.mark.asyncio
async def test_agent_controller_multi_step_success(mocker):
    task_id = uuid.uuid4()
    controller = AgentController(task_id, "Test task")

    mock_plan_msg = AgentMessage(
        message_id=uuid.uuid4(), task_id=task_id, sender="planner", recipient="controller",
        message_type="plan", payload={"plan": {"steps": [{"id": 1, "description": "Step 1"}, {"id": 2, "description": "Step 2"}]}}
    )
    mocker.patch.object(controller.planner, "run", return_value=mock_plan_msg)

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
    mocker.patch.object(controller.memory, "run", side_effect=[mock_memory_msg_1, mock_memory_msg_2, mock_store_msg])

    mock_exec_msg_1 = AgentMessage(
        message_id=uuid.uuid4(), task_id=task_id, sender="executor", recipient="controller",
        message_type="step_result", payload={"step_result": {"status": "completed", "output": "Done 1"}}
    )
    mock_exec_msg_2 = AgentMessage(
        message_id=uuid.uuid4(), task_id=task_id, sender="executor", recipient="controller",
        message_type="step_result", payload={"step_result": {"status": "completed", "output": "Done 2"}}
    )
    mocker.patch.object(controller.executor, "run", side_effect=[mock_exec_msg_1, mock_exec_msg_2])

    mock_analyzer_msg = AgentMessage(
        message_id=uuid.uuid4(), task_id=task_id, sender="analyzer", recipient="controller",
        message_type="validation", payload={"validation_report": {"passed": True, "summary": "All good", "failed_steps": []}}
    )
    mocker.patch.object(controller.analyzer, "run", return_value=mock_analyzer_msg)

    result = await controller.run_pipeline()

    # Test 7
    assert result["steps_completed"] == 2
    
    # Test 3
    assert controller.memory.run.call_count == 3
    retrieve_calls = [call for call in controller.memory.run.call_args_list if call[0][0].message_type == "retrieve"]
    assert len(retrieve_calls) == 2
    
    # Test 4
    assert controller.executor.run.call_count == 2
    exec_call_1 = controller.executor.run.call_args_list[0][0][0]
    assert exec_call_1.message_type == "execute_step"
    assert exec_call_1.payload["step"]["description"] == "Step 1"
    assert exec_call_1.payload["context"] == [{"text": "context 1"}]

    exec_call_2 = controller.executor.run.call_args_list[1][0][0]
    assert exec_call_2.payload["step"]["description"] == "Step 2"
    assert exec_call_2.payload["context"] == [{"text": "context 2"}]

    # Test 5
    assert controller.analyzer.run.call_count == 1

    # Test 6
    store_call = controller.memory.run.call_args_list[2][0][0]
    assert store_call.message_type == "store"
    assert store_call.payload["text"] == "All good"

@pytest.mark.asyncio
async def test_agent_controller_memory_context_prior_task(mocker):
    # Test 10
    task_id = uuid.uuid4()
    controller = AgentController(task_id, "Test task 2")

    mock_plan_msg = AgentMessage(
        message_id=uuid.uuid4(), task_id=task_id, sender="planner", recipient="controller",
        message_type="plan", payload={"plan": {"steps": [{"id": 1, "description": "Step 1"}]}}
    )
    mocker.patch.object(controller.planner, "run", return_value=mock_plan_msg)

    mock_memory_msg = AgentMessage(
        message_id=uuid.uuid4(), task_id=task_id, sender="memory", recipient="controller",
        message_type="memory_context", payload={"memory_context": [{"text": "Past task result context"}]}
    )
    mock_store_msg = AgentMessage(
        message_id=uuid.uuid4(), task_id=task_id, sender="memory", recipient="controller",
        message_type="memory_stored", payload={"memory_stored": True}
    )
    mocker.patch.object(controller.memory, "run", side_effect=[mock_memory_msg, mock_store_msg])

    mock_exec_msg = AgentMessage(
        message_id=uuid.uuid4(), task_id=task_id, sender="executor", recipient="controller",
        message_type="step_result", payload={"step_result": {"status": "completed", "output": "Done 1"}}
    )
    mocker.patch.object(controller.executor, "run", return_value=mock_exec_msg)

    mock_analyzer_msg = AgentMessage(
        message_id=uuid.uuid4(), task_id=task_id, sender="analyzer", recipient="controller",
        message_type="validation", payload={"validation_report": {"passed": True, "summary": "Looks good"}}
    )
    mocker.patch.object(controller.analyzer, "run", return_value=mock_analyzer_msg)

    result = await controller.run_pipeline()
    assert result["status"] == "COMPLETED"
    
    exec_call = controller.executor.run.call_args_list[0][0][0]
    assert exec_call.payload["context"] == [{"text": "Past task result context"}]

@pytest.mark.asyncio
async def test_end_to_end_task_status_transitions_and_retrieve(engine, db_session, mocker):
    """
    Integration tests 8 & 9 using the real test DB (SQLite via conftest fixtures).

    Test 8: task.status is "PROCESSING" at the moment AgentController.run_pipeline is invoked.
    Test 9: after AgentRunner.run() returns, the DB row has status="COMPLETED" and the
            result payload is persisted.
    """
    from sqlalchemy.ext.asyncio import AsyncSession
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy import select
    from app.db.models.user import User
    from app.db.models.task import Task
    from app.worker.agent_runner import AgentRunner
    from agents.controller.agent_controller import AgentController

    # ── 1. Seed: create a user and a task in the test DB ─────────────────────
    user = User(email="runner_e2e@test.com", username="e2erunner", password_hash="hash")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    task = Task(
        user_id=user.id,
        title="E2E Pipeline Task",
        description="Integration test description",
        status="PENDING",
    )
    db_session.add(task)
    await db_session.commit()
    await db_session.refresh(task)
    task_id = task.id

    # ── 2. Session factory backed by the test engine ──────────────────────────
    # StaticPool means all connections share the same in-memory SQLite DB, so
    # commits made inside AgentRunner are visible to our verification queries.
    TestSession = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    # ── 3. Capture task.status at the moment run_pipeline is called (Test 8) ──
    status_at_pipeline_call = {}

    async def mock_run_pipeline(self):
        """
        Runs in place of the real AgentController.run_pipeline.
        Opens a fresh session to read the task status from the DB — it should
        already be PROCESSING because AgentRunner committed before calling this.
        """
        async with TestSession() as s:
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

    mocker.patch.object(AgentController, "run_pipeline", mock_run_pipeline)
    
    # Also mock __init__ to avoid instantiating real agents (which require API keys)
    def mock_init(self, task_id, task_description, config=None):
        self.task_id = task_id
        self.task_description = task_description
        self.config = config
    mocker.patch.object(AgentController, "__init__", mock_init)

    # ── 4. Redirect AsyncSessionLocal inside AgentRunner to the test engine ───
    # AgentRunner imports AsyncSessionLocal inside run(), so we patch its source.
    mocker.patch("app.db.base.AsyncSessionLocal", TestSession)

    # ── 5. Execute ────────────────────────────────────────────────────────────
    runner = AgentRunner(task_id)
    result = await runner.run()

    # ── Test 8: status was PROCESSING when run_pipeline was invoked ───────────
    assert status_at_pipeline_call.get("status") == "PROCESSING", (
        f"Expected PROCESSING at pipeline call time, got {status_at_pipeline_call.get('status')!r}"
    )

    # ── Test 9: final status and result are persisted in the DB ──────────────
    assert result["status"] == "COMPLETED"
    async with TestSession() as verify:
        final_task = (await verify.execute(select(Task).where(Task.id == task_id))).scalar_one()
    assert final_task.status == "COMPLETED"
    assert final_task.result is not None
    assert final_task.result["status"] == "COMPLETED"
