/**
 * Pure formation maths: the classic march (sideways steps, drop + reverse at the edges)
 * and the speed-up as the formation thins out. No Phaser here (unit-tested).
 */

export interface March {
  /** world x of column 0 / y of row 0 (centres) */
  ox: number;
  oy: number;
  dir: 1 | -1;
  frame: 0 | 1;
}

export interface Extent {
  /** left / right edge of the alive invaders' hitboxes, world x */
  left: number;
  right: number;
}

export interface MarchRules {
  stepX: number;
  drop: number;
  minX: number;
  maxX: number;
}

/** One march beat: step sideways, or drop a row and reverse when the next step would leave the field. */
export function nextMarch(m: March, ext: Extent, r: MarchRules): { march: March; dropped: boolean } {
  const frame: 0 | 1 = m.frame === 0 ? 1 : 0;
  const blocked = m.dir > 0 ? ext.right + r.stepX > r.maxX : ext.left - r.stepX < r.minX;
  if (blocked) {
    return { march: { ox: m.ox, oy: m.oy + r.drop, dir: m.dir > 0 ? -1 : 1, frame }, dropped: true };
  }
  return { march: { ox: m.ox + m.dir * r.stepX, oy: m.oy, dir: m.dir, frame }, dropped: false };
}

/** Beat interval: slow with a full formation, fast with the last survivors. */
export function stepInterval(alive: number, total: number, baseMs: number, minMs: number): number {
  if (total <= 1 || alive >= total) return baseMs;
  const t = Math.max(0, alive - 1) / (total - 1);
  return Math.round(minMs + (baseMs - minMs) * Math.pow(t, 1.2));
}

/** Left/right hitbox extent of a set of centres with per-item half widths; null when empty. */
export function extentOf(items: readonly { x: number; halfW: number }[]): Extent | null {
  if (items.length === 0) return null;
  let left = Infinity;
  let right = -Infinity;
  for (const it of items) {
    left = Math.min(left, it.x - it.halfW);
    right = Math.max(right, it.x + it.halfW);
  }
  return { left, right };
}
