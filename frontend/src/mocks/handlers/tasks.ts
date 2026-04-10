import { http, passthrough } from 'msw'

/**
 * Task handlers — all passthroughs.
 * MSW intercepts the request but immediately forwards it to Sanskruti's real backend.
 * No mock data is returned; remove this array entry entirely once MSW is no longer needed.
 */
const API_BASE =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1` : null) ??
  'http://localhost:8000/api/v1'

export const taskHandlers = [
  http.get(`${API_BASE}/tasks`, () => passthrough()),
  http.post(`${API_BASE}/tasks`, () => passthrough()),
  http.get(`${API_BASE}/tasks/:id`, () => passthrough()),
  http.put(`${API_BASE}/tasks/:id`, () => passthrough()),
  http.delete(`${API_BASE}/tasks/:id`, () => passthrough()),
]
