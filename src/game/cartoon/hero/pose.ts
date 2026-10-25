/**
 * Pure pose math of the rubber-hose Ciccio (no canvas, unit-tested): every frame of every HERO_ALL_ANIMS
 * entry is a Pose in frame world units (64x64, feet at HERO_FRAME.footY, facing right). hero.ts turns a
 * Pose (anatomy.ts) into ink; index.ts lays the frames out in one sheet.
 */
import type { Vec } from '../api';
import { ANKLE_Y, SHOULDER_B, SHOULDER_F, muzzleOf, type Hand, type Limb, type Pose } from './anatomy';
import { HERO_ALL_ANIMS, HERO_ANIM_SPEC, type HeroAnimName } from './config';

const TAU = Math.PI * 2;
const UP = -Math.PI / 2;
/** Splayed stance of the drawing: the back shoe points backwards (angle ~ PI mirrors a shoe). */
const STAND = { front: { x: 41, y: ANKLE_Y, bend: -0.12, angle: 0.06 }, back: { x: 24, y: ANKLE_Y, bend: 0.12, angle: Math.PI - 0.06 } };
const HIP_FIST: Hand = { x: 20, y: 46, bend: 1.1, angle: 0.3, glove: 'fist' };

function base(): Pose {
  return {
    dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, bob: 0, lean: 0, headTilt: 0,
    front: { x: 46, y: 36.5, bend: -0.25, angle: -0.6, glove: 'gun' },
    back: { ...HIP_FIST },
    backOver: true,
    frontLeg: { ...STAND.front },
    backLeg: { ...STAND.back },
    face: 'smirk', brow: 0, pop: 0, glint: -1, stars: -1, speed: 0, sparkle: -1, ticks: false,
  };
}

function idle(f: number, n: number): Pose {
  const p = (f / n) * TAU;
  const b = base();
  const twitch = f === 5 || f === 6;
  return {
    ...b,
    sy: 1 + 0.028 * Math.sin(p),
    sx: 1 - 0.02 * Math.sin(p),
    bob: -0.4 * Math.sin(p - 0.6),
    front: twitch ? { ...b.front, y: b.front.y - 1.4, angle: b.front.angle - 0.4 } : b.front,
  };
}

/** Run legs + bounce; `p` = cycle phase. Arms pump unless the caller replaces them. */
function runBody(p: number): Pose {
  // ground half: the foot slides back; air half: it kicks up behind the body, then reaches forward
  const leg = (q: number, side: number): Limb => {
    const w = ((q % TAU) + TAU) % TAU;
    const u = w > Math.PI ? (w - Math.PI) / Math.PI : 0;
    const lift = 8.5 * Math.sin(Math.PI * u) * (1 - 0.45 * u);
    const push = w <= Math.PI ? 0.6 * Math.max(0, -Math.cos(w)) ** 2 : 0;
    return { x: 32 + side + 9.5 * Math.cos(w), y: ANKLE_Y - lift, bend: -0.12 - 0.06 * lift, angle: -0.07 * lift + push };
  };
  const arm = (s: number, sh: Vec): Hand => ({
    x: sh.x + 1 + (s > 0 ? 7 : 10) * s,
    y: 46.5 - 5.5 * Math.max(0, s) + 1 * Math.max(0, -s),
    bend: s > 0 ? -0.45 : 0.4,
    angle: s > 0 ? 0.1 - 0.6 * s : Math.PI - 0.6 + 0.5 * s,
    glove: 'fist',
  });
  return {
    ...base(),
    bob: 1.6 - 3.2 * Math.abs(Math.sin(p)),
    lean: 0.22,
    sy: 1 + 0.03 * Math.cos(2 * p),
    sx: 1 - 0.022 * Math.cos(2 * p),
    frontLeg: leg(p, 1.5),
    backLeg: leg(p + Math.PI, -1.5),
    front: arm(-Math.cos(p), SHOULDER_F),
    back: arm(Math.cos(p), SHOULDER_B),
    backOver: false,
    brow: -0.6,
  };
}

function run(f: number, n: number): Pose {
  return runBody((f / n) * TAU);
}

function runShoot(f: number, n: number): Pose {
  const p = (f / n) * TAU;
  return { ...runBody(p), front: { x: 47, y: 40 + 0.6 * Math.sin(2 * p), bend: -0.08, angle: -0.12, glove: 'gun' } };
}

