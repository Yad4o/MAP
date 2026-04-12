"""
tests/agents/test_planner_agent.py
─────────────────────────────────
Tests for the PlannerAgent and related prompt logic.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import uuid
import json

from app.agents.planner_agent import PlannerAgent
from app.agents.prompts import build_planner_prompt, PLANNER_SYSTEM_PROMPT
from app.schemas.agent import AgentMessage

@pytest.fixture
def planner_agent():
    # Patch ChatOpenAI to avoid real API calls
    with patch("app.agents.planner_agent.ChatOpenAI") as mock_llm_class:
        mock_llm_instance = mock_llm_class.return_value
        mock_llm_instance.ainvoke = AsyncMock()
        agent = PlannerAgent()
        yield agent

@pytest.mark.asyncio
async def test_planner_returns_valid_plan(planner_agent):
    """Verify returns AgentMessage with message_type='plan' and valid steps array."""
    task_description = "Research the capital of France"
    task_id = uuid.uuid4()
    
    # Mock successful LLM response
    mock_response = MagicMock()
    mock_response.content = json.dumps({
        "steps": [
            {
                "step_id": "1",
                "description": "Identify the capital of France",
                "assigned_agent": "executor",
                "tool_names": ["search"]
            }
        ],
        "estimated_total_duration_s": 5
    })
    mock_response.response_metadata = {
        "token_usage": {
            "prompt_tokens": 50,
            "completion_tokens": 100
        }
    }
    planner_agent.llm.ainvoke.return_value = mock_response
    
    result = await planner_agent.run(task_description, task_id)
    
    # Acceptance Criteria: Returns AgentMessage with message_type="plan" and valid steps array
    assert isinstance(result, AgentMessage)
    assert result.message_type == "plan"
    assert "plan" in result.payload
    plan = result.payload["plan"]
    assert len(plan["steps"]) == 1
    
    # Acceptance Criteria: Each step has step_id, description, tool_names, assigned_agent
    step = plan["steps"][0]
    assert "step_id" in step
    assert "description" in step
    assert "tool_names" in step
    assert "assigned_agent" in step
    
    # Acceptance Criteria: metadata.model_used is populated
    assert result.metadata.model_used is not None
    assert result.metadata.tokens_in == 50
    assert result.metadata.tokens_out == 100
    assert result.metadata.latency_ms >= 0

@pytest.mark.asyncio
async def test_planner_retries_on_bad_json(planner_agent):
    """Verify bad JSON from LLM triggers retry."""
    task_id = uuid.uuid4()
    
    # First response: invalid JSON
    bad_response = MagicMock()
    bad_response.content = "Wait, let me think... here is the plan: { oops"
    
    # Second response: valid JSON with markdown fences
    good_response = MagicMock()
    good_response.content = "```json\n{\"steps\": [{\"step_id\": \"1\", \"description\": \"Final Step\", \"assigned_agent\": \"executor\", \"tool_names\": []}]}\n```"
    good_response.response_metadata = {"token_usage": {}}
    
    planner_agent.llm.ainvoke.side_effect = [bad_response, good_response]
    
    result = await planner_agent.run("Simple task", task_id)
    
    assert result.message_type == "plan"
    assert len(result.payload["plan"]["steps"]) == 1
    assert planner_agent.llm.ainvoke.call_count == 2

@pytest.mark.asyncio
async def test_planner_fails_after_max_retries(planner_agent):
    """Verify error response after two failed attempts."""
    task_id = uuid.uuid4()
    
    bad_response = MagicMock()
    bad_response.content = "Invalid JSON again"
    planner_agent.llm.ainvoke.return_value = bad_response
    
    result = await planner_agent.run("Broken task", task_id)
    
    assert result.message_type == "error"
    assert "failed to generate" in result.payload["error"]
    assert planner_agent.llm.ainvoke.call_count == 2

def test_planner_prompt_logic():
    """Verify prompt utility and system prompt content."""
    task = "Find capital of France"
    user_prompt = build_planner_prompt(task)
    assert task in user_prompt
    
    # Acceptance Criteria: "Never include more than 8 steps"
    assert "Never include more than 8 steps" in PLANNER_SYSTEM_PROMPT
    # Acceptance Criteria: "For simple tasks... output exactly 1 step"
    assert "output exactly 1 step" in PLANNER_SYSTEM_PROMPT
    # Acceptance Criteria: FEW-SHOT EXAMPLE
    assert "Few-shot Example" in PLANNER_SYSTEM_PROMPT

@pytest.mark.asyncio
async def test_planner_strips_markdown_fences(planner_agent):
    """Verify markdown fences are correctly stripped."""
    task_id = uuid.uuid4()
    mock_response = MagicMock()
    mock_response.content = "```json\n{\"steps\": []}\n```" # empty steps but valid JSON
    mock_response.response_metadata = {}
    planner_agent.llm.ainvoke.return_value = mock_response
    
    # Note: our implementation validates non-empty steps, so let's use a non-empty one
    mock_response.content = "```json\n{\"steps\": [{\"step_id\": \"1\", \"description\": \"X\", \"assigned_agent\": \"Y\", \"tool_names\": []}]}\n```"
    
    result = await planner_agent.run("test", task_id)
    assert result.message_type == "plan"

@pytest.mark.asyncio
async def test_planner_handles_string_task_id(planner_agent):
    """Verify PlannerAgent handles task_id passed as string."""
    task_id_str = str(uuid.uuid4())
    mock_response = MagicMock()
    mock_response.content = json.dumps({"steps": [{"step_id": "1", "description": "X", "assigned_agent": "executor", "tool_names": []}]})
    mock_response.response_metadata = {}
    planner_agent.llm.ainvoke.return_value = mock_response
    
    result = await planner_agent.run("test", task_id_str)
    assert isinstance(result.task_id, uuid.uuid.UUID if hasattr(uuid, "uuid") else uuid.UUID)
    assert str(result.task_id) == task_id_str

@pytest.mark.asyncio
async def test_planner_retry_contains_feedback(planner_agent):
    """Verify that retries include error feedback in message chain."""
    task_id = uuid.uuid4()
    
    bad_resp = MagicMock(content="bad json")
    good_resp = MagicMock(content=json.dumps({"steps": [{"step_id": "1", "description": "X", "assigned_agent": "executor", "tool_names": []}]}), response_metadata={})
    
    planner_agent.llm.ainvoke.side_effect = [bad_resp, good_resp]
    
    await planner_agent.run("test", task_id)
    
    # Check the second call to ainvoke
    # Call 1: messages = [System, Human(task)]
    # Call 2: messages = [System, Human(task), Human(bad_resp), Human(feedback)]
    call_args = planner_agent.llm.ainvoke.call_args_list[1]
    messages = call_args[0][0]
    assert len(messages) == 4
    assert "failed validation" in messages[-1].content
    assert "bad json" in messages[-2].content

@pytest.mark.asyncio
async def test_planner_fails_on_empty_steps_array(planner_agent):
    """Verify validation fails if steps array is empty."""
    task_id = uuid.uuid4()
    mock_response = MagicMock(content=json.dumps({"steps": []}), response_metadata={})
    planner_agent.llm.ainvoke.return_value = mock_response
    
    result = await planner_agent.run("test", task_id)
    assert result.message_type == "error"
    assert "non-empty 'steps' array" in result.payload["error"]

@pytest.mark.asyncio
async def test_planner_uses_default_model_in_metadata(planner_agent):
    """Verify model_used in metadata matches settings.DEFAULT_MODEL."""
    task_id = uuid.uuid4()
    mock_response = MagicMock()
    mock_response.content = json.dumps({"steps": [{"step_id": "1", "description": "X", "assigned_agent": "executor", "tool_names": []}]})
    mock_response.response_metadata = {}
    planner_agent.llm.ainvoke.return_value = mock_response
    
    from app.config import settings
    result = await planner_agent.run("test", task_id)
    assert result.metadata.model_used == settings.DEFAULT_MODEL
