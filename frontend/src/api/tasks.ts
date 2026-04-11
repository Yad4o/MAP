import apiClient from './client';
import { Task, TaskCreate, TaskUpdate, TaskStatusResponse, TaskDetailResponse } from '../types/task';

export const getTasks = async (): Promise<Task[]> => {
  const { data } = await apiClient.get<Task[]>('/tasks');
  return data;
};

export const getTask = async (id: string): Promise<TaskDetailResponse> => {
  const { data } = await apiClient.get<TaskDetailResponse>(`/tasks/${id}`);
  return data;
};

export const getTaskStatus = async (id: string): Promise<TaskStatusResponse> => {
  const { data } = await apiClient.get<TaskStatusResponse>(`/tasks/${id}/status`);
  return data;
};

export const createTask = async (task: TaskCreate): Promise<Task> => {
  const { data } = await apiClient.post<Task>('/tasks', task);
  return data;
};

export const updateTask = async (id: string, task: TaskUpdate): Promise<Task> => {
  const { data } = await apiClient.put<Task>(`/tasks/${id}`, task);
  return data;
};

export const deleteTask = async (id: string): Promise<void> => {
  await apiClient.delete(`/tasks/${id}`);
};
