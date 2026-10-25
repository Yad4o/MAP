import { useEffect, useMemo, useRef, useState } from 'react';
import { BASE_URL } from '../api/client';
import { useAuthStore } from '../store/authStore';
import { createSSEParser } from '../lib/sse';
import { applyEntry, initialLiveAnswer, liveBlocks, StreamEntry } from '../lib/liveAnswer';

/**
 * useTaskStream
 * ─────────────
 * Live "typing" of a running task's answer, read from GET /tasks/:id/stream (Server-Sent Events).
 *
 * Purely additive: polling (usePollTaskStatus) stays the source of truth for status and the final
 * result. If the stream can't connect, is unauthorised, or drops for good, this just stops
 * quietly and the page behaves exactly as it did before streaming existed.
 *
 * fetch() is used instead of EventSource because EventSource can't send the Bearer token.
 */

export interface TaskStreamState {
  /** Text streamed so far, one entry per plan step, in step order. */
  blocks: string[];
  hasText: boolean;
  isStreaming: boolean;
}

const MAX_CONSECUTIVE_FAILURES = 5;
const RECONNECT_DELAY_MS = 500;
const MAX_BACKOFF_MS = 8000;

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const id = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => { clearTimeout(id); resolve(); }, { once: true });
  });

export function useTaskStream(
  taskId: string | number | undefined,
  enabled: boolean,
  onDone?: () => void,
): TaskStreamState {
  const [answer, setAnswer] = useState(initialLiveAnswer);
  const [isStreaming, setIsStreaming] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!enabled || taskId === undefined || taskId === '') return;

    const controller = new AbortController();
    const { signal } = controller;
    let offset = 0;
    let failures = 0;
    let finished = false;

    setAnswer(initialLiveAnswer());
    setIsStreaming(true);

    const connect = async () => {
      while (!signal.aborted && !finished) {
        try {
          const token = useAuthStore.getState().accessToken;
          const res = await fetch(`${BASE_URL}/tasks/${taskId}/stream?offset=${offset}`, {
            headers: {
              Accept: 'text/event-stream',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            signal,
          });
          // Not allowed / not found: nothing to retry — polling still delivers the result.
          if (res.status === 401 || res.status === 403 || res.status === 404) return;
          if (!res.ok || !res.body) throw new Error(`stream HTTP ${res.status}`);
          failures = 0;

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          const entries: StreamEntry[] = [];
          const parser = createSSEParser((event) => {
            if (event.id !== undefined && /^\d+$/.test(event.id)) offset = Number(event.id) + 1;
            if (event.event) return; // server 'timeout' / 'error' notices: just reconnect
            try {
              const entry = JSON.parse(event.data) as StreamEntry;
              entries.push(entry);
              if (entry.k === 'x') finished = true;
            } catch {
              /* ignore malformed event */
            }
          });

          while (!finished) {
            const { done, value } = await reader.read();
            if (done) break;
            parser.feed(decoder.decode(value, { stream: true }));
            if (entries.length > 0) {
              const batch = entries.splice(0); // one state update per network chunk
              setAnswer((state) => batch.reduce(applyEntry, state));
            }
          }
          if (finished) {
            reader.cancel().catch(() => undefined);
            return;
          }
          // Connection ended without a done marker (server idle timeout, proxy cut): resume.
          await sleep(RECONNECT_DELAY_MS, signal);
        } catch {
          if (signal.aborted) return;
          failures += 1;
          if (failures >= MAX_CONSECUTIVE_FAILURES) return;
          await sleep(Math.min(MAX_BACKOFF_MS, RECONNECT_DELAY_MS * 2 ** failures), signal);
        }
      }
    };

    connect().finally(() => {
      if (signal.aborted) return;
      setIsStreaming(false);
      if (finished) onDoneRef.current?.();
    });

    return () => {
      controller.abort();
      setAnswer(initialLiveAnswer());
      setIsStreaming(false);
    };
  }, [taskId, enabled]);

  const blocks = useMemo(() => liveBlocks(answer), [answer]);
  return { blocks, hasText: blocks.length > 0, isStreaming };
}
