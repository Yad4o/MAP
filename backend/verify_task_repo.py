import asyncio
from app.db.repositories.task import TaskRepository
from app.db.base import AsyncSessionLocal

async def test():
    session = AsyncSessionLocal()
    repo = TaskRepository(session)
    print('TaskRepository created successfully')
    await session.close()

if __name__ == "__main__":
    asyncio.run(test())
