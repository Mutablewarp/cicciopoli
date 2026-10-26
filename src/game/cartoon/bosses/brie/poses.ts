/**
 * What Monsieur Brie's puppet does on each beat (pure apart from the dust puffs it asks for): face frame,
 * right / left arm pose, squash and stretch, the wheelie and skid tilts, the hop crouch, the legs' lift.
 */
import { ARENA } from '../../api';
import type { RigFrame } from './kit/runner';
import { BRIE as C } from './config';
import { BRIE_ART as A } from './sheet';
import type { BrieAttack } from './patterns';

const F = ARENA.floorY;
const T = C.transform;
/** how long a landing squash lasts */
const LAND_MS = 260;
const REAR = { x: (A.pivots.hubR.x - A.origin.x) / A.pxPerUnit, y: -14 };
const FRONT = { x: (A.pivots.hubF.x - A.origin.x) / A.pxPerUnit, y: 0 };

export type Mode = 'bike' | 'skid' | 'fly' | 'foot' | 'ko';
export type ArmName = keyof typeof C.arms;
export type FaceName = (typeof A.faces)[number];

export interface Pose {
  face: FaceName;
  arm: ArmName;
  armL: ArmName;
  sx: number;
  sy: number;
  /** tilt (radians) around the pivot (px, py), local units from the feet */
  rot: number;
  px: number;
  py: number;
  /** on foot: wedge drop, lean, each leg's lift and the stance width */
  crouch: number;
  lean: number;
  lift: readonly [number, number];
  spread: number;
}

const BASE: Pose = { face: 'idle', arm: 'grip', armL: 'limp', sx: 1, sy: 1, rot: 0, px: 0, py: 0, crouch: 0, lean: 0, lift: [0, 0], spread: 1 };

/** arm + face for the current attack beat */
function act(f: RigFrame<BrieAttack>, onBike: boolean): Pick<Pose, 'arm' | 'armL' | 'face'> {
  const tele = f.stage === 'telegraph';
  const active = f.stage === 'active';
  const throwing = active && (f.plan?.hazards ?? []).some((h) => f.t >= h.atMs && f.t < h.atMs + 220);
  const windup = onBike ? 'windup' : 'shout';
  const shout = 'shout';
  switch (tele || active ? f.attack : null) {
    case 'baguette':
    case 'volley':
      return { arm: throwing ? 'throw' : 'raise', armL: 'fist', face: throwing ? shout : windup };
    case 'wheels':
      return { arm: 'basket', armL: 'limp', face: throwing ? shout : windup };
    case 'bounce':
      return { arm: 'fist', armL: 'fist', face: throwing ? shout : windup };
    case 'charge':
      return { arm: 'grip', armL: 'limp', face: tele ? 'windup' : 'shout' };
    case 'beret':
      return tele ? { arm: 'twirl', armL: 'limp', face: 'windup' } : { arm: f.t < 300 ? 'throw' : 'fist', armL: 'limp', face: 'shout' };
    case 'javelin':
      return { arm: throwing ? 'throw' : 'bundle', armL: 'fist', face: throwing ? shout : windup };
    case 'hop':
      return { arm: 'fist', armL: 'fist', face: shout };
    default: {
      const blink = (f.clock + 1700) % 3400 < 130;
      return { arm: onBike ? 'grip' : 'limp', armL: 'limp', face: blink ? 'blink' : onBike ? 'idle' : 'windup' };
    }
  }
}

/** The pose for frame f; `puff(x, y)` raises dust (skids, landings). */
export function pickPose(f: RigFrame<BrieAttack>, mode: Mode, onBike: boolean, prevT: number, puff: (x: number, y: number) => void): Pose {
  const p: Pose = { ...BASE, ...act(f, onBike) };
  const fs = f.pose.f === -1 ? 1 : -1;
  const crossed = (at: number): boolean => prevT < at && at <= f.t;
  // marching in place on foot
  if (!onBike) {
    const step = Math.sin(f.clock / 140);
    p.lift = [Math.max(0, step) * 4, Math.max(0, -step) * 4];
  }
  if (f.attack === 'charge' && f.stage === 'telegraph') {
    // wheelie on the rear wheel, dust behind
    p.rot = 0.24 * Math.min(1, f.t / 350);
    p.px = REAR.x;
    p.py = REAR.y;
    if (Math.floor(f.t / 220) !== Math.floor(prevT / 220)) puff(f.pose.x + REAR.x * fs, F);
  } else if (f.attack === 'charge' && f.stage === 'active' && f.plan?.move) {
    const a = f.plan.move(f.t);
    const b = f.plan.move(f.t + 30);
    p.rot = Math.max(-0.35, Math.min(0.35, ((a.y - b.y) / 30) * 0.5));
  } else if (f.attack === 'hop' && f.stage === 'telegraph') {
    p.crouch = 8;
    p.spread = 1.3;
    p.sx = 1.12;
    p.sy = 0.86;
  } else if (f.attack === 'hop' && f.stage === 'active') {
    const h = C.hop;
    const back = h.outMs + h.holdMs + h.backMs;
    const since = f.t >= back ? f.t - back : f.t >= h.outMs ? f.t - h.outMs : -1;
    const airborne = f.t < h.outMs || (f.t >= h.outMs + h.holdMs && f.t < back);
    if (airborne) {
      p.lift = [12, 12];
      p.spread = 0.7;
    } else if (since >= 0 && since < LAND_MS) {
      const u = 1 - since / LAND_MS;
      p.sx = 1 + 0.2 * u;
      p.sy = 1 - 0.2 * u;
      p.crouch = 8 * u;
      p.spread = 1 + 0.5 * u;
    }
    if (!airborne && f.t >= back) Object.assign(p, { arm: 'limp', armL: 'limp', face: 'windup' });
  } else if (f.stage === 'telegraph') {
    p.sx = 1 + 0.04 * Math.sin(f.t / 60);
    p.sy = 2 - p.sx;
  }
  if (mode === 'skid') {
    // brakes: nose down on the front wheel
    Object.assign(p, { rot: -0.1, px: FRONT.x, py: FRONT.y, face: 'shout' });
    if (Math.floor(f.t / 110) !== Math.floor(prevT / 110)) puff(f.pose.x + FRONT.x * fs, F);
  }
  if (mode === 'fly') {
    const u = (f.t - T.skidMs) / T.flyMs;
    Object.assign(p, { rot: u * Math.PI * 2, px: 0, py: -90, lift: [12, 12], spread: 0.7, arm: 'fist', armL: 'fist', face: 'shout' });
  }
  if (mode === 'foot' && f.stage === 'transform') {
    const u = (f.t - T.skidMs - T.flyMs) / (C.transformMs - T.skidMs - T.flyMs);
    p.sx = 1 + 0.2 * Math.max(0, 1 - u * 2.5);
    p.sy = 2 - p.sx;
    p.crouch = u < 0.4 ? 8 : 0;
    Object.assign(p, { face: 'shout', arm: 'fist', armL: 'fist' });
    if (crossed(T.skidMs + T.flyMs)) {
      puff(f.pose.x - 20, F);
      puff(f.pose.x + 20, F);
    }
  }
  // landings throw up dust
  if (f.stage === 'active' && f.plan)
    for (const c of f.plan.cues)
      if (c.sfx === 'blast' && crossed(c.atMs)) {
        puff(f.pose.x - 26, F);
        puff(f.pose.x + 26, F);
      }
  return p;
}
