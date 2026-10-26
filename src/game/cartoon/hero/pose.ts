/**
 * Every frame of every HERO_ALL_ANIMS entry as a rig Pose (pure maths, unit-tested). Frame 0 of idle is the
 * owner's drawing untouched; the other poses bend its joints. index.ts lays the frames out in one sheet.
 */
import type { Vec } from '../api';
import { HERO_ALL_ANIMS, HERO_ANIM_SPEC, type HeroAnimName } from './config';
import { JOINTS } from './parts';
import { FOOT, apply, bones, fingertip, restPose, type Pose } from './rig';

const TAU = Math.PI * 2;
const ease = (t: number): number => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

type Aim = 'forward' | 'up' | 'diag';
/** finger-gun arms: the glove turns so the index points along the aim; the reach keeps it clear of the face */
const AIM: Readonly<Record<Aim, Partial<Pose>>> = {
  forward: { gun: 0.42, wrist: -0.42, reachX: 1.6, reachY: 1.2 },
  up: { gun: -0.8, wrist: Math.PI / 2 + 0.8, flip: true },
  diag: { gun: -0.2, wrist: -0.585, reachX: 4, reachY: 0.5 },
};
const SOLE_BACK = [JOINTS.soleBackToe, JOINTS.soleBackHeel];
const SOLE_FRONT = [JOINTS.soleFrontHeel, JOINTS.soleFrontToe];
/** moves the pose up / down so the lowest sole stands on the floor (swinging legs never sink into it) */
function grounded(p: Pose): Pose {
  const b = bones(p);
  const low = Math.max(...(p.stride ? SOLE_FRONT : SOLE_BACK).map((v) => apply(b.backLeg, v).y), ...SOLE_FRONT.map((v) => apply(b.frontLeg, v).y));
  return { ...p, dy: p.dy + FOOT.y - low };
}

/** recoil of the 4-frame shooting loops (frame 1 = the shot) */
const kickOf = (f: number): number => (f === 1 ? 1 : f === 2 ? 0.4 : 0);

/** the recoil pushes the hand back along the aim */
const KICK: Readonly<Record<Aim, Vec>> = { forward: { x: -1.1, y: 0 }, up: { x: 0, y: 1.1 }, diag: { x: -0.6, y: 0.6 } };

function aimed(aim: Aim, kick: number): Partial<Pose> {
  const a = AIM[aim];
  return { ...a, wrist: (a.wrist ?? 0) - 0.12 * kick, reachX: (a.reachX ?? 0) + KICK[aim].x * kick, reachY: (a.reachY ?? 0) + KICK[aim].y * kick };
}

function idle(f: number, n: number): Pose {
  const s = Math.sin((f / n) * TAU);
  return { ...restPose(), sy: 1 + 0.018 * s, sx: 1 - 0.012 * s, head: 0.025 * s, gun: -0.035 * s, hip: 0.02 * s };
}

/** strut: both shoes forward, legs swinging from the hips, the fist stays on the hip */
function runBody(p: number): Pose {
  const swing = 0.62;
  const lift = (q: number): number => -3.2 * Math.max(0, Math.sin(q));
  return {
    ...restPose(),
    stride: true,
    lean: 0.1,
    sy: 1 + 0.025 * Math.cos(2 * p),
    sx: 1 - 0.018 * Math.cos(2 * p),
    legF: -swing * Math.cos(p) + 0.15,
    legB: swing * Math.cos(p) + 0.15,
    liftF: lift(p),
    liftB: lift(p + Math.PI),
    head: -0.05 + 0.03 * Math.sin(2 * p),
    hip: 0.08 * Math.cos(p),
    gun: 0.35 + 0.3 * Math.cos(p),
    wrist: -0.2,
  };
}

const cycle = (f: number, n: number): number => (f / n) * TAU;
const run = (f: number, n: number): Pose => grounded(runBody(cycle(f, n)));
const runShoot = (f: number, n: number): Pose => grounded({ ...runBody(cycle(f, n)), ...aimed('forward', 0) });
const runShootUp = (f: number, n: number): Pose => grounded({ ...runBody(cycle(f, n)), ...aimed('diag', 0) });
const shoot = (f: number): Pose => ({ ...restPose(), ...aimed('forward', kickOf(f)), dx: -0.5 * kickOf(f), sy: 1 - 0.015 * kickOf(f) });
const shootUp = (f: number): Pose => ({ ...restPose(), head: -0.1, lean: -0.04, ...aimed('up', kickOf(f)), sy: 1 - 0.015 * kickOf(f) });

/** in the air: legs together and a little tucked, fluttering */
function airBody(f: number): Pose {
  const w = f % 2 === 0 ? 1 : -1;
  return { ...restPose(), legF: -0.25 + 0.06 * w, legB: -0.55 - 0.06 * w, liftF: -1.5, liftB: -1, hip: 0.35, sy: 1.02, sx: 0.98 };
}
const airShoot = (aim: Aim) => (f: number): Pose => ({ ...airBody(f), ...aimed(aim, kickOf(f)), head: aim === 'forward' ? 0 : -0.08 });
const fall = (f: number): Pose => ({ ...airBody(f), gun: -0.5, wrist: 0.3, hip: 0.6 });

