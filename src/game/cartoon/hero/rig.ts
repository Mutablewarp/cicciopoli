/**
 * The cut-out rig of Ciccio: the parts cut out of the owner's drawing (parts.ts, public/level8/hero/ciccio.webp)
 * hung on their joints. A Pose bends the joints; bones() is the pure 2D maths (unit-tested, also gives the
 * finger-gun muzzle), drawRig() pastes the bitmap parts with those transforms. Frame units, facing right.
 */
import type { Vec } from '../api';
import { JOINTS, PARTS } from './parts';

/** 2D affine [a, b, c, d, e, f] as canvas transform(): x' = a x + c y + e, y' = b x + d y + f. */
export type Mat = readonly [number, number, number, number, number, number];

export interface Pose {
  /** root: offset, squash / stretch about the feet, spin about the body centre (radians, clockwise) */
  dx: number;
  dy: number;
  sx: number;
  sy: number;
  rot: number;
  /** joint angles (radians, clockwise): torso about the hips, head, gun arm, its glove, hip arm, legs */
  lean: number;
  head: number;
  gun: number;
  wrist: number;
  hip: number;
  legB: number;
  legF: number;
  /** rubber-hose reach of the gun arm (frame units, added after its rotation) */
  reachX: number;
  reachY: number;
  /** leg lift (frame units, up < 0) */
  liftB: number;
  liftF: number;
  /** running: the back leg wears the front leg's art, so both shoes point forward */
  stride: boolean;
  /** the glove turned over about the wrist (aiming up: index up, thumb forward, clear of the face) */
  flip: boolean;
  /** overlays, -1 = off, else the effect's phase 0..1 */
  stars: number;
  ticks: number;
  glint: number;
  pink: number;
  /** dash smear 0..1 (ghosts + speed lines) */
  smear: number;
}

export function restPose(): Pose {
  return {
    dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, lean: 0, head: 0, gun: 0, wrist: 0, hip: 0, legB: 0, legF: 0,
    reachX: 0, reachY: 0, liftB: 0, liftF: 0, stride: false, flip: false, stars: -1, ticks: -1, glint: -1, pink: -1, smear: 0,
  };
}

export const FOOT: Vec = { x: 32, y: 62 };
/** where the root spins (the middle of the body) */
export const CENTRE: Vec = JOINTS.chest;

const ID: Mat = [1, 0, 0, 1, 0, 0];
function mul(m: Mat, n: Mat): Mat {
  return [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
}
const move = (x: number, y: number): Mat => [1, 0, 0, 1, x, y];
const turn = (a: number): Mat => [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0];
/** rotation by `a` about point p */
const turnAt = (p: Vec, a: number): Mat => (a === 0 ? ID : mul(move(p.x, p.y), mul(turn(a), move(-p.x, -p.y))));
const mirrorAt = (p: Vec): Mat => [-1, 0, 0, 1, 2 * p.x, 0];
export const apply = (m: Mat, v: Vec): Vec => ({ x: m[0] * v.x + m[2] * v.y + m[4], y: m[1] * v.x + m[3] * v.y + m[5] });

export type Slot = 'backLeg' | 'frontLeg' | 'torso' | 'head' | 'hipArm' | 'gunSleeve' | 'glove';
/** back to front */
const SLOTS: readonly Slot[] = ['backLeg', 'frontLeg', 'torso', 'head', 'hipArm', 'gunSleeve', 'glove'];

/** World transform of every slot for a pose (frame units). */
export function bones(p: Pose): Record<Slot, Mat> {
  const squash: Mat = [p.sx, 0, 0, p.sy, FOOT.x * (1 - p.sx), FOOT.y * (1 - p.sy)];
  const root = mul(move(p.dx, p.dy), mul(turnAt(CENTRE, p.rot), squash));
  const torso = mul(root, turnAt(JOINTS.hipCentre, p.lean));
  const gunSleeve = mul(torso, mul(move(p.reachX, p.reachY), turnAt(JOINTS.gunShoulder, p.gun)));
  const B = JOINTS.hipBack;
  const F = JOINTS.hipFront;
  const backLeg = p.stride ? mul(root, mul(move(B.x - F.x, B.y - F.y + p.liftB), turnAt(F, p.legB))) : mul(root, mul(move(0, p.liftB), turnAt(B, p.legB)));
  return {
    backLeg,
    frontLeg: mul(root, mul(move(0, p.liftF), turnAt(F, p.legF))),
    torso,
    head: mul(torso, turnAt(JOINTS.neck, p.head)),
    hipArm: mul(torso, turnAt(JOINTS.hipShoulder, p.hip)),
    gunSleeve,
    glove: mul(gunSleeve, mul(turnAt(JOINTS.wrist, p.wrist), p.flip ? mirrorAt(JOINTS.wrist) : ID)),
  };
}

/** Fingertip of the finger-gun for a pose (frame units). */
export function fingertip(p: Pose): Vec {
  return apply(bones(p).glove, JOINTS.fingertip);
}

/** The bitmap part each slot shows (the back leg borrows the front leg's art while running). */
function slotArt(p: Pose, slot: Slot): keyof typeof PARTS {
  return slot === 'backLeg' && p.stride ? 'frontLeg' : slot;
}

/** Pastes the parts for pose `p` (ctx in frame units; `art` = the atlas image). */
export function drawRig(ctx: CanvasRenderingContext2D, art: CanvasImageSource, p: Pose): void {
  const b = bones(p);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  for (const slot of SLOTS) {
    const r = PARTS[slotArt(p, slot)];
    ctx.save();
    ctx.transform(...b[slot]);
    ctx.drawImage(art, r.sx, r.sy, r.sw, r.sh, r.x, r.y, r.w, r.h);
    ctx.restore();
  }
}
