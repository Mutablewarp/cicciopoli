/**
 * Composites one Ciccio frame from a Pose: far limbs, shorts, near leg, T-shirt,
 * head, near arm — each part stamped with an ink ring (cup-style separations).
 */
import type { CiccioFrameAnchors } from '../../contracts';
import { BRIDGE, paintHead, type HeadVariant } from './head';
import { INK, SHIRT, SHORTS, SKIN, SOCK, darker, type Tones } from './palette';
import { Raster, stamp } from './raster';
import { capsule, litDisc, litEllipse } from './shapes';
import { paintShoe, type ShoeKind } from './shoes';

export type Pt = readonly [number, number];

/** Segment directions in degrees: 0 down, 90 forward (+x), 180 up, -90 back. */
export interface ArmPose {
  up: number;
  lo: number;
}

/** Knee and ankle in frame pixels (hips come from the torso). */
export interface LegPose {
  knee: Pt;
  ankle: Pt;
  shoe: ShoeKind;
}

export interface Pose {
  /** waist centre in frame pixels */
  pelvis: Pt;
  /** torso lean in degrees, + = forward (clockwise on screen) */
  lean: number;
  /** extra belly radius (breathing / squash), may be negative */
  belly?: number;
  /** squash (+) / stretch (-): local x scaled by 1+sq, local y by 1-sq */
  squash?: number;
  /** head offset from its neck socket */
  head?: Pt;
  /** absolute head grid origin (overrides the neck socket, e.g. flying) */
  headAt?: Pt;
  face: HeadVariant;
  armB: ArmPose;
  armF: ArmPose;
  legB: LegPose;
  legF: LegPose;
  /** paint the near arm before the head (arm raised behind it) */
  armFBack?: boolean;
  /** club angle in radians for the hand anchor */
  club: number;
}

export const FRAME = 48;
const UPPER = 5;
const FORE = 4.5;

