# Phase 5 — Fallback System & Agent Controller

> Goal: Wire all agents together. Add the circuit breaker so the system falls back to a cheaper model when OpenAI fails.

---

# Member A — Circuit Breaker

> **File:** `backend/app/core/circuit_breaker.py`

## Windsurf Prompt

```
Create backend/app/core/circuit_breaker.py for a FastAPI multi-agent AI platform called MAP.

Implement a Redis-backed circuit breaker with 3 states: CLOSED, OPEN, HALF_OPEN.

class CircuitBreaker:
    def __init__(self, provider: str, redis_client):
        self.provider = provider
        self.redis = redis_client
        self.failure_threshold = 3      # failures before OPEN
        self.recovery_timeout = 120     # seconds before HALF_OPEN
        self.state_key = f"circuit:{provider}:state"
        self.failure_key = f"circuit:{provider}:failures"
        self.last_failure_key = f"circuit:{provider}:last_failure"
    
    async def get_state(self) -> str:
        state = await self.redis.get(self.state_key)
        if state is None:
            return "CLOSED"
        
        if state == "OPEN":
            # Check if recovery timeout has passed
            import time
            last_failure = await self.redis.get(self.last_failure_key)
            if last_failure and (time.time() - float(last_failure)) > self.recovery_timeout:
                await self.redis.set(self.state_key, "HALF_OPEN")
                return "HALF_OPEN"
        
        return state
    
    async def record_success(self):
        state = await self.get_state()
        if state in ("OPEN", "HALF_OPEN"):
            await self.redis.set(self.state_key, "CLOSED")
            await self.redis.delete(self.failure_key)
        
    async def record_failure(self):
        import time
        failures = await self.redis.incr(self.failure_key)
        await self.redis.set(self.last_failure_key, str(time.time()))
        
        if failures >= self.failure_threshold:
            await self.redis.set(self.state_key, "OPEN", ex=600)
    
    async def is_available(self) -> bool:
        state = await self.get_state()
        return state in ("CLOSED", "HALF_OPEN")
    
    async def reset(self):
        await self.redis.delete(self.state_key, self.failure_key, self.last_failure_key)

Also create a get_circuit_breaker(provider: str) factory function that returns a CircuitBreaker instance using the shared Redis client.
```

## Acceptance Criteria
- [ ] After 3 failures, circuit breaker state becomes OPEN
- [ ] After recovery_timeout, state becomes HALF_OPEN
- [ ] After one success in HALF_OPEN, state returns to CLOSED
- [ ] `reset()` clears all state

---

# Member B — Fallback Engine

> **File:** `backend/app/core/fallback_engine.py`

## Windsurf Prompt

```
Create backend/app/core/fallback_engine.py for a FastAPI multi-agent AI platform called MAP.

This wraps all LLM calls with automatic fallback from OpenAI to a cheaper model (gpt-4o-mini) when the circuit breaker opens.

from openai import AsyncOpenAI
from app.config import settings
from app.core.circuit_breaker import get_circuit_breaker

class FallbackEngine:
    
    async def chat_completion(
        self,
        messages: list[dict],
        model: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 2000,
    ) -> tuple[str, bool]:
        """
        Returns (response_content, fallback_used).
        Tries primary model first. Falls back to gpt-4o-mini on failure.
        """
        breaker = await get_circuit_breaker("openai")
        fallback_used = False
        
        if not await breaker.is_available():
            fallback_used = True
            return await self._call_fallback(messages, temperature, max_tokens), True
        
        try:
            result = await self._call_primary(messages, model or settings.DEFAULT_MODEL, temperature, max_tokens)
            await breaker.record_success()
            return result, False
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Primary LLM failed: {e}, switching to fallback")
            await breaker.record_failure()
            result = await self._call_fallback(messages, temperature, max_tokens)
            return result, True
    
    async def _call_primary(self, messages, model, temperature, max_tokens) -> str:
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        response = await client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content
    
    async def _call_fallback(self, messages, temperature, max_tokens) -> str:
        # Fallback to gpt-4o-mini — cheaper, still good quality
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content

fallback_engine = FallbackEngine()

Then update all agents (PlannerAgent, ExecutorAgent, AnalyzerAgent) to use fallback_engine.chat_completion() instead of calling ChatOpenAI directly.
Update build_response metadata to include fallback_used=True when fallback was triggered.
```

