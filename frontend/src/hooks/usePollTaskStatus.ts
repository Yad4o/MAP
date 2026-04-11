import { useQuery } from '@tanstack/react-query';
import { getTask, getTaskStatus } from '../api/tasks';
import { TaskStatus } from '../types/task';

const TERMINAL_STATES = [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED];

export const usePollTaskStatus = (id: string | undefined) => {
  return useQuery({
    queryKey: ['taskStatus', id],
    queryFn: () => getTaskStatus(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status && TERMINAL_STATES.includes(status)) {
        return false;
      }
      return 3000;
    },
  });
};

export const useTaskDetail = (id: string | undefined) => {
  return useQuery({
    queryKey: ['task', id],
    queryFn: () => getTask(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status && TERMINAL_STATES.includes(status)) {
        return false;
      }
      return 5000;
    },
  });
};
