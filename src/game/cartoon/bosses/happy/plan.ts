/**
 * HAPPY BOX patterns as pure data (no Phaser, unit-tested): where the spray clouds settle, where the paint
 * drips, which lanes the rockets take, where the mini boxes land. Each keeps a fair way out (plan.test.ts).
 */
import { ARENA, type Vec } from '../../api';
import { type Shot, lob, spread } from '../tuma/kit/geom';
import { HAPPY_CFG as C, PINK } from './config';

const ph = (phase: number): 0 | 1 => (phase > 0 ? 1 : 0);

/** Spray clouds lobbed from the nozzle; they settle on the floor and linger. One PINK if `pink`. */
export function sprayPuffs(rng: () => number, phase: number, from: Vec, playerX: number, pink: boolean): Shot[] {
  const S = C.spray;
  const [a, b] = C.field[ph(phase)];
  const n = S.n[ph(phase)];
  const fp = S.r + S.splash;
  const xs = spread(rng, n, a + fp, b - fp, C.safeW + fp * 2 + 4, fp * 2 + 8, playerX);
  const pinkAt = pink ? Math.floor(rng() * n) : -1;
  return xs.map((x, i) => {
    const v = lob(from.x, from.y, x, ARENA.floorY - S.r, S.flightMs, S.g);
    const frame = i === pinkAt ? PINK : i % PINK;
    return { delayMs: i * S.gapMs, x: from.x, y: from.y, vx: v.vx, vy: v.vy, ay: S.g, r: S.r, frame, pink: i === pinkAt };
  });
}

/** Paint drops from the gutter, staggered, with a hole away from the player. */
export function paintDrips(rng: () => number, phase: number, playerX: number): Shot[] {
  const D = C.drips;
  const [a, b] = C.field[ph(phase)];
  const n = D.n[ph(phase)];
  const fp = D.r + D.splash;
  const xs = spread(rng, n, a + fp, b - fp, C.safeW + fp * 2 + 4, fp * 2 + 12, playerX);
  return xs.map((x, i) => ({ delayMs: ((i * 3) % n) * D.staggerMs[ph(phase)], x, y: D.top, vx: 0, vy: 0, ay: D.g, r: D.r, frame: i % PINK, pink: false }));
}

/** Two rockets: one low (jump it), one high (stay down), random order. Returns their centre heights. */
export function rocketLanes(rng: () => number): number[] {
  const low = ARENA.floorY - C.rocket.low;
  const high = ARENA.floorY - C.rocket.high;
  return rng() < 0.5 ? [low, high] : [high, low];
}

/** Landing spots of the mini boxes (they then hop toward the player). */
export function miniDrops(rng: () => number, phase: number): number[] {
  const [a, b] = C.minis.landX;
  const n = C.minis.n[ph(phase)];
  return Array.from({ length: n }, (_, i) => a + ((b - a) * (i + rng())) / n);
}
