import { http, HttpResponse, delay } from 'msw';
import { MemorySearchResult } from '../../types';

export const memoryHandlers = [
  // GET /api/v1/agents/memory/stats
  http.get('/api/v1/agents/memory/stats', async () => {
    await delay(300);
    return HttpResponse.json({ count: 1242 });
  }),

  // GET /api/v1/agents/memory/search
  http.get('/api/v1/agents/memory/search', async ({ request }) => {
    await delay(500);
    const url = new URL(request.url);
    const q = url.searchParams.get('q') || '';
    
    const results: MemorySearchResult[] = [
      {
        content: `Found reference to ${q} in system logs regarding task t-001. User requested optimization of the worker node.`,
        score: 0.92,
        task_id: 't-001',
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        content: `Previous interaction about ${q} suggested following the ISO-9001 standard for documentation.`,
        score: 0.85,
        task_id: 't-042',
        created_at: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        content: `Technical specification for ${q} was uploaded in October. It includes details about the database schema.`,
        score: 0.78,
        created_at: new Date(Date.now() - 604800000).toISOString(),
      },
    ];
    return HttpResponse.json(results);
  }),

  // DELETE /api/v1/agents/memory
  http.delete('/api/v1/agents/memory', async () => {
    await delay(800);
    return new HttpResponse(null, { status: 204 });
  }),
];
