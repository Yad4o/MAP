"""
worker/agent_runner.py
──────────────────────
AgentRunner — bridges Celery worker tasks and AgentController.
Fetches the Task from DB, drives the full agent pipeline, and
persists the final status and result back to DB.
"""

import logging
import uuid

logger = logging.getLogger(__name__)

class AgentRunner:
    """
    Placeholder class for the actual agent execution logic.
    Accepts task_id and runs an async workflow.
    """
    
    def __init__(self, task_id: str | uuid.UUID):
        self.task_id = uuid.UUID(task_id) if isinstance(task_id, str) else task_id

    async def run(self) -> dict:
        """
        Drive the full agent pipeline for this task:
          1. Fetch Task from DB
          2. Set status PROCESSING
          3. Run AgentController.run_pipeline()
          4. Persist final status + result
        """
        # PHASE 3 STUB REPLACED — Now using real AgentController pipeline
        logger.info(f"AgentRunner: starting execution for task {self.task_id}")
        
        # Inline imports are used here to prevent circular import issues and premature DB initialization 
        # when the module is loaded by the Celery worker.
        from app.db.base import AsyncSessionLocal
        from app.db.repositories.task_repo import TaskRepository
        from agents.controller.agent_controller import AgentController
        
        async with AsyncSessionLocal() as session:
            task_repo = TaskRepository(session)
            
            # Fetch task from DB
            task = await task_repo.get_by_id(self.task_id)
            if not task:
                logger.error(f"AgentRunner: Task {self.task_id} not found")
                return {"status": "FAILED", "task_id": str(self.task_id), "error": "Task not found"}
                
            # Update status to PROCESSING
            task.status = "PROCESSING"
            await session.commit()
            
            # Create AgentController(task_id, description, config).
            # Task.config is a verified JSON column from the Phase 2 schema (task.py line 44).
            # getattr guards against any future model drift that drops the column.
            controller = AgentController(
                task_id=task.id,
                task_description=task.description,
                config=getattr(task, "config", None),
            )
            
            # Return await controller.run_pipeline()
            result = await controller.run_pipeline()
            
            task.status = result.get("status", "COMPLETED").upper()
            task.result = result
            await session.commit()
            
            logger.info(f"AgentRunner: task {self.task_id} completed with status {result.get('status')}")
            return result
