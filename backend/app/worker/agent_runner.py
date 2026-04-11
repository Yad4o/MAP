"""
worker/agent_runner.py
──────────────────────
Stub implementation for the Agent runner. 
Phase 4 will replace this with real LangGraph logic.
"""

import asyncio
import logging

logger = logging.getLogger(__name__)

class AgentRunner:
    """
    Placeholder class for the actual agent execution logic.
    Accepts task_id and runs an async workflow.
    """
    
    def __init__(self, task_id: str):
        self.task_id = task_id

    async def run(self) -> dict:
        """
        Simulates task execution.
        """
        logger.info(f"AgentRunner: starting execution for task {self.task_id}")
        
        # Simulate work
        await asyncio.sleep(2)
        
        logger.info(f"AgentRunner: completed execution for task {self.task_id}")
        
        return {
            "status": "COMPLETED",
            "task_id": self.task_id,
            "message": "Placeholder result from AgentRunner stub",
        }
