"""
backend/scripts/check_neon.py
─────────────────────────────
Production diagnostic script to verify the health of the live Neon DB.
Perform checks on connectivity, Alembic version, table schema, and constraints.

Usage:
    cd backend
    $env:PYTHONPATH="."
    python scripts/check_neon.py
"""

import asyncio
import sys
import os

# Add parent directory to sys.path to allow importing app module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import settings
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text


async def check():
    print(f"🔍 Running MAP Database Health Check...")
    print(f"📡 Connecting to: {settings.DATABASE_URL[:45]}...")
    
    try:
        engine = create_async_engine(settings.DATABASE_URL, echo=False)
        async with engine.connect() as conn:
            # 1. Connection check
            r = await conn.execute(text("SELECT version()"))
            print(f"  ✅ DB Version: {r.scalar()[:60]}")

            # 2. Alembic migration check
            r = await conn.execute(text("SELECT version_num FROM alembic_version"))
            rows = r.fetchall()
            print(f"  ✅ Alembic Version (current head): {[row[0] for row in rows]}")

            # 3. Table verification
            r = await conn.execute(text("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"))
            tables = [row[0] for row in r.fetchall()]
            print(f"  ✅ Registered Tables ({len(tables)}): {tables}")

            # 4. Critical Indexes (users + sessions)
            r = await conn.execute(text("SELECT indexname FROM pg_indexes WHERE tablename IN ('users','sessions') ORDER BY indexname"))
            idxs = [row[0] for row in r.fetchall()]
            print(f"  ✅ Verified Indexes: {idxs}")

            # 5. Constraint Check (CASCADE configuration)
            r = await conn.execute(text("SELECT conname, confdeltype FROM pg_constraint WHERE conrelid='sessions'::regclass AND contype='f'"))
            fks = [(row[0], "CASCADE" if row[1] == "c" else row[1]) for row in r.fetchall()]
            print(f"  ✅ Session Constraints: {fks}")

            # 6. Row counts (Sanity check)
            for t in ["users", "sessions"]:
                r = await conn.execute(text(f"SELECT count(*) FROM {t}"))
                print(f"  📊 {t} row count: {r.scalar()}")

        await engine.dispose()
        print("\n✨ Database health check PASSED.")
        
    except Exception as e:
        print(f"\n❌ Database health check FAILED: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(check())
