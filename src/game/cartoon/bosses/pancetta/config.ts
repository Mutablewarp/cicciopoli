/**
 * PANCETTA LO SKATER tuning (boss 2 of the rush): rig geometry, the half-pipe of phase 1, every attack's
 * timing / speed / size, transformation and knockout beats. World units, ms, units / s.
 * Phase 0 skating the seafront floor; phase 1 up on the half-pipe in the background (scale `pipe.s`).
 */
import { ARENA } from '../../api';

const F = ARENA.floorY;

export const PANCETTA = {
  hp: 1600,
  phases: [0.5] as readonly number[],
  introMs: 900,
  transformMs: 2300,
  koMs: 2500,
  rest: { x: 520, amp: 18, periodMs: 3000 },
  /** the half-pipe in the arena's mid layer: lips at x l / r, flat bottom at y bottom, wall radius R */
  pipe: { l: 372, r: 604, bottom: 290, R: 86, s: 0.62, periodMs: 2600, uMin: 0.1, uMax: 0.9 },
  /** where his throws leave from: offsets from the feet (facing left) at scale 1, on the floor / on the ramp */
  rig: {
    hand: { x: -58, y: -100 },
    bgHand: { x: -40, y: -120 },
  },
  /** the puppet's moves (radians, ms, world units): arm turns from the printed V-sign pose (+ = up) */
  move: {
    arm: { wave: 0.14, waveMs: 150, peaceMs: 900, point: -0.6, throw: -1.05, fist: 0.42, whirl: 0.55, whirlMs: 70, ko: -0.45 },
    headTilt: 0.05,
    bob: 1.6,
    baconSway: 0.12,
  },
  /** the kickflip hazard: his own board at this scale, turning over in `frames` frames */
  flip: { scale: 0.75, frames: 6, fps: 14, edge: 0.12 },
  /** hit boxes from the feet at scale 1 (facing left; mirrored facing right) */
  box: {
    body: { x: -46, y: -150, w: 98, h: 150 },
    /** up in the background: a square around the body centre, plus a pad (generous for phone thumbs) */
    bg: { up: 78, size: 120, pad: 14, solidAt: 0.9 },
  },
  /** the kickflip: while the board is away he bunny-hops on the spot (hop: apex units, ~everyMs a hop, landing squash) */
  board: { teleMs: 750, w: 72, h: 14, lift: 8, speed: 330, wallX: 40, startDx: -46, recoverMs: 600, hop: { apex: 22, everyMs: 430, squash: 0.1 } },
  stomp: { teleMs: 800, minX: 70, maxX: 410, outMs: 750, apex: 160, holdMs: 300, backMs: 700, backApex: 120, wave: { w: 24, h: 18, speed: 240, gap: 22 }, shake: 7, recoverMs: 650 },
  bacon: { teleMs: 800, count: 3, everyMs: 1100, entryMs: 300, entryX: 430, speed: 220, yc: F - 62, amp: 30, wavelength: 170, r: 11, pinkIndex: 1, recoverMs: 600 },
  skyBacon: { teleMs: 750, count: 4, everyMs: 950, entryMs: 380, entryX: 420, speed: 250, yc: F - 62, amp: 30, wavelength: 170, r: 11, pinkIndex: 2, recoverMs: 650 },
  wheels: { teleMs: 700, count: 4, everyMs: 700, speed: 250, r: 12, g: 1100, popVy: -120, hopVy: 160, spin: -1400, lift: 30, dx: -50, pinkIndex: 2, recoverMs: 600 },
  dive: { teleMs: 900, minX: 70, maxX: 400, outMs: 900, apex: 60, holdMs: 400, backMs: 900, backApex: 80, backU: 0.9, wave: { w: 24, h: 18, speed: 240, gap: 22 }, shake: 8, recoverMs: 700 },
  rain: { teleMs: 850, count: 4, spacing: 100, minX: 40, maxX: 440, everyMs: 250, flightMs: 950, apex: 110, hopMs: 700, r: 12, g: 1100, hopVy: 200, pinkIndex: 1, spin: -900, recoverMs: 650 },
  transform: { leapMs: 1300, apex: 50, u: 0.9 },
  ko: { fallMs: 700, apex: 40, minX: 380, maxX: 580, tumbleMs: 600, bonkAt: 1250, slideMs: 450, starsAt: 1300 },
} as const;
