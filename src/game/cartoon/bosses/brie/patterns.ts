/**
 * MONSIEUR BRIE's brain (pure, unit-tested): what each attack throws, where and when, how he moves.
 * Phase 0 on the bicycle: BAGUETTE (low javelins along the road), RUOTE (brie wheels rolling out of the
 * basket), CARICA (bell, wheelie, a leap across the arena and back), BERRETTO (beret boomerang: low out,
 * high back). Phase 1 on foot, melting: SALTO (hop on the hero's spot, cheese waves), GIAVELLOTTI
 * (baguettes stuck in the marked spots), RAFFICA (low / high baguettes), RIMBALZI (bouncing wheels).
 */
import { ARENA, type Box, type Vec } from '../../api';
import { BRIE as C } from './config';
import { bounce, chain, easeOut, hold, leap, lerp, line, orbit } from './kit/paths';
import type { AttackPlan, AttackSpec, Brain, HazardPlan, PlanCtx, Pose } from './kit/timeline';

export type BrieAttack = 'baguette' | 'wheels' | 'charge' | 'beret' | 'hop' | 'javelin' | 'volley' | 'bounce';

const F = ARENA.floorY;
/** a hazard is gone once it is this far past the left / right edge */
const OFF_L = -70;
const OFF_R = ARENA.w + 70;
const linear = (u: number): number => u;
const ms = (dist: number, speed: number): number => (Math.abs(dist) / speed) * 1000;

export function restPose(phase: number, clockMs = 0): Pose {
  const r = C.rest[Math.min(phase, 1)] ?? C.rest[0];
  return { x: r.x + C.drift.amp * Math.sin((clockMs / C.drift.periodMs) * Math.PI * 2), y: r.y, s: 1, f: -1 };
}

/** A rig point given from the feet (local, facing left) at pose p. */
function fromFeet(p: Pose, off: Vec): Vec {
  const dir = p.f === -1 ? 1 : -1;
  return { x: p.x + off.x * dir * p.s, y: p.y + off.y * p.s };
}

/** A rig point given from the wedge's bottom centre at pose p. */
function local(p: Pose, phase: number, off: Vec): Vec {
  const w = phase === 0 ? C.rig.bikeWedge : C.rig.footWedge;
  return fromFeet(p, { x: w.x + off.x, y: w.y + off.y });
}

const hand = (p: Pose, phase: number, h: Vec): Vec =>
  local(p, phase, { x: C.rig.shoulder.x + h.x, y: C.rig.shoulder.y + h.y });

function plain(hazards: HazardPlan[], marks: Vec[] = []): AttackPlan {
  return { hazards, marks, cues: [] };
}

/** A baguette thrown from the hand that dips to its lane (low = jump it, high = stay down) and flies left. */
function baguette(from: Vec, lane: 'low' | 'high', atMs: number, speed: number, pink: boolean): HazardPlan {
  const b = C.baguette;
  const y = F - (lane === 'low' ? b.low : b.high);
  return {
    atMs,
    kind: 'baguette',
    frame: pink ? 1 : 0,
    pink,
    w: b.w,
    h: b.h,
    lifeMs: b.dipMs + ms(b.laneX - OFF_L, speed),
    path: chain([
      { ms: b.dipMs, path: lerp(from, { x: b.laneX, y }, b.dipMs, easeOut) },
      { ms: 1e6, path: line(b.laneX, y, -speed) },
    ]),
  };
}

function planBaguette(ctx: PlanCtx): AttackPlan {
  const h = hand(ctx.from, 0, C.rig.throwHand);
  const b = C.baguette;
  return plain(Array.from({ length: b.count }, (_, i) => baguette(h, 'low', i * b.everyMs, b.speed, i === b.count - 1)));
}

function planVolley(ctx: PlanCtx): AttackPlan {
  const h = hand(ctx.from, 1, C.rig.throwHand);
  const v = C.volley;
  return plain(v.order.map((lane, i) => baguette(h, lane, i * v.everyMs, C.baguette.speed + 40, i === v.order.length - 1)));
}

interface WheelCfg {
  count: number;
  everyMs: number;
  speed: number;
  r: number;
  g: number;
  popVy: number;
  hopVy: number;
  spin: number;
  pinkIndex: number;
}

function wheels(from: Vec, w: WheelCfg): HazardPlan[] {
  return Array.from({ length: w.count }, (_, i) => ({
    atMs: i * w.everyMs,
    kind: 'wheel',
    frame: i === w.pinkIndex ? 1 : 0,
    pink: i === w.pinkIndex,
    r: w.r,
    spin: w.spin,
    lifeMs: ms(from.x - OFF_L, w.speed),
    path: bounce(from.x, from.y, -w.speed, w.popVy, w.g, F - w.r, w.hopVy),
  }));
}

