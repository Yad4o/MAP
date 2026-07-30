export enum TaskStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  RETRYING = 'RETRYING',
}

export enum StepType {
  ROOT = 'ROOT',
  PLAN = 'PLAN',
  EXECUTE = 'EXECUTE',
  ANALYZE = 'ANALYZE',
  MEMORY = 'MEMORY',
  FALLBACK = 'FALLBACK'
}

export enum StepStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED'
}

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
}

export interface TaskMessage {
  id: string;
  task_id: string | number;
  role: MessageRole;
  content: string;
  created_at: string;
}

export interface TaskError {
  type: string;
  message: string;
  traceback?: string;
}

export interface TaskStepResponse {
  id: string;
  step_index: number;
  step_type: StepType;
  agent_name: string;
  status: StepStatus;
  model_used?: string;
  tokens_in?: number;
  tokens_out?: number;
  latency_ms?: number;
  confidence?: number;
  input_payload?: Record<string, unknown>;
  output_payload?: Record<string, unknown>;
  created_at: string;
  completed_at?: string;
}

export interface Task {
  id: string | number;
  user_id: string | number;
  title: string;
  description?: string;
  status: TaskStatus;
  task_type?: string;
  priority: number;
  retry_count: number;
  config?: any;
  created_at: string;
  updated_at?: string;
  started_at?: string;
  completed_at?: string;
  result?: any;
  error?: TaskError;
}

export interface TaskDetailResponse extends Task {
  steps: TaskStepResponse[];
  messages?: TaskMessage[];
}

export interface TaskStatusResponse {
  id: string | number;
  status: TaskStatus;
  retry_count: number;
  started_at?: string;
  completed_at?: string;
}

export interface TaskCreate {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: number;
  config?: any;
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: number;
  config?: any;
}
