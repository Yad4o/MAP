"""
tests/agents/test_executor_agent.py
________________________________
Tests for the ExecutorAgent and its tools.

Tests cover:
- WebSearchTool functionality
- FileReaderTool functionality  
- CodeInterpreterTool functionality
- ExecutorAgent.run() with ReAct loop
- Integration tests for tool selection and execution
"""

import pytest
import asyncio
import os
import tempfile
import time
from unittest.mock import AsyncMock, MagicMock, patch
import uuid
from datetime import datetime

from agents.executor.executor_agent import ExecutorAgent
from agents.executor.tools.web_search import WebSearchTool
from agents.executor.tools.file_reader import FileReaderTool
from agents.executor.tools.code_interpreter import CodeInterpreterTool
from agents.shared.message import AgentMessage, AgentMetadata
from langchain_core.messages import AIMessage, ToolMessage


class TestWebSearchTool:
    """Test suite for WebSearchTool"""

    @pytest.fixture
    def web_search_tool(self):
        return WebSearchTool()

    @pytest.mark.asyncio
    async def test_web_search_returns_results(self, web_search_tool):
        """Test WebSearchTool returns real results for a test query"""
        with patch('agents.executor.tools.web_search.DDGS') as mock_ddgs:
            # Mock DDGS response
            mock_ddgs_instance = MagicMock()
            mock_ddgs.return_value = mock_ddgs_instance
            mock_ddgs_instance.text.return_value = [
                {
                    'title': 'Python Tutorial',
                    'href': 'https://example.com/python',
                    'body': 'Learn Python programming'
                },
                {
                    'title': 'Python Docs',
                    'href': 'https://docs.python.org',
                    'body': 'Official Python documentation'
                }
            ]
            
            result = await web_search_tool._arun("Python programming", num_results=2)
            
            assert "Python Tutorial" in result
            assert "https://example.com/python" in result
            assert "Learn Python programming" in result
            assert "Python Docs" in result
            assert "https://docs.python.org" in result
            assert "Official Python documentation" in result

    @pytest.mark.asyncio
    async def test_web_search_no_results(self, web_search_tool):
        """Test WebSearchTool handles no results gracefully"""
        with patch('agents.executor.tools.web_search.DDGS') as mock_ddgs:
            mock_ddgs_instance = MagicMock()
            mock_ddgs.return_value = mock_ddgs_instance
            mock_ddgs_instance.text.return_value = []
            
            result = await web_search_tool._arun("nonexistent query")
            
            assert "No results found" in result

    def test_web_search_sync_run_returns_formatted_results(self, web_search_tool):
        """Test _run method returns properly formatted results from sync execution"""
        with patch('agents.executor.tools.web_search.DDGS') as mock_ddgs:
            # Mock DDGS response
            mock_ddgs_instance = MagicMock()
            mock_ddgs.return_value = mock_ddgs_instance
            mock_ddgs_instance.text.return_value = [
                {
                    'title': 'Test Result',
                    'href': 'https://example.com',
                    'body': 'Test summary'
                }
            ]
            
            result = web_search_tool._run("test query", num_results=1)
            
            assert "Test Result" in result
            assert "https://example.com" in result
            assert "Test summary" in result
            # Verify DDGS was called directly (not through asyncio.run)
            mock_ddgs.assert_called_once()
            mock_ddgs_instance.text.assert_called_once_with("test query", max_results=1)

    def test_web_search_sync_run_no_results(self, web_search_tool):
        """Test _run method handles no results correctly"""
        with patch('agents.executor.tools.web_search.DDGS') as mock_ddgs:
            mock_ddgs_instance = MagicMock()
            mock_ddgs.return_value = mock_ddgs_instance
            mock_ddgs_instance.text.return_value = []  # No results
            
            result = web_search_tool._run("test query", num_results=5)
            
            assert "No results found" in result
            assert result == "No results found for query: test query"
            # Verify DDGS was called correctly
            mock_ddgs.assert_called_once()
            mock_ddgs_instance.text.assert_called_once_with("test query", max_results=5)

    @pytest.mark.asyncio
    async def test_web_search_dependency_missing(self, web_search_tool):
        """Test WebSearchTool handles missing DDGS dependency"""
        with patch('agents.executor.tools.web_search.DDGS', None):
            result = await web_search_tool._arun("test query")
            assert "'duckduckgo-search' package is not installed" in result


