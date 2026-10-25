/**
 * Pure attack planner of IL BOSS DELLA BURGER GANG. A ROUND is a short timeline computed when it starts
 * (boss poses, floor marks, shots with closed-form paths) from the boss stage and the player x. No Phaser:
 * runtime.ts plays it, plan.test.ts proves every round telegraphs >= 500 ms and can be survived.
 */
import type { SfxName } from '../../../../contracts';
import { ARENA, type Vec } from '../../api';
import { ATK, BG, BOXES, EMIT, SFX } from './config';

const F = ARENA.floorY;
const TAU = Math.PI * 2;

export type ShotKind = 'bubble' | 'shades' | 'can' | 'fizz' | 'drop' | 'wave' | 'brick' | 'burger' | 'fries';
export type Pose = 'idle' | 'shake' | 'spray' | 'windup' | 'throw' | 'twirl' | 'fling' | 'whistle' | 'lift' | 'stomp';
export type RoundKind =
  | 'fizz' | 'shades' | 'geyser'
  | 'cans' | 'gang' | 'cansGang' | 'shadesGang'
  | 'stomp' | 'rain' | 'double' | 'stompRain' | 'cansFast';

export interface Shot {
  /** spawn time, ms from the round start */
  at: number;
  /** when its telegraph (pose or floor mark) began */
  warnAt: number;
  kind: ShotKind;
  lifeMs: number;
  /** centre at t ms after the spawn */
  path(t: number): Vec;
  r?: number;
  w?: number;
  h?: number;
  pink?: boolean;
  /** a shootable gang member */
  hp?: number;
  /** spawned only while that shot (index in the round) is alive: a parried can does not burst */
  parent?: number;
  sfx?: SfxName;
}
export interface Cue {
  at: number;
  ms: number;
  pose: Pose;
  sfx?: SfxName;
  flash?: boolean;
  shake?: boolean;
}
export interface Mark {
  at: number;
  ms: number;
  x: number;
  kind: 'puddle' | 'shadow';
}
export interface Round {
  kind: RoundKind;
  cues: Cue[];
  marks: Mark[];
  shots: Shot[];
  durationMs: number;
}
/** Where the boss stands, its size, the player x when the round starts, a seeded 0..1 source. */
export interface Stage {
  bx: number;
  s: number;
  playerX: number;
  rng(): number;
}

/** Round pool per phase (3 phases) and the round that opens each phase. */
export const ROUNDS: readonly (readonly RoundKind[])[] = [
  ['fizz', 'shades', 'geyser'],
  ['cans', 'gang', 'cansGang', 'shadesGang'],
  ['stomp', 'rain', 'double', 'stompRain', 'cansFast'],
];
export const FIRST: readonly RoundKind[] = ['fizz', 'gang', 'stomp'];

/** A boss-space point (scale 1, relative to the feet) in the world. */
function emit(st: Stage, p: Vec): Vec {
  return { x: st.bx + p.x * st.s, y: F + p.y * st.s };
}

