/** THE OLD SCHOOL numbers (world units, ms, px/s): placement, attack timings, speeds, sizes. */
import { ARENA } from '../../api';

const F = ARENA.floorY;

export const OS = {
  hp: 1600,
  phases: [0.5],
  firstRestMs: 1500,
  /** phase 1: where the hand holds the burger (its bottom-centre) */
  grip: { x: 524, y: 268 },
  /** phase 2: the burger sits on the floor here */
  floorSpot: { x: 566, y: F },
  /** the floating fist's home in phase 2 (its centre) */
  fistHome: { x: 430, y: 112 },
  bottles: [{ x: 392, frame: 0 }, { x: 420, frame: 2 }],
  depth: { bottles: -19, handBack: -12, arm: -11.5, burger: -11, handFront: -10, fist: -9, fx: -8 },
  idle: { swayMs: 900, bobMs: 640, breatheMs: 260, waveMs: 230, hopEveryMs: 950 },
  slam: { teleMs: 720, liftPx: 36, dropPx: 26, downMs: 110, waveAt: 470, waveSpeed: 250, gapMs: 900 },
  flick: { teleMs: 650, gapMs: 400, speed: 235, spin: 620, r: 8 },
  sauce: { teleMs: 720, gapMs: 140, flightMs: 1050, g: 900, lo: 34, hi: 456, margin: 28, r: 9, counts: [4, 5] },
  hop: { teleMs: 700, ms: 640, apex: 120, firstApex: 60, out: [380, 240, 96], minX: 70, maxX: 450 },
  pound: { teleMs: 600, trackMs: 520, lockMs: 580, slamMs: 140, holdMs: 280, riseMs: 400, n: 3, waveSpeed: 230, follow: 0.006 },
  sweep: { teleMs: 760, flyMs: 320, leftX: 40, rightX: 470, speed: 460, h: 22, w: 92, flyApex: 70, homeMs: 700 },
  wave: { w: 38, h: 26 },
  fist: { r: 30 },
  transformMs: 2600,
  koMs: 2800,
} as const;