function rot(p: Pose, lx: number, ly: number): [number, number] {
  const a = (p.lean * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const sq = p.squash ?? 0;
  const x = lx * (1 + sq);
  const y = ly * (1 - sq);
  return [p.pelvis[0] + x * c - y * s, p.pelvis[1] + x * s + y * c];
}

function dir(deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [Math.sin(a), Math.cos(a)];
}

interface ArmJoints {
  sh: [number, number];
  el: [number, number];
  hand: [number, number];
}

function armJoints(p: Pose, a: ArmPose, front: boolean): ArmJoints {
  const sh = front ? rot(p, 6, -12) : rot(p, -8, -12);
  const [ux, uy] = dir(a.up);
  const [fx, fy] = dir(a.lo);
  const el: [number, number] = [sh[0] + ux * UPPER, sh[1] + uy * UPPER];
  const hand: [number, number] = [Math.round(el[0] + fx * FORE), Math.round(el[1] + fy * FORE)];
  return { sh, el, hand };
}

function paintArm(p: Pose, a: ArmPose, front: boolean): Raster {
  const r = new Raster(FRAME, FRAME);
  const skin = front ? SKIN : darker(SKIN);
  const shirt = front ? SHIRT : darker(SHIRT);
  const j = armJoints(p, a, front);
  capsule(r, j.sh[0], j.sh[1], j.el[0], j.el[1], 1.5, skin);
  capsule(r, j.el[0], j.el[1], j.hand[0], j.hand[1], 1.4, skin);
  litDisc(r, j.hand[0], j.hand[1], 2, skin, 0.1);
  const [ux, uy] = dir(a.up);
  capsule(r, j.sh[0], j.sh[1], j.sh[0] + ux * 2.5, j.sh[1] + uy * 2.5, 2.3, shirt);
  return r;
}

function paintLeg(p: Pose, l: LegPose, front: boolean): Raster {
  const r = new Raster(FRAME, FRAME);
  const hip = front ? rot(p, 3, 0) : rot(p, -3, 0);
  const shorts: Tones = front ? SHORTS : darker(SHORTS);
  const skin = front ? SKIN : darker(SKIN);
  const sock = front ? SOCK : darker(SOCK);
  const [kx, ky] = l.knee;
  const [ax, ay] = l.ankle;
  capsule(r, hip[0], hip[1], kx, ky, 1.4, skin);
  capsule(r, kx, ky, ax, ay, 1.3, skin);
  capsule(r, ax, ay, ax, ay, 1.2, sock);
  const hx = hip[0] + (kx - hip[0]) * 0.25;
  const hy = hip[1] + (ky - hip[1]) * 0.25;
  capsule(r, hip[0], hip[1], hx, hy, 2.1, shorts);
  paintShoe(r, l.shoe, ax, ay + 1, !front);
  return r;
}

function paintSeat(p: Pose): Raster {
  const r = new Raster(FRAME, FRAME);
  const [cx, cy] = rot(p, -1, -1);
  const sq = p.squash ?? 0;
  litEllipse(r, cx, cy, 7.5 * (1 + sq), 3 * (1 - sq), SHORTS, { angle: (p.lean * Math.PI) / 180 });
  return r;
}

function paintShirt(p: Pose): Raster {
  const r = new Raster(FRAME, FRAME);
  const ang = (p.lean * Math.PI) / 180;
  const b = p.belly ?? 0;
  const wx = 1 + (p.squash ?? 0);
  const wy = 1 - (p.squash ?? 0);
  const [chx, chy] = rot(p, -3, -11);
  litEllipse(r, chx, chy, 6.5 * wx, 5 * wy, SHIRT, { angle: ang });
  const [bx, by] = rot(p, 2, -8 + b * 0.3);
  litEllipse(r, bx, by, (9.5 + b) * wx, (7 + b * 0.5) * wy, SHIRT, { angle: ang });
  return r;
}

/** Soft shadow the chin casts on the T-shirt (one cool-grey row under the head). */
function chinShadow(out: Raster, head: Raster): void {
  for (let x = 0; x < FRAME; x++) {
    let y = FRAME - 1;
    while (y >= 0 && head.get(x, y) === null) y--;
    if (y < 0) continue;
    const below = out.get(x, y + 1);
    if (below === SHIRT.hi || below === SHIRT.base) out.set(x, y + 1, SHIRT.sh);
  }
}

function headOrigin(p: Pose): [number, number] {
  if (p.headAt) return [p.headAt[0], p.headAt[1]];
  const [x, y] = rot(p, -8, -30);
  const off = p.head ?? [0, 0];
  return [Math.round(x + off[0]), Math.round(y + off[1])];
}

export function renderPose(p: Pose): { raster: Raster; anchors: CiccioFrameAnchors } {
  const out = new Raster(FRAME, FRAME);
  const [hx, hy] = headOrigin(p);
  const head = new Raster(FRAME, FRAME);
  paintHead(head, p.face, hx, hy);
  const armF = paintArm(p, p.armF, true);

  stamp(out, paintArm(p, p.armB, false), INK);
  stamp(out, paintLeg(p, p.legB, false), INK);
  stamp(out, paintSeat(p), INK);
  stamp(out, paintLeg(p, p.legF, true), INK);
  stamp(out, paintShirt(p), INK);
  if (p.armFBack) stamp(out, armF, INK);
  stamp(out, head, null);
  chinShadow(out, head);
  if (!p.armFBack) stamp(out, armF, INK);

  const hand = armJoints(p, p.armF, true).hand;
  const [cx, cy] = rot(p, -1, -8);
  const [bx, by] = rot(p, -7, -12);
  return {
    raster: out,
    anchors: {
      hand: { x: hand[0], y: hand[1], angle: p.club },
      chest: { x: Math.round(cx), y: Math.round(cy) },
      back: { x: Math.round(bx), y: Math.round(by) },
      head: { x: hx + BRIDGE.x, y: hy + BRIDGE.y },
    },
  };
}