class TestFileReaderTool:
    """Test suite for FileReaderTool"""

    @pytest.fixture
    def file_reader_tool(self):
        return FileReaderTool()

    def test_file_reader_reads_txt_file(self, file_reader_tool):
        """Test FileReaderTool reads a .txt file"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as f:
            f.write("This is a test file.\nIt contains multiple lines.\nTesting FileReaderTool.")
            temp_file = f.name
        
        try:
            result = file_reader_tool._run(temp_file)
            assert "This is a test file" in result
            assert "It contains multiple lines" in result
            assert "Testing FileReaderTool" in result
        finally:
            os.unlink(temp_file)

    def test_file_reader_reads_md_file(self, file_reader_tool):
        """Test FileReaderTool reads a .md file"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False, encoding='utf-8') as f:
            f.write("# Test Markdown\n\nThis is a **test** markdown file.")
            temp_file = f.name
        
        try:
            result = file_reader_tool._run(temp_file)
            assert "# Test Markdown" in result
            assert "This is a **test** markdown file" in result
        finally:
            os.unlink(temp_file)

    def test_file_reader_reads_json_file(self, file_reader_tool):
        """Test FileReaderTool reads a .json file"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False, encoding='utf-8') as f:
            f.write('{"test": "value", "number": 42}')
            temp_file = f.name
        
        try:
            result = file_reader_tool._run(temp_file)
            assert '"test": "value"' in result
            assert '"number": 42' in result
        finally:
            os.unlink(temp_file)

    def test_file_reader_reads_csv_file(self, file_reader_tool):
        """Test FileReaderTool reads a .csv file"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as f:
            f.write('name,age,city\nJohn,25,NYC\nJane,30,LA')
            temp_file = f.name
        
        try:
            result = file_reader_tool._run(temp_file)
            assert 'name,age,city' in result
            assert 'John,25,NYC' in result
            assert 'Jane,30,LA' in result
        finally:
            os.unlink(temp_file)

    def test_file_reader_missing_file(self, file_reader_tool):
        """Test FileReaderTool handles missing file"""
        result = file_reader_tool._run("nonexistent_file.txt")
        assert "File not found" in result

    def test_file_reader_unsupported_extension(self, file_reader_tool):
        """Test FileReaderTool handles unsupported file extension"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.exe', delete=False) as f:
            f.write("binary content")
            temp_file = f.name
        
        try:
            result = file_reader_tool._run(temp_file)
            assert "Unsupported file extension" in result
        finally:
            os.unlink(temp_file)

    def test_file_reader_max_chars_limit(self, file_reader_tool):
        """Test FileReaderTool respects max_chars parameter"""
        long_content = "A" * 1000  # Create content longer than default limit
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as f:
            f.write(long_content)
            temp_file = f.name
        
        try:
            result = file_reader_tool._run(temp_file, max_chars=100)
            assert len(result) <= 100
            assert "A" * 100 == result[:100]
        finally:
            os.unlink(temp_file)

    def test_file_reader_pdf_dependency_missing(self, file_reader_tool):
        """Test FileReaderTool handles missing pypdf dependency"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.pdf', delete=False) as f:
            f.write("fake pdf content")
            temp_file = f.name
        
        try:
            with patch('agents.executor.tools.file_reader.PdfReader', None):
                result = file_reader_tool._run(temp_file)
                assert "pypdf package not installed" in result
        finally:
            os.unlink(temp_file)

    @pytest.mark.asyncio
    async def test_file_reader_async_wrapper(self, file_reader_tool):
        """Test _arun method runs blocking I/O in thread pool executor"""
        # Test that _arun properly uses thread pool for async I/O
        with patch.object(file_reader_tool, '_run', return_value="test result") as mock_run:
            result = await file_reader_tool._arun("test_file.txt")
            assert result == "test result"
            mock_run.assert_called_once_with("test_file.txt", 10000)

    @pytest.mark.asyncio
    async def test_file_reader_async_io_performance(self, file_reader_tool):
        """Test FileReaderTool async I/O doesn't block event loop"""
        # Create a temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as f:
            f.write("Test content for async I/O")
            temp_file = f.name
        
        try:
            # This should not block the event loop
            start_time = time.time()
            result = await file_reader_tool._arun(temp_file)
            end_time = time.time()
            
            # Verify result and that it completed quickly
            assert "Test content for async I/O" in result
            assert (end_time - start_time) < 1.0  # Should be very fast
            
        finally:
            # Clean up
            if os.path.exists(temp_file):
                os.unlink(temp_file)


