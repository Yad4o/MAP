"""
test_agent_fallback_integration.py
----------------------------------
Tests for agent integration with fallback engine.
"""

import pytest
import asyncio
import uuid
from unittest.mock import AsyncMock, patch, MagicMock

# Import agents
from agents.planner.planner_agent import PlannerAgent
from agents.executor.executor_agent import ExecutorAgent
from agents.shared.message import AgentMessage, AgentMetadata


class TestPlannerAgentFallback:
    """Test PlannerAgent integration with fallback engine."""
    
    @pytest.fixture
    def mock_fallback_engine(self):
        """Mock fallback engine."""
        mock_engine = AsyncMock()
        mock_engine.chat_completion.return_value = ('{"steps": [{"id": "1", "description": "Test step"}]}', True, 15, 8)
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
                    
                    # Override return value for this test - primary succeeded
                    mock_fallback_engine.chat_completion.return_value = (
                        '{"steps": [{"id": "1", "description": "Test step"}]}',
                        False,  # primary succeeded - no fallback
                        15, 8
                    )
                    
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
                    assert call_args[1]['model'] == 'gpt-4o'
                    assert call_args[1]['temperature'] == 0.7
                    
                    # Verify response structure
                    assert response.message_type == "plan"
                    assert "plan" in response.payload
                    assert response.metadata.fallback_used is False
    
    @pytest.mark.asyncio
    async def test_planner_reports_fallback_used(self, planner_agent, mock_fallback_engine):
        """Test that planner agent reports fallback usage in metadata."""
        # Mock fallback engine
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
                    
                    # Verify fallback was reported
                    assert response.metadata.fallback_used is True


class TestExecutorAgentFallback:
    """Test ExecutorAgent integration with fallback engine."""
    
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
    async def test_executor_uses_fallback_chat_model(self, executor_agent, mock_langgraph_agent):
        """Test that executor agent uses FallbackChatModel."""
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
                
                # Verify FallbackChatModel was created and used
                mock_create.assert_called_once()
                llm_arg = mock_create.call_args[0][0]  # First argument to create_react_agent
                
                # Check that it's our FallbackChatModel
                assert hasattr(llm_arg, 'fallback_ever_used')
                assert hasattr(llm_arg, 'total_tokens_in')
                assert hasattr(llm_arg, '_generate')
                
                # Verify response structure
                assert response.message_type == "step_result"
                assert "step_result" in response.payload
    
    @pytest.mark.asyncio
    async def test_executor_reports_fallback_used(self, executor_agent, mock_langgraph_agent):
        """Test that executor agent reports fallback usage in metadata."""
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
                assert isinstance(response.metadata.fallback_used, bool)


class TestFallbackChatModel:
    """Test the FallbackChatModel wrapper."""
    
    @pytest.mark.asyncio
    async def test_fallback_chat_model_integration(self):
        """Test that FallbackChatModel works with LangChain interface."""
        from agents.executor.executor_agent import FallbackChatModel
        
        # Mock fallback engine
        with patch('agents.executor.executor_agent.fallback_engine') as mock_engine:
            mock_engine.chat_completion = AsyncMock(return_value=("Test response", True, 10, 5))
            
            # Create model instance
            model = FallbackChatModel(temperature=0.2)
            
            # Test _generate method
            from langchain_core.messages import HumanMessage
            messages = [HumanMessage(content="Hello")]
            
            result = await model._generate(messages)
            
            # Verify fallback engine was called
            mock_engine.chat_completion.assert_called_once()
            call_args = mock_engine.chat_completion.call_args
            assert call_args[1]['temperature'] == 0.2
            
            # Verify result
            assert result.generations[0].message.content == "Test response"
            assert result.llm_output["fallback_used"] is True
            
            # Verify FallbackChatModel has expected fields
            assert hasattr(model, 'fallback_ever_used')
            assert hasattr(model, 'total_tokens_in')
            assert hasattr(model, 'total_tokens_out')
            assert hasattr(model, '_generate')
    
    @pytest.mark.asyncio
    async def test_fallback_chat_model_message_conversion(self):
        """Test that FallbackChatModel converts messages correctly."""
        from agents.executor.executor_agent import FallbackChatModel
        from langchain_core.messages import HumanMessage, AIMessage
        
        # Mock fallback engine
        with patch('agents.executor.executor_agent.fallback_engine') as mock_engine:
            mock_engine.chat_completion = AsyncMock(return_value=("Response", False, 8, 4))
            
            # Create model instance
            model = FallbackChatModel()
            
            # Test with different message types
            messages = [
                HumanMessage(content="User message"),
                AIMessage(content="Assistant message"),
            ]
            
            await model._generate(messages)
            
            # Verify message conversion
            call_args = mock_engine.chat_completion.call_args
            converted_messages = call_args[1]['messages']
            
            assert converted_messages[0]["role"] == "user"
            assert converted_messages[0]["content"] == "User message"
            assert converted_messages[1]["role"] == "assistant"
            assert converted_messages[1]["content"] == "Assistant message"


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
