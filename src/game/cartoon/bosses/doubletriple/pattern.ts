/**
 * DOUBLE TRIPLE attack decks and pure pattern plans (no Phaser; unit-tested in pattern.test.ts).
 * Phase 1 (the double burger): patty FRISBEE x2, CHEDDAR waves x3, bacon WHIP x2, jumping STOMP.
 * Phase 2 (split into two minis): mini HOP at the player, FRISBEE, CHEDDAR in turns, SALSA rain, WHIP.
 */
import { ARENA, type Box, type Vec } from '../../api';
import { boomerangVx, spreadLandings } from '../oldschool/kit/geometry';
import type { AttackDef } from '../oldschool/kit/scheduler';
import { DT } from './tuning';

export type DtAttack = 'frisbee' | 'cheddar' | 'whip' | 'stomp' | 'hop' | 'salsa';
export type Band = 'low' | 'high';

const F = ARENA.floorY;
const { frisbee, cheddar, whip, stomp, hop, salsa } = DT;
const every = (n: number, gap: number): number[] => Array.from({ length: n }, (_, i) => i * gap);
const HOPS2 = 4;

export const DECK1: readonly AttackDef<DtAttack>[] = [
  { id: 'frisbee', teleMs: frisbee.teleMs, actMs: frisbee.gapMs + 900, restMs: 700, fireAt: every(2, frisbee.gapMs) },
  { id: 'cheddar', teleMs: cheddar.teleMs, actMs: 2 * cheddar.gapMs + 600, restMs: 650, fireAt: every(cheddar.n, cheddar.gapMs) },
  { id: 'whip', teleMs: whip.teleMs, actMs: whip.gapMs + 700, restMs: 650, fireAt: every(2, whip.gapMs) },
  { id: 'stomp', teleMs: stomp.teleMs, actMs: 2 * stomp.flightMs + stomp.waitMs + 400, restMs: 700, fireAt: [0, stomp.flightMs + stomp.waitMs] },
];

export const DECK2: readonly AttackDef<DtAttack>[] = [
  { id: 'hop', teleMs: hop.teleMs, actMs: HOPS2 * hop.ms + 200, restMs: 600, fireAt: every(HOPS2, hop.ms) },
  { id: 'frisbee', teleMs: frisbee.teleMs - 50, actMs: frisbee.gapMs + 900, restMs: 600, fireAt: every(2, frisbee.gapMs) },
  { id: 'cheddar', teleMs: cheddar.teleMs - 100, actMs: 2 * (cheddar.gapMs - 50) + 600, restMs: 600, fireAt: every(cheddar.n, cheddar.gapMs - 50) },
  { id: 'salsa', teleMs: salsa.teleMs, actMs: (salsa.count - 1) * salsa.gapMs + salsa.flightMs + 200, restMs: 600, fireAt: every(salsa.count, salsa.gapMs) },
  { id: 'whip', teleMs: whip.teleMs, actMs: 800, restMs: 600, fireAt: [0] },
];

export const hopCount = (): number => HOPS2;

/** Two throws / two whips: one low (jump it), one high (stay under it), in a random order. */
export function bands(rng: () => number): readonly [Band, Band] {
  return rng() < 0.5 ? ['low', 'high'] : ['high', 'low'];
}

export function frisbeeY(b: Band): number {
  return b === 'low' ? frisbee.low : frisbee.high;
}

/** Frisbee launch from x0: turns back at turnX and comes home after lifeMs. */
export function frisbeeThrow(x0: number): { vx: number; ax: number; lifeMs: number } {
  const vx = boomerangVx(x0, frisbee.turnX, frisbee.ax);
  return { vx, ax: frisbee.ax, lifeMs: (2 * -vx * 1000) / frisbee.ax };
}

/** The whip's hit box for a burger standing at x. */
export function whipBox(x: number, b: Band): Box {
  const cy = b === 'low' ? whip.low : whip.high;
  return { x: x + whip.fromDx - whip.len, y: cy - whip.h / 2, w: whip.len, h: whip.h };
}

/** Stomp: out to the far side, back home. */
export function stompStops(): Vec[] {
  return [{ x: DT.home.x, y: F }, { x: stomp.landX, y: F }, { x: DT.home.x, y: F }];
}

export function hopTarget(playerX: number): Vec {
  return { x: Math.min(hop.maxX, Math.max(hop.minX, playerX)), y: F };
}

export function salsaVolley(rng: () => number): { xs: number[]; pink: number } {
  return { xs: spreadLandings(rng, salsa.count, salsa.lo, salsa.hi, salsa.margin), pink: Math.floor(rng() * salsa.count) };
}