/** launch, tuck into a ball, one forward somersault, open up */
function jump(f: number, n: number): Pose {
  if (f === 0) return { ...restPose(), sy: 1.08, sx: 0.94, legF: 0.25, legB: -0.25, hip: 0.4, gun: -0.6 };
  const t = (f - 1) / (n - 2);
  const tuck = Math.sin(Math.min(1, t * 1.15) * Math.PI);
  return {
    ...restPose(),
    rot: ease(Math.min(1, t * 1.1)) * TAU,
    sx: 1 - 0.14 * tuck,
    sy: 1 - 0.14 * tuck,
    legF: -1.1 * tuck,
    legB: -1.4 * tuck,
    liftF: -6 * tuck,
    liftB: -6 * tuck,
    hip: 0.5 * tuck,
    gun: 0.9 * tuck,
    wrist: 0.4 * tuck,
    head: 0.15 * tuck,
  };
}

function dash(f: number, n: number): Pose {
  const t = f / (n - 1);
  const go = t < 0.75 ? 1 : 1 - (t - 0.75) / 0.25;
  return { ...restPose(), lean: 0.3 * go, sx: 1 + 0.16 * go, sy: 1 - 0.1 * go, legF: 0.55 * go, legB: 0.9 * go, liftF: -2 * go, liftB: -3 * go, hip: 0.25 * go, gun: 0.75 * go, wrist: 0.3 * go, head: 0.12 * go, smear: go };
}

function hurt(f: number, n: number): Pose {
  const t = f / (n - 1);
  const k = f === 0 ? 0.6 : 1 - ease(Math.max(0, (t - 0.25) / 0.75));
  return { ...restPose(), dx: -2.4 * k, lean: -0.32 * k, head: -0.25 * k, sy: 1 - 0.07 * k, sx: 1 + 0.05 * k, hip: 1.1 * k, gun: -1.2 * k, wrist: -0.4 * k, legF: -0.35 * k, legB: 0.25 * k, stars: f >= 1 ? t : -1 };
}

function parry(f: number, n: number): Pose {
  const t = f / (n - 1);
  const tuck = Math.sin(t * Math.PI);
  return { ...restPose(), rot: ease(t) * TAU, sx: 1 - 0.15 * tuck, sy: 1 - 0.15 * tuck, legF: -0.9 * tuck, legB: -1.2 * tuck, liftF: -5 * tuck, liftB: -5 * tuck, hip: 0.6 * tuck, gun: -0.8 * tuck, pink: t };
}

/** wind up, then point at the sky: PIOGGIA DI PATATINE */
function superPose(f: number, n: number): Pose {
  if (f < 3) {
    const w = (f + 1) / 3;
    return { ...restPose(), sy: 1 - 0.07 * w, sx: 1 + 0.04 * w, gun: 0.6 * w, wrist: -0.2 * w, head: 0.08 * w };
  }
  const t = (f - 3) / (n - 4);
  return { ...restPose(), ...aimed('up', 0), sy: 1.04, sx: 0.97, lean: -0.08, head: -0.16, hip: 0.08 * Math.sin(t * TAU), ticks: t, glint: t };
}

/** a little dance: heel kicks, a finger-gun to the camera on the beat, the hand on the hip */
function victory(f: number, n: number): Pose {
  const p = cycle(f, n) * 2;
  const beat = f % 3 === 1 ? 1 : 0;
  return {
    ...restPose(),
    dy: -2.2 * Math.abs(Math.sin(p)),
    rot: 0.07 * Math.sin(p),
    legF: -0.35 * Math.max(0, Math.sin(p)),
    legB: 0.35 * Math.max(0, -Math.sin(p)),
    liftF: -2.5 * Math.max(0, Math.sin(p)),
    liftB: -2.5 * Math.max(0, -Math.sin(p)),
    head: 0.08 * Math.sin(p),
    gun: -0.25 * beat,
    wrist: -0.15 * beat,
    ticks: f >= n - 5 ? (f - (n - 5)) / 4 : -1,
    glint: f >= n - 4 ? (f - (n - 4)) / 3 : -1,
  };
}

/** staggers, tips over backwards and lies flat with stars round his head */
function ko(f: number, n: number): Pose {
  const t = Math.min(1, f / (n - 3));
  const fallT = ease(t);
  return {
    ...restPose(),
    rot: -lerp(0, Math.PI / 2, fallT),
    dy: 2 * fallT,
    dx: 4 * fallT,
    sy: 1 - 0.06 * fallT,
    head: -0.2 * fallT,
    hip: -0.6 * fallT,
    gun: 1.3 * fallT,
    wrist: 0.6 * fallT,
    legF: -0.35 * fallT,
    legB: -0.1 * fallT,
    stars: f >= n - 3 ? (f - (n - 3)) / 3 : -1,
  };
}

/** the round start: a finger-gun "bang" at the camera, glint on the glasses, the drawing's motion ticks */
function intro(f: number, n: number): Pose {
  const bang = f === 4 ? 1 : f === 5 ? 0.5 : 0;
  const wind = f >= 1 && f <= 3 ? f / 3 : 0;
  return {
    ...restPose(),
    gun: 0.18 * wind - 0.12 * bang,
    wrist: 0.1 * wind - 0.22 * bang,
    lean: -0.04 * wind,
    head: 0.05 * wind,
    sy: 1 - 0.03 * bang,
    ticks: f >= 4 ? (f - 4) / (n - 5) : -1,
    glint: f >= 5 && f <= 8 ? (f - 5) / 3 : -1,
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

const fromFeet = (v: Vec): Vec => ({ x: v.x - FOOT.x, y: v.y - FOOT.y });
/** Shot spawn offsets from the feet anchor = the drawing's fingertip in each aim (facing right; the core mirrors x). */
export const HERO_MUZZLE = {
  forward: fromFeet(fingertip(heroPose('shoot', 0))),
  up: fromFeet(fingertip(heroPose('shootUp', 0))),
  run: fromFeet(fingertip(heroPose('runShoot', 0))),
} as const;
