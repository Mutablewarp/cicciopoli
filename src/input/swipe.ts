import type { Dir4 } from '../contracts';

/** Minimum finger travel (CSS px) for a swipe on the game area (maze mode). */
export const SWIPE_MIN_PX = 24;

/** Direction of a finger travel, or null while it is shorter than `min` on both axes. */
export function swipeDir(dx: number, dy: number, min = SWIPE_MIN_PX): Dir4 | null {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (Math.max(ax, ay) < min) return null;
  if (ax > ay) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'up' : 'down';
}

/**
 * Tracks one finger: emits a direction each time it has travelled `min` px from the last
 * emit point, so one long gesture can steer through several turns without lifting.
 */
export class SwipeTracker {
  private x = 0;
  private y = 0;
  private last: Dir4 | null = null;

  constructor(private readonly min = SWIPE_MIN_PX) {}

  start(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.last = null;
  }

  /** Returns a new direction to emit (null = nothing new). */
  move(x: number, y: number): Dir4 | null {
    const d = swipeDir(x - this.x, y - this.y, this.min);
    if (!d) return null;
    this.x = x;
    this.y = y;
    if (d === this.last) return null;
    this.last = d;
    return d;
  }
}

/** Cross pad: travel from the hub that keeps the previous arm / that picks the first arm. */
const CROSS_KEEP_PX = 10;
const CROSS_HUB_PX = 12;

/** Arm under a finger offset from the cross-pad hub; the previous arm sticks near the hub. */
export function crossDir(dx: number, dy: number, prev: Dir4 | null): Dir4 | null {
  const d = Math.max(Math.abs(dx), Math.abs(dy));
  if (d < (prev ? CROSS_KEEP_PX : CROSS_HUB_PX)) return prev;
  if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'up' : 'down';
}
