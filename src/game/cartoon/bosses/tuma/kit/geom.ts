/**
 * Pure attack geometry of the BOSS-B lane (no Phaser, unit-tested): lobbed shots, falling columns, and the
 * "safe spot" check — every pattern must leave a stretch of floor at least SAFE_W wide that it never touches.
 */

/** A projectile planned by a pattern (world units, px/s, px/s²). */
export interface Shot {
  /** ms after the attack fires */
  delayMs: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ay: number;
  /** hit radius */
  r: number;
  frame: number;
  pink: boolean;
}

/** Span of floor a pattern can hurt: [from, to]. */
export type Span = readonly [number, number];

/** Initial velocity to lob from (x0, y0) to (x1, y1) in `ms` under gravity g (px/s²). */
export function lob(x0: number, y0: number, x1: number, y1: number, ms: number, g: number): { vx: number; vy: number } {
  const t = ms / 1000;
  return { vx: (x1 - x0) / t, vy: (y1 - y0 - 0.5 * g * t * t) / t };
}

/** Where a falling shot reaches the line y = groundY (its centre). */
export function landX(s: Shot, groundY: number): number {
  const a = 0.5 * s.ay;
  const b = s.vy;
  const c = s.y - groundY;
  const t = a === 0 ? -c / b : (-b + Math.sqrt(Math.max(0, b * b - 4 * a * c))) / (2 * a);
  return s.x + s.vx * t;
}

/**
 * n x positions inside [a, b], spaced at least `minSep`, that keep a free hole `hole` wide (the safe spot)
 * away from `avoidX` (so the player has to move). Positions are centres; callers add their footprint.
 */
export function spread(rng: () => number, n: number, a: number, b: number, hole: number, minSep: number, avoidX: number): number[] {
  let hc = a + hole / 2 + rng() * (b - a - hole);
  if (Math.abs(hc - avoidX) < hole * 0.75) hc = avoidX < (a + b) / 2 ? Math.min(b - hole / 2, avoidX + hole * 1.5) : Math.max(a + hole / 2, avoidX - hole * 1.5);
  const left = hc - hole / 2 - a;
  const len = b - a - hole;
  const step = len / n;
  const jitter = Math.max(0, step - minSep) / 2;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const u = step * (i + 0.5) + (rng() * 2 - 1) * jitter;
    out.push(u < left ? a + u : a + u + hole);
  }
  return out;
}

/** Widest free stretch of [a, b] left by the hurt spans. */
export function widestGap(spans: readonly Span[], a: number, b: number): number {
  const s = [...spans].sort((p, q) => p[0] - q[0]);
  let best = 0;
  let cur = a;
  for (const [from, to] of s) {
    if (from > cur) best = Math.max(best, Math.min(from, b) - cur);
    cur = Math.max(cur, to);
    if (cur >= b) break;
  }
  return Math.max(best, b - cur);
}

/** Floor spans hurt by shots landing (centre ± r + splash). */
export function landingSpans(shots: readonly Shot[], groundY: number, splash: number): Span[] {
  return shots.map((s) => {
    const x = landX(s, groundY - s.r);
    return [x - s.r - splash, x + s.r + splash] as const;
  });
}
