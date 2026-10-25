"""
test_executor_streaming.py
--------------------------
The executor can stream the model's answer to the live view while still
returning exactly the same final graph state `ainvoke` would have.
"""

from typing import Iterator

import pytest
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, AIMessageChunk, HumanMessage
from langchain_core.outputs import ChatGenerationChunk
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent

from agents.executor.executor_agent import _chunk_text, _invoke_agent


@tool
def lookup(q: str) -> str:
    """lookup something"""
    return "TOOLRESULT for " + q


class ScriptedModel(BaseChatModel):
    """Turn 1: narration + tool call. Turn 2: the final answer, word by word."""
    turn: int = 0
    use_tool: bool = True

    @property
    def _llm_type(self):
        return "scripted"

    def bind_tools(self, tools, **kw):
        return self

    def _generate(self, *a, **kw):
        raise NotImplementedError

    def _stream(self, messages, stop=None, run_manager=None, **kw) -> Iterator[ChatGenerationChunk]:
        self.turn += 1
        if self.use_tool and self.turn == 1:
            yield ChatGenerationChunk(message=AIMessageChunk(
                content="Let me check. ",
                tool_call_chunks=[{"name": "lookup", "args": '{"q":"x"}', "id": "c1", "index": 0}],
            ))
        else:
            for w in ["Final ", "answer ", "here."]:
                yield ChatGenerationChunk(message=AIMessageChunk(content=w))


class RecordingStream:
    def __init__(self):
        self.events = []

    async def delta(self, text):
        self.events.append(("d", text))

    async def reset(self):
        self.events.append(("r", None))

    async def flush(self):
        self.events.append(("f", None))


def _agent(use_tool=True):
    return create_react_agent(ScriptedModel(use_tool=use_tool), [lookup], state_modifier="sys")


class TestInvokeAgent:
    @pytest.mark.asyncio
    async def test_streams_final_answer_and_returns_the_same_state_shape(self):
        stream = RecordingStream()
        state = await _invoke_agent(_agent(use_tool=False), {"messages": [HumanMessage(content="hi")]}, stream)
        assert [t for k, t in stream.events if k == "d"] == ["Final ", "answer ", "here."]
        assert state["messages"][-1].content == "Final answer here."
        assert stream.events[-1] == ("f", None)

    @pytest.mark.asyncio
    async def test_users_own_message_is_never_streamed(self):
        stream = RecordingStream()
        await _invoke_agent(_agent(use_tool=False), {"messages": [HumanMessage(content="SECRET-PROMPT")]}, stream)
        assert all("SECRET-PROMPT" not in (t or "") for _, t in stream.events)

    @pytest.mark.asyncio
    async def test_narration_before_a_tool_call_is_cleared_when_the_tool_runs(self):
        stream = RecordingStream()
        state = await _invoke_agent(_agent(use_tool=True), {"messages": [HumanMessage(content="hi")]}, stream)
        kinds = [k for k, _ in stream.events]
        assert kinds.index("r") > kinds.index("d")                 # narration, then reset
        texts_after_reset = [t for k, t in stream.events[kinds.index("r"):] if k == "d"]
        assert "".join(texts_after_reset) == "Final answer here."  # only the real answer remains
        assert state["messages"][-1].content == "Final answer here."

    @pytest.mark.asyncio
    async def test_without_a_stream_it_behaves_like_plain_ainvoke(self):
        class Plain:
            async def ainvoke(self, state):
                return {"messages": [AIMessage(content="plain")]}

            def astream(self, *a, **kw):
                raise AssertionError("must not stream when no stream is attached")

        state = await _invoke_agent(Plain(), {"messages": []}, None)
        assert state["messages"][-1].content == "plain"

    @pytest.mark.asyncio
    async def test_raises_if_the_stream_yields_no_final_state(self):
        class Empty:
            async def astream(self, *a, **kw):
                if False:
                    yield None

        with pytest.raises(RuntimeError):
            await _invoke_agent(Empty(), {"messages": []}, RecordingStream())


class TestChunkText:
    def test_plain_string(self):
        assert _chunk_text(AIMessageChunk(content="hi")) == "hi"

    def test_anthropic_style_block_list(self):
        chunk = AIMessageChunk(content=[{"type": "text", "text": "a"}, {"type": "tool_use", "id": "x"}, {"type": "text", "text": "b"}])
        assert _chunk_text(chunk) == "ab"

    def test_empty_content(self):
        assert _chunk_text(AIMessageChunk(content="")) == ""
