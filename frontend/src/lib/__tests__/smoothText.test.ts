import { describe, it, expect } from 'vitest';
import { nextVisibleLength, sliceBlocks } from '../smoothText';

describe('nextVisibleLength', () => {
  it('never passes the target and always makes progress when behind', () => {
    expect(nextVisibleLength(0, 1, 40)).toBe(1);
    expect(nextVisibleLength(5, 7, 40)).toBeLessThanOrEqual(7);
    expect(nextVisibleLength(5, 7, 40)).toBeGreaterThan(5);
  });

  it('moves faster when the backlog is bigger, so it never lags far behind', () => {
    const small = nextVisibleLength(0, 20, 40);
    const big = nextVisibleLength(0, 2000, 40);
    expect(big).toBeGreaterThan(small);
  });

  it('eventually catches up completely', () => {
    let v = 0;
    for (let i = 0; i < 500 && v < 1000; i++) v = nextVisibleLength(v, 1000, 40);
    expect(v).toBe(1000);
  });

  it('snaps down if the target shrinks (a reset)', () => {
    expect(nextVisibleLength(50, 10, 40)).toBe(10);
  });
});

describe('sliceBlocks', () => {
  it('reveals blocks in order up to a total visible length', () => {
    expect(sliceBlocks(['abc', 'defg'], 5)).toEqual(['abc', 'de']);
    expect(sliceBlocks(['abc', 'defg'], 2)).toEqual(['ab', '']);
    expect(sliceBlocks(['abc', 'defg'], 99)).toEqual(['abc', 'defg']);
  });
});
