import { http, HttpResponse } from 'msw'
import { Task, TaskCreate, TaskUpdate, TaskStatus } from '../../types/task'

const API_BASE = import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1` : null) ??
  'http://localhost:8000/api/v1'

function mockUUID(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

let mockTasks: Task[] = [
  {
    id: mockUUID(), title: 'Learn React', description: 'Study React Query',
    status: TaskStatus.COMPLETED, user_id: mockUUID(), task_type: null,
    priority: 5, retry_count: 0, config: null,
    created_at: new Date().toISOString(), started_at: null,
    completed_at: new Date().toISOString(), result: null, error: null,
  },
  {
    id: mockUUID(), title: 'Build Project', description: 'Create MSW handlers',
    status: TaskStatus.PROCESSING, user_id: mockUUID(), task_type: null,
    priority: 5, retry_count: 0, config: null,
    created_at: new Date().toISOString(), started_at: new Date().toISOString(),
    completed_at: null, result: null, error: null,
  },
  {
    id: mockUUID(), title: 'Write Tests', description: 'Using Vitest',
    status: TaskStatus.PENDING, user_id: mockUUID(), task_type: null,
    priority: 5, retry_count: 0, config: null,
    created_at: new Date().toISOString(), started_at: null,
    completed_at: null, result: null, error: null,
  },
]

export const taskHandlers = [
  http.get(`${API_BASE}/tasks`, () => {
    return HttpResponse.json<Task[]>(mockTasks)
  }),

  http.post(`${API_BASE}/tasks`, async ({ request }) => {
    const data = await request.json() as TaskCreate
    const newTask: Task = {
      id: mockUUID(),
      title: data.title,
      description: data.description || null,
      status: TaskStatus.PENDING,
      user_id: mockUUID(),
      task_type: null,
      priority: data.priority ?? 5,
      retry_count: 0,
      config: data.config ?? null,
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
      result: null,
      error: null,
    }
    mockTasks.push(newTask)
    return HttpResponse.json<Task>(newTask, { status: 201 })
  }),

  http.get(`${API_BASE}/tasks/:id`, ({ params }) => {
    const { id } = params
    const task = mockTasks.find(t => t.id === id)
    if (!task) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json<Task>(task)
  }),

  http.put(`${API_BASE}/tasks/:id`, async ({ params, request }) => {
    const { id } = params
    const data = await request.json() as TaskUpdate
    const index = mockTasks.findIndex(t => t.id === id)
    if (index === -1) return new HttpResponse(null, { status: 404 })
    
    mockTasks[index] = { ...mockTasks[index], ...data }
    return HttpResponse.json<Task>(mockTasks[index])
  }),

  http.delete(`${API_BASE}/tasks/:id`, ({ params }) => {
    const { id } = params
    mockTasks = mockTasks.filter(t => t.id !== id)
    return new HttpResponse(null, { status: 204 })
  })
]
