"""
Controller <-> live streaming contract.

  * run_pipeline opens a publisher, and ALWAYS finishes/closes it (even on crash)
    so the browser's live view can never hang waiting for a stream that won't end.
  * a StepStream is handed to the executor only when streaming is actually enabled,
    so the non-streaming path stays exactly as before.
"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from agents.controller.agent_controller import AgentController
from agents.shared.message import AgentMessage


class FakePublisher:
    def __init__(self, enabled=True):
        self.enabled = enabled
        self.finished = False
        self.closed = False
        self.steps = []

    def for_step(self, step):
        self.steps.append(step)
        return f"stream-for-step-{step}"

    async def finish(self):
        self.finished = True

    async def close(self):
        self.closed = True


def _controller():
    return AgentController(uuid.uuid4(), "say hello")


def _step_result():
    return AgentMessage(
        message_id=uuid.uuid4(), task_id=uuid.uuid4(), sender="executor", recipient="controller",
        message_type="step_result", payload={"step_result": {"output": "hi"}},
    )


@pytest.mark.asyncio
async def test_pipeline_finishes_and_closes_the_stream_on_success():
    ctrl, pub = _controller(), FakePublisher()
    ctrl._run_pipeline_inner = AsyncMock(return_value={"status": "COMPLETED"})
    with patch("agents.controller.agent_controller.TokenStreamPublisher.open", AsyncMock(return_value=pub)):
        result = await ctrl.run_pipeline()
    assert result == {"status": "COMPLETED"}
    assert pub.finished and pub.closed
    assert ctrl._stream is None   # not left dangling on the controller


@pytest.mark.asyncio
async def test_pipeline_finishes_and_closes_the_stream_even_if_it_crashes():
    ctrl, pub = _controller(), FakePublisher()
    ctrl._run_pipeline_inner = AsyncMock(side_effect=RuntimeError("boom"))
    with patch("agents.controller.agent_controller.TokenStreamPublisher.open", AsyncMock(return_value=pub)):
        with pytest.raises(RuntimeError, match="boom"):
            await ctrl.run_pipeline()
    assert pub.finished and pub.closed


@pytest.mark.asyncio
async def test_executor_receives_a_step_stream_when_streaming_is_enabled():
    ctrl, pub = _controller(), FakePublisher(enabled=True)
    ctrl._stream = pub
    ctrl.memory.run = AsyncMock(return_value=MagicMock(payload={"memory_context": []}))
    ctrl.executor.run = AsyncMock(return_value=_step_result())
    ctrl._persist_step = AsyncMock()

    await ctrl._execute_step({"description": "do it", "step_id": "s1"}, step_index=2)

    assert ctrl.executor.run.call_args.kwargs == {"stream": "stream-for-step-2"}


@pytest.mark.asyncio
async def test_executor_gets_no_stream_argument_when_streaming_is_disabled():
    ctrl = _controller()
    ctrl._stream = FakePublisher(enabled=False)
    ctrl.memory.run = AsyncMock(return_value=MagicMock(payload={"memory_context": []}))
    ctrl.executor.run = AsyncMock(return_value=_step_result())
    ctrl._persist_step = AsyncMock()

    await ctrl._execute_step({"description": "do it", "step_id": "s1"}, step_index=0)

    assert ctrl.executor.run.call_args.kwargs == {}
    assert len(ctrl.executor.run.call_args.args) == 1
