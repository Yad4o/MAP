import apiClient from './client';
import { Task, TaskCreate, TaskUpdate } from '../types/task';

export const getTasks = async (): Promise<Task[]> => {
  const { data } = await apiClient.get<Task[]>('/tasks');
  return data;
};

export const getTask = async (id: number): Promise<Task> => {
  const { data } = await apiClient.get<Task>(`/tasks/${id}`);
  return data;
};

export const createTask = async (task: TaskCreate): Promise<Task> => {
  const { data } = await apiClient.post<Task>('/tasks', task);
  return data;
};

export const updateTask = async (id: number, task: TaskUpdate): Promise<Task> => {
  const { data } = await apiClient.put<Task>(`/tasks/${id}`, task);
  return data;
};

export const deleteTask = async (id: number): Promise<void> => {
  await apiClient.delete(`/tasks/${id}`);
};

// TODO (Task 2.3 integration): restore getStatus, getSteps, cancel, retry
// export const getTaskStatus = async (id: number): Promise<TaskStatusResponse> => { ... };
// export const getTaskSteps = async (id: number): Promise<TaskStepResponse[]> => { ... };
// export const cancelTask = async (id: number): Promise<void> => { ... };
// export const retryTask = async (id: number): Promise<Task> => { ... };