type Aim = 'forward' | 'up' | 'diag';
/** Recoil of the 4-frame shooting loops (frame 1 = the shot). */
const kickOf = (f: number): number => (f === 1 ? 1 : f === 2 ? 0.4 : 0);

/** The finger-gun hand for an aim; `kick` 0..1 is the recoil. The fingertips sit on the core's muzzles. */
function gun(aim: Aim, kick: number): Hand {
  if (aim === 'forward') return { x: 47.5 - 1.8 * kick, y: 40.5 - 0.4 * kick, bend: -0.06, angle: -0.04 - 0.2 * kick, glove: 'gun' };
  if (aim === 'up') return { x: 49.5, y: 27.5 + 1.6 * kick, bend: 0.14, angle: UP + 0.1 + 0.15 * kick, glove: 'gun' };
  return { x: 46.5 - 1.2 * kick, y: 34.5 + 1.2 * kick, bend: 0.06, angle: -0.8 - 0.15 * kick, glove: 'gun' };
}

function shoot(f: number): Pose {
  const kick = kickOf(f);
  return { ...base(), lean: -0.04 * kick, sy: 1 - 0.02 * kick, brow: -0.8, front: gun('forward', kick) };
}

function shootUp(f: number): Pose {
  const kick = kickOf(f);
  return { ...base(), lean: -0.06, headTilt: -0.14, brow: -0.6, sy: 1 - 0.02 * kick, front: gun('up', kick) };
}

/** Running with ▲: the run legs, an upright chest and the finger-gun raised at 45°. */
function runShootUp(f: number, n: number): Pose {
  const p = (f / n) * TAU;
  const g = gun('diag', 0);
  return { ...runBody(p), lean: 0.08, headTilt: -0.08, front: { ...g, y: g.y + 0.6 * Math.sin(2 * p), angle: g.angle - 0.08 } };
}

/** Firing in mid-air: legs pedalling under the stretched body, the back hand flung open for balance. */
function airShoot(aim: Aim): (f: number) => Pose {
  return (f: number): Pose => {
    const w = f % 2 === 0 ? 1 : -1;
    const kick = kickOf(f);
    return {
      ...base(),
      sy: 1.04 - 0.02 * kick,
      sx: 0.97,
      lean: aim === 'up' ? -0.06 : -0.03 * kick,
      headTilt: aim === 'forward' ? 0 : -0.1,
      brow: -0.8,
      front: gun(aim, kick),
      back: { x: 19.5 - w, y: 33 + w, bend: 0.25, angle: UP - 0.75 - 0.15 * w, glove: 'open' },
      backOver: false,
      frontLeg: { x: 39.5, y: ANKLE_Y - 3.5 + w, bend: -0.4, angle: 0.15 },
      backLeg: { x: 27, y: ANKLE_Y - 1 - w, bend: 0.2, angle: 0.4 },
    };
  };
}

/** Ball tuck for the jump / parry spin. */
function tuck(rot: number): Pose {
  return {
    ...base(),
    rot,
    dy: -3,
    bob: 5,
    lean: 0.18,
    front: { x: 44, y: 44, bend: -0.4, angle: 0.1, glove: 'fist' },
    back: { x: 38, y: 48, bend: -0.3, angle: 0.5, glove: 'fist' },
    backOver: false,
    frontLeg: { x: 41, y: 50, bend: -0.75, angle: -0.2 },
    backLeg: { x: 34.5, y: 51.5, bend: -0.75, angle: -0.1 },
    face: 'grin',
    brow: 0.8,
  };
}

function jump(f: number, n: number): Pose {
  // the last frame is the upright tuck again: the anim plays once and may hold it
  if (f >= 2) return tuck(((f - 2) / (n - 3)) * TAU);
  const s = f === 0 ? 1 : 0.5;
  return {
    ...base(),
    sy: 1 + 0.18 * s,
    sx: 1 - 0.13 * s,
    front: { x: 47, y: 23, bend: -0.2, angle: UP + 0.45, glove: 'open' },
    back: { x: 19, y: 25, bend: 0.2, angle: UP - 0.5, glove: 'open' },
    backOver: false,
    frontLeg: { x: 34.5, y: ANKLE_Y, bend: -0.05, angle: 0.4 },
    backLeg: { x: 29.5, y: ANKLE_Y - 0.5, bend: 0.05, angle: 0.5 },
    face: 'grin',
    brow: 1.2,
  };
}

