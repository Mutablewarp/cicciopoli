/**
 * Poses of the cut-out Burger Gang boss (rig.ts): joint angles in degrees (Phaser: positive = clockwise on screen)
 * around the pivots cut in scripts/level8/burgergang-spec.mjs, the body lean and squash, and where the sunglasses
 * are. armL = the peace-sign arm (+ raises the glove over his head), armR = the cup arm (- raises the cup),
 * legB = the back leg (+ lifts the left sneaker toward the hero), legF = the front leg.
 */
import type { Pose } from './plan';

export type RigPose = Pose | 'gulp' | 'roar' | 'ko';
export type ShadesAt = 'face' | 'spin' | 'off';

export interface Joint {
  armL: number;
  armR: number;
  legF: number;
  legB: number;
  lean: number;
  sx: number;
  sy: number;
  shades: ShadesAt;
  /** the cup arm swings in front of the bun (a throw over his head, a gulp) */
  cupFront: boolean;
}

const BASE: Joint = { armL: 0, armR: 0, legF: 0, legB: 0, lean: 0, sx: 1, sy: 1, shades: 'face', cupFront: false };
const pose = (j: Partial<Joint>): Joint => ({ ...BASE, ...j });

export const POSES: Readonly<Record<RigPose, Joint>> = {
  idle: BASE,
  /** shakes the cup (the rig adds a fast jitter): soda is coming */
  shake: pose({ armR: -20, lean: 3, sx: 1.03, sy: 0.97 }),
  spray: pose({ armL: 8, armR: -55, lean: -5, sx: 0.98, sy: 1.04 }),
  windup: pose({ armL: -10, armR: 35, lean: 6, sx: 1.02, sy: 0.98 }),
  throw: pose({ armR: -115, lean: -8, sx: 0.97, sy: 1.05, cupFront: true }),
  /** spins the sunglasses on his face */
  twirl: pose({ armL: 10, shades: 'spin' }),
  fling: pose({ armL: -40, lean: -6, shades: 'off' }),
  whistle: pose({ armL: 20, armR: -15, sx: 0.96, sy: 1.06 }),
  lift: pose({ armL: -15, armR: -25, legB: 40, lean: 6, sy: 1.04 }),
  stomp: pose({ armL: 10, armR: 10, sx: 1.08, sy: 0.9 }),
  /** brings the cup to his mouth */
  gulp: pose({ armR: -125, lean: 8, sy: 1.03, cupFront: true }),
  roar: pose({ armL: -25, armR: -40, sx: 0.95, sy: 1.08 }),
  ko: pose({ armL: 40, armR: 50, legF: -15, legB: 15, sy: 0.95, shades: 'off' }),
};
