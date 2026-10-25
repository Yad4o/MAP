import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTaskStream } from '../useTaskStream';
import { useAuthStore } from '../../store/authStore';

const enc = new TextEncoder();

function sseResponse(events: Array<Record<string, unknown>>, startId = 0, opts: { keepOpen?: boolean } = {}) {
  const text = events
    .map((e, i) => `id: ${startId + i}\ndata: ${JSON.stringify(e)}\n\n`)
    .join('');
  let sent = false;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (!sent) {
        sent = true;
        controller.enqueue(enc.encode(text));
        if (!opts.keepOpen) controller.close();
      }
    },
  });
  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

describe('useTaskStream', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    useAuthStore.setState({ accessToken: 'tok-123' });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('does nothing while disabled', () => {
    renderHook(() => useTaskStream('abc', false));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('streams text into blocks using the auth token', async () => {
    fetchMock.mockResolvedValueOnce(
      sseResponse([{ k: 'd', s: 0, t: 'Hel' }, { k: 'd', s: 0, t: 'lo' }, { k: 'x' }]),
    );
    const { result } = renderHook(() => useTaskStream('abc', true));
    await waitFor(() => expect(result.current.blocks).toEqual(['Hello']));
    expect(result.current.hasText).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/tasks/abc/stream?offset=0');
    expect(init.headers.Authorization).toBe('Bearer tok-123');
  });

  it('stops and calls onDone when the stream finishes, without reconnecting', async () => {
    fetchMock.mockResolvedValueOnce(sseResponse([{ k: 'd', s: 0, t: 'x' }, { k: 'x' }]));
    const onDone = vi.fn();
    const { result } = renderHook(() => useTaskStream('abc', true, onDone));
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.isStreaming).toBe(false));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reconnects from the next offset when the connection drops', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout'] });
    fetchMock
      .mockResolvedValueOnce(sseResponse([{ k: 'd', s: 0, t: 'one ' }, { k: 'd', s: 0, t: 'two ' }]))
      .mockResolvedValueOnce(sseResponse([{ k: 'd', s: 0, t: 'three' }, { k: 'x' }], 2));
    const { result } = renderHook(() => useTaskStream('abc', true));
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(String(fetchMock.mock.calls[1][0])).toContain('offset=2');
    expect(result.current.blocks).toEqual(['one two three']);
  });

  it('gives up quietly on 404 (polling still delivers the result)', async () => {
    fetchMock.mockResolvedValue(new Response('nope', { status: 404 }));
    const { result } = renderHook(() => useTaskStream('abc', true));
    await waitFor(() => expect(result.current.isStreaming).toBe(false));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.hasText).toBe(false);
  });

  it('aborts the request on unmount', async () => {
    fetchMock.mockResolvedValueOnce(sseResponse([{ k: 'd', s: 0, t: 'x' }], 0, { keepOpen: true }));
    const { unmount } = renderHook(() => useTaskStream('abc', true));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const signal: AbortSignal = fetchMock.mock.calls[0][1].signal;
    unmount();
    expect(signal.aborted).toBe(true);
  });

  it('clears old text when a new run starts', async () => {
    fetchMock
      .mockResolvedValueOnce(sseResponse([{ k: 'd', s: 0, t: 'old run' }, { k: 'x' }]))
      .mockResolvedValueOnce(sseResponse([], 0, { keepOpen: true }));
    const { result, rerender } = renderHook(({ on }) => useTaskStream('abc', on), { initialProps: { on: true } });
    await waitFor(() => expect(result.current.blocks).toEqual(['old run']));
    rerender({ on: false });
    expect(result.current.blocks).toEqual([]);
    rerender({ on: true });
    expect(result.current.hasText).toBe(false);
  });
});
