/**
 * Skeleton of the hero: pose parameters, proportion constants and forward / inverse kinematics.
 * Everything is in continuous frame pixels (x right, y down, pixel i covers [i, i+1)).
 * Standing reference: hip line y = 37, shoulder joints y = 29.8 (+-18.4 px from the centre line), chin y = 19, trousers
 * waistband y = 32.5, crotch y = 40, ragged trouser hems y = 47-50, sole y = 63 (62 px tall with the outline): a short
 * compact torso on 23 rows of leg, the arms bowed out from the shoulders so the fists tuck in at the hips.
 */
export type Pt = readonly [number, number];
export type Face = 'grit' | 'roar' | 'hurt' | 'joy';

/** Segment angles in degrees: 0 hangs down, 90 points forward (+x), 180 up, -90 back. */
export interface ArmPose {
  up: number;
  lo: number;
  /** biceps flex 0..1 (bigger bulge on the inside of the elbow) */
  flex?: number;
  /** 'claw' = hand opening with the fingers fanned out (the throw); 'wrap' = fingers curling around a pole; default is a clenched fist */
  hand?: 'fist' | 'claw' | 'wrap';
  /** drawn behind the torso instead of beside it */
  behind?: boolean;
  /** bigger fist (punch strike) */
  big?: boolean;
  /** arm length factor (default 1): the slam arms reach a little further than the idle ones */
  len?: number;
  /** arm thickness factor (default 1): the flag-grab arm is a huge one */
  thick?: number;
}

/** Ankle target (the leg is solved by IK); `foot` = toe angle (0 flat, + toe down); `knee` = direction the knee points to. */
export interface LegPose {
  ankle: Pt;
  foot?: number;
  knee?: Pt;
}

export interface Pose {
  /** hip line centre */
  pelvis: Pt;
  /** spine lean in degrees, + = forward (top moves right) */
  lean: number;
  /** torso yaw -1..1: + turns the chest toward the right (shoulders close up and shift forward) */
  twist?: number;
  /** chest expansion in px (breathing, flexing) */
  breath?: number;
  /** hip joints distance from the pelvis centre (default K.hipX; running legs swing from nearer the middle) */
  hips?: number;
  /** head offset from its neck socket */
  head?: Pt;
  face: Face;
  /** comic impact rays around the fist (the ground-slam landing) */
  impact?: boolean;
  armB: ArmPose;
  armF: ArmPose;
  legB: LegPose;
  legF: LegPose;
}

/** Depth layers, back to front: a higher layer always paints over a lower one. */
export const LAYER = { armBehind: 0, farLeg: 1, nearLeg: 2, torso: 3, pelvis: 4, armB: 5, armF: 6, head: 7 } as const;

export const K = {
  thigh: 12.2,
  shin: 11.4,
  upper: 6.9,
  fore: 5.4,
  /** wrist to fist centre */
  fist: 2.6,
  shoulderX: 18.4,
  shoulderY: -5.4,
  hipX: 7.2,
  /** chin socket of the head (bottom row of the head grid) */
  neckY: -18.5,
} as const;

export const rad = (deg: number): number => (deg * Math.PI) / 180;

/** Unit vector of a segment angle (0 down, 90 forward). */
export function dir(deg: number): Pt {
  const a = rad(deg);
  return [Math.sin(a), Math.cos(a)];
}

/** Torso-local point (origin = hip line, y up is negative) to frame pixels. */
export function torsoPt(p: Pose, lx: number, ly: number): Pt {
  const a = rad(p.lean);
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [p.pelvis[0] + lx * c - ly * s, p.pelvis[1] + lx * s + ly * c];
}

/** How far a held breath / flex lifts the chest, shoulders and head (px). */
export const chestLift = (p: Pose): number => 0.6 * (p.breath ?? 0);

/** The pelvis block of the trousers only follows part of the spine lean (the hips stay nearly level when the torso pitches over). */
export const pelvisAngle = (p: Pose): number => rad(p.lean * 0.4);

/** Pelvis-local point (origin = hip line) to frame pixels. */
export function pelvisPt(p: Pose, lx: number, ly: number): Pt {
  const a = pelvisAngle(p);
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [p.pelvis[0] + lx * c - ly * s, p.pelvis[1] + lx * s + ly * c];
}

export function shoulderPt(p: Pose, front: boolean): Pt {
  const tw = p.twist ?? 0;
  const sx = (front ? 1 : -1) * K.shoulderX * Math.cos(1.2 * tw) + 2.5 * tw;
  return torsoPt(p, sx, K.shoulderY - chestLift(p));
}

export interface ArmJoints {
  sh: Pt;
  el: Pt;
  wr: Pt;
  fist: Pt;
  /** unit vector along the forearm */
  fd: Pt;
}

export function armJoints(p: Pose, a: ArmPose, front: boolean): ArmJoints {
  const sh = shoulderPt(p, front);
  const [ux, uy] = dir(a.up);
  const fd = dir(a.lo);
  const k = a.len ?? 1;
  const el: Pt = [sh[0] + ux * K.upper * k, sh[1] + uy * K.upper * k];
  const wr: Pt = [el[0] + fd[0] * K.fore * k, el[1] + fd[1] * K.fore * k];
  return { sh, el, wr, fist: [wr[0] + fd[0] * K.fist, wr[1] + fd[1] * K.fist], fd };
}

export interface LegJoints {
  hip: Pt;
  knee: Pt;
  ankle: Pt;
  foot: number;
}

export function hipPt(p: Pose, front: boolean): Pt {
  const h = p.hips ?? K.hipX;
  return [p.pelvis[0] + (front ? h : -h), p.pelvis[1]];
}

/** Two-bone IK: the ankle is pulled in when out of reach, the knee bends toward the facing side. */
export function legJoints(p: Pose, l: LegPose, front: boolean): LegJoints {
  const hip = hipPt(p, front);
  const dx = l.ankle[0] - hip[0];
  const dy = l.ankle[1] - hip[1];
  const reach = K.thigh + K.shin - 0.15;
  let d = Math.hypot(dx, dy) || 1;
  const ux = dx / d;
  const uy = dy / d;
  let ankle: Pt = l.ankle;
  if (d > reach) {
    d = reach;
    ankle = [hip[0] + ux * reach, hip[1] + uy * reach];
  }
  const a = (K.thigh * K.thigh - K.shin * K.shin + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, K.thigh * K.thigh - a * a));
  const k1: Pt = [hip[0] + ux * a - uy * h, hip[1] + uy * a + ux * h];
  const k2: Pt = [hip[0] + ux * a + uy * h, hip[1] + uy * a - ux * h];
  const [hx, hy] = l.knee ?? [1, 0.6];
  const knee = k1[0] * hx + k1[1] * hy > k2[0] * hx + k2[1] * hy ? k1 : k2;
  return { hip, knee, ankle, foot: l.foot ?? 0 };
}
