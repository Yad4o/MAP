"""
agents/analyzer/analyzer_agent.py
───────────────────────────────────
Validates Executor outputs and scores confidence.

Phase 0: Skeleton only.
Phase 4: Implement validation logic and confidence scoring.
"""

import uuid
from agents.shared.base_agent import BaseAgent
from agents.shared.message import AgentMessage


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
        raise NotImplementedError("Phase 4 — implement this")
