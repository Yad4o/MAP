# Phase 3 — Queue & Workers

> Goal: A submitted task flows from the API into a queue and gets picked up by a worker.
> By end of this phase: submitting a task via the API results in the worker logging "processing task {id}".

---

# Member A — Celery Application Setup

> **Files:** `backend/app/worker/celery_app.py`, `backend/app/worker/agent_runner.py`

## What You Are Building

The Celery application factory and the agent runner stub. Celery is the task queue system. When the API pushes a task to Redis, Celery workers pick it up and process it. This phase wires up the infrastructure. The actual agent logic comes in Phase 4.

## Windsurf Prompt

```
I am setting up Celery for a FastAPI multi-agent AI platform called MAP.
The Redis broker is hosted on Upstash — the URL uses rediss:// (with SSL).

1. Complete backend/app/worker/celery_app.py
The file already has the Celery app created. Update it:
- Import settings from app.config
- Make sure the broker URL supports SSL for Upstash rediss:// URLs
  Add broker_use_ssl and redis_backend_use_ssl settings:
  broker_use_ssl = {"ssl_cert_reqs": None}
  redis_backend_use_ssl = {"ssl_cert_reqs": None}
- Set task_always_eager = True when APP_ENV == "development"
  This makes Celery run tasks synchronously in development (no worker needed)
  Import this conditionally: if settings.is_development: celery_app.conf.task_always_eager = True

2. Create backend/app/worker/agent_runner.py
This file will eventually call the full agent pipeline.
For now create a stub:

class AgentRunner:
    def __init__(self, task_id: str):
        self.task_id = task_id

    async def run(self) -> dict:
        """
        Phase 3: Just log that we received the task and return a stub result.
        Phase 4: Replace with real AgentController call.
        """
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"AgentRunner received task {self.task_id}")
        
        # Simulate some async work
        import asyncio
        await asyncio.sleep(1)
        
        return {
            "status": "completed",
            "task_id": self.task_id,
            "result": "Phase 3 stub — real agents connect in Phase 4",
        }

3. Complete backend/app/worker/tasks.py
Implement the process_task Celery task:

@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def process_task(self, task_id: str) -> dict:
    import asyncio
    import logging
    from app.worker.agent_runner import AgentRunner
    
    logger = logging.getLogger(__name__)
    logger.info(f"Worker picked up task {task_id}")
    
    try:
        # Update task status to PROCESSING in database
        # Use a synchronous database approach here since Celery tasks are sync
        from app.db.base import AsyncSessionLocal
        from app.db.repositories.task_repo import TaskRepository
        
        async def _run():
            async with AsyncSessionLocal() as db:
                task_repo = TaskRepository(db)
                await task_repo.update_status(task_id, "PROCESSING", {"started_at": __import__("datetime").datetime.utcnow()})
                await db.commit()
            
            runner = AgentRunner(task_id)
            result = await runner.run()
            
            async with AsyncSessionLocal() as db:
                task_repo = TaskRepository(db)
                await task_repo.set_result(task_id, result)
                await db.commit()
            
            return result
        
        return asyncio.run(_run())
        
    except Exception as exc:
        logger.error(f"Task {task_id} failed: {exc}")
        
        async def _fail():
            from app.db.base import AsyncSessionLocal
            from app.db.repositories.task_repo import TaskRepository
            async with AsyncSessionLocal() as db:
                task_repo = TaskRepository(db)
                await task_repo.set_error(task_id, {"error": str(exc), "type": type(exc).__name__})
                await db.commit()
        
        asyncio.run(_fail())
        raise self.retry(exc=exc)

4. Update backend/app/services/task_service.py
In create_task, replace the Redis LPUSH with a real Celery call:
from app.worker.tasks import process_task
After creating the task in the DB:
process_task.apply_async(args=[str(task.id)], queue="default")
```

## Acceptance Criteria
- [ ] `celery_app.py` imports and loads without errors
- [ ] `task_always_eager = True` in development (tasks run inline, no worker process needed)
- [ ] Submitting a task via `POST /api/v1/tasks` triggers the Celery task
- [ ] Task status changes from PENDING → PROCESSING → COMPLETED in the database
- [ ] Logs show "Worker picked up task {id}" when a task is submitted

---

# Member B — Redis Helper Utilities

> **Files:** `backend/app/core/redis_client.py`, `backend/app/core/rate_limiter.py`

## What You Are Building

A shared Redis client module and rate limiting utilities. Redis is used for: task status caching, rate limiting, distributed locks, and token revocation. Centralizing the Redis client prevents creating multiple connections.

## Windsurf Prompt

