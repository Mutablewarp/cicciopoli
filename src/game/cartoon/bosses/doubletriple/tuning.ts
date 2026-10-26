/** DOUBLE TRIPLE numbers (world units, ms, px/s): placement, attack timings, speeds, sizes. */
import { ARENA } from '../../api';

const F = ARENA.floorY;

export const DT = {
  hp: 1750,
  phases: [0.5],
  firstRestMs: 1500,
  /**
   * The shirt rig: points of ref/level8_shirt_double_triple_v2.png (source px) and the world size of one shirt
   * pixel: the soles on the floor, the body's hips, each leg's hip, each shoulder, the left glove.
   */
  art: {
    scale: 0.5,
    feet: { x: 522, y: 1287 },
    hip: { x: 522, y: 1186 },
    hipL: { x: 490, y: 1180 },
    hipR: { x: 536, y: 1182 },
    shoulderL: { x: 410, y: 1082 },
    shoulderR: { x: 611, y: 1086 },
    gloveL: { x: 375, y: 1150 },
  },
  /** leg turns (deg): strut swing, crouch spread, tucked spread */
  legs: { walkAmp: 12, crouch: 14, tuck: 26 },
  /** hit boxes: body half width and top above the hips, legs half width */
  box: { halfW: 62, top: 116, legsHalfW: 36 },
  /** phase 1: feet x of the big burger; it struts a little around it */
  home: { x: 520 },
  strut: { amp: 16, ms: 2600, stepFps: 8 },
  /** phase 2: the two minis' feet x */
  minis: [{ x: 560 }, { x: 420 }],
  /** the minis are the whole rig at this scale (no peace arm) */
  mini: { scale: 0.6, bounceMs: 820 },
  depth: { legs: -12, armR: -11.5, armL: -11.4, body: -11, fx: -8 },
  /** glideMs: the dip from the hand into its lane, over before the frisbee reaches a hero standing back from the boss */
  frisbee: { teleMs: 650, gapMs: 460, turnX: 44, ax: 280, low: F - 14, high: F - 82, w: 36, h: 12, glideMs: 60 },
  cheddar: { teleMs: 700, gapMs: 700, speed: 210, w: 36, h: 24, n: 3, fromDx: -70 },
  /** growMs: the lane warning stretches out from the hand; leanDx: the pull-back of the wind-up */
  whip: { teleMs: 650, gapMs: 760, low: F - 13, high: F - 80, len: 300, h: 14, liveMs: 300, fromDx: -60, growMs: 220, leanDx: 10 },
  /** apex: the bun stays below the HUD bar (1280x720 and a phone held sideways) */
  stomp: { teleMs: 720, flightMs: 900, apex: 120, landX: 120, waitMs: 700, waveSpeed: 230 },
  hop: { teleMs: 600, ms: 600, apex: 110, minX: 60, maxX: 370 },
  salsa: { teleMs: 650, gapMs: 150, flightMs: 1000, g: 900, lo: 30, hi: 380, margin: 28, r: 9, count: 4 },
  transformMs: 2400,
  koMs: 2800,
} as const;
