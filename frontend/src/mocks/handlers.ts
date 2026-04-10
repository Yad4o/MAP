import { http, passthrough } from 'msw'
import { taskHandlers } from './handlers/tasks'

// Use the same base URL as the API client
const API_BASE = import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1` : null) ??
  'http://localhost:8000/api/v1'

// Define your mock API handlers here
export const handlers = [
  // Auth endpoints - all passthrough to real backend
  http.post(`${API_BASE}/auth/login`, () => passthrough()),
  http.post(`${API_BASE}/auth/register`, () => passthrough()),
  http.get(`${API_BASE}/auth/me`, () => passthrough()),
  http.post(`${API_BASE}/auth/logout`, () => passthrough()),
  http.patch(`${API_BASE}/auth/me`, () => passthrough()),
  http.post(`${API_BASE}/auth/change-password`, () => passthrough()),
  http.post(`${API_BASE}/auth/refresh`, () => passthrough()),

  // Task handlers (already passthrough)
  ...taskHandlers
]

