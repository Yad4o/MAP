import { useQuery } from '@tanstack/react-query';
import { getTaskStatus, getTaskDetail } from '../api/tasks';
import { TaskStatus } from '../types/task';

const TERMINAL_STATES = [
  TaskStatus.COMPLETED,
  TaskStatus.FAILED,
  TaskStatus.CANCELLED
];

/**
 * Polls the task status every 3 seconds until it reaches a terminal state.
 */
export const usePollTaskStatus = (id: string | number | undefined) => {
  return useQuery({
    queryKey: ['tasks', id, 'status'],
    queryFn: () => getTaskStatus(id!),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status && TERMINAL_STATES.includes(status)) {
        return false;
      }
      return 3000;
    },
    enabled: !!id,
  });
};

/**
 * Polls the full task detail every 5 seconds until it reaches a terminal state.
 */
export const useTaskDetail = (id: string | number | undefined) => {
  return useQuery({
    queryKey: ['tasks', id, 'detail'],
    queryFn: () => getTaskDetail(id!),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status && TERMINAL_STATES.includes(status)) {
        return false;
      }
      return 5000;
    },
    enabled: !!id,
  });
};
