"""
db_logger.py
----------
Simple database logger that saves logs to database for frontend display.
"""

import logging
import threading
from datetime import datetime

from app.db.models.log import Log


class DatabaseLogHandler(logging.Handler):
    """Synchronous database logger to avoid async issues."""
    
    def __init__(self):
        super().__init__()
    
    def emit(self, record):
        """Handle a log record by saving it to database in a thread."""
        try:
            # Run database save in a separate thread to avoid blocking
            threading.Thread(
                target=self._save_log_sync,
                args=(record,),
                daemon=True
            ).start()
        except Exception as e:
            print(f"Database logging error: {e}")
    
    def _save_log_sync(self, record):
        """Save log record to database synchronously."""
        try:
            # Import here to avoid circular imports
            from app.db.base import AsyncSessionLocal
            import asyncio
            
            # Create new event loop for this thread
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            async def save():
                async with AsyncSessionLocal() as db:
                    log_entry = Log(
                        level=record.levelname,
                        event=record.getMessage(),
                        logger=record.name,
                        task_id=getattr(record, 'task_id', None),
                        user_id=getattr(record, 'user_id', None),
                        request_id=getattr(record, 'request_id', None),
                        error_type=getattr(record, 'error_type', None),
                        error_detail=getattr(record, 'error_detail', None),
                        context=getattr(record, 'context', None),
                        created_at=datetime.fromtimestamp(record.created)
                    )
                    db.add(log_entry)
                    await db.commit()
            
            loop.run_until_complete(save())
            loop.close()
            
        except Exception as e:
            print(f"Failed to save log to database: {e}")


def setup_database_logging():
    """Setup database logging handler for the frontend log viewer.

    Attaches to the 'app' and 'agents' namespace loggers so that all
    child loggers (e.g. app.worker.agent_runner, agents.controller.*) 
    automatically propagate their records here via the normal logging 
    hierarchy.  The handler must NOT be attached to the root logger to
    avoid capturing SQLAlchemy / uvicorn noise that would create a write
    storm to the logs table.
    """
    db_handler = DatabaseLogHandler()
    db_handler.setLevel(logging.DEBUG)  # capture everything; let the logger decide the level

    app_logger = logging.getLogger("app")
    app_logger.addHandler(db_handler)

    agents_logger = logging.getLogger("agents")
    agents_logger.addHandler(db_handler)

    # Also capture the __main__ logger used during startup
    main_logger = logging.getLogger("__main__")
    main_logger.addHandler(db_handler)

    return db_handler