function planCharge(ctx: PlanCtx): AttackPlan {
  const c = C.charge;
  const home = { x: ctx.from.x, y: F };
  const start = { x: c.rollTo, y: F };
  const land = { x: c.landX, y: F };
  const path = chain([
    { ms: c.rollMs, path: lerp(home, start, c.rollMs) },
    { ms: c.leapMs, path: leap(start, land, c.leapMs, c.apex) },
    { ms: c.turnMs, path: hold(land) },
    { ms: c.leapMs, path: leap(land, home, c.leapMs, c.apex) },
    { ms: c.settleMs, path: hold(home) },
  ]);
  const turn = c.rollMs + c.leapMs + c.turnMs / 2;
  const back = c.rollMs + c.leapMs * 2 + c.turnMs;
  return {
    hazards: [],
    marks: [land],
    marksMs: c.rollMs + c.leapMs,
    move: (t) => ({ ...path(t), s: 1, f: t > turn && t < back ? 1 : -1 }),
    cues: [
      { atMs: c.rollMs + c.leapMs, sfx: 'blast', shake: c.shake },
      { atMs: back, sfx: 'blast', shake: c.shake / 2 },
    ],
    sfx: 'roundBell',
  };
}

function planBeret(ctx: PlanCtx): AttackPlan {
  const b = C.beret;
  const tip = hand(ctx.from, 0, C.rig.twirlHand);
  const low = F - b.low;
  const high = F - b.high;
  const home = local(ctx.from, 0, C.rig.beret);
  const parts = [
    { ms: b.diveMs, path: lerp(tip, { x: b.diveTo, y: low }, b.diveMs, easeOut) },
    { ms: b.outMs, path: lerp({ x: b.diveTo, y: low }, { x: b.farX, y: low }, b.outMs, linear) },
    { ms: b.turnMs, path: orbit({ x: b.farX, y: (low + high) / 2 }, 30, (low - high) / 2, Math.PI / 2, (Math.PI * 3) / 2, b.turnMs) },
    { ms: b.backMs, path: lerp({ x: b.farX, y: high }, { x: b.backTo, y: high }, b.backMs, linear) },
    { ms: b.homeMs, path: lerp({ x: b.backTo, y: high }, home, b.homeMs) },
  ];
  const life = parts.reduce((a, p) => a + p.ms, 0);
  return plain([{ atMs: 0, kind: 'beret', r: b.r, spin: b.spin, lifeMs: life, path: chain(parts) }]);
}

function planHop(ctx: PlanCtx): AttackPlan {
  const h = C.hop;
  const tx = Math.max(h.minX, Math.min(h.maxX, ctx.playerX));
  const home = { x: ctx.from.x, y: F };
  const spot = { x: tx, y: F };
  const path = chain([
    { ms: h.outMs, path: leap(home, spot, h.outMs, h.apex) },
    { ms: h.holdMs, path: hold(spot) },
    { ms: h.backMs, path: leap(spot, home, h.backMs, h.backApex) },
  ]);
  const wy = F - h.wave.h / 2;
  const wave = (dir: 1 | -1): HazardPlan => {
    const x0 = tx + dir * h.wave.gap;
    return {
      atMs: h.outMs,
      kind: 'wave',
      w: h.wave.w,
      h: h.wave.h,
      lifeMs: ms((dir < 0 ? OFF_L : OFF_R) - x0, h.wave.speed),
      path: line(x0, wy, dir * h.wave.speed),
    };
  };
  const back = h.outMs + h.holdMs;
  return {
    hazards: [wave(-1), wave(1)],
    marks: [spot],
    marksMs: h.outMs,
    move: (t) => ({ ...path(t), s: 1, f: t > back && t < back + h.backMs ? 1 : -1 }),
    cues: [
      { atMs: h.outMs, sfx: 'blast', shake: h.shake },
      { atMs: back + h.backMs, sfx: 'blast', shake: h.shake / 2 },
    ],
  };
}

function planJavelin(ctx: PlanCtx): AttackPlan {
  const j = C.javelin;
  const x1 = Math.max(j.minX, Math.min(j.maxX, ctx.playerX));
  const spots = [0, -1, 1, -2, 2]
    .map((i) => x1 + i * j.spacing)
    .filter((x) => x >= j.minX && x <= j.maxX)
    .slice(0, j.count);
  const from = hand(ctx.from, 1, C.rig.bundleHand);
  const hazards = spots.map((x, i): HazardPlan => {
    const at = { x, y: F - j.stuckLift };
    return {
      atMs: i * j.everyMs,
      kind: 'baguette',
      frame: i === j.pinkIndex ? 1 : 0,
      pink: i === j.pinkIndex,
      r: j.r,
      aim: true,
      lifeMs: j.flightMs + j.stickMs,
      path: chain([
        { ms: j.flightMs, path: leap(from, at, j.flightMs, j.apex) },
        { ms: j.stickMs, path: hold(at) },
      ]),
    };
  });
  return {
    hazards,
    marks: spots.map((x) => ({ x, y: F })),
    cues: spots.map((_, i) => ({ atMs: i * j.everyMs, sfx: 'lob' as const })),
  };
}

