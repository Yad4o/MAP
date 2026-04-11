import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def fix():
    engine = create_async_engine("sqlite+aiosqlite:///map_dev.db")
    async with engine.connect() as conn:
        # Add tasks.updated_at
        try:
            await conn.execute(text("ALTER TABLE tasks ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;"))
            print("Added tasks.updated_at")
        except Exception as e:
            print(f"tasks.updated_at check: {e}")

        # Add task_steps.title
        try:
            await conn.execute(text("ALTER TABLE task_steps ADD COLUMN title VARCHAR(500) NOT NULL DEFAULT 'Untitled Step';"))
            print("Added task_steps.title")
        except Exception as e:
            print(f"task_steps.title check: {e}")

        # Add task_steps.order
        try:
            await conn.execute(text("ALTER TABLE task_steps ADD COLUMN \"order\" INTEGER NOT NULL DEFAULT 0;"))
            print("Added task_steps.order")
        except Exception as e:
            print(f"task_steps.order check: {e}")
        
        await conn.commit()
    await engine.dispose()

asyncio.run(fix())
