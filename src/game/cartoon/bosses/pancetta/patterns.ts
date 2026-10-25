/**
 * PANCETTA LO SKATER's brain (pure, unit-tested). Phase 0 on the seafront floor: KICKFLIP (he kicks his
 * board across the floor and it comes back), OLLIE (a big ollie onto the hero's spot, shockwaves),
 * PANCETTA AL VENTO (bacon ribbons waving through the air: stand in the dips), RUOTE (skate wheels
 * rolling out). Phase 1 up on the half-pipe in the background: TUFFO (he dives out of the pipe onto the
 * marked spot), BACON DALL'ALTO, PIOGGIA DI RUOTE (wheels raining on marked spots).
 */
import { ARENA, type Box, type Vec } from '../../api';
import { PANCETTA as C } from './config';
import { bounce, chain, leap, lerp, line, sineLine } from '../brie/kit/paths';
import type { AttackPlan, AttackSpec, Brain, HazardPlan, PlanCtx, Pose } from '../brie/kit/timeline';
import { pipeAt, pipeUp } from './pipe';

export type PancettaAttack = 'board' | 'stomp' | 'bacon' | 'wheels' | 'dive' | 'skyBacon' | 'rain';

const F = ARENA.floorY;
const OFF_L = -70;
const OFF_R = ARENA.w + 70;
const P = C.pipe;
const ms = (dist: number, speed: number): number => (Math.abs(dist) / speed) * 1000;
const linear = (u: number): number => u;

/** In the background, standing on the half-pipe (its "up" is the wall's normal). */
export function onPipe(p: Pose): boolean {
  return p.s < P.s + 0.02 && p.x >= P.l - 4 && p.x <= P.r + 4;
}

function upOf(p: Pose): Vec {
  return onPipe(p) ? pipeUp(p.x) : { x: 0, y: -1 };
}

export function restPose(phase: number, phaseMs = 0): Pose {
  if (phase === 0) return { x: C.rest.x + C.rest.amp * Math.sin((phaseMs / C.rest.periodMs) * Math.PI * 2), y: F, s: 1, f: -1 };
  // starts at the right lip, where the transformation lands him
  const a = ((phaseMs - C.transformMs) / P.periodMs) * Math.PI * 2;
  const u = (P.uMin + P.uMax) / 2 + ((P.uMax - P.uMin) / 2) * Math.cos(a);
  return { ...pipeAt(u), s: P.s, f: Math.sin(a) > 0 ? -1 : 1 };
}

/** A point given from the feet (facing left, scale 1) at pose p, along its "up". */
function rigPoint(p: Pose, off: Vec): Vec {
  const up = upOf(p);
  const dir = p.f === -1 ? 1 : -1;
  const right = { x: -up.y, y: up.x };
  return { x: p.x + (right.x * off.x * dir - up.x * off.y) * p.s, y: p.y + (right.y * off.x * dir - up.y * off.y) * p.s };
}

function landing(spot: Vec, w: { w: number; h: number; speed: number; gap: number }, atMs: number): HazardPlan[] {
  return ([-1, 1] as const).map((dir) => {
    const x0 = spot.x + dir * w.gap;
    return { atMs, kind: 'wave', w: w.w, h: w.h, lifeMs: ms((dir < 0 ? OFF_L : OFF_R) - x0, w.speed), path: line(x0, F - w.h / 2, dir * w.speed) };
  });
}

function planBoard(ctx: PlanCtx): AttackPlan {
  const b = C.board;
  const start = { x: ctx.from.x + b.startDx, y: F - b.lift };
  const wall = { x: b.wallX, y: F - b.lift };
  const t = ms(start.x - wall.x, b.speed);
  return {
    hazards: [{ atMs: 0, kind: 'flip', w: b.w, h: b.h, lifeMs: t * 2, path: chain([{ ms: t, path: lerp(start, wall, t, linear) }, { ms: t, path: lerp(wall, start, t, linear) }]) }],
    marks: [],
    cues: [{ atMs: t, sfx: 'blast', shake: 2 }],
  };
}

interface Leaper {
  minX: number;
  maxX: number;
  outMs: number;
  apex: number;
  holdMs: number;
  backMs: number;
  backApex: number;
  wave: { w: number; h: number; speed: number; gap: number };
  shake: number;
}

