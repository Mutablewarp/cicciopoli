/** DOUBLE TRIPLE numbers (world units, ms, px/s): placement, attack timings, speeds, sizes. */
import { ARENA } from '../../api';

const F = ARENA.floorY;

export const DT = {
  hp: 1750,
  phases: [0.5],
  firstRestMs: 1500,
  /** phase 1: feet x of the big burger; it struts a little around it */
  home: { x: 520 },
  strut: { amp: 16, ms: 2600, stepFps: 8 },
  /** hips above the soles (the legs frame), body overlap on the hips */
  legH: 42,
  hipOverlap: 4,
  /** phase 2: the two minis' feet x */
  minis: [{ x: 560 }, { x: 420 }],
  mini: { legScale: 0.72, armScale: 0.62, bounceMs: 820 },
  depth: { legs: -12, armR: -11.5, body: -11, armL: -10, fx: -8 },
  frisbee: { teleMs: 650, gapMs: 460, turnX: 44, ax: 280, low: F - 14, high: F - 82, w: 36, h: 12, glideMs: 140 },
  cheddar: { teleMs: 700, gapMs: 700, speed: 210, w: 36, h: 24, n: 3, fromDx: -70 },
  /** growMs: the lane warning stretches out from the hand; leanDx: the pull-back of the wind-up */
  whip: { teleMs: 650, gapMs: 760, low: F - 13, high: F - 80, len: 300, h: 14, liveMs: 360, fromDx: -60, growMs: 220, leanDx: 10 },
  stomp: { teleMs: 720, flightMs: 900, apex: 190, landX: 120, waitMs: 700, waveSpeed: 230 },
  hop: { teleMs: 600, ms: 600, apex: 110, minX: 60, maxX: 370 },
  salsa: { teleMs: 650, gapMs: 150, flightMs: 1000, g: 900, lo: 30, hi: 380, margin: 28, r: 9, count: 4 },
  transformMs: 2400,
  koMs: 2800,
} as const;
