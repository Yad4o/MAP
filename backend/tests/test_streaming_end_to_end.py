"""
End to end (minus the network): model -> executor -> publisher -> Redis list -> SSE events.
"""

import json

import pytest
from langchain_core.messages import HumanMessage
from langgraph.prebuilt import create_react_agent

from agents.executor.executor_agent import _invoke_agent
from app.core.token_stream import TokenStreamPublisher, stream_task_events
from tests.agents.test_executor_streaming import ScriptedModel, lookup
from tests.unit.test_token_stream import Clock, FakeRedis

TASK_ID = "22222222-2222-2222-2222-222222222222"


@pytest.mark.asyncio
async def test_answer_text_reaches_the_sse_stream_and_converges_on_the_final_output():
    redis, clock = FakeRedis(), Clock()
    publisher = TokenStreamPublisher(TASK_ID, redis, clock=clock)
    agent = create_react_agent(ScriptedModel(use_tool=True), [lookup], state_modifier="sys")

    state = await _invoke_agent(agent, {"messages": [HumanMessage(content="hi")]}, publisher.for_step(0))
    await publisher.finish()

    events = []
    async for chunk in stream_task_events(redis, TASK_ID, sleep=clock.sleep, clock=clock):
        if chunk.startswith("id:"):
            events.append(json.loads(chunk.split("data: ", 1)[1]))

    # A browser applying these events (append deltas, clear on reset) ends up with the final answer.
    shown = ""
    for e in events:
        if e["k"] == "d":
            shown += e["t"]
        elif e["k"] == "r":
            shown = ""
    assert shown == state["messages"][-1].content == "Final answer here."
    assert events[-1] == {"k": "x"}
