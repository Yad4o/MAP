import { apiClient } from './client';
import { AdminMetrics, AdminUser } from '../types';

export const adminApi = {
  getMetrics: async (): Promise<AdminMetrics> => {
    const response = await apiClient.get<AdminMetrics>('/admin/metrics');
    return response.data;
  },

  getUsers: async (): Promise<AdminUser[]> => {
    const response = await apiClient.get<AdminUser[]>('/admin/users');
    return response.data;
  },

  updateUser: async (id: string, data: Partial<AdminUser>): Promise<void> => {
    await apiClient.patch(`/admin/users/${id}`, data);
  },
};
