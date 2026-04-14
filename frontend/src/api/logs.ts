import { apiClient } from './client';
import { LogEntry } from '../types';

export const logsApi = {
  getLogs: async (params: { level?: string; search?: string } = {}): Promise<LogEntry[]> => {
    const response = await apiClient.get<LogEntry[]>('/logs', { params });
    return response.data;
  },
};
