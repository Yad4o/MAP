/**
 * State for the live (streaming) answer, built from the server's stream entries:
 *   {k:'d', s, t}  append text to step s
 *   {k:'r', s}     discard step s's text so far (narration before a tool call, retries)
 *   {k:'x'}        stream finished
 */
export type StreamEntry =
  | { k: 'd'; s: number; t: string }
  | { k: 'r'; s: number }
  | { k: 'x' };

export interface LiveAnswerState {
  steps: Record<number, string>;
  done: boolean;
}

export const initialLiveAnswer = (): LiveAnswerState => ({ steps: {}, done: false });

export function applyEntry(state: LiveAnswerState, entry: StreamEntry): LiveAnswerState {
  switch (entry?.k) {
    case 'd':
      return { ...state, steps: { ...state.steps, [entry.s]: (state.steps[entry.s] ?? '') + entry.t } };
    case 'r': {
      const steps = { ...state.steps };
      delete steps[entry.s];
      return { ...state, steps };
    }
    case 'x':
      return { ...state, done: true };
    default:
      return state;
  }
}

/** Per-step text in step order, skipping empty steps. */
export function liveBlocks(state: LiveAnswerState): string[] {
  return Object.keys(state.steps)
    .map(Number)
    .sort((a, b) => a - b)
    .map((i) => state.steps[i])
    .filter((text) => text.trim().length > 0);
}
