import asyncio
import sqlalchemy as sa
from app.db.base import engine

async def test():
    async with engine.connect() as conn:
        result = await conn.execute(
            sa.text("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname='public' ORDER BY tablename")
        )
        tables = [r[0] for r in result.fetchall()]
        print("Connected! Tables found:", tables)

asyncio.run(test())
