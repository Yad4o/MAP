import { http, HttpResponse } from 'msw'
import { 
  Task, 
  TaskCreate, 
  TaskUpdate, 
  TaskStatus, 
  TaskDetailResponse,
  TaskMessage,
  MessageRole,
  StepType,
  StepStatus
} from '../../types/task'

const API_BASE = import.meta.env?.VITE_API_BASE_URL ??
  (import.meta.env?.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1` : null) ??
  'http://localhost:8000/api/v1'

// In-memory store — reset between test runs via server.resetHandlers()
let mockTasks: Task[] = [
  {
    id: 1,
    title: 'Design system architecture',
    description: 'Plan the overall microservices layout, define bounded contexts, and select communication patterns for the MAP platform.',
    status: TaskStatus.COMPLETED,
    user_id: 1,
    priority: 8,
    retry_count: 0,
    created_at: '2026-04-08T09:00:00.000Z',
  },
  {
    id: 2,
    title: 'Implement agent orchestration layer',
    description: 'Build the core agent dispatcher that routes tasks to the correct AI agent based on task type and priority.',
    status: TaskStatus.PROCESSING,
    user_id: 1,
    priority: 10,
    retry_count: 1,
    created_at: '2026-04-09T14:30:00.000Z',
  },
  {
    id: 3,
    title: 'Write E2E test suite',
    description: 'Create comprehensive end-to-end tests covering task creation, agent execution, and result delivery pipelines.',
    status: TaskStatus.PENDING,
    user_id: 1,
    priority: 5,
    retry_count: 0,
    created_at: '2026-04-10T08:15:00.000Z',
  },
]

let nextId = 1000

// Follow-up conversation thread per task, keyed by task id (string)
let mockMessages: Record<string, TaskMessage[]> = {}
let nextMessageId = 1

// Request counts for stateful status polling
let statusRequestCounts: Record<string | number, number> = {}

export const resetStatusCounts = () => {
  statusRequestCounts = {}
}

export const taskHandlers = [
  // GET /api/v1/tasks — list all tasks
  http.get(`${API_BASE}/tasks`, () => {
    return HttpResponse.json<Task[]>(mockTasks)
  }),

  // POST /api/v1/tasks — create a new task
  http.post(`${API_BASE}/tasks`, async ({ request }) => {
    const data = (await request.json()) as TaskCreate
    const newTask: Task = {
      id: nextId++,
      user_id: 1,
      title: data.title,
      description: data.description || '',
      status: data.status || TaskStatus.PENDING,
      priority: data.priority || 5,
      retry_count: 0,
      created_at: new Date().toISOString(),
    }
    mockTasks.push(newTask)
    return HttpResponse.json<Task>(newTask, { status: 202 })
  }),

  // GET /api/v1/tasks/:id/status — stateful polling
  http.get(`${API_BASE}/tasks/:id/status`, ({ params }) => {
    const id = params.id as string
    const task = mockTasks.find((t) => String(t.id) === id)
    if (!task) return new HttpResponse(null, { status: 404 })

    // Simulate state transition: PROCESSING -> PROCESSING -> COMPLETED
    if (task.status === TaskStatus.PROCESSING || task.status === TaskStatus.PENDING) {
      statusRequestCounts[id] = (statusRequestCounts[id] || 0) + 1
      if (statusRequestCounts[id] >= 3) {
        task.status = TaskStatus.COMPLETED
        task.completed_at = new Date().toISOString()
      } else if (task.status === TaskStatus.PENDING) {
        task.status = TaskStatus.PROCESSING
        task.started_at = new Date().toISOString()
      }
    }

    return HttpResponse.json({
      id: task.id,
      status: task.status,
      retry_count: task.retry_count,
      started_at: task.started_at,
      completed_at: task.completed_at,
    })
  }),

  // GET /api/v1/tasks/:id — detailed task view
  http.get(`${API_BASE}/tasks/:id`, ({ params }) => {
    const task = mockTasks.find((t) => String(t.id) === params.id)
    if (!task) return new HttpResponse(null, { status: 404 })

    const detail: TaskDetailResponse = {
      ...task,
      steps: [
        {
          id: 'step-1',
          step_index: 0,
          step_type: StepType.PLAN,
          agent_name: 'ArchitectAgent',
          status: StepStatus.COMPLETED,
          latency_ms: 1200,
          confidence: 0.98,
          created_at: task.created_at,
          completed_at: new Date().toISOString(),
          input_payload: { task: task.title, detail: task.description },
          output_payload: { plan: ['Research', 'Execute', 'Verify'] }
        },
        {
          id: 'step-2',
          step_index: 1,
          step_type: StepType.EXECUTE,
          agent_name: 'CoderAgent',
          status: task.status === TaskStatus.COMPLETED ? StepStatus.COMPLETED : StepStatus.RUNNING,
          latency_ms: task.status === TaskStatus.COMPLETED ? 4500 : undefined,
          confidence: 0.92,
          created_at: new Date().toISOString(),
          input_payload: { plan: ['Research', 'Execute', 'Verify'], current_step: 'Execute' },
          output_payload: { code: 'console.log("hello world")' }
        }
      ],
      messages: mockMessages[String(task.id)] || [],
    }
    return HttpResponse.json<TaskDetailResponse>(detail)
  }),

  // POST /api/v1/tasks/:id/cancel
  http.post(`${API_BASE}/tasks/:id/cancel`, ({ params }) => {
    const task = mockTasks.find((t) => String(t.id) === params.id)
    if (!task) return new HttpResponse(null, { status: 404 })
    task.status = TaskStatus.CANCELLED
    return new HttpResponse(null, { status: 204 })
  }),

  // POST /api/v1/tasks/:id/retry
  http.post(`${API_BASE}/tasks/:id/retry`, ({ params }) => {
    const task = mockTasks.find((t) => String(t.id) === params.id)
    if (!task) return new HttpResponse(null, { status: 404 })
    task.status = TaskStatus.PENDING
    task.retry_count += 1
    delete statusRequestCounts[params.id as string]
    return HttpResponse.json(task)
  }),

  // POST /api/v1/tasks/:id/messages — send a follow-up, re-queue the task
  http.post(`${API_BASE}/tasks/:id/messages`, async ({ params, request }) => {
    const id = params.id as string
    const task = mockTasks.find((t) => String(t.id) === id)
    if (!task) return new HttpResponse(null, { status: 404 })

    if (task.status !== TaskStatus.COMPLETED && task.status !== TaskStatus.FAILED) {
      return HttpResponse.json(
        { detail: `Cannot continue a task with status '${task.status}'.` },
        { status: 400 },
      )
    }

    const { content } = (await request.json()) as { content: string }
    const thread = mockMessages[id] || (mockMessages[id] = [])
    thread.push({
      id: `msg-${nextMessageId++}`,
      task_id: task.id,
      role: MessageRole.USER,
      content,
      created_at: new Date().toISOString(),
    })

    task.status = TaskStatus.PENDING
    delete statusRequestCounts[id]

    // Simulate the worker replying once polling brings status back to
    // COMPLETED — matches AgentRunner logging an assistant message after
    // each continuation run.
    setTimeout(() => {
      if (mockMessages[id]) {
        mockMessages[id].push({
          id: `msg-${nextMessageId++}`,
          task_id: task.id,
          role: MessageRole.ASSISTANT,
          content: `Done — I took your follow-up ("${content}") into account and updated the result.`,
          created_at: new Date().toISOString(),
        })
      }
    }, 3000)

    return HttpResponse.json<Task>(task, { status: 202 })
  }),

  // GET /api/v1/tasks/:id/messages — full follow-up thread
  http.get(`${API_BASE}/tasks/:id/messages`, ({ params }) => {
    const id = params.id as string
    const task = mockTasks.find((t) => String(t.id) === id)
    if (!task) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json<TaskMessage[]>(mockMessages[id] || [])
  }),

  // PUT /api/v1/tasks/:id — update a task
  http.put(`${API_BASE}/tasks/:id`, async ({ params, request }) => {
    const data = (await request.json()) as TaskUpdate
    const index = mockTasks.findIndex((t) => String(t.id) === params.id)
    if (index === -1) return new HttpResponse(null, { status: 404 })

    mockTasks[index] = { ...mockTasks[index], ...data }
    return HttpResponse.json<Task>(mockTasks[index])
  }),

  // DELETE /api/v1/tasks/:id — delete a task
  http.delete(`${API_BASE}/tasks/:id`, ({ params }) => {
    mockTasks = mockTasks.filter((t) => String(t.id) !== params.id)
    return new HttpResponse(null, { status: 204 })
  }),
]
