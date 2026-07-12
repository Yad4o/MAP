import { http, HttpResponse, delay } from 'msw';
import { ProviderKeyResponse, SetProviderKeyRequest } from '../../types';

const API_BASE = import.meta.env?.VITE_API_BASE_URL ??
  (import.meta.env?.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api/v1` : null) ??
  'http://localhost:8000/api/v1';

// In-memory so PUT/DELETE in the mock UI actually persist across a session.
const SEED_KEYS: ProviderKeyResponse[] = [
  { provider: 'anthropic', masked_key: '******a1b2', added_at: new Date(Date.now() - 86400000 * 3).toISOString() },
];
let mockKeys: ProviderKeyResponse[] = [...SEED_KEYS];

/** Test helper: restore the mock provider-keys store to its seeded state. */
export function resetMockProviderKeys() {
  mockKeys = [...SEED_KEYS];
}

export const providerKeyHandlers = [
  // GET /api/v1/provider-keys
  http.get(`${API_BASE}/provider-keys`, async () => {
    await delay(20);
    return HttpResponse.json(mockKeys);
  }),

  // PUT /api/v1/provider-keys
  http.put(`${API_BASE}/provider-keys`, async ({ request }) => {
    await delay(20);
    const body = (await request.json()) as SetProviderKeyRequest;
    const entry: ProviderKeyResponse = {
      provider: body.provider,
      masked_key: `******${body.api_key.slice(-4)}`,
      added_at: new Date().toISOString(),
    };
    mockKeys = [...mockKeys.filter((k) => k.provider !== body.provider), entry];
    return HttpResponse.json(entry);
  }),

  // DELETE /api/v1/provider-keys/:provider
  http.delete(`${API_BASE}/provider-keys/:provider`, async ({ params }) => {
    await delay(20);
    mockKeys = mockKeys.filter((k) => k.provider !== params.provider);
    return new HttpResponse(null, { status: 204 });
  }),
];