## Acceptance Criteria
- [ ] `fallback_engine.chat_completion()` returns a response from primary model
- [ ] When circuit breaker is OPEN, falls back to gpt-4o-mini automatically
- [ ] All agents use fallback_engine instead of direct OpenAI calls
- [ ] `fallback_used` is correctly reported in AgentMetadata

---

# Member C — Agent Controller (Full Pipeline)

> **File:** `agents/controller/agent_controller.py`, `backend/app/worker/agent_runner.py`

## Windsurf Prompt

```
Implement the full Agent Controller pipeline for a multi-agent AI platform called MAP.

1. Complete agents/controller/agent_controller.py

Implement run_pipeline():

async def run_pipeline(self) -> dict:
    import uuid
    from agents.shared.message import AgentMessage, AgentMetadata
    from agents.planner.planner_agent import PlannerAgent
    from agents.executor.executor_agent import ExecutorAgent
    from agents.analyzer.analyzer_agent import AnalyzerAgent
    from agents.memory.memory_agent import MemoryAgent
    
    planner = PlannerAgent(self.task_id, self.config)
    executor = ExecutorAgent(self.task_id, self.config)
    analyzer = AnalyzerAgent(self.task_id, self.config)
    memory = MemoryAgent(self.task_id, self.config)
    
    def make_message(sender, recipient, msg_type, payload):
        return AgentMessage(
            message_id=uuid.uuid4(),
            task_id=self.task_id,
            sender=sender,
            recipient=recipient,
            message_type=msg_type,
            payload=payload,
        )
    
    # Step 1: Plan
    plan_response = await planner.run(make_message(
        "controller", "planner", "task",
        {"task_description": self.task_description}
    ))
    
    if plan_response.message_type == "error":
        return {"error": plan_response.payload.get("error"), "status": "failed"}
    
    plan = plan_response.payload.get("plan", {})
    steps = plan.get("steps", [])
    
    # Step 2: Execute each step
    step_results = []
    for step in steps:
        # Retrieve memory context for this step
        memory_response = await memory.run(make_message(
            "controller", "memory", "retrieve",
            {"query": step.get("description", ""), "top_k": 3, "user_id": self.config.get("user_id", "default")}
        ))
        context = memory_response.payload.get("results", [])
        
        # Execute the step
        exec_response = await executor.run(make_message(
            "controller", "executor", "execute_step",
            {"step": step, "context": context}
        ))
        
        if exec_response.message_type != "error":
            step_results.append(exec_response.payload.get("step_result", {}))
    
    # Step 3: Analyze results
    analyze_response = await analyzer.run(make_message(
        "controller", "analyzer", "validate",
        {"step_results": step_results, "plan": plan}
    ))
    
    validation = analyze_response.payload.get("validation_report", {})
    
    # Step 4: Store in memory
    summary = validation.get("summary", f"Task completed with {len(step_results)} steps")
    await memory.run(make_message(
        "controller", "memory", "store",
        {"task_summary": summary, "task_type": plan.get("task_type", "general"), "user_id": self.config.get("user_id", "default")}
    ))
    
    # Build final result
    return {
        "status": "completed",
        "task_id": str(self.task_id),
        "plan": plan,
        "step_results": step_results,
        "validation": validation,
        "summary": summary,
        "steps_completed": len(step_results),
    }

2. Update backend/app/worker/agent_runner.py
Replace the stub with real AgentController call:

async def run(self) -> dict:
    import uuid
    from agents.controller.agent_controller import AgentController
    from app.db.base import AsyncSessionLocal
    from app.db.repositories.task_repo import TaskRepository
    
    # Fetch task details
    async with AsyncSessionLocal() as db:
        task_repo = TaskRepository(db)
        task = await task_repo.get_by_id(uuid.UUID(self.task_id))
        if not task:
            return {"error": "Task not found", "status": "failed"}
        description = task.description
        user_id = str(task.user_id)
    
    controller = AgentController(
        task_id=uuid.UUID(self.task_id),
        task_description=description,
        config={"user_id": user_id}
    )
    
    return await controller.run_pipeline()
```

## Acceptance Criteria
- [ ] Submitting a task via API runs through all 4 agents
- [ ] Final result stored in the task record in Neon database
- [ ] Task status goes: PENDING → PROCESSING → COMPLETED
- [ ] Result JSON viewable via `GET /api/v1/tasks/{id}`
- [ ] Memory context from previous tasks is retrieved for new tasks

