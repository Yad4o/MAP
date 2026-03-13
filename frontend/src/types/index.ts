/**
 * frontend/src/types/index.ts
 * ────────────────────────────
 * TypeScript interfaces mirroring the backend Pydantic schemas.
 * These are the contract between frontend and backend.
 *
 * Rule: When a backend schema changes, this file must be updated too.
 * Phase 0: All types defined. Frontend builds against these from day 1.
 */

// ── Common ────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ErrorResponse {
  error_code: string;
  message: string;
  request_id?: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface MessageResponse {
  message: string;
}

// ── Auth ──────────────────────────────────────────────────────

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UpdateProfileRequest {
  username?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface UserResponse {
  id: string;
  email: string;
  username: string;
  role: "USER" | "ADMIN" | "SYSTEM";
  tier: "free" | "pro" | "enterprise";
  is_active: boolean;
  email_verified: boolean;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

// ── Tasks ─────────────────────────────────────────────────────

export type TaskStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "RETRYING";

export type TaskType = "research" | "code" | "data" | "document" | "general";

export type StepType = "ROOT" | "PLAN" | "EXECUTE" | "ANALYZE" | "MEMORY" | "FALLBACK";

export type StepStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "SKIPPED";

export interface TaskCreateRequest {
  title: string;
  description: string;
  priority?: number;
  config?: Record<string, unknown>;
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
  output_payload?: Record<string, unknown>;
  created_at: string;
  completed_at?: string;
}

export interface TaskResponse {
  id: string;
  title: string;
  status: TaskStatus;
  task_type?: TaskType;
  priority: number;
  retry_count: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface TaskDetailResponse extends TaskResponse {
  description: string;
  config?: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: Record<string, unknown>;
  steps: TaskStepResponse[];
}

export interface TaskStatusResponse {
  id: string;
  status: TaskStatus;
  retry_count: number;
  started_at?: string;
  completed_at?: string;
}

// ── Agents ────────────────────────────────────────────────────

export interface AgentMetadata {
  model_used?: string;
  tokens_in: number;
  tokens_out: number;
  latency_ms: number;
  fallback_used: boolean;
}

export interface MemorySearchRequest {
  query: string;
  top_k?: number;
}

export interface MemorySearchResult {
  content: string;
  score: number;
  task_id?: string;
  created_at?: string;
}

// ── API Keys ──────────────────────────────────────────────────

export interface ApiKeyResponse {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  is_active: boolean;
  last_used_at?: string;
  expires_at?: string;
  created_at: string;
}

export interface CreateApiKeyRequest {
  name: string;
  scopes: string[];
  expires_at?: string;
}

// Only returned once on creation — never again
export interface NewApiKeyResponse extends ApiKeyResponse {
  full_key: string;
}

// ── WebSocket Events ──────────────────────────────────────────

export type WsEventType = "step_complete" | "thinking" | "complete" | "error";

export interface WsEvent<T = unknown> {
  event: WsEventType;
  task_id: string;
  data: T;
  timestamp: string;
}
