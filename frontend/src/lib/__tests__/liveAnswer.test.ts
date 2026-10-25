import { describe, it, expect } from 'vitest';
import { applyEntry, initialLiveAnswer, liveBlocks } from '../liveAnswer';

describe('live answer reducer', () => {
  it('appends deltas per step and orders blocks by step', () => {
    let s = initialLiveAnswer();
    s = applyEntry(s, { k: 'd', s: 1, t: 'second' });
    s = applyEntry(s, { k: 'd', s: 0, t: 'Hel' });
    s = applyEntry(s, { k: 'd', s: 0, t: 'lo' });
    expect(liveBlocks(s)).toEqual(['Hello', 'second']);
  });

  it('reset clears only that step', () => {
    let s = initialLiveAnswer();
    s = applyEntry(s, { k: 'd', s: 0, t: 'keep' });
    s = applyEntry(s, { k: 'd', s: 1, t: 'narration' });
    s = applyEntry(s, { k: 'r', s: 1 });
    s = applyEntry(s, { k: 'd', s: 1, t: 'final' });
    expect(liveBlocks(s)).toEqual(['keep', 'final']);
  });

  it('done marks the stream finished', () => {
    expect(applyEntry(initialLiveAnswer(), { k: 'x' }).done).toBe(true);
  });

  it('ignores unknown entries and drops empty blocks', () => {
    let s = applyEntry(initialLiveAnswer(), { k: 'zzz' } as never);
    s = applyEntry(s, { k: 'd', s: 0, t: '   ' });
    expect(liveBlocks(s)).toEqual([]);
  });

  it('does not mutate the previous state', () => {
    const a = applyEntry(initialLiveAnswer(), { k: 'd', s: 0, t: 'a' });
    applyEntry(a, { k: 'd', s: 0, t: 'b' });
    expect(liveBlocks(a)).toEqual(['a']);
  });
});
