import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def check():
    engine = create_async_engine("sqlite+aiosqlite:///map_dev.db")
    async with engine.connect() as conn:
        result = await conn.execute(text("PRAGMA table_info(task_steps);"))
        columns = result.fetchall()
        for col in columns:
            print(col)
    await engine.dispose()

asyncio.run(check())
