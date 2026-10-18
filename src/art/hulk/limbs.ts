/**
 * Arm and leg sculpts: round deltoid, biceps and forearm swell, big fist; thick thigh, calf, big bare foot and
 * the baggy trouser legs with their torn, diagonal hems. Built from the zbuf primitives in frame coordinates.
 */
import { M } from './palette';
import { armJoints, dir, legJoints, LAYER, rad, type ArmPose, type LegPose, type Pose, type Pt } from './rig';
import { capsule, ellipsoid, type Mat, type Prim } from './zbuf';

function fistPrims(m: Mat, layer: number, fist: Pt, fd: Pt, big: boolean): Prim[] {
  const ang = Math.atan2(fd[1], fd[0]);
  const side: Pt = [-fd[1], fd[0]];
  const k = big ? 1.14 : 1;
  return [
    ellipsoid(m, layer, fist[0], fist[1], 4.3 * k, 4.1 * k, 4.1 * k, { angle: ang, lift: 3 }),
    // thumb wrapped over the front of the fist
    ellipsoid(m, layer, fist[0] - fd[0] * 1.2 + side[0] * 2, fist[1] - fd[1] * 1.2 + side[1] * 2, 2.2, 1.5, 2, { angle: ang, lift: 8 }),
  ];
}

/** Hand opening mid-throw: a big palm with four thick fingers fanned along the forearm direction. */
function clawPrims(m: Mat, layer: number, fist: Pt, lo: number): Prim[] {
  const [cx, cy] = fist;
  const ang = Math.atan2(dir(lo)[1], dir(lo)[0]);
  const prims: Prim[] = [ellipsoid(m, layer, cx, cy, 5.6, 5.2, 4.8, { angle: ang, lift: 3 })];
  for (const off of [-38, -13, 13, 38]) {
    const [dx, dy] = dir(lo + off);
    prims.push(capsule(m, layer, cx + dx * 3.4, cy + dy * 3.4, cx + dx * 8.6, cy + dy * 8.6, 2.2, 1.4, { lift: 4 }));
  }
  return prims;
}

/** Fingers hooked around a vertical pole: a tall fist with four stacked finger rolls on its front (creases are in details.ts). */
function wrapPrims(m: Mat, layer: number, fist: Pt): Prim[] {
  const [fx, fy] = fist;
  const prims: Prim[] = [ellipsoid(m, layer, fx, fy, 4.2, 5.8, 4.6, { lift: 3 })];
  for (const k of [-3.9, -1.3, 1.3, 3.9]) prims.push(capsule(m, layer, fx + 1.6, fy + k, fx + 4.6, fy + k, 1.7, 1.5, { lift: 6 }));
  return prims;
}

export function armPrims(p: Pose, a: ArmPose, front: boolean): Prim[] {
  const j = armJoints(p, a, front);
  const m = front ? M.skin : M.skinFar;
  const layer = a.behind ? LAYER.armBehind : front ? LAYER.armF : LAYER.armB;
  const f = a.flex ?? 0;
  const ux = j.el[0] - j.sh[0];
  const uy = j.el[1] - j.sh[1];
  const ul = Math.hypot(ux, uy) || 1;
  // biceps peak on the inside of the bend (towards the front for a straight arm)
  const cross = ux * (j.wr[1] - j.el[1]) - uy * (j.wr[0] - j.el[0]);
  const s = Math.abs(cross) < 1 ? (front ? -1 : 1) * Math.sign(uy || 1) : Math.sign(cross);
  const nx = (-uy / ul) * s;
  const ny = (ux / ul) * s;
  const k = a.thick ?? 1;
  const prims: Prim[] = [
    ellipsoid(m, layer, j.sh[0], j.sh[1] + 0.2, 6, 4.9, 5.4, { bias: 0.04, lift: 2 }),
    capsule(m, layer, j.sh[0], j.sh[1], j.el[0], j.el[1], 3.1 * k, 2.7 * k, { bumps: [[0.45, 0.6, 0.28]] }),
    capsule(m, layer, j.el[0], j.el[1], j.wr[0], j.wr[1], 3.3 * k, 2.6 * k, { bumps: [[0.3, 0.7, 0.3]], lift: 1 }),
  ];
  if (f >= 0.5) {
    prims.push(
      ellipsoid(m, layer, j.sh[0] + ux * 0.5 + nx * (0.9 + 1.8 * f), j.sh[1] + uy * 0.5 + ny * (0.9 + 1.8 * f), 4.8 + f * 1.2, 3.5 + f * 1.4, 5 + f, { angle: Math.atan2(uy, ux), lift: 5 }),
    );
  }
  const hand =
    a.hand === 'claw' ? clawPrims(m, layer, j.fist, a.lo)
    : a.hand === 'wrap' ? wrapPrims(m, layer, j.fist)
    : fistPrims(m, layer, j.fist, j.fd, a.big === true);
  return prims.concat(hand);
}

