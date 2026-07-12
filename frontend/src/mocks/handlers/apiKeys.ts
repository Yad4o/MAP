import { http, HttpResponse, delay } from 'msw';
import { ApiKeyResponse, NewApiKeyResponse } from '../../types';

const API_BASE = import.meta.env?.VITE_API_BASE_URL ??
  (import.meta.env?.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1` : null) ??
  'http://localhost:8000/api/v1';

export const apiKeyHandlers = [
  // GET /api/v1/api-keys
  http.get(`${API_BASE}/api-keys`, async () => {
    await delay(300);
    const keys: ApiKeyResponse[] = [
      {
        id: 'k1',
        name: 'Production Worker',
        key_prefix: 'map_live_prod',
        scopes: ['task:read', 'task:write'],
        is_active: true,
        last_used_at: new Date(Date.now() - 3600000).toISOString(),
        created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
      },
      {
        id: 'k2',
        name: 'Development Testing',
        key_prefix: 'map_live_dev',
        scopes: ['task:read'],
        is_active: true,
        last_used_at: new Date(Date.now() - 5000).toISOString(),
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      },
      {
        id: 'k3',
        name: 'Legacy Integration',
        key_prefix: 'map_live_old',
        scopes: ['admin:read'],
        is_active: false,
        created_at: new Date(Date.now() - 86400000 * 365).toISOString(),
      },
    ];
    return HttpResponse.json(keys);
  }),

  // POST /api/v1/api-keys
  http.post(`${API_BASE}/api-keys`, async ({ request }) => {
    await delay(500);
    const body = await request.json() as import('../../types').CreateApiKeyRequest;
    const newKey: NewApiKeyResponse = {
      id: `k-${Math.random().toString(36).slice(2, 11)}`,
      name: body.name || 'Untitled Key',
      key_prefix: 'map_live_new',
      full_key: 'map_live_new_abc123def456ghi789jkl012',
      scopes: body.scopes || ['task:read'],
      is_active: true,
      created_at: new Date().toISOString(),
    };
    return HttpResponse.json(newKey);
  }),

  // DELETE /api/v1/api-keys/:id
  http.delete(`${API_BASE}/api-keys/:id`, async () => {
    await delay(300);
    return new HttpResponse(null, { status: 204 });
  }),
];
