import { http, HttpResponse, delay } from 'msw';
import { AdminMetrics, AdminUser } from '../../types';

export const adminHandlers = [
  // GET /api/v1/admin/metrics
  http.get('/api/v1/admin/metrics', async () => {
    await delay(500);
    const metrics: AdminMetrics = {
      total_tasks_today: 142,
      success_rate: 94.5,
      avg_task_duration: 12.4,
      active_users: 18,
    };
    return HttpResponse.json(metrics);
  }),

  // GET /api/v1/admin/users
  http.get('/api/v1/admin/users', async () => {
    await delay(500);
    const users: AdminUser[] = [
      {
        id: 'u1',
        email: 'admin@example.com',
        username: 'admin',
        role: 'ADMIN',
        tier: 'enterprise',
        is_active: true,
        last_login: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'u2',
        email: 'user1@example.com',
        username: 'jdoe',
        role: 'USER',
        tier: 'pro',
        is_active: true,
        last_login: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 'u3',
        email: 'user2@example.com',
        username: 'asmith',
        role: 'USER',
        tier: 'free',
        is_active: false,
        last_login: new Date(Date.now() - 604800000).toISOString(),
      },
      {
        id: 'u4',
        email: 'user3@example.com',
        username: 'bwayne',
        role: 'USER',
        tier: 'enterprise',
        is_active: true,
        last_login: new Date(Date.now() - 10000).toISOString(),
      },
      {
        id: 'u5',
        email: 'user4@example.com',
        username: 'ckent',
        role: 'USER',
        tier: 'pro',
        is_active: true,
        last_login: new Date(Date.now() - 300000).toISOString(),
      },
    ];
    return HttpResponse.json(users);
  }),

  // PATCH /api/v1/admin/users/:id
  http.patch('/api/v1/admin/users/:id', async ({ params, request }) => {
    await delay(300);
    const body = await request.json() as Partial<AdminUser>;
    return HttpResponse.json({ message: `User ${params.id} updated successfully`, ...body });
  }),
];
