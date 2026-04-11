/**
 * Frontend type definitions for Task system.
 * Must match backend schemas/task.py (TaskRead, TaskCreateRequest, TaskUpdateRequest).
 */

export enum TaskStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  RETRYING = 'RETRYING',
}

export interface TaskStep {
  id: string;
  task_id: string;
  step_index: number;
  step_type: string;
  agent_name: string;
  status: string;
  model_used: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
  latency_ms: number | null;
  confidence: number | null;
  output_payload: Record<string, unknown> | null;
  created_at: string;
  completed_at: string | null;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  task_type: string | null;
  priority: number;
  retry_count: number;
  config: Record<string, unknown> | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  result: Record<string, unknown> | null;
  error: Record<string, unknown> | null;
}

export interface TaskCreate {
  title: string;
  description?: string;
  priority?: number;
  config?: Record<string, unknown>;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  priority?: number;
  config?: Record<string, unknown>;
}

export interface TaskStatusResponse {
  id: string;
  status: TaskStatus;
}

export interface TaskDetailResponse extends Task {
  steps: TaskStep[];
}