---

# Phase 6 — Frontend Completion

## Member A — Task Detail UI Enhancement

## Windsurf Prompt

```
Enhance frontend/src/pages/TaskDetailPage.tsx for the MAP platform.

Add an Agent Trace Visualization section using React Flow:
npm install reactflow

Import ReactFlow and create a FlowChart component that:
- Takes the task steps array as input
- Creates a node for each step: colored by agent (planner=blue, executor=green, analyzer=orange, memory=purple)
- Connects nodes in sequence with animated edges
- Each node shows: agent name, status badge, latency in ms
- Clicking a node opens a side panel showing the full input_payload and output_payload as formatted JSON

Also add a Task Timeline component:
- Horizontal timeline showing each step
- Shows start time, end time, and duration for each step
- Color coded by status

Use @xyflow/react package. Make it responsive.
```

## Member B — Admin and Logs Pages

## Windsurf Prompt

```
Create frontend/src/pages/AdminPage.tsx and frontend/src/pages/LogsPage.tsx for the MAP platform.

AdminPage (only accessible to ADMIN role users):
- System metrics cards: total tasks today, success rate %, average task duration, active users
- User management table: list all users with columns: email, username, role, tier, is_active, last_login
  - Toggle active/inactive button per user
  - Change role dropdown per user
- Fetch data from GET /api/v1/admin/users and GET /api/v1/admin/metrics
- Add MSW handlers returning realistic mock data

LogsPage:
- Live log stream table with columns: timestamp, level badge (color coded), event, task_id (clickable link), logger
- Level filter buttons: ALL, DEBUG, INFO, WARNING, ERROR, CRITICAL
- Search input that filters by event text
- Auto-scroll to bottom toggle
- Fetch from GET /api/v1/logs with level and search query params
- Refresh every 5 seconds using React Query refetchInterval

All with Tailwind CSS, wrapped in AppShell.
```

## Member C — Settings Page

## Windsurf Prompt

```
Create frontend/src/pages/SettingsPage.tsx for the MAP platform.

Three sections in a tabbed layout:

Tab 1 — Profile:
- Display current user info (email, username, role, tier)
- Edit username form with React Hook Form
- Change password form (current password, new password, confirm)
- On save: call PATCH /api/v1/auth/me or POST /api/v1/auth/change-password

Tab 2 — API Keys:
- List existing API keys showing: name, prefix (map_live_xxxx), created date, last used, active status
- Create new key button → modal with name field → on create: show the full key ONCE with copy button and warning "This key will never be shown again"
- Revoke key button with confirmation dialog
- Fetch from GET /api/v1/api-keys, create via POST, revoke via DELETE

Tab 3 — Memory:
- Show count of stored memories
- Search memories by query text
- Delete all memories button with confirmation
- Fetch from GET /api/v1/agents/memory/search, clear via DELETE /api/v1/agents/memory

Add MSW handlers for all endpoints used.
Use Tailwind CSS, tabs from Shadcn/ui if available.
```

---

# Phase 7 — Docker & Testing

## Member A — Docker Production Setup

## Windsurf Prompt

```
Create production Docker configuration for the MAP multi-agent AI platform.

1. Complete backend/Dockerfile (already exists as stub)
Ensure it uses multi-stage build, non-root user, and copies only necessary files.

2. Create backend/Dockerfile.worker
Same as backend Dockerfile but CMD runs:
celery -A app.worker.celery_app worker -l info -Q default,high_priority,long_running -c 4 -P gevent

3. Create frontend/Dockerfile
Multi-stage: stage 1 builds with node:20-alpine (npm run build), stage 2 serves with nginx:alpine
Copy dist/ to nginx html directory
Copy a custom nginx.conf that serves index.html for all routes (SPA routing)

4. Create nginx/nginx.conf
Upstream backend on port 8000
Upstream frontend on port 80
Route /api/* to backend
Route /* to frontend
Add gzip compression
Add security headers

5. Update docker-compose.yml
Uncomment all services now that Dockerfiles exist.
Add healthchecks to backend and worker services.
```

## Member B — API Integration Tests

## Windsurf Prompt