class TestCodeInterpreterTool:
    """Test suite for CodeInterpreterTool"""

    @pytest.fixture
    def code_interpreter_tool(self):
        return CodeInterpreterTool()

    def test_code_interpreter_executes_simple_python(self, code_interpreter_tool):
        """Test CodeInterpreterTool executes simple Python and returns output"""
        code = """
print('Hello, World!')
result = 2 + 3
print(f'2 + 3 = {result}')
"""
        result = code_interpreter_tool._run(code)
        assert "Hello, World!" in result
        assert "2 + 3 = 5" in result
        assert "Output:" in result

    def test_code_interpreter_math_functions(self, code_interpreter_tool):
        """Test CodeInterpreterTool supports math functions"""
        code = """
# Math module is already available in restricted_globals
print(f'Pi = {math.pi}')
print(f'Sqrt(16) = {math.sqrt(16)}')
"""
        result = code_interpreter_tool._run(code)
        assert "Pi =" in result
        assert "3.14159" in result
        assert "Sqrt(16) = 4.0" in result

    def test_code_interpreter_no_output(self, code_interpreter_tool):
        """Test CodeInterpreterTool handles code with no output"""
        code = "x = 42  # No print statement"
        result = code_interpreter_tool._run(code)
        assert "executed successfully" in result.lower()

    def test_code_interpreter_syntax_error(self, code_interpreter_tool):
        """Test CodeInterpreterTool handles syntax errors gracefully"""
        code = "print('unclosed string"
        result = code_interpreter_tool._run(code)
        assert "Error executing code" in result

    def test_code_interpreter_runtime_error(self, code_interpreter_tool):
        """Test CodeInterpreterTool handles runtime errors gracefully"""
        code = "print(undefined_variable)"
        result = code_interpreter_tool._run(code)
        assert "Error executing code" in result

    def test_code_interpreter_restricted_namespace(self, code_interpreter_tool):
        """Test CodeInterpreterTool uses restricted namespace"""
        code = """
# Try to access unsafe builtins
try:
    eval('print("unsafe")')
except NameError:
    print("eval not available")

# Try to use __import__ to escape sandbox
try:
    os = __import__('os')
    print("__import__ available - SECURITY BREACH")
except NameError:
    print("__import__ not available - sandbox secure")
"""
        result = code_interpreter_tool._run(code)
        # The tool always echoes the input source in a fenced code block
        # ahead of the real output (see code_interpreter.py docstring), so
        # asserting against the full `result` false-positives here: the
        # literal string "SECURITY BREACH" appears in the *source* as an
        # unexecuted print() argument, even though it never actually runs.
        # Check only the real execution output instead.
        output_section = result.split("Output:\n", 1)[-1] if "Output:\n" in result else result
        assert "eval not available" in output_section
        assert "__import__ not available" in output_section
        assert "SECURITY BREACH" not in output_section

    @pytest.mark.asyncio
    async def test_code_interpreter_async_wrapper(self, code_interpreter_tool):
        """Test _arun method delegates to _run"""
        with patch.object(code_interpreter_tool, '_run', return_value="test result") as mock_run:
            result = await code_interpreter_tool._arun("test code")
            assert result == "test result"
            mock_run.assert_called_once_with("test code")

    def test_code_interpreter_returns_source_code(self, code_interpreter_tool):
        """
        Regression test: the executed source code must be present in the
        return value, not just stdout. Without this, the tool's return
        value is discarded the instant exec() finishes and only the LLM's
        narration of "what it did" survives — the user never sees the
        actual function/script that was written.
        """
        code = "def add_numbers(a, b):\n    return a + b\n\nprint(add_numbers(5, 7))"
        result = code_interpreter_tool._run(code)
        assert "def add_numbers(a, b):" in result
        assert "return a + b" in result
        assert "12" in result

    def test_code_interpreter_returns_source_code_on_error(self, code_interpreter_tool):
        """Source code must also be preserved when execution raises, so the
        user/agent can see exactly what was attempted."""
        code = "print(undefined_variable)"
        result = code_interpreter_tool._run(code)
        assert "print(undefined_variable)" in result
        assert "Error executing code" in result

    def test_code_interpreter_returns_source_code_on_no_output(self, code_interpreter_tool):
        """Source code must be preserved even when the code produces no stdout."""
        code = "def add_numbers(a, b):\n    return a + b"
        result = code_interpreter_tool._run(code)
        assert "def add_numbers(a, b):" in result
        assert "executed successfully" in result.lower()