function fall(f: number): Pose {
  const w = f % 2 === 0 ? 1 : -1;
  return {
    ...base(),
    sy: 1.04,
    sx: 0.97,
    front: { x: 46 + w, y: 29 - w, bend: -0.25, angle: UP + 0.5 + 0.2 * w, glove: 'open' },
    back: { x: 20 - w, y: 30 + w, bend: 0.25, angle: UP - 0.6 - 0.2 * w, glove: 'open' },
    backOver: false,
    frontLeg: { x: 37.5, y: ANKLE_Y - 1 + w, bend: -0.2, angle: 0.25 },
    backLeg: { x: 27.5, y: ANKLE_Y - 1 - w, bend: 0.15, angle: 0.35 },
    face: 'ouch',
    brow: 1.6,
  };
}

function dash(f: number, n: number): Pose {
  const b = base();
  if (f === 0) return { ...b, lean: -0.2, sx: 0.9, sy: 1.06, brow: -1, front: { x: 44, y: 46, bend: 0.3, angle: 0.4, glove: 'fist' } };
  if (f === n - 1) return { ...b, lean: 0.12, sx: 1.06, sy: 0.96, speed: 0.35, face: 'grin', brow: -1 };
  return {
    ...b,
    dx: -3,
    lean: 0.24,
    sx: 1.18,
    sy: 0.88,
    speed: 1,
    face: 'grin',
    brow: -1.2,
    front: { x: 26, y: 47, bend: 0.3, angle: Math.PI - 0.2, glove: 'fist' },
    back: { x: 19, y: 46, bend: 0.25, angle: Math.PI - 0.1, glove: 'fist' },
    backOver: false,
    frontLeg: { x: 33, y: ANKLE_Y, bend: -0.2, angle: 0 },
    backLeg: { x: 22, y: ANKLE_Y - 1.5, bend: 0.2, angle: 0.4 },
  };
}

function hurt(f: number, n: number): Pose {
  const b = base();
  const flung = {
    front: { x: 46, y: 29, bend: -0.2, angle: UP + 0.7, glove: 'open' as const },
    back: { x: 23, y: 30, bend: 0.2, angle: UP - 0.5, glove: 'open' as const },
    backOver: false,
  };
  if (f === 0) return { ...b, ...flung, dx: 3, lean: -0.2, sx: 1.1, sy: 0.88, pop: 1, face: 'ouch', brow: 2.2, frontLeg: { x: 41, y: ANKLE_Y - 3.5, bend: -0.3, angle: -0.35 } };
  if (f === 1) return { ...b, ...flung, lean: -0.16, sx: 0.92, sy: 1.1, pop: 1, face: 'ouch', brow: 2.4, stars: 0 };
  const k = (f - 1) / (n - 1);
  return { ...b, lean: -0.12 * (1 - k), pop: 1 - k, face: 'ouch', brow: 1.2, stars: k, front: { x: 44, y: 44, bend: -0.3, angle: 0.5, glove: 'open' } };
}

function parry(f: number, n: number): Pose {
  return { ...tuck((f / n) * TAU), sparkle: f / (n - 1) };
}

function superPose(f: number): Pose {
  const b = base();
  const point: Hand = { x: 49, y: 24, bend: 0.1, angle: UP + 0.12, glove: 'point' };
  if (f <= 1) return { ...b, sy: 0.86 - 0.04 * f, sx: 1.1 + 0.02 * f, bob: 1.5, brow: -1, front: { x: 41, y: 48, bend: 0.3, angle: 0.8, glove: 'fist' } };
  if (f === 2) return { ...b, sy: 1.16, sx: 0.88, dy: -2, headTilt: -0.1, face: 'shout', brow: 2, front: point };
  return { ...b, sy: 1.04 - 0.01 * (f - 3), sx: 0.98, headTilt: -0.18, face: 'shout', brow: 2, front: point, ticks: true, glint: f >= 4 && f <= 6 ? (f - 4) / 2 : -1 };
}

