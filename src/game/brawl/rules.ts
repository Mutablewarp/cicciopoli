/**
 * Level 5 fighting rules as pure functions (no Phaser, unit-tested): hit points, which
 * crack frame a brick shows, the punch hitbox and what a ground-slam shockwave reaches.
 */
import { ENEMY_HP, HULK } from '../../config/tuning';
import type { Rect } from '../combat/club';

export interface HitResult {
  hp: number;
  dead: boolean;
}

/** Applies `damage` to `hp`; a thing with no hit points left is dead. */
export function hitResult(hp: number, damage: number): HitResult {
  const left = Math.max(0, hp - damage);
  return { hp: left, dead: left <= 0 };
}

/**
 * Whether a stun of `ms` takes on the mega burger. Only a slam-strength one does (punches must
 * not lock the fight), not while it is already staggered and not inside the grace after the last
 * stagger: a slam cycle (~1.1 s) is shorter than the stun (1.5 s), so chained slams would
 * otherwise keep it frozen until it dies and it would never attack.
 */
export function bossStuns(ms: number, staggered: boolean, graceLeftMs: number): boolean {
  return ms >= HULK.slam.stunMs && !staggered && graceLeftMs <= 0;
}

/** Starting hit points of an enemy kind against the fists (1 for anything unlisted). */
export function enemyHp(kind: string): number {
  return ENEMY_HP[kind] ?? 1;
}

/**
 * Brick sprite frame (0 intact … 3 almost gone) from the hit points left and the damage of
 * the last hit: a slam that takes two stages at once shows the worst crack.
 */
export function brickFrame(hpLeft: number, lastDamage: number): number {
  if (hpLeft >= HULK.brickHits) return 0;
  if (hpLeft >= HULK.brickHits - 1) return 1;
  return lastDamage >= 2 ? 3 : 2;
}

export interface Cell {
  col: number;
  row: number;
}

/** The items stacked directly on top of cell (col, row), bottom to top: they hang in the air once it is gone. */
export function stackAbove<T extends Cell>(items: readonly T[], col: number, row: number): T[] {
  const out: T[] = [];
  for (let r = row - 1; ; r--) {
    const hit = items.find((i) => i.col === col && i.row === r);
    if (!hit) return out;
    out.push(hit);
  }
}

export interface PunchSource {
  left: number;
  right: number;
  centerY: number;
  facing: 1 | -1;
}

/** Fist hitbox in front of the body (taller than the Thai club: it reaches head and feet). */
export function punchBox(src: PunchSource): Rect {
  const p = HULK.punch;
  const front = src.facing > 0 ? src.right : src.left - p.reach;
  return { left: front, right: front + p.reach, top: src.centerY - p.vUp, bottom: src.centerY + p.vDown };
}

/** True when a box is inside the shockwave of a slam landing at (x, feetY). */
export function inBlast(x: number, feetY: number, box: Rect): boolean {
  const gap = Math.max(box.left - x, x - box.right, 0);
  const s = HULK.slam;
  return gap <= s.radius && box.bottom >= feetY - s.reachUp && box.top <= feetY + s.reachDown;
}

/** True when a box is within the small landing shockwave (feet at (x, feetY)). */
export function inLandingShock(x: number, feetY: number, box: Rect): boolean {
  const gap = Math.max(box.left - x, x - box.right, 0);
  return gap <= HULK.landing.radius && Math.abs(box.bottom - feetY) <= 12;
}
