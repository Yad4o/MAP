"""
core/agent/runner.py
--------------------
Stub for the AgentRunner class.
To be replaced with real agent logic in Phase 4.
"""

import asyncio
import logging
import uuid

logger = logging.getLogger(__name__)

class AgentRunner:
    """ stub class that accepts a task_id and has an async run method. """
    
    def __init__(self, task_id: uuid.UUID):
        self.task_id = task_id

    async def run(self) -> dict:
        """
        Logs that it received the task, waits briefly, and returns a dict 
        with status, task_id, and a placeholder result message.
        """
        logger.info(f"AgentRunner received task: {self.task_id}")
        
        # Simulate some work
        await asyncio.sleep(2)
        
        return {
            "status": "COMPLETED",
            "task_id": str(self.task_id),
            "result": "Placeholder result from AgentRunner stub",
        }
