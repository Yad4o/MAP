import { http, passthrough, HttpResponse } from 'msw'
import { TaskStatus } from '../../types/task'

/**
 * Task handlers — includes stateful mocks for polling.
 */
const API_BASE =
  import.meta.env.VITE_API_BASE_URL ??
  (import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1` : null) ??
  'http://localhost:8000/api/v1'

let statusPollCount = 0;

export const taskHandlers = [
  http.get(`${API_BASE}/tasks`, () => passthrough()),
  http.post(`${API_BASE}/tasks`, () => passthrough()),
  
  // Stateful status handler: PROCESSING (2x) -> COMPLETED
  http.get(`${API_BASE}/tasks/:id/status`, () => {
    statusPollCount++;
    const status = statusPollCount > 2 ? TaskStatus.COMPLETED : TaskStatus.PROCESSING;
    return HttpResponse.json({ id: 'mock-id', status });
  }),

  // Task detail with mock steps
  http.get(`${API_BASE}/tasks/:id`, ({ params }) => {
    const { id } = params;
    const status = statusPollCount > 2 ? TaskStatus.COMPLETED : TaskStatus.PROCESSING;
    
    return HttpResponse.json({
      id,
      user_id: 'user-123',
      title: 'Analyze market trends',
      description: 'Using AI to crawl and summarize latest semiconductor trends.',
      status,
      task_type: 'research',
      priority: 1,
      retry_count: 0,
      config: { model: 'gpt-4' },
      created_at: new Date(Date.now() - 30000).toISOString(),
      started_at: new Date(Date.now() - 25000).toISOString(),
      completed_at: status === TaskStatus.COMPLETED ? new Date().toISOString() : null,
      result: status === TaskStatus.COMPLETED ? { summary: 'Semiconductor market is growing at 15% CAGR.', confidence_score: 0.95 } : null,
      error: null,
      steps: [
        {
          id: 'step-1',
          task_id: id as string,
          step_index: 0,
          step_type: 'search',
          agent_name: 'SearchAgent',
          status: 'COMPLETED',
          model_used: 'gpt-3.5-turbo',
          tokens_in: 500,
          tokens_out: 200,
          latency_ms: 1200,
          confidence: 0.98,
          output_payload: { query: 'semiconductor trends 2024', results_count: 50 },
          created_at: new Date(Date.now() - 24000).toISOString(),
          completed_at: new Date(Date.now() - 22800).toISOString(),
        },
        {
          id: 'step-2',
          task_id: id as string,
          step_index: 1,
          step_type: 'analyze',
          agent_name: 'AnalysisAgent',
          status: status === TaskStatus.COMPLETED ? 'COMPLETED' : 'PROCESSING',
          model_used: 'gpt-4',
          tokens_in: 2000,
          tokens_out: 800,
          latency_ms: 4500,
          confidence: 0.92,
          output_payload: status === TaskStatus.COMPLETED ? { synthesis: 'Competitive landscape is consolidating.' } : null,
          created_at: new Date(Date.now() - 22000).toISOString(),
          completed_at: status === TaskStatus.COMPLETED ? new Date(Date.now() - 17500).toISOString() : null,
        }
      ]
    });
  }),

  http.put(`${API_BASE}/tasks/:id`, () => passthrough()),
  http.delete(`${API_BASE}/tasks/:id`, () => passthrough()),
]
