import { http, HttpResponse, delay } from 'msw';
import { LogEntry } from '../../types';

export const logHandlers = [
  // GET /api/v1/logs
  http.get('/api/v1/logs', async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const level = url.searchParams.get('level');
    const search = url.searchParams.get('search');

    const allLogs: LogEntry[] = Array.from({ length: 20 }).map((_, i) => {
      const levels: LogEntry['level'][] = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'];
      const currentLevel = levels[i % levels.length];
      return {
        id: `log-${i}`,
        timestamp: new Date(Date.now() - i * 1000 * 60).toISOString(),
        level: currentLevel,
        event: i % 3 === 0 ? `Task processing error in step ${i}` : `Successfully executed step ${i} for task`,
        task_id: i % 2 === 0 ? `t-${i}` : undefined,
        logger: i % 4 === 0 ? 'worker.executor' : 'app.api.tasks',
      };
    });

    let filteredLogs = allLogs;
    if (level && level !== 'ALL') {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }
    if (search) {
      filteredLogs = filteredLogs.filter(log => log.event.toLowerCase().includes(search.toLowerCase()));
    }

    return HttpResponse.json(filteredLogs);
  }),
];