/** Left edge of the boss body (with its sway): the player lives left of it. */
export function frontX(st: Stage): number {
  return st.bx + BOXES.body.x * st.s - BG.sway;
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** Time for a body falling from y0 (speed vy0 down, gravity g) to reach y1 (ms). */
function fallMs(y0: number, y1: number, vy0: number, g: number): number {
  return ((-vy0 + Math.sqrt(vy0 * vy0 + 2 * g * (y1 - y0))) / g) * 1000;
}

function ballistic(at: number, warnAt: number, kind: ShotKind, x0: number, y0: number, vx: number, vy: number, g: number, r: number, parent?: number): Shot {
  return {
    at,
    warnAt,
    kind,
    r,
    parent,
    lifeMs: fallMs(y0, F - r, vy, g),
    path: (t) => {
      const s = t / 1000;
      return { x: x0 + vx * s, y: y0 + vy * s + (g * s * s) / 2 };
    },
  };
}

function bubble(st: Stage, at: number, warnAt: number, lane: number, pink: boolean): Shot {
  const a = ATK.fizz;
  const o = emit(st, EMIT.cup);
  const y1 = F - lane;
  return {
    at,
    warnAt,
    kind: 'bubble',
    r: a.r,
    pink,
    lifeMs: ((o.x + a.r) / a.speed) * 1000,
    path: (t) => {
      const u = Math.min(1, t / a.settleMs);
      const e = u * (2 - u);
      return { x: o.x - (a.speed * t) / 1000, y: o.y + (y1 - o.y) * e + Math.sin((t / a.bobMs) * TAU) * a.bob * e };
    },
  };
}

/** Sunglasses boomerang: an ellipse to the left wall and back, dir 1 = out low / back high. */
function shadesShot(st: Stage, at: number, warnAt: number, dir: 1 | -1): Shot {
  const a = ATK.shades;
  const o = emit(st, EMIT.shadesHand);
  const cx = (o.x + a.leftX) / 2;
  const ax = (o.x - a.leftX) / 2;
  const cy = F - a.cy;
  return {
    at,
    warnAt,
    kind: 'shades',
    r: a.r,
    pink: true,
    sfx: SFX.whoosh,
    lifeMs: a.flightMs,
    path: (t) => {
      const th = (TAU * t) / a.flightMs;
      const k = ((1 + Math.cos(th)) / 2) ** 4;
      return { x: cx + ax * Math.cos(th), y: cy + dir * a.ay * Math.sin(th) + (o.y - cy) * k };
    },
  };
}

function column(at: number, warnAt: number, x: number, w: number, h: number, live: number, parent?: number): Shot {
  return { at, warnAt, kind: 'fizz', w, h, lifeMs: live, parent, sfx: SFX.burst, path: () => ({ x, y: F - h / 2 }) };
}

function gangMember(st: Stage, kind: 'burger' | 'fries', at: number, warnAt: number): Shot {
  const x0 = st.bx + EMIT.gang.x * st.s;
  if (kind === 'burger') {
    const b = ATK.burger;
    return {
      at,
      warnAt,
      kind,
      r: b.r,
      hp: b.hp,
      lifeMs: ((x0 + b.r * 2) / b.speed) * 1000,
      path: (t) => ({ x: x0 - (b.speed * t) / 1000, y: F - b.r - Math.abs(Math.sin((Math.PI * t) / b.hopMs)) * b.hopH }),
    };
  }
  const f = ATK.fries;
  return {
    at,
    warnAt,
    kind,
    w: f.w,
    h: f.h,
    hp: f.hp,
    lifeMs: ((x0 + f.w) / f.speed) * 1000,
    path: (t) => ({ x: x0 - (f.speed * t) / 1000, y: F - f.h / 2 - Math.abs(Math.sin((Math.PI * t) / f.hopMs)) * f.hopH }),
  };
}

function empty(kind: RoundKind): Round {
  return { kind, cues: [], marks: [], shots: [], durationMs: 0 };
}

/** Lay round b over round a (both start together). */
function merge(a: Round, b: Round, kind: RoundKind): Round {
  const base = a.shots.length;
  return {
    kind,
    cues: [...a.cues, ...b.cues],
    marks: [...a.marks, ...b.marks],
    shots: [...a.shots, ...b.shots.map((s) => ({ ...s, parent: s.parent === undefined ? undefined : s.parent + base }))],
    durationMs: 0,
  };
}

function fizz(st: Stage, count: number): Round {
  const a = ATK.fizz;
  const r = empty('fizz');
  const lowFirst = st.rng() < 0.5 ? 0 : 1;
  r.cues.push({ at: 0, ms: a.teleMs, pose: 'shake', sfx: SFX.tele, flash: true }, { at: a.teleMs, ms: count * a.gapMs, pose: 'spray' });
  for (let i = 0; i < count; i++) {
    r.shots.push(bubble(st, a.teleMs + i * a.gapMs, 0, (i + lowFirst) % 2 === 0 ? a.low : a.high, i === a.pinkAt));
  }
  return r;
}

function shades(st: Stage, both: boolean): Round {
  const a = ATK.shades;
  const tele = both ? ATK.double.teleMs : a.teleMs;
  const r = empty(both ? 'double' : 'shades');
  const fly = a.flightMs + (both ? ATK.double.secondMs : 0);
  r.cues.push({ at: 0, ms: tele, pose: 'twirl', sfx: SFX.tele, flash: true }, { at: tele, ms: fly + a.catchMs, pose: 'fling', sfx: SFX.throw });
  r.shots.push(shadesShot(st, tele, 0, 1));
  if (both) r.shots.push(shadesShot(st, tele + ATK.double.secondMs, 0, -1));
  return r;
}

function geyser(st: Stage): Round {
  const a = ATK.geyser;
  const hi = frontX(st) - a.lo;
  const p = clamp(st.playerX, a.lo, hi);
  const inside = (x: number): boolean => x >= a.lo && x <= hi;
  const waves = [
    [p, p - a.step, p + a.step].filter(inside),
    [p - a.step / 2, p + a.step / 2, p - 1.5 * a.step, p + 1.5 * a.step].filter(inside),
  ];
  const r = empty('geyser');
  waves.forEach((xs, w) => {
    const warn = w === 0 ? 0 : a.teleMs;
    const erupt = a.teleMs + w * a.wave2Ms;
    r.cues.push({ at: warn, ms: erupt - warn, pose: 'shake', sfx: SFX.tele, flash: true }, { at: erupt, ms: a.liveMs, pose: 'spray' });
    for (const x of xs) {
      r.marks.push({ at: warn, ms: erupt - warn, x, kind: 'puddle' });
      r.shots.push(column(erupt, warn, x, a.w, a.h, a.liveMs));
    }
  });
  return r;
}

function cans(st: Stage, count: number, cadence: number): Round {
  const a = ATK.cans;
  const b = ATK.burst;
  const r = empty('cans');
  const o = emit(st, EMIT.throwHand);
  const hi = frontX(st) - a.edge;
  const ly = F - a.r;
  for (let i = 0; i < count; i++) {
    const w = i * cadence;
    const rel = w + a.teleMs;
    r.cues.push({ at: w, ms: a.teleMs, pose: 'windup', sfx: SFX.tele, flash: true }, { at: rel, ms: a.throwMs, pose: 'throw', sfx: SFX.throw });
    const tx = clamp(st.playerX + (a.offsets[i % a.offsets.length] ?? 0), a.edge, hi);
    const idx = r.shots.length;
    r.shots.push({
      at: rel,
      warnAt: w,
      kind: 'can',
      r: a.r,
      pink: i === a.pinkAt,
      lifeMs: a.flightMs + a.rattleMs + a.graceMs,
      path: (t) => {
        if (t >= a.flightMs) return { x: tx + Math.sin((t / a.jitterMs) * TAU) * a.jitter, y: ly };
        const u = t / a.flightMs;
        return { x: o.x + (tx - o.x) * u, y: o.y + (ly - o.y) * u - 4 * a.apex * u * (1 - u) };
      },
    });
    const pop = rel + a.flightMs + a.rattleMs;
    r.shots.push(column(pop, w, tx, b.w, b.h, b.liveMs, idx));
    for (const side of [-1, 1]) r.shots.push(ballistic(pop, w, 'drop', tx, F - b.dropY, side * b.dropVx, -b.dropVy, b.dropG, b.dropR, idx));
  }
  return r;
}

function gang(st: Stage): Round {
  const g = ATK.gang;
  const r = empty('gang');
  r.cues.push({ at: 0, ms: g.teleMs, pose: 'whistle', sfx: SFX.tele, flash: true });
  r.shots.push(gangMember(st, 'burger', g.teleMs, 0), gangMember(st, 'burger', g.teleMs + g.burgerGapMs, 0), gangMember(st, 'fries', g.teleMs + g.friesAtMs, 0));
  return r;
}

function stomp(st: Stage): Round {
  const a = ATK.stomp;
  const r = empty('stomp');
  r.cues.push({ at: 0, ms: a.teleMs, pose: 'lift', sfx: SFX.tele, flash: true }, { at: a.teleMs, ms: a.stompMs, pose: 'stomp', sfx: SFX.stomp, shake: true });
  const x0 = emit(st, EMIT.foot).x;
  r.shots.push({
    at: a.teleMs,
    warnAt: 0,
    kind: 'wave',
    w: a.waveW,
    h: a.waveH,
    lifeMs: ((x0 + a.waveW) / a.waveSpeed) * 1000,
    path: (t) => ({ x: x0 - (a.waveSpeed * t) / 1000, y: F - a.waveH / 2 }),
  });
  const hi = frontX(st) - a.edge;
  for (const off of a.bricks) {
    const x = clamp(st.playerX + off, a.edge, hi);
    const shot = ballistic(a.teleMs, 0, 'brick', x, -a.brickR, 0, 0, a.brickG, a.brickR);
    r.marks.push({ at: a.teleMs, ms: shot.lifeMs, x, kind: 'shadow' });
    r.shots.push(shot);
  }
  return r;
}

function rain(st: Stage, waves: number): Round {
  const a = ATK.rain;
  const r = empty('rain');
  const n = Math.ceil((frontX(st) - a.x0) / a.step) + 1;
  r.cues.push({ at: 0, ms: a.teleMs, pose: 'shake', sfx: SFX.tele, flash: true }, { at: a.teleMs, ms: a.sprayMs + (waves - 1) * a.waveGapMs, pose: 'spray' });
  let gap = Math.floor(st.rng() * (n - 1));
  for (let w = 0; w < waves; w++) {
    if (w > 0) gap = clamp(gap + (gap + a.shiftCols <= n - 2 ? a.shiftCols : -a.shiftCols), 0, n - 2);
    const start = a.teleMs + w * a.waveGapMs;
    const open = (c: number): boolean => c === gap || c === gap + 1;
    const solid = Array.from({ length: n }, (_, c) => c).filter((c) => !open(c));
    const pinkCol = solid[Math.floor(st.rng() * solid.length)];
    for (const c of solid) {
      const x = a.x0 + c * a.step;
      const y0 = -a.r - (c % 2) * a.stagger;
      r.shots.push({
        at: start,
        warnAt: 0,
        kind: 'bubble',
        r: a.r,
        pink: c === pinkCol,
        lifeMs: ((F - a.r - y0) / a.speed) * 1000,
        path: (t) => ({ x: x + Math.sin((t / a.swayMs) * TAU) * a.sway, y: y0 + (a.speed * t) / 1000 }),
      });
    }
  }
  return r;
}

function withGang(base: Round, st: Stage, at: number, kind: RoundKind, member: 'burger' | 'fries'): Round {
  base.shots.push(gangMember(st, member, at, 0));
  return { ...base, kind };
}

function build(kind: RoundKind, st: Stage): Round {
  switch (kind) {
    case 'fizz': return fizz(st, ATK.fizz.count);
    case 'shades': return shades(st, false);
    case 'geyser': return geyser(st);
    case 'cans': return cans(st, 3, ATK.cans.cadenceMs);
    case 'gang': return gang(st);
    case 'cansGang': return withGang(cans(st, 2, ATK.cans.cadenceMs), st, ATK.combo.cansBurgerMs, kind, 'burger');
    case 'shadesGang': return withGang(shades(st, false), st, ATK.combo.shadesFriesMs, kind, 'fries');
    case 'stomp': return stomp(st);
    case 'rain': return rain(st, 2);
    case 'double': return shades(st, true);
    case 'stompRain': return merge(rain(st, 1), stomp(st), kind);
    case 'cansFast': return withGang(cans(st, 3, ATK.combo.fastCadenceMs), st, ATK.combo.fastBurgerMs, kind, 'burger');
  }
}

/** The full timeline of one round, its duration = the last cue or shot to end. */
export function planRound(kind: RoundKind, st: Stage): Round {
  const r = build(kind, st);
  const ends = [...r.cues.map((c) => c.at + c.ms), ...r.shots.map((s) => s.at + s.lifeMs), ...r.marks.map((m) => m.at + m.ms)];
  return { ...r, durationMs: Math.ceil(Math.max(0, ...ends)) };
}

/** Next round of a phase: seeded, never the same twice in a row. */
export function pickRound(phase: number, last: RoundKind | null, rng: () => number): RoundKind {
  const pool = ROUNDS[Math.min(phase, ROUNDS.length - 1)] ?? ROUNDS[0] ?? [];
  const list = pool.filter((k) => k !== last);
  return list[Math.floor(rng() * list.length)] ?? 'fizz';
}
