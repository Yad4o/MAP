/**
 * frontend/src/api/tasks.ts
 * ──────────────────────────
 * All task-related API calls.
 */

import apiClient from "./client";
import type {
  PaginatedResponse,
  TaskCreateRequest,
  TaskDetailResponse,
  TaskResponse,
  TaskStatusResponse,
  TaskStepResponse,
} from "../types";

export const tasksApi = {
  create: async (data: TaskCreateRequest): Promise<TaskResponse> => {
    const res = await apiClient.post("/tasks", data);
    return res.data;
  },

  list: async (page = 1, pageSize = 20): Promise<PaginatedResponse<TaskResponse>> => {
    const res = await apiClient.get("/tasks", { params: { page, page_size: pageSize } });
    return res.data;
  },

  getById: async (taskId: string): Promise<TaskDetailResponse> => {
    const res = await apiClient.get(`/tasks/${taskId}`);
    return res.data;
  },

  getStatus: async (taskId: string): Promise<TaskStatusResponse> => {
    const res = await apiClient.get(`/tasks/${taskId}/status`);
    return res.data;
  },

  getSteps: async (taskId: string): Promise<TaskStepResponse[]> => {
    const res = await apiClient.get(`/tasks/${taskId}/steps`);
    return res.data;
  },

  cancel: async (taskId: string): Promise<void> => {
    await apiClient.delete(`/tasks/${taskId}`);
  },

  retry: async (taskId: string): Promise<TaskResponse> => {
    const res = await apiClient.post(`/tasks/${taskId}/retry`);
    return res.data;
  },
};
