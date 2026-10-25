/**
 * Ciccio's skeleton in the 64x64 hero frame (feet at HERO_FRAME.footY, facing right): the Pose shape every
 * hero frame is described with, the joints hero.ts draws from, and the lean / squash / spin transforms
 * that map a pose point (e.g. the finger-gun tip the core spawns shots at) into the frame.
 */
import { HERO_FRAME, type Vec } from '../api';

export type Glove = 'gun' | 'fist' | 'open' | 'point';
type Face = 'smirk' | 'grin' | 'ouch' | 'dizzy' | 'shout';

/** A hand or a foot: where the hose ends, how it bows (signed, x length) and the glove / shoe angle. */
export interface Limb {
  x: number;
  y: number;
  bend: number;
  angle: number;
}
export interface Hand extends Limb {
  glove: Glove;
}

export interface Pose {
  /** whole drawing offset (hops) */
  dx: number;
  dy: number;
  /** squash / stretch about the feet anchor */
  sx: number;
  sy: number;
  /** whole-body spin (rad) about SPIN */
  rot: number;
  /** upper body (torso, head, arms, hips) drop; feet stay planted */
  bob: number;
  /** torso + head + arms lean about the hips (rad, + = forward) */
  lean: number;
  headTilt: number;
  front: Hand;
  back: Hand;
  /** back glove drawn over the torso (hand on the hip) */
  backOver: boolean;
  frontLeg: Limb;
  backLeg: Limb;
  face: Face;
  /** eyebrow raise (world units, + = up) */
  brow: number;
  /** sunglasses popped up 0..1 (the pie-cut eyes show) */
  pop: number;
  /** -1 none, else 0..1 glint sweep on the lenses */
  glint: number;
  /** -1 none, else 0..1 orbit of dizzy stars */
  stars: number;
  /** 0..1 speed lines + smear ghosts */
  speed: number;
  /** -1 none, else 0..1 pink parry sparkle */
  sparkle: number;
  /** the little ink "action ticks" of the reference drawing */
  ticks: boolean;
}

export const ANKLE_Y = 57.4;
export const FEET: Vec = { x: HERO_FRAME.w / 2, y: HERO_FRAME.footY };
export const HIP: Vec = { x: 32, y: 47.5 };
export const HIP_F: Vec = { x: 36, y: 47.5 };
export const HIP_B: Vec = { x: 28, y: 47.5 };
export const SHOULDER_F: Vec = { x: 39.5, y: 37.6 };
export const SHOULDER_B: Vec = { x: 25, y: 38.6 };
export const HEAD: Vec = { x: 34, y: 24.2 };
/** The head is drawn at this scale around HEAD. */
export const HEAD_SCALE = 0.86;
export const NECK: Vec = { x: 34, y: 33 };
export const SPIN: Vec = { x: 34, y: 37 };
/** Face radius (the head circle used by the bounds test and the stars). */
export const HEAD_R = 11;
/** Finger-gun fingertip in glove space (x along the forearm). */
const GUN_TIP: Vec = { x: 12.6, y: -1.7 };

/** A point of the leaning upper body (torso / head / arm space) mapped into frame units. */
export function upperToFrame(p: Pose, v: Vec): Vec {
  const hx = HIP.x;
  const hy = HIP.y + p.bob;
  const c = Math.cos(p.lean);
  const s = Math.sin(p.lean);
  const x = hx + (v.x - hx) * c - (v.y + p.bob - hy) * s;
  const y = hy + (v.x - hx) * s + (v.y + p.bob - hy) * c;
  return outerToFrame(p, { x, y });
}

/** Squash about the feet, spin about SPIN, then the hop offset. */
export function outerToFrame(p: Pose, v: Vec): Vec {
  const c = Math.cos(p.rot);
  const s = Math.sin(p.rot);
  const rx = SPIN.x + (v.x - SPIN.x) * c - (v.y - SPIN.y) * s;
  const ry = SPIN.y + (v.x - SPIN.x) * s + (v.y - SPIN.y) * c;
  return { x: FEET.x + (rx - FEET.x) * p.sx + p.dx, y: FEET.y + (ry - FEET.y) * p.sy + p.dy };
}

/** Fingertip of the front finger-gun, relative to the feet anchor (where the core spawns shots). */
export function muzzleOf(p: Pose): Vec {
  const h = p.front;
  const c = Math.cos(h.angle);
  const s = Math.sin(h.angle);
  const flip = c < 0 ? -1 : 1;
  const tip = upperToFrame(p, { x: h.x + GUN_TIP.x * c - GUN_TIP.y * flip * s, y: h.y + GUN_TIP.x * s + GUN_TIP.y * flip * c });
  return { x: tip.x - FEET.x, y: tip.y - FEET.y };
}
