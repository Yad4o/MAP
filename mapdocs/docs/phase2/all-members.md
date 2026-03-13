# Phase 2 — Task System

> Everyone rotates layers from Phase 1.
> Member A moves from API routes → Database models
> Member B moves from Database → API routes
> Member C stays on Frontend but builds the Task pages

---

# Member A — Task Database Models & Repositories

> **Files:** `backend/app/db/models/task.py`, `backend/app/db/repositories/task_repo.py`, new Alembic migration

## What You Are Building

The data layer for all task management. Tasks are the core entity of the system — everything revolves around them. You are building the ORM models with proper relationships and the full repository with all CRUD operations. Then running a migration to create the tables.

## Windsurf Prompt

```
I am building the Task database layer for a FastAPI multi-agent AI platform called MAP.

Complete these files:

1. backend/app/db/models/task.py
Add proper foreign keys and relationships:
- Task.user_id: add ForeignKey("users.id") 
- TaskStep.task_id: add ForeignKey("tasks.id", ondelete="CASCADE")
- Task: add relationship steps = relationship("TaskStep", back_populates="task", cascade="all, delete-orphan", order_by="TaskStep.step_index")
- Task: add relationship user = relationship("User", back_populates="tasks")
- TaskStep: add relationship task = relationship("Task", back_populates="steps")
- Also add tasks = relationship("Task", back_populates="user") to the User model in user.py

2. backend/app/db/repositories/task_repo.py
Implement ALL methods in TaskRepository:

- create(user_id, title, description, priority, config) -> Task
  Create Task, set status="PENDING", add, flush, refresh, return

- get_by_id(task_id) -> Task | None
  Select task, also eagerly load steps using selectinload(Task.steps)

- get_by_id_and_user(task_id, user_id) -> Task | None
  Same as get_by_id but also filter by user_id for security

- list_by_user(user_id, status, page, page_size) -> tuple[list[Task], int]
  Filter by user_id, optionally filter by status
  Order by created_at DESC
  Paginate with offset/limit
  Return (tasks_list, total_count)

- update_status(task_id, status, extra_fields) -> None
  Update task status. extra_fields is a dict of additional fields to update
  Example extra_fields: {"started_at": datetime.utcnow()} or {"completed_at": datetime.utcnow()}

- set_result(task_id, result: dict) -> None
  Update task: result=result, status="COMPLETED", completed_at=now()

- set_error(task_id, error: dict) -> None
  Update task: error=error, status="FAILED", completed_at=now()

- increment_retry(task_id) -> None
  Increment retry_count by 1, set status="RETRYING"

Implement ALL methods in TaskStepRepository:

- create(task_id, step_index, step_type, agent_name, input_payload) -> TaskStep
  Create TaskStep with status="PENDING", add, flush, refresh, return

- list_by_task(task_id) -> list[TaskStep]
  Select all steps for task ordered by step_index ASC

- complete_step(step_id, output_payload, model_used, tokens_in, tokens_out, latency_ms, confidence) -> None
  Update step: status="COMPLETED", completed_at=now(), and all provided fields

3. Create Alembic migration:
Run: alembic revision --autogenerate -m "create_tasks_and_steps"
Then: alembic upgrade head

Verify in Neon dashboard that tasks and task_steps tables exist with all columns.
```

## Acceptance Criteria
- [ ] `alembic upgrade head` runs without errors
- [ ] `tasks` and `task_steps` tables in Neon dashboard
- [ ] All TaskRepository methods implemented
- [ ] All TaskStepRepository methods implemented
- [ ] Relationships working (task.steps returns list, step.task returns task)

---

# Member B — Task API Routes & Service

> **Files:** `backend/app/api/v1/tasks.py`, `backend/app/services/task_service.py`, `backend/app/main.py`

## What You Are Building

The HTTP interface for all task operations. Users submit tasks here, poll for status, and retrieve results. The most important design decision: `POST /tasks` returns immediately with `202 Accepted` — it does not wait for the task to complete. Task processing happens asynchronously in the Celery worker.

## Windsurf Prompt

