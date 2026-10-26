/**
 * One DOUBLE TRIPLE rig of shirt parts: the big burger (scale 1, with the peace arm) or a phase-2 mini (scale
 * DT.mini.scale): legs about their hips, the body squashed about its hips, arms about the shoulders the squash
 * moves. Pure placement maths (shoulder, glove, boxes) is exported for the moves.
 */
import type Phaser from 'phaser';
import { type Box, type Vec } from '../../api';
import { part, put } from '../oldschool/kit/rig';
import { armTurn, GLOVE_L, HIP, legTurn, off, originAt, PART_TEX, PIVOT, POSE, SHOULDER_L, SHOULDER_R, turn, type DtPart } from './look';
import { DT } from './tuning';
import type { DtPose, MiniPose } from './types';

type Sprite = Phaser.GameObjects.Sprite;

export interface RigSprites {
  readonly body: Sprite;
  readonly legL: Sprite;
  readonly legR: Sprite;
  readonly armL: Sprite;
  readonly armR: Sprite | null;
  readonly all: readonly Sprite[];
}

/** feet, squash, arm POSEs and leg frame of a rig */
export interface RigPose {
  x: number;
  y: number;
  sx: number;
  sy: number;
  legs: number;
  armL: number;
  armR: number;
}

export const bigRig = (p: DtPose): RigPose => ({ x: p.bx, y: p.by, sx: p.sx, sy: p.sy, legs: p.legs, armL: p.armL, armR: p.armR });
/** a mini's pose as a rig pose (minis carry the glove arm only) */
export const miniRig = (m: MiniPose): RigPose => ({ x: m.x, y: m.y, sx: m.sx, sy: m.sy, legs: m.legs, armL: m.arm, armR: POSE.peace });

export function makeRig(scene: Phaser.Scene, k: number, peace: boolean): RigSprites {
  const d = DT.depth;
  const mk = (p: DtPart, depth: number): Sprite => part(scene, PART_TEX[p], k, depth, 0, ...originAt(p, PIVOT[p]));
  const legL = mk('legL', d.legs);
  const legR = mk('legR', d.legs);
  const armR = peace ? mk('armR', d.armR) : null;
  const armL = mk('armL', d.armL);
  const body = mk('body', d.body);
  return { body, legL, legR, armL, armR, all: [legL, legR, ...(armR ? [armR] : []), armL, body] };
}

/** world hips of the body (they stay on the legs; the squash happens above them) */
function hips(p: RigPose, s: number): Vec {
  return { x: p.x + HIP.x * s, y: p.y + HIP.y * s };
}

function shoulder(p: RigPose, s: number, v: Vec): Vec {
  const h = hips(p, s);
  return { x: h.x + v.x * s * p.sx, y: h.y + v.y * s * p.sy };
}

export function shoulderL(p: RigPose, s: number): Vec {
  return shoulder(p, s, SHOULDER_L);
}

/** world position of the left glove in an arm pose */
export function handL(p: RigPose, s: number, pose: number): Vec {
  const sh = shoulderL(p, s);
  const g = turn(GLOVE_L, armTurn(pose, 'L'));
  return { x: sh.x + g.x * s, y: sh.y + g.y * s };
}

export function placeRig(r: RigSprites, p: RigPose, s: number, k: number, wob = 0): void {
  const [aL, aR] = legTurn(p.legs);
  const lL = off(DT.art.hipL);
  const lR = off(DT.art.hipR);
  put(r.legL, k, p.x + lL.x * s, p.y + lL.y * s, s, s, aL);
  put(r.legR, k, p.x + lR.x * s, p.y + lR.y * s, s, s, aR);
  const h = hips(p, s);
  put(r.body, k, h.x, h.y, s * (p.sx + wob), s * (p.sy - wob));
  const sl = shoulderL(p, s);
  put(r.armL, k, sl.x, sl.y, s, s, armTurn(p.armL, 'L'));
  if (r.armR) {
    const sr = shoulder(p, s, SHOULDER_R);
    put(r.armR, k, sr.x, sr.y, s, s, armTurn(p.armR, 'R'));
  }
}

/** top of the burger stack (world y) */
export function rigTop(p: RigPose, s: number): number {
  return hips(p, s).y - DT.box.top * s * p.sy;
}

/** hurt / body boxes: the burger stack and the legs under it */
export function rigBoxes(p: RigPose, s: number): Box[] {
  const B = DT.box;
  const h = hips(p, s);
  const top = rigTop(p, s);
  return [
    { x: p.x - B.halfW * s * p.sx, y: top, w: 2 * B.halfW * s * p.sx, h: h.y - top },
    { x: p.x - B.legsHalfW * s, y: h.y, w: 2 * B.legsHalfW * s, h: p.y - h.y },
  ];
}
