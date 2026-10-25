import { describe, it, expect } from 'vitest';
import { createSSEParser, SSEEvent } from '../sse';

function parse(chunks: string[]): SSEEvent[] {
  const events: SSEEvent[] = [];
  const parser = createSSEParser((e) => events.push(e));
  chunks.forEach((c) => parser.feed(c));
  return events;
}

describe('createSSEParser', () => {
  it('parses a complete event', () => {
    expect(parse(['id: 3\ndata: {"a":1}\n\n'])).toEqual([{ id: '3', event: undefined, data: '{"a":1}' }]);
  });

  it('handles events split across chunks, even mid-line', () => {
    expect(parse(['id: 1\nda', 'ta: hel', 'lo\n', '\nid: 2\ndata: bye\n\n']).map((e) => e.data)).toEqual(['hello', 'bye']);
  });

  it('ignores comment/heartbeat lines', () => {
    expect(parse([': ping\n\n', 'data: x\n\n']).map((e) => e.data)).toEqual(['x']);
  });

  it('joins multiple data lines with a newline', () => {
    expect(parse(['data: a\ndata: b\n\n'])[0].data).toBe('a\nb');
  });

  it('keeps named events', () => {
    expect(parse(['event: timeout\ndata: {}\n\n'])[0].event).toBe('timeout');
  });

  it('supports CRLF line endings', () => {
    expect(parse(['id: 4\r\ndata: z\r\n\r\n'])[0]).toEqual({ id: '4', event: undefined, data: 'z' });
  });

  it('does not emit an incomplete trailing event', () => {
    expect(parse(['data: partial'])).toEqual([]);
  });
});
