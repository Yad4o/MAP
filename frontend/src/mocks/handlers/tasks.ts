import { http, HttpResponse } from 'msw'
import { Task, TaskCreate, TaskUpdate, TaskStatus } from '../../types/task'

const API_BASE = import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1` : null) ??
  'http://localhost:8000/api/v1'

let mockTasks: Task[] = [
  { id: 1, title: 'Learn React', description: 'Study React Query', status: TaskStatus.DONE, user_id: 1, created_at: new Date().toISOString() },
  { id: 2, title: 'Build Project', description: 'Create MSW handlers', status: TaskStatus.IN_PROGRESS, user_id: 1, created_at: new Date().toISOString() },
  { id: 3, title: 'Write Tests', description: 'Using Vitest', status: TaskStatus.PENDING, user_id: 1, created_at: new Date().toISOString() },
]

let nextId = 1000;

export const taskHandlers = [
  http.get(`${API_BASE}/tasks`, () => {
    return HttpResponse.json<Task[]>(mockTasks)
  }),

  http.post(`${API_BASE}/tasks`, async ({ request }) => {
    const data = await request.json() as TaskCreate
    const newTask: Task = {
      id: nextId++,
      title: data.title,
      description: data.description || '',
      status: data.status || TaskStatus.PENDING,
      user_id: 1,
      created_at: new Date().toISOString()
    }
    mockTasks.push(newTask)
    return HttpResponse.json<Task>(newTask, { status: 201 })
  }),

  http.get(`${API_BASE}/tasks/:id`, ({ params }) => {
    const { id } = params
    const task = mockTasks.find(t => t.id === Number(id))
    if (!task) return new HttpResponse(null, { status: 404 })
    return HttpResponse.json<Task>(task)
  }),

  http.put(`${API_BASE}/tasks/:id`, async ({ params, request }) => {
    const { id } = params
    const data = await request.json() as TaskUpdate
    const index = mockTasks.findIndex(t => t.id === Number(id))
    if (index === -1) return new HttpResponse(null, { status: 404 })
    
    mockTasks[index] = { ...mockTasks[index], ...data }
    return HttpResponse.json<Task>(mockTasks[index])
  }),

  http.delete(`${API_BASE}/tasks/:id`, ({ params }) => {
    const { id } = params
    mockTasks = mockTasks.filter(t => t.id !== Number(id))
    return new HttpResponse(null, { status: 204 })
  })
]
