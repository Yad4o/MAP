"""
test_agent_fallback_integration.py
----------------------------------
Tests for agent integration with the simplified fallback engine.
"""

import pytest
import asyncio
import uuid
from unittest.mock import AsyncMock, patch, MagicMock

# Import agents
from agents.planner.planner_agent import PlannerAgent
from agents.executor.executor_agent import ExecutorAgent
from agents.shared.message import AgentMessage, AgentMetadata
from app.config import settings


class TestPlannerAgentFallback:
    """Test PlannerAgent integration with fallback engine."""
    
    @pytest.fixture
    def mock_fallback_engine(self):
        """Mock fallback engine."""
        mock_engine = AsyncMock()
        mock_engine.chat_completion.return_value = ('{"steps": [{"id": "1", "description": "Test step"}]}', False, 15, 8)
        return mock_engine
    
    @pytest.fixture
    def planner_agent(self):
        """Create planner agent instance."""
        task_id = uuid.uuid4()
        return PlannerAgent(task_id)
    
    @pytest.mark.asyncio
    async def test_planner_uses_fallback_engine(self, planner_agent, mock_fallback_engine):
        """Test that planner agent uses fallback engine."""
        with patch('agents.planner.planner_agent.fallback_engine', mock_fallback_engine):
            with patch('backend.app.config.settings.DEFAULT_MODEL', 'gpt-4o'):
                with patch('backend.app.config.settings.PLANNER_TEMPERATURE', 0.7):
                    
                    # Create test message
                    message = AgentMessage(
                        message_id=uuid.uuid4(),
                        task_id=planner_agent.task_id,
                        sender="controller",
                        recipient="planner",
                        message_type="plan_request",
                        payload={"task_description": "Test task"},
                    )
                    
                    # Run planner
                    response = await planner_agent.run(message)
                    
                    # Verify fallback engine was called
                    mock_fallback_engine.chat_completion.assert_called_once()
                    call_args = mock_fallback_engine.chat_completion.call_args
                    assert call_args[1]['model'] == settings.DEFAULT_MODEL
                    assert call_args[1]['temperature'] == 0.7
                    
                    # Verify response structure
                    assert response.message_type == "plan"
                    assert "plan" in response.payload
                    assert response.metadata.fallback_used is False


class TestExecutorAgentFallback:
    """Test ExecutorAgent integration with direct Groq call."""
    
    @pytest.fixture
    def executor_agent(self):
        """Create executor agent instance."""
        task_id = uuid.uuid4()
        return ExecutorAgent(task_id)
    
    @pytest.fixture
    def mock_langgraph_agent(self):
        """Mock LangGraph agent."""
        mock_agent = AsyncMock()
        mock_result = {
            "messages": [MagicMock(content="Test response", usage_metadata=None, response_metadata={})]
        }
        mock_agent.ainvoke.return_value = mock_result
        return mock_agent
    
    @pytest.mark.asyncio
    async def test_executor_reports_fallback_used_false(self, executor_agent, mock_langgraph_agent):
        """Test that executor agent reports fallback_used=False in metadata."""
        with patch('agents.executor.executor_agent.create_react_agent') as mock_create:
            mock_create.return_value = mock_langgraph_agent
            with patch('backend.app.config.settings.EXECUTOR_TEMPERATURE', 0.2):
                
                # Create test message
                step = {"id": "1", "description": "Test step", "tool_names": ["web_search"]}
                message = AgentMessage(
                    message_id=uuid.uuid4(),
                    task_id=executor_agent.task_id,
                    sender="controller",
                    recipient="executor",
                    message_type="step_execution",
                    payload={"step": step, "context": []},
                )
                
                # Run executor
                response = await executor_agent.run(message)
                
                # Verify metadata includes fallback_used field
                assert hasattr(response.metadata, 'fallback_used')
                assert response.metadata.fallback_used is False


class TestAgentMetadataFallback:
    """Test fallback_used field in AgentMetadata."""
    
    def test_agent_metadata_serialization(self):
        """Test that fallback_used is included in message serialization."""
        metadata = AgentMetadata(
            model_used="gpt-4o",
            tokens_in=100,
            tokens_out=50,
            latency_ms=1000,
            fallback_used=True
        )
        
        message = AgentMessage(
            message_id=uuid.uuid4(),
            task_id=uuid.uuid4(),
            sender="planner",
            recipient="controller",
            message_type="plan",
            payload={"test": "data"},
            metadata=metadata
        )
        
        # Test serialization
        message_dict = message.to_dict()
        
        assert message_dict["metadata"]["fallback_used"] is True
        assert message_dict["metadata"]["model_used"] == "gpt-4o"
    
    def test_agent_metadata_defaults(self):
        """Test AgentMetadata defaults."""
        metadata = AgentMetadata()
        
        assert metadata.fallback_used is False
        assert metadata.tokens_in == 0
        assert metadata.tokens_out == 0
        assert metadata.latency_ms == 0
        assert metadata.model_used is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
