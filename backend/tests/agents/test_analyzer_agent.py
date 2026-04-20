"""
backend/tests/agents/test_analyzer_agent.py
────────────────────────────────────
Unit tests for agents/analyzer/analyzer_agent.py

All LLM calls are mocked — no real API key is required to run these tests.
"""

import json
import uuid
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import os
from agents.analyzer.analyzer_agent import AnalyzerAgent, _strip_markdown_fences
from agents.shared.message import AgentMessage, AgentMetadata


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_message(step_results=None, plan=None) -> AgentMessage:
    """Build a minimal inbound AgentMessage for the analyzer."""
    return AgentMessage(
        message_id=uuid.uuid4(),
        task_id=uuid.uuid4(),
        sender="controller",
        recipient="analyzer",
        message_type="step_result",
        payload={
            "step_results": step_results or [
                {"step_id": "step_1", "output": {"result": "done"}, "is_complete": True}
            ],
            "plan": plan or {
                "task_id": str(uuid.uuid4()),
                "task_type": "general",
                "steps": [{"step_id": "step_1", "description": "Do something"}],
            },
        },
        timestamp=datetime.utcnow(),
        metadata=AgentMetadata(),
    )


def _make_agent(task_id=None) -> AnalyzerAgent:
    return AnalyzerAgent(task_id=task_id or uuid.uuid4())


_VALID_REPORT = {
    "passed": True,
    "confidence": 1.0,
    "step_scores": {"step_1": 0.92},
    "failed_steps": [],
    "critique": "",
    "summary": "All steps completed successfully.",
}

_FAIL_REPORT = {
    "passed": False,
    "confidence": 0.0,
    "step_scores": {"step_1": 0.55},
    "failed_steps": ["step_1"],
    "critique": "Step 1 output was incomplete.",
    "summary": "Execution did not meet quality threshold.",
    "failed_steps": ["step_1"]
}


# ── _strip_markdown_fences unit tests ─────────────────────────────────────────

class TestStripMarkdownFences:
    def test_strips_json_fence(self):
        raw = "```json\n{\"key\": 1}\n```"
        assert _strip_markdown_fences(raw) == '{"key": 1}'

    def test_strips_plain_fence(self):
        raw = "```\n{\"key\": 2}\n```"
        assert _strip_markdown_fences(raw) == '{"key": 2}'

    def test_no_fence_passthrough(self):
        raw = '{"key": 3}'
        assert _strip_markdown_fences(raw) == '{"key": 3}'

    def test_strips_whitespace(self):
        raw = "```json\n  {\"key\": 4}  \n```"
        assert _strip_markdown_fences(raw).startswith("{")


# ── AnalyzerAgent.run() tests ─────────────────────────────────────────────────