class TestExecutorAgent:
    """Test suite for ExecutorAgent"""

    @pytest.fixture
    def executor_agent(self):
        task_id = uuid.uuid4()
        config = {"llm": MagicMock()}
        return ExecutorAgent(task_id, config)

    def test_executor_agent_initialization(self, executor_agent):
        """Test ExecutorAgent initializes correctly"""
        assert executor_agent.name == "executor"
        assert executor_agent.description == "Executes plan steps using tools in a ReAct loop."
        assert "web_search" in executor_agent.available_tools
        assert "file_reader" in executor_agent.available_tools
        assert "code_interpreter" in executor_agent.available_tools

    def test_executor_agent_tools_available(self, executor_agent):
        """Test all required tools are available and instantiated"""
        tools = executor_agent.available_tools
        assert isinstance(tools["web_search"], WebSearchTool)
        assert isinstance(tools["file_reader"], FileReaderTool)
        assert isinstance(tools["code_interpreter"], CodeInterpreterTool)

    @pytest.mark.asyncio
    async def test_executor_agent_missing_dependencies(self):
        """Test ExecutorAgent handles missing LangGraph dependencies"""
        with patch('agents.executor.executor_agent.HumanMessage', None):
            with patch('agents.executor.executor_agent.create_react_agent', None):
                task_id = uuid.uuid4()
                executor = ExecutorAgent(task_id, {})
                
                message = AgentMessage(
                    message_id=uuid.uuid4(),
                    task_id=task_id,
                    sender="controller",
                    recipient="executor",
                    message_type="execute_step",
                    payload={}
                )
                
                result = await executor.run(message)
                assert result.message_type == "error"
                assert "LangGraph dependencies not installed" in result.payload["error"]

    @pytest.mark.asyncio
    async def test_executor_agent_runs_with_fallback_llm(self, executor_agent):
        """Test ExecutorAgent runs successfully using FallbackChatModel"""
        message = AgentMessage(
            message_id=uuid.uuid4(),
            task_id=executor_agent.task_id,
            sender="controller",
            recipient="executor",
            message_type="execute_step",
            payload={"step": {"description": "Test step"}}
        )
        
        with patch('agents.executor.executor_agent.HumanMessage'):
            with patch('agents.executor.executor_agent.create_react_agent') as mock_create_agent:
                mock_agent = AsyncMock()
                mock_agent.ainvoke.return_value = {"messages": [MagicMock(content="Success")]}
                mock_create_agent.return_value = mock_agent
                
                result = await executor_agent.run(message)
                assert result.message_type == "step_result"
                assert result.payload["step_result"]["output"] == "Success"

    @pytest.mark.asyncio
    async def test_executor_agent_default_tool_selection(self, executor_agent):
        """Test ExecutorAgent defaults to WebSearchTool when no tools specified"""
        message = AgentMessage(
            message_id=uuid.uuid4(),
            task_id=executor_agent.task_id,
            sender="controller",
            recipient="executor",
            message_type="execute_step",
            payload={
                "step": {
                    "description": "Test step",
                    "tool_names": []  # Empty list
                }
            }
        )
        
        with patch('agents.executor.executor_agent.HumanMessage') as mock_human:
            with patch('agents.executor.executor_agent.create_react_agent') as mock_create_agent:
                mock_agent = AsyncMock()
                mock_agent.ainvoke.return_value = {"messages": [MagicMock(content="Test result")]}
                mock_create_agent.return_value = mock_agent
                
                await executor_agent.run(message)
                
                # Check that WebSearchTool was used as default
                tools_used = mock_create_agent.call_args[0][1]
                assert len(tools_used) == 1
                assert isinstance(tools_used[0], WebSearchTool)

    @pytest.mark.asyncio
    async def test_executor_agent_tool_selection(self, executor_agent):
        """Test ExecutorAgent selects specified tools correctly"""
        message = AgentMessage(
            message_id=uuid.uuid4(),
            task_id=executor_agent.task_id,
            sender="controller",
            recipient="executor",
            message_type="execute_step",
            payload={
                "step": {
                    "description": "Test step",
                    "tool_names": ["file_reader", "code_interpreter"]
                }
            }
        )
        
        with patch('agents.executor.executor_agent.HumanMessage') as mock_human:
            with patch('agents.executor.executor_agent.create_react_agent') as mock_create_agent:
                mock_agent = AsyncMock()
                mock_agent.ainvoke.return_value = {"messages": [MagicMock(content="Test result")]}
                mock_create_agent.return_value = mock_agent
                
                await executor_agent.run(message)
                
                # Check that specified tools were used
                tools_used = mock_create_agent.call_args[0][1]
                assert len(tools_used) == 2
                tool_names = [tool.name for tool in tools_used]
                assert "file_reader" in tool_names
                assert "code_interpreter" in tool_names

    @pytest.mark.asyncio
    async def test_executor_agent_invalid_tool_selection(self, executor_agent):
        """Test ExecutorAgent handles invalid tool names gracefully"""
        message = AgentMessage(
            message_id=uuid.uuid4(),
            task_id=executor_agent.task_id,
            sender="controller",
            recipient="executor",
            message_type="execute_step",
            payload={
                "step": {
                    "description": "Test step",
                    "tool_names": ["invalid_tool", "another_invalid"]
                }
            }
        )
        
        with patch('agents.executor.executor_agent.HumanMessage') as mock_human:
            with patch('agents.executor.executor_agent.create_react_agent') as mock_create_agent:
                mock_agent = AsyncMock()
                mock_agent.ainvoke.return_value = {"messages": [MagicMock(content="Test result")]}
                mock_create_agent.return_value = mock_agent
                
                await executor_agent.run(message)
                
                # Should default to WebSearchTool when no valid tools found
                tools_used = mock_create_agent.call_args[0][1]
                assert len(tools_used) == 1
                assert isinstance(tools_used[0], WebSearchTool)

    @pytest.mark.asyncio
    async def test_executor_agent_returns_step_result(self, executor_agent):
        """Test ExecutorAgent.run() returns a step_result message"""
        message = AgentMessage(
            message_id=uuid.uuid4(),
            task_id=executor_agent.task_id,
            sender="controller",
            recipient="executor",
            message_type="execute_step",
            payload={
                "step": {
                    "id": "test_step_1",
                    "description": "Execute test search",
                    "tool_names": ["web_search"]
                },
                "context": ["Context item 1", "Context item 2"]
            }
        )
        
        with patch('agents.executor.executor_agent.HumanMessage') as mock_human:
            with patch('agents.executor.executor_agent.create_react_agent') as mock_create_agent:
                # Mock agent and its response
                mock_agent = AsyncMock()
                mock_final_message = MagicMock()
                mock_final_message.content = "Search completed successfully"
                mock_agent.ainvoke.return_value = {"messages": [mock_final_message]}
                mock_create_agent.return_value = mock_agent

                result = await executor_agent.run(message)

                # Verify response structure
                assert result.message_type == "step_result"
                assert "step_result" in result.payload
                step_result = result.payload["step_result"]

                assert step_result["step_id"] == "test_step_1"
                assert step_result["description"] == "Execute test search"
                assert step_result["status"] == "completed"
                assert step_result["output"] == "Search completed successfully"
                
                # Should report empty tool_calls when no tools used
                assert step_result["tool_calls_used"] == []
                assert "latency_ms" in step_result
                assert "tokens_used" in step_result
                assert "trace" in step_result

    @pytest.mark.asyncio
    async def test_executor_agent_includes_context_in_prompt(self, executor_agent):
        """Test ExecutorAgent includes context in the prompt"""
        message = AgentMessage(
            message_id=uuid.uuid4(),
            task_id=executor_agent.task_id,
            sender="controller",
            recipient="executor",
            message_type="execute_step",
            payload={
                "step": {
                    "description": "Test step",
                    "tool_names": ["web_search"]
                },
                "context": ["Important context 1", "Important context 2"]
            }
        )
        
        # Create a mock HumanMessage instance to capture the content
        mock_human_message = MagicMock()
        
        with patch('agents.executor.executor_agent.HumanMessage', return_value=mock_human_message) as mock_human_class:
            with patch('agents.executor.executor_agent.create_react_agent') as mock_create_agent:
                mock_agent = AsyncMock()
                mock_agent.ainvoke.return_value = {"messages": [MagicMock(content="Result")]}
                mock_create_agent.return_value = mock_agent
                
                await executor_agent.run(message)
                
                # Check that HumanMessage was created with context
                mock_human_class.assert_called_once()
                call_args = mock_human_class.call_args
                if call_args.args:
                    content = call_args.args[0]
                else:
                    content = call_args.kwargs.get('content', '')
                assert "Important context 1" in content
                assert "Important context 2" in content
                assert "Background" in content
                assert "Test step" in content

    @pytest.mark.asyncio
    async def test_executor_agent_filters_low_score_memory_context(self, executor_agent):
        """Test ExecutorAgent filters out memory items with similarity score < 0.5"""
        message = AgentMessage(
            message_id=uuid.uuid4(),
            task_id=executor_agent.task_id,
            sender="controller",
            recipient="executor",
            message_type="execute_step",
            payload={
                "step": {
                    "description": "Test LeetCode Problem",
                    "tool_names": ["web_search"]
                },
                "context": [
                    {"text": "Unrelated prior task error output", "score": 0.0},
                    {"text": "Relevant prior problem pattern", "score": 0.85}
                ]
            }
        )

        mock_human_message = MagicMock()

        with patch('agents.executor.executor_agent.HumanMessage', return_value=mock_human_message) as mock_human_class:
            with patch('agents.executor.executor_agent.create_react_agent') as mock_create_agent:
                mock_agent = AsyncMock()
                mock_agent.ainvoke.return_value = {"messages": [MagicMock(content="Result")]}
                mock_create_agent.return_value = mock_agent

                await executor_agent.run(message)

                mock_human_class.assert_called_once()
                call_args = mock_human_class.call_args
                content = call_args.args[0] if call_args.args else call_args.kwargs.get('content', '')

                # Score 0.0 item must be filtered out
                assert "Unrelated prior task error output" not in content
                # Score 0.85 item must be included
                assert "Relevant prior problem pattern" in content
                # Must be formatted cleanly without dict stringification
                assert "{'text':" not in content
                # Must be labeled as background
                assert "Background" in content

    @pytest.mark.asyncio
    async def test_executor_agent_handles_execution_error(self, executor_agent):
        """Test ExecutorAgent handles execution errors gracefully"""
        message = AgentMessage(
            message_id=uuid.uuid4(),
            task_id=executor_agent.task_id,
            sender="controller",
            recipient="executor",
            message_type="execute_step",
            payload={
                "step": {
                    "description": "Test step",
                    "tool_names": ["web_search"]
                }
            }
        )
        
        with patch('agents.executor.executor_agent.HumanMessage'):
            with patch('agents.executor.executor_agent.create_react_agent') as mock_create_agent:
                mock_agent = AsyncMock()
                mock_agent.ainvoke.side_effect = Exception("Test error")
                mock_create_agent.return_value = mock_agent
                
                result = await executor_agent.run(message)
                
                assert result.message_type == "error"
                assert "Test error" in result.payload["error"]

    @pytest.mark.asyncio
    async def test_executor_agent_tracks_token_usage(self, executor_agent):
        """Test ExecutorAgent extracts and returns actual token usage"""
        message = AgentMessage(
            message_id=uuid.uuid4(),
            task_id=executor_agent.task_id,
            sender="controller",
            recipient="executor",
            message_type="execute_step",
            payload={
                "step": {
                    "description": "Test step",
                    "tool_names": ["web_search"]
                }
            }
        )
        
        with patch('agents.executor.executor_agent.HumanMessage'):
            with patch('agents.executor.executor_agent.create_react_agent') as mock_create_agent:
                mock_agent = AsyncMock()
                
                # Mock final message with token usage metadata
                mock_final_message = MagicMock()
                mock_final_message.content = "Test response"
                mock_final_message.usage_metadata = {
                    'input_tokens': 50,
                    'output_tokens': 25
                }
                
                mock_agent.ainvoke.return_value = {
                    "messages": [mock_final_message]
                }
                mock_create_agent.return_value = mock_agent
                
                result = await executor_agent.run(message)
                
                assert result.message_type == "step_result"
                step_result = result.payload["step_result"]
                assert step_result["tokens_used"]["in"] == 50
                assert step_result["tokens_used"]["out"] == 25

    @pytest.mark.asyncio
    async def test_executor_agent_tracks_actual_tool_calls(self, executor_agent):
        """Test ExecutorAgent tracks actual tool calls from LangGraph trace"""
        message = AgentMessage(
            message_id=uuid.uuid4(),
            task_id=executor_agent.task_id,
            sender="controller",
            recipient="executor",
            message_type="execute_step",
            payload={
                "step": {
                    "description": "Test step with multiple tools",
                    "tool_names": ["web_search", "file_reader", "code_interpreter"]
                }
            }
        )
        
        with patch('agents.executor.executor_agent.HumanMessage') as mock_human:
            with patch('agents.executor.executor_agent.create_react_agent') as mock_create_agent:
                mock_agent = AsyncMock()
                
                # Mock messages with tool calls
                mock_thought = MagicMock()
                mock_thought.content = "I need to search and read files"
                
                # Create proper LangGraph tool call structure
                mock_tool_call = MagicMock()
                mock_tool_call.content = "Using web_search tool"
                mock_tool_call.tool_calls = [
                    {"name": "web_search", "id": "call_1"}
                ]
                
                mock_final = MagicMock()
                mock_final.content = "Task completed successfully"
                mock_final.tool_calls = [
                    {"name": "file_reader", "id": "call_2"}
                ]
                
                mock_agent.ainvoke.return_value = {
                    "messages": [mock_thought, mock_tool_call, mock_final]
                }
                mock_create_agent.return_value = mock_agent
                
                result = await executor_agent.run(message)
                
                assert result.message_type == "step_result"
                step_result = result.payload["step_result"]
                
                # Should report only tools actually used (web_search, file_reader)
                assert set(step_result["tool_calls_used"]) == {"web_search", "file_reader"}
                assert "code_interpreter" not in step_result["tool_calls_used"]
                
                # Verify both tools are reported (order may vary)
                assert "web_search" in step_result["tool_calls_used"]
                assert "file_reader" in step_result["tool_calls_used"]
                
                # Verify empty tool_calls when no tools used
                if not step_result["tool_calls_used"]:
                    assert step_result["tool_calls_used"] == []

    @pytest.mark.asyncio
    async def test_executor_agent_surfaces_generated_code_in_output(self, executor_agent):
        """
        Regression test for: agent describes the code it wrote ("The function
        `add_numbers` is defined...") instead of showing the code itself.

        Uses real AIMessage/ToolMessage instances (not bare MagicMock) so the
        isinstance() checks in executor_agent.run() actually engage — this is
        what distinguishes this test from the older mock-based tests, which
        intentionally bypass the new code path since they use plain MagicMocks.
        """
        message = AgentMessage(
            message_id=uuid.uuid4(),
            task_id=executor_agent.task_id,
            sender="controller",
            recipient="executor",
            message_type="execute_step",
            payload={
                "step": {
                    "id": "code_step_1",
                    "description": "Write a function that adds two numbers",
                    "tool_names": ["code_interpreter"]
                }
            }
        )

        source_code = "def add_numbers(a, b):\n    return a + b\n\nprint(add_numbers(5, 7))"
        tool_result_content = f"```python\n{source_code}\n```\n\nOutput:\n12\n"

        ai_with_tool_call = AIMessage(
            content="",
            tool_calls=[{
                "name": "code_interpreter",
                "args": {"code": source_code},
                "id": "call_1",
                "type": "tool_call",
            }],
        )
        tool_result_message = ToolMessage(
            content=tool_result_content,
            tool_call_id="call_1",
        )
        final_narration = AIMessage(
            content="The function `add_numbers` is defined to take two parameters and returns their sum."
        )

        with patch('agents.executor.executor_agent.HumanMessage'):
            with patch('agents.executor.executor_agent.create_react_agent') as mock_create_agent:
                mock_agent = AsyncMock()
                mock_agent.ainvoke.return_value = {
                    "messages": [ai_with_tool_call, tool_result_message, final_narration]
                }
                mock_create_agent.return_value = mock_agent

                result = await executor_agent.run(message)

                step_result = result.payload["step_result"]

                # The actual source code must be present in `output`, not
                # just the LLM's paraphrase of what it did.
                assert "def add_numbers(a, b):" in step_result["output"]
                assert "return a + b" in step_result["output"]

                # The narration is preserved separately, not lost.
                assert "defined to take two parameters" in step_result["summary"]

                # code_artifacts should contain the tool result verbatim.
                assert any("def add_numbers" in artifact for artifact in step_result["code_artifacts"])

                # tool_inputs should contain the raw code the agent passed in,
                # independent of whatever the tool returned.
                assert any(
                    ti["tool"] == "code_interpreter" and ti["args"].get("code") == source_code
                    for ti in step_result["tool_inputs"]
                )