/** Leap onto the hero's spot (scale toward 1), shockwaves, then leap to `home` (scale homeS). */
function planLeap(ctx: PlanCtx, l: Leaper, home: Vec, homeS: number): AttackPlan {
  const tx = Math.max(l.minX, Math.min(l.maxX, ctx.playerX));
  const spot = { x: tx, y: F };
  const out = leap(ctx.from, spot, l.outMs, l.apex);
  const back = leap(spot, home, l.backMs, l.backApex);
  const backAt = l.outMs + l.holdMs;
  const s0 = ctx.from.s;
  return {
    hazards: landing(spot, l.wave, l.outMs),
    marks: [spot],
    marksMs: l.outMs,
    move: (t) => {
      if (t < l.outMs) return { ...out(t), s: s0 + (1 - s0) * (t / l.outMs), f: -1 };
      if (t < backAt) return { ...spot, s: 1, f: -1 };
      const u = Math.min(1, (t - backAt) / l.backMs);
      return { ...back(t - backAt), s: 1 + (homeS - 1) * u, f: u < 1 ? 1 : -1 };
    },
    cues: [
      { atMs: l.outMs, sfx: 'blast', shake: l.shake },
      { atMs: backAt + l.backMs, sfx: 'blast', shake: l.shake / 3 },
    ],
  };
}

interface Ribbons {
  count: number;
  everyMs: number;
  entryMs: number;
  entryX: number;
  speed: number;
  yc: number;
  amp: number;
  wavelength: number;
  r: number;
  pinkIndex: number;
}

/** Bacon ribbons: from the hand to the entry point, then waving left (a sine fixed in space: stand in the dips). */
function planBacon(from: Vec, b: Ribbons): AttackPlan {
  const hazards = Array.from({ length: b.count }, (_, i): HazardPlan => {
    const phase = i % 2 ? Math.PI : 0;
    const entry = { x: b.entryX, y: b.yc + b.amp * Math.sin(phase) };
    return {
      atMs: i * b.everyMs,
      kind: i === b.pinkIndex ? 'baconPink' : 'bacon',
      pink: i === b.pinkIndex,
      r: b.r,
      aim: true,
      lifeMs: b.entryMs + ms(b.entryX - OFF_L, b.speed),
      path: chain([
        { ms: b.entryMs, path: lerp(from, entry, b.entryMs) },
        { ms: 1e6, path: sineLine(b.entryX, b.yc, -b.speed, b.amp, b.wavelength, phase) },
      ]),
    };
  });
  return { hazards, marks: [], cues: hazards.map((h) => ({ atMs: h.atMs, sfx: 'lob' as const })) };
}

function planWheels(ctx: PlanCtx): AttackPlan {
  const w = C.wheels;
  const x0 = ctx.from.x + w.dx;
  const y0 = F - w.r - w.lift;
  const hazards = Array.from({ length: w.count }, (_, i): HazardPlan => ({
    atMs: i * w.everyMs,
    kind: 'wheel',
    frame: i === w.pinkIndex ? 1 : 0,
    pink: i === w.pinkIndex,
    r: w.r,
    spin: w.spin,
    lifeMs: ms(x0 - OFF_L, w.speed),
    path: bounce(x0, y0, -w.speed, w.popVy, w.g, F - w.r, w.hopVy),
  }));
  return { hazards, marks: [], cues: [] };
}

function planRain(ctx: PlanCtx): AttackPlan {
  const r = C.rain;
  const x1 = Math.max(r.minX, Math.min(r.maxX, ctx.playerX));
  const spots = [0, 1, -1, 2, -2, 3, -3]
    .map((i) => x1 + i * r.spacing)
    .filter((x) => x >= r.minX && x <= r.maxX)
    .slice(0, r.count);
  const from = rigPoint(ctx.from, C.rig.bgHand);
  const hazards = spots.map((x, i): HazardPlan => {
    const at = { x, y: F - r.r };
    return {
      atMs: i * r.everyMs,
      kind: 'wheel',
      frame: i === r.pinkIndex ? 1 : 0,
      pink: i === r.pinkIndex,
      r: r.r,
      spin: r.spin,
      lifeMs: r.flightMs + r.hopMs,
      path: chain([
        { ms: r.flightMs, path: leap(from, at, r.flightMs, r.apex) },
        { ms: r.hopMs, path: bounce(x, at.y, 0, -r.hopVy, r.g, at.y, r.hopVy) },
      ]),
    };
  });
  return {
    hazards,
    marks: spots.map((x) => ({ x, y: F })),
    marksMs: (spots.length - 1) * r.everyMs + r.flightMs,
    cues: spots.map((_, i) => ({ atMs: i * r.everyMs + r.flightMs, sfx: 'blast' as const, shake: 2 })),
  };
}

const B = C.board;
const S = C.stomp;
const BA = C.bacon;
const SB = C.skyBacon;
const W = C.wheels;
const D = C.dive;
const R = C.rain;
const boardMs = 2 * ms(C.rest.x + C.rest.amp + B.startDx - B.wallX, B.speed);
const waveMs = (minX: number, w: { speed: number; gap: number }): number => ms(OFF_R - minX - w.gap, w.speed);

