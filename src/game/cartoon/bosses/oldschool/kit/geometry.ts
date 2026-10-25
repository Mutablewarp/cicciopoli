/**
 * Pure fairness geometry shared by the BOSS-C bosses (no Phaser, unit-tested): the hero the patterns are
 * made fair against, jump-over / stand-under bands, spread landing spots, ballistic throws and hop arcs.
 */
import { CT_PLAYER } from '../../../../../config/cartoon';
import { ARENA, type Vec } from '../../../api';

/**
 * The hero the patterns are fair against: the drawn body (wider and taller than the core's forgiving hit
 * box) and the full jump apex of the core tuning (feet clearance above the floor, world units).
 */
export const HERO = {
  w: CT_PLAYER.hitW + 10,
  h: CT_PLAYER.hitH + 14,
  jumpClear: (CT_PLAYER.jumpVy * CT_PLAYER.jumpVy) / (2 * CT_PLAYER.gravity),
} as const;
/** a hazard whose top is at or below this y can be jumped over (half the jump clearance as margin) */
const JUMP_TOP = ARENA.floorY - HERO.jumpClear / 2;
/** a hazard whose bottom is at or above this y passes over a standing hero */
const DUCK_BOTTOM = ARENA.floorY - HERO.h - 10;

export const ease = (u: number): number => 1 - (1 - Math.min(1, Math.max(0, u))) ** 2;
export const lerp = (a: number, b: number, u: number): number => a + (b - a) * u;

export function jumpable(top: number): boolean {
  return top >= JUMP_TOP;
}

export function overhead(bottom: number): boolean {
  return bottom <= DUCK_BOTTOM;
}

/** `count` landing x's over [lo, hi]: one per equal slot, jittered inside it (keeps `margin` from the slot edges). */
export function spreadLandings(rng: () => number, count: number, lo: number, hi: number, margin: number): number[] {
  const slot = (hi - lo) / count;
  return Array.from({ length: count }, (_, i) => lo + i * slot + margin + rng() * Math.max(0, slot - 2 * margin));
}

/** Smallest free floor gap between danger zones of radius r centred on xs (sorted or not). */
export function minGap(xs: readonly number[], r: number): number {
  const s = [...xs].sort((a, b) => a - b);
  let gap = Infinity;
  for (let i = 1; i < s.length; i++) gap = Math.min(gap, s[i] - s[i - 1] - 2 * r);
  return gap;
}

/** Launch velocity (px/s) so a body thrown from `from` reaches (toX, toY) after `ms` under gravity g (px/s²). */
export function ballistic(from: Vec, toX: number, toY: number, ms: number, g: number): Vec {
  const t = ms / 1000;
  return { x: (toX - from.x) / t, y: (toY - from.y - 0.5 * g * t * t) / t };
}

/** A hop from `from` to `to` rising `apex` above the straight line: position at progress s (0..1). */
export function arc(from: Vec, to: Vec, apex: number, s: number): Vec {
  const u = Math.min(1, Math.max(0, s));
  return { x: from.x + (to.x - from.x) * u, y: from.y + (to.y - from.y) * u - 4 * apex * u * (1 - u) };
}

/** Velocity of `speed` px/s from `from` toward `to`. */
export function aim(from: Vec, to: Vec, speed: number): Vec {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const d = Math.hypot(dx, dy) || 1;
  return { x: (dx / d) * speed, y: (dy / d) * speed };
}

/** Boomerang throw: launch speed (negative = leftward) so it turns back at turnX under a pull of ax px/s². */
export function boomerangVx(x0: number, turnX: number, ax: number): number {
  return -Math.sqrt(2 * ax * Math.max(0, x0 - turnX));
}

/** Progress span (s0..s1) of a floor-to-floor hop during which a standing hero fits under the feet. */
export function hopClearSpan(apex: number): readonly [number, number] {
  // feet lift >= HERO.h + 10  <=>  4 apex u (1 - u) >= need
  const need = (HERO.h + 10) / (4 * apex);
  if (need > 0.25) return [0.5, 0.5];
  const d = Math.sqrt(0.25 - need);
  return [0.5 - d, 0.5 + d];
}