class TestIntegration:
    """Integration tests for the complete executor system"""

    @pytest.mark.asyncio
    async def test_react_loop_uses_selected_tool(self):
        """Test ReAct loop correctly uses the selected tool"""
        task_id = uuid.uuid4()
        executor = ExecutorAgent(task_id, {"llm": MagicMock()})
        
        message = AgentMessage(
            message_id=uuid.uuid4(),
            task_id=task_id,
            sender="controller",
            recipient="executor",
            message_type="execute_step",
            payload={
                "step": {
                    "description": "Search for Python information",
                    "tool_names": ["web_search"]
                }
            }
        )
        
        with patch('agents.executor.executor_agent.HumanMessage') as mock_human:
            with patch('agents.executor.executor_agent.create_react_agent') as mock_create_agent:
                # Mock agent that simulates tool usage
                mock_agent = AsyncMock()
                
                # Simulate a ReAct conversation
                mock_thought = MagicMock()
                mock_thought.content = "I need to search for Python information"
                
                mock_tool_call = MagicMock()
                mock_tool_call.content = "Using web_search tool to find Python information"
                
                mock_result = MagicMock()
                mock_result.content = "Found Python tutorials and documentation"
                
                mock_agent.ainvoke.return_value = {
                    "messages": [mock_thought, mock_tool_call, mock_result]
                }
                mock_create_agent.return_value = mock_agent
                
                result = await executor.run(message)
                
                # Verify the agent was created with the correct tools
                tools_used = mock_create_agent.call_args[0][1]
                assert len(tools_used) == 1
                assert isinstance(tools_used[0], WebSearchTool)
                
                # Verify the result contains the trace
                step_result = result.payload["step_result"]
                assert len(step_result["trace"]) == 3
                assert "Python information" in step_result["trace"][0]
                assert "web_search tool" in step_result["trace"][1]
                assert "Python tutorials" in step_result["trace"][2]

    @pytest.mark.asyncio
    async def test_complete_workflow_with_all_tools(self):
        """Test complete workflow using multiple tools"""
        task_id = uuid.uuid4()
        executor = ExecutorAgent(task_id, {"llm": MagicMock()})
        
        message = AgentMessage(
            message_id=uuid.uuid4(),
            task_id=task_id,
            sender="controller",
            recipient="executor",
            message_type="execute_step",
            payload={
                "step": {
                    "id": "multi_tool_step",
                    "description": "Read file, process data, and search web",
                    "tool_names": ["file_reader", "code_interpreter", "web_search"]
                },
                "context": ["Additional context for the task"]
            }
        )
        
        with patch('agents.executor.executor_agent.HumanMessage') as mock_human:
            with patch('agents.executor.executor_agent.create_react_agent') as mock_create_agent:
                mock_agent = AsyncMock()
                
                # Mock messages with tool calls in LangGraph format
                mock_thought = MagicMock()
                mock_thought.content = "I need to use all three tools"
                
                mock_web_search = MagicMock()
                mock_web_search.content = "Using web search"
                mock_web_search.tool_calls = [
                    {"name": "web_search", "id": "call_1"}
                ]
                
                mock_file_reader = MagicMock()
                mock_file_reader.content = "Reading file"
                mock_file_reader.tool_calls = [
                    {"name": "file_reader", "id": "call_2"}
                ]
                
                mock_final = MagicMock()
                mock_final.content = "Task completed using all tools"
                mock_final.tool_calls = [
                    {"name": "code_interpreter", "id": "call_3"}
                ]
                
                mock_agent.ainvoke.return_value = {
                    "messages": [mock_thought, mock_web_search, mock_file_reader, mock_final]
                }
                mock_create_agent.return_value = mock_agent
                
                result = await executor.run(message)
                
                # Verify all tools were made available
                tools_used = mock_create_agent.call_args[0][1]
                assert len(tools_used) == 3
                tool_names = [tool.name for tool in tools_used]
                assert "file_reader" in tool_names
                assert "code_interpreter" in tool_names
                assert "web_search" in tool_names
                
                # Verify successful execution
                assert result.message_type == "step_result"
                step_result = result.payload["step_result"]
                assert step_result["step_id"] == "multi_tool_step"
                assert step_result["status"] == "completed"
                assert len(step_result["tool_calls_used"]) == 3

    @pytest.mark.asyncio
    async def test_executor_agent_tool_use_error_fallback(self):
        """Test ExecutorAgent falls back to direct LLM call when tool calling schema fails"""
        task_id = uuid.uuid4()
        executor = ExecutorAgent(task_id, {"llm": MagicMock()})

        message = AgentMessage(
            message_id=uuid.uuid4(),
            task_id=task_id,
            sender="controller",
            recipient="executor",
            message_type="execute_step",
            payload={
                "step": {
                    "id": "step_tool_err",
                    "description": "Write two sum solution",
                    "tool_names": ["web_search"]
                }
            }
        )

        with patch('agents.executor.executor_agent.build_chat_model') as mock_build_model:
            mock_llm = AsyncMock()
            direct_msg = MagicMock()
            direct_msg.content = "def twoSum(nums, target): return []"
            mock_llm.ainvoke.return_value = direct_msg
            mock_build_model.return_value = mock_llm

            with patch('agents.executor.executor_agent.create_react_agent') as mock_create_agent:
                mock_agent = AsyncMock()
                mock_agent.ainvoke.side_effect = Exception("400 - tool_use_failed: Failed to call a function")
                mock_create_agent.return_value = mock_agent

                result = await executor.run(message)

                assert result.message_type == "step_result"
                step_result = result.payload["step_result"]
                assert "def twoSum" in step_result["output"]
                mock_llm.ainvoke.assert_called_once()

