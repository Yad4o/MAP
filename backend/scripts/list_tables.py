import asyncio
import sqlalchemy as sa
from app.db import base


async def main():
    engine = base.engine
    async with engine.connect() as conn:
        res = await conn.execute(sa.text("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname='public' ORDER BY tablename"))
        rows = res.fetchall()
        tables = [r[0] for r in rows]
        print('tables:', tables)


if __name__ == '__main__':
    asyncio.run(main())