```
Create API integration tests for the MAP multi-agent AI platform using pytest and httpx.

Create these test files in backend/tests/integration/:

1. conftest.py
- Create a test database (separate Neon database or SQLite for tests)
- Create async test client using httpx.AsyncClient with the FastAPI app
- Helper fixture: create_test_user() that registers and logs in a user, returns auth headers
- Run alembic migrations before tests, drop tables after

2. test_auth.py
Test every auth endpoint:
- test_register_success: valid data returns 201 with user object
- test_register_duplicate_email: duplicate returns 400
- test_login_success: correct credentials return token pair
- test_login_wrong_password: returns 401
- test_get_me_authenticated: returns user profile with valid token
- test_get_me_no_token: returns 401
- test_get_me_expired_token: returns 401

3. test_tasks.py
- test_create_task_success: creates task, returns 202
- test_create_task_unauthenticated: returns 401
- test_list_tasks_empty: returns empty paginated list
- test_list_tasks_with_data: returns tasks belonging to current user only
- test_get_task_by_id: returns full task detail
- test_get_task_other_user: returns 404 (cannot see other user's task)
- test_cancel_task: status changes to CANCELLED
- test_cancel_completed_task: returns 400

Use pytest-asyncio for async tests.
Mock the Celery task so tasks don't actually run agents during tests.
```

## Member C — End-to-End Tests

## Windsurf Prompt

```
Create Playwright E2E tests for the MAP multi-agent AI platform.

Install: npm install -D @playwright/test && npx playwright install chromium

Create these test files in frontend/tests/e2e/:

1. auth.spec.ts
- test registers a new user successfully
- test shows validation errors on invalid email
- test shows error on wrong password
- test redirects to /tasks after login
- test logout clears session and redirects to /login
- test cannot access /tasks without being logged in

2. tasks.spec.ts  
- test task list page loads and shows empty state
- test clicking New Task navigates to create form
- test form validation prevents empty submission
- test submitting valid task shows it in the list
- test clicking a task card opens the detail page
- test task status badge shows correct color

3. navigation.spec.ts
- test all sidebar links navigate to correct pages
- test browser back button works correctly
- test 404 page for unknown routes

Use page.route() to mock all API calls so tests don't need a running backend.
Each test should be fully isolated — no shared state between tests.
Use Playwright's expect() assertions.

Create playwright.config.ts:
- baseURL: http://localhost:5173
- use chromium only for speed
- screenshots on failure
- video on failure
```

---

# Phase 8 — Final Polish (All Together)

## Windsurf Prompt (run this together)

```
Perform final polish on the MAP multi-agent AI platform project for showcase/portfolio presentation.

1. README.md improvements:
- Add badges at the top: Python version, Node version, License, PRs welcome
- Add a "Demo" section with screenshots description (or placeholder)
- Add "Quick Start" section with exactly 5 commands to get running
- Add "Architecture" section with the ASCII diagram from the spec
- Ensure all sections from the TechnicalSpec are covered

2. Code quality:
- Run through all Python files and add missing docstrings to all classes and public methods
- Add type hints to any function missing them in backend/
- Run: cd backend && python -m ruff check . --fix

3. Add a seed script at backend/scripts/seed_data.py:
Creates a demo user: email=demo@map.ai, password=demo1234
Creates 5 sample tasks with different statuses and types
Run with: python backend/scripts/seed_data.py

4. Add a frontend loading state for the entire app:
While authStore is checking if the user is logged in (initial load), show a centered MAP logo with a spinner instead of flashing the login page

5. Error boundary in React:
Wrap the app in an ErrorBoundary component that catches JS errors and shows a friendly "Something went wrong" page with a "Reload" button instead of a white screen

6. Final .env.example review:
Make sure every variable in .env.example has a comment explaining what it does and where to get the value (e.g. "Get from openai.com/api-keys")
```

## Phase 8 Acceptance Criteria (whole team reviews together)
- [ ] `README.md` is clear and impressive — someone who has never seen the project understands it in 2 minutes
- [ ] All Python files have docstrings
- [ ] `npm run build` completes with zero errors
- [ ] `pytest backend/tests/` passes with >80% coverage
- [ ] `npx playwright test` passes all E2E tests
- [ ] Submitting a real task returns a real AI-generated result
- [ ] The GitHub repo is public and the README renders correctly on GitHub
- [ ] No secrets in the repository (verify with `git log --all --full-history -- .env`)
