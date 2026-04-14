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
    
    assert result["status"] == "failed"
    assert result["error"] == "Planner failed"

@pytest.mark.asyncio
async def test_agent_controller_analyzer_failure(mocker):
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
    
    # Mock memory (retrieve & store)
    mock_memory_msg = AgentMessage(
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
    
    # Mock analyzer returning failed
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
