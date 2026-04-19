"""
tests/agents/test_planner_agent.py
─────────────────────────────────
Tests for the PlannerAgent and related prompt logic.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import uuid
import json

from agents.planner.planner_agent import PlannerAgent
from agents.planner.prompts import build_planner_prompt, PLANNER_SYSTEM_PROMPT
from agents.shared.message import AgentMessage, AgentMetadata

@pytest.fixture
def planner_agent():
    task_id = uuid.uuid4()
    agent = PlannerAgent(task_id=task_id)
    return agent

def build_test_message(task_description, task_id):
    """Helper to build an input message for the planner."""
    return AgentMessage(
        message_id=uuid.uuid4(),
        task_id=task_id,
        sender="controller",
        recipient="planner",
        message_type="command",
        payload={"task_description": task_description}
    )

@pytest.mark.asyncio
async def test_planner_returns_valid_plan(planner_agent):
    """Verify returns AgentMessage with message_type='plan' and valid steps array."""
    task_description = "Research the capital of France"
    task_id = planner_agent.task_id
    message = build_test_message(task_description, task_id)
    
    # Mock successful LLM response
    plan_data = {
        "task_type": "research",
        "steps": [
            {
                "step_id": "step_1",
                "description": "Identify the capital of France",
                "assigned_agent": "executor",
                "tool_names": ["search"],
                "dependency_step_ids": []
            }
        ],
        "estimated_total_duration_s": 5
    }
    
    with patch("agents.planner.planner_agent.fallback_engine.chat_completion", new_callable=AsyncMock) as mock_chat:
        mock_chat.return_value = (json.dumps(plan_data), False, 50, 100)
        
        result = await planner_agent.run(message)
        
        assert isinstance(result, AgentMessage)
        assert result.message_type == "plan"
        assert "plan" in result.payload
        plan = result.payload["plan"]
        assert len(plan["steps"]) == 1
        
        assert result.metadata.tokens_in == 50
        assert result.metadata.tokens_out == 100

@pytest.mark.asyncio
async def test_planner_retries_on_bad_json(planner_agent):
    """Verify bad JSON from LLM triggers retry."""
    task_id = planner_agent.task_id
    message = build_test_message("test", task_id)
    
    # First response: invalid JSON
    bad_content = "Wait, let me think... here is the plan: { oops"
    # Second response: valid JSON
    good_content = json.dumps({"steps": [{"step_id": "step_1", "description": "Final Step", "assigned_agent": "executor", "tool_names": []}]})
    
    with patch("agents.planner.planner_agent.fallback_engine.chat_completion", new_callable=AsyncMock) as mock_chat:
        mock_chat.side_effect = [
            (bad_content, False, 10, 10),
            (good_content, False, 20, 20)
        ]
        
        result = await planner_agent.run(message)
        
        assert result.message_type == "plan"
        assert len(result.payload["plan"]["steps"]) == 1
        assert mock_chat.call_count == 2

@pytest.mark.asyncio
async def test_planner_fails_after_max_retries(planner_agent):
    """Verify error response after two failed attempts."""
    task_id = planner_agent.task_id
    message = build_test_message("test", task_id)
    
    with patch("agents.planner.planner_agent.fallback_engine.chat_completion", new_callable=AsyncMock) as mock_chat:
        mock_chat.return_value = ("Invalid JSON again", False, 10, 10)
        
        result = await planner_agent.run(message)
        
        assert result.message_type == "error"
        assert "failed to generate" in result.payload["error"].lower()
        assert mock_chat.call_count == 2  # exactly 1 original + 1 retry

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
    task_id = planner_agent.task_id
    message = build_test_message("test", task_id)
    
    content = "```json\n{\"steps\": [{\"step_id\": \"step_1\", \"description\": \"X\", \"assigned_agent\": \"executor\", \"tool_names\": []}]}\n```"
    
    with patch("agents.planner.planner_agent.fallback_engine.chat_completion", new_callable=AsyncMock) as mock_chat:
        mock_chat.return_value = (content, False, 0, 0)
        
        result = await planner_agent.run(message)
        assert result.message_type == "plan"

@pytest.mark.asyncio
async def test_planner_retry_contains_feedback(planner_agent):
    """Verify that retries include error feedback in message chain."""
    task_id = planner_agent.task_id
    message = build_test_message("test", task_id)
    
    bad_content = "bad json"
    good_content = json.dumps({"steps": [{"step_id": "step_1", "description": "X", "assigned_agent": "executor", "tool_names": []}]})
    
    with patch("agents.planner.planner_agent.fallback_engine.chat_completion", new_callable=AsyncMock) as mock_chat:
        mock_chat.side_effect = [
            (bad_content, False, 0, 0),
            (good_content, False, 0, 0)
        ]
        
        await planner_agent.run(message)
        
        # Check the second call to chat_completion
        call_args = mock_chat.call_args_list[1]
        messages = call_args[1]["messages"]
        assert len(messages) == 4
        assert messages[-2]["role"] == "assistant"
        assert messages[-1]["role"] == "user"
        assert "bad json" in messages[-2]["content"]
        assert "failed validation" in messages[-1]["content"]

@pytest.mark.asyncio
async def test_planner_uses_default_model_in_metadata(planner_agent):
    """Verify model_used in metadata matches settings.DEFAULT_MODEL."""
    task_id = planner_agent.task_id
    message = build_test_message("test", task_id)
    
    content = json.dumps({"steps": [{"step_id": "step_1", "description": "X", "assigned_agent": "executor", "tool_names": []}]})
    
    with patch("agents.planner.planner_agent.fallback_engine.chat_completion", new_callable=AsyncMock) as mock_chat:
        mock_chat.return_value = (content, False, 0, 0)
        
        from backend.app.config import settings
        result = await planner_agent.run(message)
        assert result.metadata.model_used == settings.DEFAULT_MODEL

@pytest.mark.asyncio
async def test_simple_task_sends_one_step_constraint(planner_agent):
    """Verify the system prompt containing the 1-step constraint is passed to the LLM for simple tasks."""
    task_id = planner_agent.task_id
    message = build_test_message("What is the capital of France?", task_id)
    
    content = json.dumps({"steps": [{"step_id": "step_1", "description": "X", "assigned_agent": "executor", "tool_names": []}]})
    
    with patch("agents.planner.planner_agent.fallback_engine.chat_completion", new_callable=AsyncMock) as mock_chat:
        mock_chat.return_value = (content, False, 0, 0)
        
        await planner_agent.run(message)
        
        call_args = mock_chat.call_args_list[0]
        messages = call_args[1]["messages"]
        system_content = messages[0]["content"]
        assert "output exactly 1 step" in system_content
