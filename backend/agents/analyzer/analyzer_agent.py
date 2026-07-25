"""
agents/analyzer/analyzer_agent.py
───────────────────────────────────
Validates Executor outputs and scores confidence.

# ALREADY IMPLEMENTED: AnalyzerAgent skeleton exists — adding full run() implementation.

Phase 4: Calls fallback_engine with the quality analyst system prompt, strips
         markdown fences from the response, parses a JSON validation report,
         and returns a validation AgentMessage. Gracefully falls back on
         JSON parse failure (passed=True, raw content used as critique).
"""

import json
import logging
import os
import re
import time
import uuid

from agents.analyzer.prompts import ANALYZER_SYSTEM_PROMPT
from agents.shared.base_agent import BaseAgent
from agents.shared.message import AgentMessage, AgentMetadata
from app.config import settings
from app.core.fallback_engine import fallback_engine

logger = logging.getLogger(__name__)

# ── Confidence threshold (mirrors ANALYZER_CONFIDENCE_THRESHOLD in config) ──
_DEFAULT_THRESHOLD = float(os.getenv("ANALYZER_CONFIDENCE_THRESHOLD", "0.70"))
_MODEL = os.getenv("ANALYZER_MODEL", "gpt-4o-mini")
_TEMPERATURE = float(os.getenv("ANALYZER_TEMPERATURE", "0.1"))


def _strip_markdown_fences(text: str) -> str:
    """
    Remove ```json ... ``` or ``` ... ``` code fences from an LLM response.
    Returns the raw content between the fences (stripped of whitespace).
    If no fence is found the original string is returned unchanged.
    """
    # Match ```json\n...\n``` or ```\n...\n```
    pattern = r"```(?:json)?\s*([\s\S]*?)```"
    match = re.search(pattern, text)
    if match:
        return match.group(1).strip()
    return text.strip()


class AnalyzerAgent(BaseAgent):
    """
    Receives all StepResults from the Executor.
    Returns a validation report with per-step confidence scores.
    Flags steps below the confidence threshold for re-execution.

    Model config:
      - model:       gpt-4o-mini  (override: ANALYZER_MODEL env var)
      - temperature: 0.1          (deterministic evaluation)
    """

    name = "analyzer"
    description = "Validates executor outputs and scores confidence."

    def __init__(self, task_id: uuid.UUID, config: dict | None = None):
        super().__init__(task_id, config)

    async def run(self, message: AgentMessage) -> AgentMessage:
        """
        Input payload:  { "step_results": list[dict], "plan": dict }
        Output payload: {
            "validation_report": {
                "passed":       bool,
                "confidence":   float,
                "step_scores":  { "step_id": float },
                "failed_steps": list[str],
                "critique":     str,
                "summary":      str
            }
        }
        """
        step_results = message.payload.get("step_results", [])
        plan = message.payload.get("plan", {})

        # ── Build user message ────────────────────────────────────────────────
        user_content = json.dumps(
            {"step_results": step_results, "plan": plan},
            indent=2,
            default=str,
        )

        messages = [
            {"role": "system", "content": ANALYZER_SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ]

        # ── Call LLM via fallback_engine ──────────────────────────────────────
        # OLD: response = await self._llm.ainvoke([SystemMessage(...), HumanMessage(...)])
        # NEW: using fallback_engine.chat_completion
        t0 = time.time()
        try:
            raw_content, fallback_used, tokens_in, tokens_out = await fallback_engine.chat_completion(
                messages=messages,
                model=settings.DEFAULT_MODEL,
                temperature=settings.ANALYZER_TEMPERATURE,
                max_tokens=settings.MAX_TOKENS,
            )
        except Exception as exc:
            logger.error("AnalyzerAgent LLM call failed: %s", exc)
            return self.build_error(f"LLM call failed: {exc}")

        latency_ms = int((time.time() - t0) * 1000)

        # ── Strip markdown fences ─────────────────────────────────────────────
        clean_content = _strip_markdown_fences(raw_content)

        # ── Parse JSON ───────────────────────────────────────────────────────
        try:
            report: dict = json.loads(clean_content)

            # Enforce passed/failed invariants
            step_scores = report.get("step_scores", {})
            failed = {sid for sid, score in step_scores.items() if score < _DEFAULT_THRESHOLD}

            # Belt-and-suspenders: any step the controller marked as
            # explicitly failed (e.g. it crashed before producing a
            # result, such as a recursion-limit abort) must count as
            # failed even if the LLM didn't score it — an unscored step
            # is not the same as a passing one.
            for step_result in step_results:
                if step_result.get("status") == "failed":
                    sid = step_result.get("step_id")
                    if sid:
                        failed.add(sid)

            report["failed_steps"] = sorted(failed)
            report["passed"] = len(failed) == 0

            # Ensure required keys exist with safe defaults
            report.setdefault("confidence", 1.0)
            report.setdefault("step_scores", {})
            report.setdefault("critique", "")
            report.setdefault("summary", "")

        except (json.JSONDecodeError, ValueError) as exc:
            logger.warning(
                "AnalyzerAgent: JSON parse failed (%s) — using fallback report. "
                "Raw content: %.200s",
                exc,
                raw_content,
            )
            # Graceful fallback: return a low-confidence failed report
            report = {
                "passed": False,
                "confidence": 0.0,
                "step_scores": {},
                "failed_steps": [],
                "critique": f"Analyzer parse failure: {raw_content}",
                "summary": "Analyzer could not parse LLM response.",
            }

        logger.info(
            "AnalyzerAgent: validation complete — passed=%s confidence=%.2f latency_ms=%d",
            report["passed"],
            report.get("confidence", 1.0),
            latency_ms,
        )

        metadata = AgentMetadata(
            model_used=settings.DEFAULT_MODEL,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            latency_ms=latency_ms,
            fallback_used=fallback_used,
        )

        return self.build_response(
            recipient="controller",
            message_type="validation",
            payload={"validation_report": report},
            metadata=metadata,
        )