/** Triangle wave 0..1 across the trouser leg: one torn point every ~4.6 px. */
const jag = (side: number): number => Math.abs((((side + 40) / 2.3) % 2) - 1);

/** Length (px along the thigh axis, from the hip) of the torn trouser leg at a signed side offset: a diagonal cut, shorter at the inseam, with triangular rips. */
const hemLen = (side: number, front: boolean): number => 9.8 + 0.45 * (front ? -side : side) + 3.6 * jag(side);

export function legPrims(p: Pose, l: LegPose, front: boolean): Prim[] {
  const j = legJoints(p, l, front);
  const layer = front ? LAYER.nearLeg : LAYER.farLeg;
  const m = front ? M.skin : M.skinFar;
  const sm = front ? M.shorts : M.shortsFar;
  // quadriceps on the front of the thigh
  const kx = j.knee[0] - j.hip[0];
  const ky = j.knee[1] - j.hip[1];
  const kl = Math.hypot(kx, ky) || 1;
  const hq: Pt = [j.hip[0] + kx * 0.42 + (ky / kl) * 0.6, j.hip[1] + ky * 0.42 - (kx / kl) * 0.6];
  // calf: a bulge on the back of the shin
  const sx = j.ankle[0] - j.knee[0];
  const sy = j.ankle[1] - j.knee[1];
  const sl = Math.hypot(sx, sy) || 1;
  const calf: Pt = [j.knee[0] + sx * 0.3 - (sy / sl) * 1.5, j.knee[1] + sy * 0.3 + (sx / sl) * 1.5];
  const prims: Prim[] = [
    capsule(m, layer, j.hip[0], j.hip[1], j.knee[0], j.knee[1], 4.5, 4, { bumps: [[0.4, 0.7, 0.3]], flatStart: true }),
    capsule(m, layer, j.knee[0], j.knee[1], j.ankle[0], j.ankle[1], 4, 3.1, { bumps: [[0.28, 1.4, 0.24]] }),
    ellipsoid(m, layer, j.knee[0], j.knee[1], 3.7, 3.7, 3.5),
    ellipsoid(m, layer, hq[0], hq[1], 3.6, 3, 4.2, { angle: Math.atan2(kx, -ky), lift: 4 }),
    ellipsoid(m, layer, calf[0], calf[1], 3.2, 4.6, 3.4, { angle: Math.atan2(sx, -sy), lift: 3 }),
    // baggy trouser leg with a diagonal torn hem, apart from the other leg (the crotch notch stays open)
    capsule(sm, layer, j.hip[0], j.hip[1] - 1, j.hip[0] + kx * 1.3, j.hip[1] + ky * 1.3 - 1, 4, 6, {
      bumps: [[0.3, 0.5, 0.3]],
      lift: 20,
      clip: (t, side) => t > 0.07 && t * kl * 1.3 < hemLen(side, front),
    }),
  ];
  const f = rad(j.foot);
  const c = Math.cos(f);
  const s = Math.sin(f);
  const fp = (lx: number, ly: number): Pt => [j.ankle[0] + lx * c - ly * s, j.ankle[1] + lx * s + ly * c];
  const heel = fp(-0.8, 2.3);
  const ball = fp(4.6, 2.6);
  const toe = fp(8.6, 3.1);
  prims.push(
    ellipsoid(m, layer, heel[0], heel[1], 3.2, 2.3, 2.6, { angle: f, lift: 3 }),
    capsule(m, layer, heel[0], heel[1], ball[0], ball[1], 2.5, 2.3, { lift: 3 }),
    ellipsoid(m, layer, toe[0], toe[1], 2.8, 1.7, 1.9, { angle: f, lift: 4 }),
  );
  return prims;
}
