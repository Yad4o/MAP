import apiClient from './client';
import { 
  Task, 
  TaskCreate, 
  TaskUpdate, 
  TaskStatusResponse, 
  TaskDetailResponse 
} from '../types/task';

export const getTasks = async (): Promise<Task[]> => {
  const { data } = await apiClient.get<Task[]>('/tasks');
  return data;
};

export const getTaskDetail = async (id: string | number): Promise<TaskDetailResponse> => {
  const { data } = await apiClient.get<TaskDetailResponse>(`/tasks/${id}`);
  return data;
};

export const getTaskStatus = async (id: string | number): Promise<TaskStatusResponse> => {
  const { data } = await apiClient.get<TaskStatusResponse>(`/tasks/${id}/status`);
  return data;
};

export const createTask = async (task: TaskCreate): Promise<Task> => {
  const { data } = await apiClient.post<Task>('/tasks', task);
  return data;
};

export const updateTask = async (id: string | number, task: TaskUpdate): Promise<Task> => {
  const { data } = await apiClient.put<Task>(`/tasks/${id}`, task);
  return data;
};

export const deleteTask = async (id: string | number): Promise<void> => {
  await apiClient.delete(`/tasks/${id}`);
};

export const cancelTask = async (id: string | number): Promise<void> => {
  await apiClient.post(`/tasks/${id}/cancel`);
};

export const retryTask = async (id: string | number): Promise<Task> => {
  const { data } = await apiClient.post<Task>(`/tasks/${id}/retry`);
  return data;
};