export const PANCETTA_ATTACKS: readonly AttackSpec<PancettaAttack>[] = [
  { id: 'board', telegraphMs: B.teleMs, activeMs: boardMs + 50, recoverMs: B.recoverMs, phases: [0], weight: 3 },
  { id: 'stomp', telegraphMs: S.teleMs, activeMs: S.outMs + waveMs(S.minX, S.wave) + 50, recoverMs: S.recoverMs, phases: [0], weight: 3 },
  { id: 'bacon', telegraphMs: BA.teleMs, activeMs: (BA.count - 1) * BA.everyMs + BA.entryMs + ms(BA.entryX - OFF_L, BA.speed) + 50, recoverMs: BA.recoverMs, phases: [0], weight: 2 },
  { id: 'wheels', telegraphMs: W.teleMs, activeMs: (W.count - 1) * W.everyMs + ms(C.rest.x + C.rest.amp + W.dx - OFF_L, W.speed) + 50, recoverMs: W.recoverMs, phases: [0], weight: 2 },
  { id: 'dive', telegraphMs: D.teleMs, activeMs: Math.max(D.outMs + D.holdMs + D.backMs, D.outMs + waveMs(D.minX, D.wave)) + 50, recoverMs: D.recoverMs, phases: [1], weight: 3 },
  { id: 'skyBacon', telegraphMs: SB.teleMs, activeMs: (SB.count - 1) * SB.everyMs + SB.entryMs + ms(SB.entryX - OFF_L, SB.speed) + 50, recoverMs: SB.recoverMs, phases: [1], weight: 2 },
  { id: 'rain', telegraphMs: R.teleMs, activeMs: (R.count - 1) * R.everyMs + R.flightMs + R.hopMs + 50, recoverMs: R.recoverMs, phases: [1], weight: 2 },
];

function boxAt(b: Box, p: Pose): Box {
  const x = p.f === -1 ? b.x : -(b.x + b.w);
  return { x: p.x + x * p.s, y: p.y + b.y * p.s, w: b.w * p.s, h: b.h * p.s };
}

export const PANCETTA_BRAIN: Brain<PancettaAttack> = {
  attacks: PANCETTA_ATTACKS,
  introMs: C.introMs,
  transformMs: C.transformMs,
  koMs: C.koMs,
  openers: { 0: 'board', 1: 'skyBacon' },
  plan(id, ctx) {
    switch (id) {
      case 'board':
        return planBoard(ctx);
      case 'stomp':
        return planLeap(ctx, S, { x: ctx.from.x, y: F }, 1);
      case 'bacon':
        return planBacon(rigPoint(ctx.from, C.rig.hand), BA);
      case 'wheels':
        return planWheels(ctx);
      case 'dive':
        return planLeap(ctx, D, pipeAt(D.backU), P.s);
      case 'skyBacon':
        return planBacon(rigPoint(ctx.from, C.rig.bgHand), SB);
      case 'rain':
        return planRain(ctx);
    }
  },
  rest: restPose,
  resume(phase, p) {
    // back on the right lip after a dive: the half-pipe loop restarts from there
    return phase === 1 && onPipe(p) ? C.transformMs : null;
  },
  transformPose(t, from) {
    const T = C.transform;
    const lip = pipeAt(T.u);
    if (t >= T.leapMs) return { ...lip, s: P.s, f: -1 };
    const u = t / T.leapMs;
    return { ...leap(from, lip, T.leapMs, T.apex)(t), s: from.s + (P.s - from.s) * u, f: 1 };
  },
  koPose(t, from) {
    const K = C.ko;
    const land = { x: Math.max(K.minX, Math.min(K.maxX, from.x)), y: F };
    if (from.s > C.box.bg.solidAt) {
      const u = Math.min(1, t / 300);
      return { x: from.x, y: from.y + (F - from.y) * u * u, s: from.s, f: from.f };
    }
    const u = Math.min(1, t / K.fallMs);
    return { ...leap(from, land, K.fallMs, K.apex)(Math.min(t, K.fallMs)), s: from.s + (1 - from.s) * u, f: from.f };
  },
  boxes(p) {
    const bg = C.box.bg;
    if (p.s > bg.solidAt) {
      const b = boxAt(C.box.body, p);
      return { hurt: [b], body: [b] };
    }
    const up = upOf(p);
    const c = { x: p.x + up.x * bg.up * p.s, y: p.y + up.y * bg.up * p.s };
    const half = (bg.size * p.s) / 2 + bg.pad;
    return { hurt: [{ x: c.x - half, y: c.y - half, w: half * 2, h: half * 2 }], body: [] };
  },
};