```
I am building Redis utilities for a FastAPI multi-agent AI platform called MAP.
Redis is hosted on Upstash using rediss:// (SSL).

1. Create backend/app/core/redis_client.py
Create a module-level async Redis client:

import redis.asyncio as aioredis
from app.config import settings

_redis_client = None

async def get_redis() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            ssl_cert_reqs=None,  # Required for Upstash
        )
    return _redis_client

async def close_redis():
    global _redis_client
    if _redis_client:
        await _redis_client.close()
        _redis_client = None

Add startup and shutdown event handlers in main.py:
@app.on_event("startup")
async def startup(): await get_redis()

@app.on_event("shutdown") 
async def shutdown(): await close_redis()

2. Create backend/app/core/rate_limiter.py
Implement a sliding window rate limiter as a FastAPI dependency:

async def check_rate_limit(request: Request, current_user = Depends(get_current_user)):
    redis = await get_redis()
    
    # Determine limit based on user tier
    tier_limits = {
        "free": settings.RATE_LIMIT_FREE_RPM,
        "pro": settings.RATE_LIMIT_PRO_RPM,
        "enterprise": settings.RATE_LIMIT_ENTERPRISE_RPM,
    }
    limit = tier_limits.get(current_user.tier, settings.RATE_LIMIT_FREE_RPM)
    
    # Sliding window key: rate:{user_id}:{current_minute}
    import time
    window = int(time.time() / 60)
    key = f"rate:{current_user.id}:{window}"
    
    # Increment counter, set TTL if new key
    count = await redis.incr(key)
    if count == 1:
        await redis.expire(key, 120)  # 2 minute TTL (covers current + previous window)
    
    if count > limit:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Max {limit} requests per minute.",
            headers={"Retry-After": "60"}
        )

3. Create backend/app/core/cache.py
Simple cache utilities:

async def cache_set(key: str, value: str, ttl: int = 300):
    redis = await get_redis()
    await redis.set(key, value, ex=ttl)

async def cache_get(key: str) -> str | None:
    redis = await get_redis()
    return await redis.get(key)

async def cache_delete(key: str):
    redis = await get_redis()
    await redis.delete(key)

async def add_to_revoked_tokens(jti: str, ttl: int):
    redis = await get_redis()
    await redis.set(f"revoked:{jti}", "1", ex=ttl)

async def is_token_revoked(jti: str) -> bool:
    redis = await get_redis()
    return await redis.exists(f"revoked:{jti}") > 0

4. Update backend/app/dependencies.py
Use is_token_revoked from cache.py instead of direct Redis calls.
Update the get_current_user dependency to call await is_token_revoked(jti).
```

## Acceptance Criteria
- [ ] Redis client connects to Upstash without errors on startup
- [ ] `is_token_revoked` returns True for a revoked JTI
- [ ] Rate limiter returns 429 when limit is exceeded
- [ ] Cache set/get/delete work correctly
- [ ] No connection errors in startup logs

---

# Member C — Task Status Polling and Real-Time Hook

> **Files:** `frontend/src/hooks/usePollTaskStatus.ts`, `frontend/src/pages/TaskDetailPage.tsx`

## What You Are Building

The Task Detail page and a polling hook that keeps checking the task status until it completes. Since the backend processes tasks asynchronously, the frontend needs to continuously ask "is this done yet?" and update the UI when the status changes.

## Windsurf Prompt

```
I am building the Task Detail page for a React multi-agent AI platform called MAP.

1. Create frontend/src/hooks/usePollTaskStatus.ts
A React Query based polling hook:

export function usePollTaskStatus(taskId: string) {
  return useQuery({
    queryKey: ["task-status", taskId],
    queryFn: () => tasksApi.getStatus(taskId),
    refetchInterval: (data) => {
      // Stop polling when task reaches a terminal state
      const done = ["COMPLETED", "FAILED", "CANCELLED"];
      if (data && done.includes(data.status)) return false;
      return 3000; // Poll every 3 seconds otherwise
    },
    enabled: !!taskId,
  });
}

Also create useTaskDetail hook:
export function useTaskDetail(taskId: string) {
  return useQuery({
    queryKey: ["task", taskId],
    queryFn: () => tasksApi.getById(taskId),
    refetchInterval: (data) => {
      const done = ["COMPLETED", "FAILED", "CANCELLED"];
      if (data && done.includes(data.status)) return false;
      return 5000;
    },
    enabled: !!taskId,
  });
}

2. Create frontend/src/pages/TaskDetailPage.tsx
Read taskId from URL params using useParams().
Use useTaskDetail hook to fetch and auto-refresh the task.

Show these sections:

Header section:
- Task title (large)
- Status badge (same colors as TaskListPage)
- Created at, Started at, Completed at timestamps
- Cancel button (only if status is PENDING or PROCESSING)
- Retry button (only if status is FAILED)

Progress section (show while PENDING or PROCESSING):
- Animated progress indicator (pulsing dots or spinner)
- "Working on it..." message
- How long it has been running

Result section (show when COMPLETED):
- Display task.result as formatted JSON in a code block
- Copy to clipboard button

Error section (show when FAILED):
- Error message from task.error
- Error type
- Retry count

Steps section (show always):
- List of task steps
- Each step shows: agent name, status badge, latency in ms, confidence percentage if available
- Steps are collapsed by default, expandable to show input/output payload

3. Add MSW handlers for the detail page:
GET /api/v1/tasks/:id → return a mock TaskDetailResponse with steps
GET /api/v1/tasks/:id/status → return a mock TaskStatusResponse
After 3 seconds change the mock status from PROCESSING to COMPLETED
(Use a stateful MSW handler that tracks request count)

Use the existing types from types/index.ts.
Use Tailwind CSS for styling.
```

## Acceptance Criteria
- [ ] TaskDetailPage renders at `/tasks/:id`
- [ ] Status badge updates automatically when status changes (via polling)
- [ ] Result section appears when task is COMPLETED
- [ ] Error section appears when task is FAILED
- [ ] Steps section shows all agent steps
- [ ] Cancel button appears only for PENDING/PROCESSING tasks
- [ ] Polling stops when task reaches terminal state