```
I am building the Task API routes for a FastAPI multi-agent AI platform called MAP.

Complete these files:

1. backend/app/services/task_service.py
Implement TaskService class:

- create_task(user_id: uuid.UUID, data: TaskCreateRequest) -> TaskResponse
  Create task via TaskRepository
  Push task_id to Redis list: LPUSH "queue:default" task_id_string
  (Real Celery integration comes in Phase 3, use Redis directly for now)
  Cache status in Redis: SET "task:{task_id}:status" "PENDING" EX 86400
  Return TaskResponse from the created task

- list_tasks(user_id, status, page, page_size) -> PaginatedResponse[TaskResponse]
  Call task_repo.list_by_user with all params
  Build PaginatedResponse with total_pages = ceil(total / page_size)
  Return it

- get_task_detail(task_id, user_id) -> TaskDetailResponse
  Call task_repo.get_by_id_and_user (raises 404 if not found)
  Build TaskDetailResponse including steps list
  Return it

- get_task_status(task_id, user_id) -> TaskStatusResponse
  First check Redis: GET "task:{task_id}:status"
  If found in Redis, build TaskStatusResponse from cached status
  If not in Redis, fetch from DB via task_repo.get_by_id_and_user
  Return TaskStatusResponse

- cancel_task(task_id, user_id) -> None
  Fetch task, verify belongs to user, verify status is PENDING or PROCESSING
  Raise HTTPException 400 if task is already completed or failed
  Update status to CANCELLED via task_repo.update_status

- retry_task(task_id, user_id) -> TaskResponse
  Fetch task, verify belongs to user, verify status is FAILED
  Raise HTTPException 400 if task is not in FAILED state
  Increment retry count via task_repo.increment_retry
  Push task_id back to Redis queue
  Return updated TaskResponse

2. backend/app/api/v1/tasks.py
Implement all route handlers. Each handler should:
- Get current_user from Depends(get_current_user)
- Instantiate TaskService(db)
- Call the appropriate service method
- Return the result

Add proper status codes and response models matching the existing stubs.

3. backend/app/main.py
Uncomment the tasks router registration.

For Redis use:
import redis.asyncio as aioredis
redis_client = aioredis.from_url(settings.REDIS_URL)

Import get_current_user from app.dependencies
Import TaskRepository, TaskStepRepository from app.db.repositories.task_repo
```

## Acceptance Criteria
- [ ] `POST /api/v1/tasks` returns `202` with task object
- [ ] `GET /api/v1/tasks` returns paginated list of user's tasks
- [ ] `GET /api/v1/tasks/{id}` returns full task with steps array
- [ ] `GET /api/v1/tasks/{id}/status` returns lightweight status object
- [ ] `DELETE /api/v1/tasks/{id}` cancels a pending task
- [ ] Tasks from one user cannot be accessed by another user (returns 404)
- [ ] All routes require authentication (401 without token)

---

# Member C — Task Frontend Pages

> **Files:** `frontend/src/pages/TaskListPage.tsx`, `frontend/src/pages/TaskCreatePage.tsx`

## What You Are Building

The two main task pages. The list page shows all the user's tasks with their status, and allows filtering. The create page is a form where users submit new tasks. Both pages use TanStack Query (React Query) to manage server state and polling.

## Windsurf Prompt

```
I am building the Task pages for a React multi-agent AI platform called MAP.

Install required packages: npm install @tanstack/react-query

1. Update frontend/src/main.tsx
Wrap the app with QueryClientProvider:
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
const queryClient = new QueryClient()
Wrap App with <QueryClientProvider client={queryClient}>

2. Create a shared layout component at frontend/src/components/layout/AppShell.tsx
A sidebar layout with:
- Left sidebar with navigation links: Tasks, History, Logs, Settings, Admin (admin only)
- Show current user's username and a logout button at the bottom of sidebar
- Main content area on the right
- Use Tailwind for styling — dark sidebar (gray-900), white content area

3. Create frontend/src/pages/TaskListPage.tsx
Features:
- Use useQuery from TanStack Query to fetch tasks: queryKey: ["tasks"], queryFn: () => tasksApi.list()
- Show a loading skeleton while fetching (gray animated rectangles where cards would be)
- Show each task as a card with: title, status badge (color coded), created_at formatted as relative time (e.g. "2 hours ago"), task_type if available
- Status badge colors: PENDING=yellow, PROCESSING=blue, COMPLETED=green, FAILED=red, CANCELLED=gray
- Filter buttons at the top to filter by status — clicking a filter refetches with that status
- A "New Task" button in the top right that links to /tasks/new
- Clicking a task card navigates to /tasks/:id
- Empty state: if no tasks, show a centered message "No tasks yet" with a button to create one
- Add MSW handler: GET /api/v1/tasks → return { items: [mockTask1, mockTask2], total: 2, page: 1, page_size: 20, total_pages: 1 }

4. Create frontend/src/pages/TaskCreatePage.tsx
A form with:
- Title field (text input, required, min 3 chars)
- Description field (textarea, required, min 10 chars, tall enough to write a paragraph)
- Priority selector (1-10, default 5, shown as a slider or select dropdown)
- Submit button that calls tasksApi.create() and on success navigates to /tasks/:id of the new task
- Cancel button that goes back to /tasks
- Show loading state on submit button
- Show error message if submission fails
- Add MSW handler: POST /api/v1/tasks → return a mock TaskResponse

Use useNavigate from react-router-dom for navigation.
Use React Hook Form with Zod for form validation.
Wrap both pages in the AppShell layout component.
All styling with Tailwind CSS only.
Use the existing types from frontend/src/types/index.ts.
```

## Acceptance Criteria
- [ ] TaskListPage shows task cards with correct status badge colors
- [ ] Filtering by status works (even with mock data)
- [ ] TaskCreatePage form validates all fields before submitting
- [ ] Successful task creation navigates to the task detail page
- [ ] Both pages use AppShell layout with sidebar navigation
- [ ] Loading states show while data is being fetched
- [ ] No TypeScript errors