const B = C.baguette;
const W = C.wheels;
const R = C.bounce;
const CH = C.charge;
const BE = C.beret;
const J = C.javelin;

export const BRIE_ATTACKS: readonly AttackSpec<BrieAttack>[] = [
  { id: 'baguette', telegraphMs: B.teleMs, activeMs: (B.count - 1) * B.everyMs + B.dipMs + ms(B.laneX - OFF_L, B.speed) + 50, recoverMs: B.recoverMs, phases: [0], weight: 3 },
  { id: 'wheels', telegraphMs: W.teleMs, activeMs: (W.count - 1) * W.everyMs + ms(C.rest[0].x + C.drift.amp + C.rig.basket.x - OFF_L, W.speed) + 50, recoverMs: W.recoverMs, phases: [0], weight: 3 },
  { id: 'charge', telegraphMs: CH.teleMs, activeMs: CH.rollMs + CH.leapMs * 2 + CH.turnMs + CH.settleMs, recoverMs: CH.recoverMs, phases: [0], weight: 2 },
  { id: 'beret', telegraphMs: BE.teleMs, activeMs: BE.diveMs + BE.outMs + BE.turnMs + BE.backMs + BE.homeMs + 50, recoverMs: BE.recoverMs, phases: [0], weight: 2 },
  { id: 'hop', telegraphMs: C.hop.teleMs, activeMs: C.hop.outMs + ms(OFF_R - C.hop.minX, C.hop.wave.speed) + 50, recoverMs: C.hop.recoverMs, phases: [1], weight: 3 },
  { id: 'javelin', telegraphMs: J.teleMs, activeMs: (J.count - 1) * J.everyMs + J.flightMs + J.stickMs + 50, recoverMs: J.recoverMs, phases: [1], weight: 3 },
  { id: 'volley', telegraphMs: C.volley.teleMs, activeMs: (C.volley.order.length - 1) * C.volley.everyMs + B.dipMs + ms(B.laneX - OFF_L, B.speed + 40) + 50, recoverMs: C.volley.recoverMs, phases: [1], weight: 2 },
  { id: 'bounce', telegraphMs: R.teleMs, activeMs: (R.count - 1) * R.everyMs + ms(R.spawnX - OFF_L, R.speed) + 50, recoverMs: R.recoverMs, phases: [1], weight: 2 },
];

function boxAt(b: Box, p: Pose): Box {
  const x = p.f === -1 ? b.x : -(b.x + b.w);
  return { x: p.x + x * p.s, y: p.y + b.y * p.s, w: b.w * p.s, h: b.h * p.s };
}

export const BRIE_BRAIN: Brain<BrieAttack> = {
  attacks: BRIE_ATTACKS,
  introMs: C.introMs,
  transformMs: C.transformMs,
  koMs: C.koMs,
  openers: { 0: 'baguette', 1: 'hop' },
  plan(id, ctx) {
    switch (id) {
      case 'baguette':
        return planBaguette(ctx);
      case 'wheels':
        return plain(wheels(fromFeet(ctx.from, C.rig.basket), W));
      case 'charge':
        return planCharge(ctx);
      case 'beret':
        return planBeret(ctx);
      case 'hop':
        return planHop(ctx);
      case 'javelin':
        return planJavelin(ctx);
      case 'volley':
        return planVolley(ctx);
      case 'bounce':
        return plain(wheels({ x: R.spawnX, y: F - R.r - R.spawnLift }, R));
    }
  },
  rest: restPose,
  transformPose(t, from) {
    const T = C.transform;
    const skid = { x: from.x - T.skidBack, y: F };
    if (t < T.skidMs) return { ...lerp(from, skid, T.skidMs, easeOut)(t), s: 1, f: -1 };
    const lift = { x: skid.x + C.rig.bikeWedge.x - C.rig.footWedge.x, y: F + C.rig.bikeWedge.y - C.rig.footWedge.y };
    return { ...leap(lift, restPose(1), T.flyMs, T.apex)(t - T.skidMs), s: 1, f: -1 };
  },
  koPose(t, from) {
    const u = Math.min(1, t / 300);
    return { x: from.x, y: from.y + (F - from.y) * u * u, s: from.s, f: from.f };
  },
  boxes(p, phase) {
    // the rider first: the core anchors speech balloons and homing shots on the first hurt box
    const list = phase === 0 ? [C.box.rider, C.box.bike] : [C.box.foot];
    const out = list.map((b) => boxAt(b, p));
    return { hurt: out, body: out };
  },
};