function victory(f: number): Pose {
  const b = base();
  if (f >= 8) return { ...b, face: 'grin', ticks: true, glint: (f - 8) / 3, brow: 1 };
  const side = f < 4 ? 1 : -1;
  const s = Math.sin(((f % 4) / 4) * Math.PI);
  const up = (hx: number, hy: number, a: number): Hand => ({ x: hx, y: hy, bend: 0.2 * Math.sign(hx - 32), angle: a, glove: 'open' });
  return {
    ...b,
    dy: -3 * s,
    lean: 0.13 * side,
    sy: 1 + 0.06 * s,
    sx: 1 - 0.04 * s,
    face: 'grin',
    brow: 1.4,
    front: side > 0 ? up(48, 30, UP + 0.6) : up(46, 38, -0.2),
    back: side > 0 ? up(19, 38, Math.PI + 0.2) : up(19, 29, UP - 0.6),
    backOver: false,
    frontLeg: side > 0 ? { x: 43, y: ANKLE_Y - 4 * s, bend: -0.3, angle: -0.4 * s } : { ...STAND.front },
    backLeg: side > 0 ? { ...STAND.back } : { x: 21, y: ANKLE_Y - 4 * s, bend: 0.3, angle: 0.4 * s },
  };
}

function ko(f: number, n: number): Pose {
  const b = base();
  if (f === 0) return { ...b, lean: -0.3, sx: 1.1, sy: 0.9, pop: 1, face: 'ouch', brow: 2.2, front: { x: 46, y: 29, bend: -0.2, angle: UP + 0.6, glove: 'open' }, backOver: false };
  if (f === 1) return { ...b, sx: 0.9, sy: 1.12, dy: -2, pop: 1, face: 'ouch', brow: 2.4, front: { x: 45, y: 26, bend: -0.2, angle: UP + 0.4, glove: 'open' }, backOver: false };
  const flat = f === 2 ? 0.5 : 1;
  return {
    ...b,
    sy: 1 - 0.42 * flat,
    sx: 1 + 0.3 * flat,
    face: 'dizzy',
    brow: 0.6,
    stars: f === 2 ? 0 : (f - 3) / (n - 3),
    front: { x: 41, y: 48, bend: 0.25, angle: 0.9, glove: 'open' },
    back: { x: 23, y: 48, bend: -0.25, angle: Math.PI - 0.9, glove: 'open' },
    backOver: false,
    frontLeg: { x: 43, y: ANKLE_Y, bend: -0.2, angle: 0.2 },
    backLeg: { x: 22, y: ANKLE_Y, bend: 0.2, angle: Math.PI - 0.2 },
  };
}

function intro(f: number, n: number): Pose {
  const b = base();
  if (f <= 1 || f >= n - 1) return idle(f * 2, HERO_ANIM_SPEC.idle.frames);
  if (f === 2) return { ...b, sy: 0.92, sx: 1.06, bob: 1, brow: 1, front: { x: 41, y: 45, bend: 0.3, angle: 0.6, glove: 'gun' } };
  const click = f === 6 ? 1 : 0;
  return {
    ...b,
    sy: f === 3 ? 1.08 : 1,
    sx: f === 3 ? 0.95 : 1,
    dy: f === 3 ? -1.5 : 0,
    face: 'grin',
    brow: 1.2,
    ticks: true,
    glint: f >= 4 && f <= 7 ? (f - 4) / 3 : -1,
    front: { x: 47.5, y: 35 - click, bend: -0.2, angle: -0.38 - 0.25 * click, glove: 'gun' },
  };
}

const POSES: Readonly<Record<HeroAnimName, (f: number, n: number) => Pose>> = {
  intro, idle, run, jump, fall, shoot, shootUp, runShoot, dash, hurt, parry, super: superPose, victory, ko,
  runShootUp, airShoot: airShoot('forward'), airShootUp: airShoot('up'), airShootDiag: airShoot('diag'),
};

/** Every anim in HERO_ALL_ANIMS order (the sheet order). */
export const HERO_ORDER = Object.keys(HERO_ALL_ANIMS) as HeroAnimName[];

export function heroPose(name: HeroAnimName, f: number): Pose {
  return POSES[name](f, HERO_ANIM_SPEC[name].frames);
}

/** First sheet frame of each anim (anims laid out back to back in HERO_ORDER) and the total. */
export function heroLayout(): { start: Readonly<Record<HeroAnimName, number>>; total: number } {
  const start = {} as Record<HeroAnimName, number>;
  let total = 0;
  for (const name of HERO_ORDER) {
    start[name] = total;
    total += HERO_ANIM_SPEC[name].frames;
  }
  return { start, total };
}

/** Shot spawn offsets from the feet anchor (facing right; the core mirrors x when facing left). */
export const HERO_MUZZLE = {
  forward: muzzleOf(heroPose('shoot', 0)),
  up: muzzleOf(heroPose('shootUp', 0)),
  run: muzzleOf(heroPose('runShoot', 0)),
} as const;
