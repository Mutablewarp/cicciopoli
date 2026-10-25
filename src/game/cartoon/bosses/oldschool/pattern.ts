/**
 * THE OLD SCHOOL attack decks and pure pattern plans (no Phaser; unit-tested in pattern.test.ts).
 * Phase 1 (the hand holds the burger): SLAM x2, bacon FLICK, SAUCE rain from the bottles, burger HOP.
 * Phase 2 (the hand becomes a fist): POUND x3 chasing the player, floor SWEEP, HOP at the player, SAUCE, FLICK.
 */
import { ARENA, type Vec } from '../../api';
import { spreadLandings } from './kit/geometry';
import type { AttackDef } from './kit/scheduler';
import { OS } from './tuning';

export type OsAttack = 'slam' | 'flick' | 'sauce' | 'hop' | 'pound' | 'sweep';

const F = ARENA.floorY;
const { pound, hop, sauce, flick, slam, sweep } = OS;

/** one fist pound: track the player, lock (the telegraph), slam, hold, rise */
export const POUND_CYCLE_MS = pound.trackMs + pound.lockMs + pound.slamMs + pound.holdMs + pound.riseMs;
/** sweep: slide time across the floor */
export const SWEEP_SLIDE_MS = ((sweep.rightX - sweep.leftX) / sweep.speed) * 1000;

const every = (n: number, gap: number): number[] => Array.from({ length: n }, (_, i) => i * gap);
const hops1 = hop.out.length + 2;
const hops2 = 4;

export const DECK1: readonly AttackDef<OsAttack>[] = [
  { id: 'slam', teleMs: slam.teleMs, actMs: slam.gapMs + 900, restMs: 650, fireAt: every(2, slam.gapMs) },
  { id: 'flick', teleMs: flick.teleMs, actMs: 2 * flick.gapMs + 450, restMs: 650, fireAt: every(3, flick.gapMs) },
  { id: 'sauce', teleMs: sauce.teleMs, actMs: 3 * sauce.gapMs + sauce.flightMs + 200, restMs: 650, fireAt: every(sauce.counts[0], sauce.gapMs) },
  { id: 'hop', teleMs: hop.teleMs, actMs: hops1 * hop.ms + 200, restMs: 700, fireAt: every(hops1, hop.ms) },
];

export const DECK2: readonly AttackDef<OsAttack>[] = [
  { id: 'pound', teleMs: pound.teleMs, actMs: pound.n * POUND_CYCLE_MS, restMs: 550, fireAt: every(pound.n, POUND_CYCLE_MS) },
  { id: 'sweep', teleMs: sweep.teleMs, actMs: SWEEP_SLIDE_MS + 1100, restMs: 550, fireAt: [0] },
  { id: 'hop', teleMs: hop.teleMs - 100, actMs: hops2 * hop.ms + 200, restMs: 600, fireAt: every(hops2, hop.ms) },
  { id: 'sauce', teleMs: sauce.teleMs - 100, actMs: 4 * sauce.gapMs + sauce.flightMs + 200, restMs: 600, fireAt: every(sauce.counts[1], sauce.gapMs) },
  { id: 'flick', teleMs: flick.teleMs - 50, actMs: 2 * flick.gapMs + 450, restMs: 600, fireAt: every(3, flick.gapMs) },
];

/** Phase 1 hop: out of the hand to three fixed spots, back to the middle, back into the hand. */
export function hopStops1(): Vec[] {
  return [{ ...OS.grip }, ...hop.out.map((x) => ({ x, y: F })), { x: 330, y: F }, { ...OS.grip }];
}

/** Phase 2 hop target: the player's x, kept inside the free floor. */
export function hopTarget(playerX: number): Vec {
  return { x: Math.min(hop.maxX, Math.max(hop.minX, playerX)), y: F };
}

export function hopCount(phase: number): number {
  return phase === 0 ? hops1 : hops2;
}

/** A sauce volley: where each drop lands and which one is pink (parryable). */
export function sauceVolley(rng: () => number, count: number): { xs: number[]; pink: number } {
  return { xs: spreadLandings(rng, count, sauce.lo, sauce.hi, sauce.margin), pink: Math.floor(rng() * count) };
}

/** The sweep starts at the edge farther from the player and slides toward him. */
export function sweepFrom(playerX: number): { x0: number; x1: number } {
  const fromRight = playerX < (sweep.leftX + sweep.rightX) / 2;
  return fromRight ? { x0: sweep.rightX, x1: sweep.leftX } : { x0: sweep.leftX, x1: sweep.rightX };
}

type PoundStage = 'track' | 'lock' | 'slam' | 'hold' | 'rise';

/** Stage of one pound cycle at t ms since it started, and the progress inside that stage. */
export function poundStage(t: number): { stage: PoundStage; u: number } {
  const spans: readonly (readonly [PoundStage, number])[] = [
    ['track', pound.trackMs], ['lock', pound.lockMs], ['slam', pound.slamMs], ['hold', pound.holdMs], ['rise', pound.riseMs],
  ];
  let left = t;
  for (const [stage, ms] of spans) {
    if (left < ms) return { stage, u: left / ms };
    left -= ms;
  }
  return { stage: 'rise', u: 1 };
}
