import { useEffect, useRef, useState } from 'react';

/** Time between pacing ticks (~25 fps — plenty for text, light on re-renders). */
export const TICK_MS = 40;

/**
 * How many characters should be visible after one tick.
 *
 * The server delivers text in bursts; this releases it at a steady pace that speeds up with the
 * backlog (so we never fall far behind the real stream) and slows to a calm trickle when nearly
 * caught up. Snaps down immediately if the target shrinks (a reset).
 */
export function nextVisibleLength(visible: number, target: number, _elapsedMs: number): number {
  if (visible >= target) return target;
  const backlog = target - visible;
  const step = Math.max(1, Math.ceil(backlog / 12));
  return Math.min(target, visible + step);
}

/** Reveal `blocks` in order up to `visible` total characters. */
export function sliceBlocks(blocks: string[], visible: number): string[] {
  let remaining = visible;
  return blocks.map((block) => {
    const take = Math.max(0, Math.min(block.length, remaining));
    remaining -= take;
    return block.slice(0, take);
  });
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Smoothly advancing visible length chasing `target`. Stops ticking once caught up. */
export function useSmoothedLength(target: number): number {
  const [visible, setVisible] = useState(0);
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    if (visible === target) return;
    if (visible > target || prefersReducedMotion()) {
      setVisible(target);
      return;
    }
    const id = setTimeout(
      () => setVisible((v) => nextVisibleLength(v, targetRef.current, TICK_MS)),
      TICK_MS,
    );
    return () => clearTimeout(id);
  }, [visible, target]);

  return Math.min(visible, target);
}
