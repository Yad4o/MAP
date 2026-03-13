/**
 * frontend/src/hooks/useTaskStream.ts
 * ─────────────────────────────────────
 * WebSocket hook for real-time task updates.
 *
 * Phase 0: Hook shape defined. Returns mock data.
 * Phase 6: Implement real WebSocket connection.
 */

import { useEffect, useRef, useState } from "react";
import type { TaskStepResponse, TaskStatus, WsEvent } from "../types";

interface TaskStreamState {
  status: TaskStatus | null;
  steps: TaskStepResponse[];
  isConnected: boolean;
  error: string | null;
}

export function useTaskStream(taskId: string | null) {
  const [state, setState] = useState<TaskStreamState>({
    status: null,
    steps: [],
    isConnected: false,
    error: null,
  });

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!taskId) return;

    // TODO Phase 6: Replace with real WebSocket connection
    // const ws = new WebSocket(`ws://localhost:8000/api/v1/tasks/${taskId}/ws?token=...`);
    // ws.onopen = () => setState(s => ({ ...s, isConnected: true }));
    // ws.onmessage = (e) => handleMessage(JSON.parse(e.data));
    // ws.onclose = () => setState(s => ({ ...s, isConnected: false }));
    // wsRef.current = ws;

    // return () => ws.close();

    console.log(`[useTaskStream] Phase 6 — WebSocket for task ${taskId} not yet implemented`);
  }, [taskId]);

  return state;
}
