"""
agents/analyzer/analyzer_agent.py
───────────────────────────────────
Validates Executor outputs and scores confidence.

Phase 4: Implement validation logic and confidence scoring using fallback_engine.
"""

import json
import logging
import time
import uuid
from typing import Dict, Any, List
from backend.app.config import settings
from backend.app.core.fallback_engine import fallback_engine
from agents.shared.base_agent import BaseAgent
from agents.shared.message import AgentMessage, AgentMetadata

logger = logging.getLogger(__name__)

# Analyzer system prompt for validation
ANALYZER_SYSTEM_PROMPT = """You are an analyzer agent that validates executor outputs and scores confidence.

Your task is to evaluate the execution results against the expected outcomes and provide:
1. A confidence score (0.0-1.0) for each step
2. Identify any failed steps
3. Provide a brief critique

Respond with a JSON object containing:
{
    "step_scores": {"step_id": confidence_score, ...},
    "failed_steps": ["step_id1", "step_id2", ...],
    "critique": "Brief assessment of the results"
}

Be objective and thorough in your evaluation."""


class AnalyzerAgent(BaseAgent):
    """
    Receives all StepResults from the Executor.
    Returns a validation report with per-step confidence scores.
    Flags steps below the confidence threshold for re-execution.

    Model config:
      - temperature: 0.1 (deterministic evaluation)
    """

    name = "analyzer"
    description = "Validates executor outputs and scores confidence."

    async def run(self, message: AgentMessage) -> AgentMessage:
        """
        Input payload:  { "step_results": list[StepResult], "plan": PlanDocument }
        Output payload: {
            "validation_report": {
                "passed": bool,
                "step_scores": { "step_id": confidence_float },
                "failed_steps": list[step_id],
                "critique": str
            }
        }

        Steps to implement in Phase 4:
        1. For each step result: validate against expected_output_schema
        2. Call LLM to self-evaluate confidence (0.0-1.0) with reasoning
        3. Flag steps with confidence < ANALYZER_CONFIDENCE_THRESHOLD
        4. Return validation report
        """
        payload = message.payload
        step_results = payload.get("step_results", [])
        plan = payload.get("plan", {})

        if not step_results:
            return self.build_error("No step_results provided in payload.")

        # Build analysis prompt
        analysis_prompt = self._build_analysis_prompt(step_results, plan)

        messages = [
            {"role": "system", "content": ANALYZER_SYSTEM_PROMPT},
            {"role": "user", "content": analysis_prompt}
        ]

        start_time = time.time()
        try:
            # Call LLM using fallback_engine
            # OLD: llm = ChatOpenAI(...); response = await llm.ainvoke(messages)
            # NEW: using fallback_engine.chat_completion
            content, fallback_used, tokens_in, tokens_out = await fallback_engine.chat_completion(
                messages=messages,
                model=settings.DEFAULT_MODEL,
                temperature=getattr(settings, 'ANALYZER_TEMPERATURE', 0.1),
                max_tokens=getattr(settings, 'MAX_TOKENS', None),
            )

            # Strip markdown fences if present
            if content.strip().startswith("```"):
                lines = content.strip().split("\n")
                if lines[0].strip().startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].strip().startswith("```"):
                    lines = lines[:-1]
                content = "\n".join(lines).strip()

            # Parse JSON response
            analysis_result = json.loads(content)

            # Validate required fields
            required_fields = ["step_scores", "failed_steps", "critique"]
            for field in required_fields:
                if field not in analysis_result:
                    raise ValueError(f"Missing required field: {field}")

            # Determine if validation passed
            failed_steps = analysis_result["failed_steps"]
            passed = len(failed_steps) == 0

            # Build validation report
            validation_report = {
                "passed": passed,
                "step_scores": analysis_result["step_scores"],
                "failed_steps": failed_steps,
                "critique": analysis_result["critique"]
            }

            # Create metadata
            latency_ms = int((time.time() - start_time) * 1000)
            metadata = AgentMetadata(
                model_used=settings.DEFAULT_MODEL,
                tokens_in=tokens_in,
                tokens_out=tokens_out,
                latency_ms=latency_ms,
                fallback_used=fallback_used
            )

            return self.build_response(
                recipient="controller",
                message_type="validation_report",
                payload={"validation_report": validation_report},
                metadata=metadata
            )

        except Exception as e:
            logger.error(f"AnalyzerAgent failed: {e}", exc_info=True)
            return self.build_error(f"Analysis failed: {type(e).__name__}: {str(e)}")

    def _build_analysis_prompt(self, step_results: List[Dict[str, Any]], plan: Dict[str, Any]) -> str:
        """Build the analysis prompt from step results and plan."""
        prompt_parts = [
            "Please analyze the following execution results:",
            "",
            "=== PLAN ==="
        ]

        # Add plan information
        if plan and "steps" in plan:
            for step in plan["steps"]:
                step_id = step.get("id", "unknown")
                description = step.get("description", "No description")
                prompt_parts.append(f"Step {step_id}: {description}")

        prompt_parts.extend([
            "",
            "=== EXECUTION RESULTS ==="
        ])

        # Add step results
        for i, result in enumerate(step_results):
            step_id = result.get("step_id", f"step_{i}")
            status = result.get("status", "unknown")
            output = result.get("output", "No output")
            prompt_parts.append(f"Step {step_id} ({status}):")
            prompt_parts.append(f"Output: {output[:500]}..." if len(output) > 500 else f"Output: {output}")
            prompt_parts.append("")

        prompt_parts.extend([
            "Please evaluate these results and provide confidence scores for each step.",
            "Consider completeness, correctness, and adherence to the plan requirements."
        ])

        return "\n".join(prompt_parts)