@pytest.mark.asyncio
class TestAnalyzerAgentRun:

    # 1. Returns AgentMessage with message_type="validation"
    async def test_returns_validation_message_type(self):
        message = _make_message()

        with patch("agents.analyzer.analyzer_agent.fallback_engine.chat_completion") as mock_completion:
            mock_completion.return_value = (json.dumps(_VALID_REPORT), False, 100, 50)
            agent = _make_agent()
            result = await agent.run(message)

        assert isinstance(result, AgentMessage)
        assert result.message_type == "validation"

    # 2. Validation report contains all required fields
    async def test_report_contains_required_fields(self):
        message = _make_message()

        with patch("agents.analyzer.analyzer_agent.fallback_engine.chat_completion") as mock_completion:
            mock_completion.return_value = (json.dumps(_VALID_REPORT), False, 100, 50)
            agent = _make_agent()
            result = await agent.run(message)

        report = result.payload["validation_report"]
        for field in ("passed", "confidence", "step_scores", "failed_steps", "critique", "summary"):
            assert field in report, f"Missing field: {field}"

    # 3. Invalid JSON from LLM falls back gracefully — passed=False
    async def test_invalid_json_fallback_no_exception(self):
        message = _make_message()

        with patch("agents.analyzer.analyzer_agent.fallback_engine.chat_completion") as mock_completion:
            mock_completion.return_value = ("This is not JSON", False, 100, 50)
            agent = _make_agent()
            result = await agent.run(message)

        assert result.message_type == "validation"
        report = result.payload["validation_report"]
        assert report["passed"] is False

    # 4. Markdown fences in LLM response are stripped before parse attempt
    async def test_markdown_fences_stripped_before_parse(self):
        message = _make_message()
        fenced = f"```json\n{json.dumps(_VALID_REPORT)}\n```"

        with patch("agents.analyzer.analyzer_agent.fallback_engine.chat_completion") as mock_completion:
            mock_completion.return_value = (fenced, False, 100, 50)
            agent = _make_agent()
            result = await agent.run(message)

        assert result.message_type == "validation"
        report = result.payload["validation_report"]
        assert report["passed"] is True
        assert report["confidence"] == pytest.approx(1.0)

    # 5. Fallback: raw content is used as critique and summary
    async def test_fallback_uses_raw_content_as_critique_and_summary(self):
        message = _make_message()
        bad_content = "Sorry, I cannot produce JSON right now."

        with patch("agents.analyzer.analyzer_agent.fallback_engine.chat_completion") as mock_completion:
            mock_completion.return_value = (bad_content, False, 100, 50)
            agent = _make_agent()
            result = await agent.run(message)

        report = result.payload["validation_report"]
        assert report["critique"] == f"Analyzer parse failure: {bad_content}"
        assert report["summary"] == "Analyzer could not parse LLM response."

    # 6. Valid report with a failing step → passed=False and failed_steps populated
    async def test_failing_step_sets_passed_false(self):
        message = _make_message()

        with patch("agents.analyzer.analyzer_agent.fallback_engine.chat_completion") as mock_completion:
            mock_completion.return_value = (json.dumps(_FAIL_REPORT), False, 100, 50)
            agent = _make_agent()
            result = await agent.run(message)

        report = result.payload["validation_report"]
        assert report["passed"] is False
        assert "step_1" in report["failed_steps"]

    # 7. Confidence is a float (0.0–1.0)
    async def test_confidence_is_float_in_range(self):
        message = _make_message()

        with patch("agents.analyzer.analyzer_agent.fallback_engine.chat_completion") as mock_completion:
            mock_completion.return_value = (json.dumps(_VALID_REPORT), False, 100, 50)
            agent = _make_agent()
            result = await agent.run(message)

        confidence = result.payload["validation_report"]["confidence"]
        assert isinstance(confidence, float)
        assert 0.0 <= confidence <= 1.0

    # 8. LLM error returns error AgentMessage
    async def test_llm_exception_returns_error_message(self):
        message = _make_message()

        with patch("agents.analyzer.analyzer_agent.fallback_engine.chat_completion") as mock_completion:
            mock_completion.side_effect = RuntimeError("API unavailable")
            agent = _make_agent()
            result = await agent.run(message)

        assert result.message_type == "error"
        assert "error" in result.payload

    # 9. Step scores are forwarded verbatim
    async def test_step_scores_forwarded_verbatim(self):
        message = _make_message()
        report_with_scores = {**_VALID_REPORT, "step_scores": {"step_1": 0.88, "step_2": 0.95}}

        with patch("agents.analyzer.analyzer_agent.fallback_engine.chat_completion") as mock_completion:
            mock_completion.return_value = (json.dumps(report_with_scores), False, 100, 50)
            agent = _make_agent()
            result = await agent.run(message)

        scores = result.payload["validation_report"]["step_scores"]
        assert scores["step_1"] == pytest.approx(0.88)
        assert scores["step_2"] == pytest.approx(0.95)

    # 10. Sender is "analyzer", recipient is "controller"
    async def test_sender_and_recipient(self):
        message = _make_message()

        with patch("agents.analyzer.analyzer_agent.fallback_engine.chat_completion") as mock_completion:
            mock_completion.return_value = (json.dumps(_VALID_REPORT), False, 100, 50)
            agent = _make_agent()
            result = await agent.run(message)

        assert result.sender == "analyzer"
        assert result.recipient == "controller"

    # 11. task_id is preserved from inbound message
    async def test_task_id_preserved(self):
        task_id = uuid.uuid4()
        message = _make_message()
        message.task_id = task_id

        with patch("agents.analyzer.analyzer_agent.fallback_engine.chat_completion") as mock_completion:
            mock_completion.return_value = (json.dumps(_VALID_REPORT), False, 100, 50)
            agent = _make_agent(task_id=task_id)
            result = await agent.run(message)

        assert result.task_id == task_id

    # 12. Fallback defaults: step_scores={}, failed_steps=[], confidence=0.0
    async def test_fallback_defaults(self):
        message = _make_message()

        with patch("agents.analyzer.analyzer_agent.fallback_engine.chat_completion") as mock_completion:
            mock_completion.return_value = ("not json", False, 100, 50)
            agent = _make_agent()
            result = await agent.run(message)

        report = result.payload["validation_report"]
        assert report["step_scores"] == {}
        assert report["failed_steps"] == []
        assert report["confidence"] == pytest.approx(0.0)
