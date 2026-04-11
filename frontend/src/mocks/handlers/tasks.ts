import { http, HttpResponse } from 'msw'
import { Task, TaskCreate, TaskUpdate, TaskStatus } from '../../types/task'

const API_BASE = import.meta.env?.VITE_API_BASE_URL ??
  (import.meta.env?.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1` : null) ??
  'http://localhost:8000/api/v1'

// In-memory store — reset between test runs via server.resetHandlers()
let mockTasks: Task[] = [
  {
    id: 1,
    title: 'Design system architecture',
    description: 'Plan the overall microservices layout, define bounded contexts, and select communication patterns for the MAP platform.',
    status: TaskStatus.DONE,
    user_id: 1,
    created_at: '2026-04-08T09:00:00.000Z',
  },
  {
    id: 2,
    title: 'Implement agent orchestration layer',
    description: 'Build the core agent dispatcher that routes tasks to the correct AI agent based on task type and priority.',
    status: TaskStatus.IN_PROGRESS,
    user_id: 1,
    created_at: '2026-04-09T14:30:00.000Z',
  },
  {
    id: 3,
    title: 'Write E2E test suite',
    description: 'Create comprehensive end-to-end tests covering task creation, agent execution, and result delivery pipelines.',
    status: TaskStatus.PENDING,
    user_id: 1,
    created_at: '2026-04-10T08:15:00.000Z',
  },
]

let nextId = 1000

export const taskHandlers = [
  // GET /api/v1/tasks — list all tasks
  http.get(`${API_BASE}/tasks`, () => {
    return HttpResponse.json<Task[]>(mockTasks)
  }),

  // POST /api/v1/tasks — create a new task
  http.post(`${API_BASE}/tasks`, async ({ request }) => {
    const data = (await request.json()) as TaskCreate
    const newTask: Task = {
      id: 999,
      title: data.title,
      description: data.description || '',
      status: data.status || TaskStatus.PENDING,
      user_id: 1,
      created_at: new Date().toISOString(),
    }
    mockTasks.push(newTask)
    // Increment so subsequent calls in the same session get unique IDs
    nextId++
    return HttpResponse.json<Task>(newTask, { status: 201 })
  }),

  // GET /api/v1/tasks/:id — single task
  http.get(`${API_BASE}/tasks/:id`, ({ params }) => {
    const task = mockTasks.find((t) => t.id === Number(params.id))
    if (!task) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json<Task>(task)
  }),

  // PUT /api/v1/tasks/:id — update a task
  http.put(`${API_BASE}/tasks/:id`, async ({ params, request }) => {
    const data = (await request.json()) as TaskUpdate
    const index = mockTasks.findIndex((t) => t.id === Number(params.id))
    if (index === -1) return new HttpResponse(null, { status: 404 })

    mockTasks[index] = { ...mockTasks[index], ...data }
    return HttpResponse.json<Task>(mockTasks[index])
  }),

  // DELETE /api/v1/tasks/:id — delete a task
  http.delete(`${API_BASE}/tasks/:id`, ({ params }) => {
    mockTasks = mockTasks.filter((t) => t.id !== Number(params.id))
    return new HttpResponse(null, { status: 204 })
  }),
]
