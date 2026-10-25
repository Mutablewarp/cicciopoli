/**
 * The QA bot's look-ahead (pure, no Phaser): every frame it simulates a handful of short input plans
 * (stand, run, jump now or a bit later, short hop, SCATTO) with the hero's real physics against the
 * hazards and boss bodies extrapolated from their motion, and keeps the plan that stays clear longest,
 * then the one closest to where it wants to stand. Used by bot.ts; a stand-in for a careful player.
 */
import { ARENA, type Box } from '../api';
import { boxesOverlap, shapeHitsBox } from './rules';
import { CT_BOT, CT_PLAYER as P } from '../../../config/cartoon';

/** A hazard as the planner sees it: shape now, velocity and acceleration. */
export interface SimHazard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  r?: number;
  w?: number;
  h?: number;
  pink: boolean;
  /** a telegraphed hazard (still a warning): it only exists from fromMs to toMs from now */
  fromMs?: number;
  toMs?: number;
}

export interface SimBody {
  box: Box;
  vx: number;
  vy: number;
}

export interface SimHero {
  x: number;
  /** feet */
  y: number;
  vx: number;
  vy: number;
  onGround: boolean;
  facing: 1 | -1;
  canDash: boolean;
  /** hits are ignored this long (hurt blink, shield, dash) */
  safeMs: number;
}

export interface Plan {
  axisX: -1 | 0 | 1;
  /** ms from now when SALTA is pressed (null = no jump) */
  jumpAt: number | null;
  /** keep SALTA held (full jump) or let go (short hop) */
  hold: boolean;
  dash: boolean;
}

export interface PlanResult {
  plan: Plan;
  /** first hit (ms), Infinity when the plan stays clear */
  hitAt: number;
  endX: number;
  endGround: boolean;
  facing: 1 | -1;
}

/** Every plan worth trying from this state. */
export function plans(h: SimHero): Plan[] {
  const out: Plan[] = [];
  const axes = [-1, 0, 1] as const;
  for (const axisX of axes) {
    if (h.onGround) {
      out.push({ axisX, jumpAt: null, hold: false, dash: false });
      for (const at of CT_BOT.jumpDelaysMs) for (const hold of [true, false]) out.push({ axisX, jumpAt: at, hold, dash: false });
    } else {
      for (const hold of [true, false]) out.push({ axisX, jumpAt: null, hold, dash: false });
    }
  }
  if (h.canDash) for (const axisX of [-1, 1] as const) out.push({ axisX, jumpAt: null, hold: false, dash: true });
  return out;
}

function inflate(hz: SimHazard, pad: number): SimHazard {
  return hz.w !== undefined && hz.h !== undefined ? { ...hz, w: hz.w + pad * 2, h: hz.h + pad * 2 } : { ...hz, r: (hz.r ?? 6) + pad };
}

/** Runs one plan; hazards and bodies move on their extrapolated paths. */
export function simulate(start: SimHero, plan: Plan, hazards: readonly SimHazard[], bodies: readonly SimBody[]): PlanResult {
  const dt = CT_BOT.stepMs / 1000;
  let { x, y, vx, vy, onGround, facing } = start;
  let dashMs = 0;
  let safe = start.safeMs;
  let rise = 0;
  let cut = false;
  if (plan.axisX !== 0) facing = plan.axisX;
  if (plan.dash) {
    dashMs = P.dashMs;
    safe = Math.max(safe, P.dashIframesMs);
    vx = facing * P.dashSpeed;
    vy = 0;
  }
  const padded = hazards.map((hz) => inflate(hz, CT_BOT.padding));
  let hitAt = Infinity;
  for (let t = CT_BOT.stepMs; t <= CT_BOT.horizonMs; t += CT_BOT.stepMs) {
    if (dashMs > 0) {
      dashMs -= CT_BOT.stepMs;
      x += vx * dt;
      if (dashMs <= 0) vx = facing * P.runSpeed * 0.6;
    } else {
      const target = (plan.dash ? 0 : plan.axisX) * P.runSpeed;
      const a = (onGround ? P.accelGround : P.accelAir) * dt;
      vx += Math.max(-a, Math.min(a, target - vx));
      if (plan.jumpAt !== null && onGround && t - CT_BOT.stepMs <= plan.jumpAt && plan.jumpAt < t) {
        onGround = false;
        vy = -P.jumpVy;
        rise = P.jumpMinMs;
        cut = false;
      }
      rise -= CT_BOT.stepMs;
      if (!plan.hold && !cut && rise <= 0 && vy < 0 && !onGround) {
        cut = true;
        vy *= P.jumpCut;
      }
      vy = Math.min(P.maxFall, vy + P.gravity * dt);
      x += vx * dt;
      y += vy * dt;
      if (y >= ARENA.floorY) {
        y = ARENA.floorY;
        vy = 0;
        onGround = true;
      } else onGround = false;
    }
    x = Math.max(P.minX, Math.min(P.maxX, x));
    safe -= CT_BOT.stepMs;
    if (safe > 0) continue;
    const s = t / 1000;
    const hero: Box = { x: x - P.hitW / 2, y: y - P.hitH, w: P.hitW, h: P.hitH };
    const hit =
      padded.some((hz) => {
        if (hz.pink && !onGround) return false; // the bot parries pink things in the air
        if (t < (hz.fromMs ?? 0) || t > (hz.toMs ?? Infinity)) return false;
        const at = { ...hz, x: hz.x + hz.vx * s + 0.5 * hz.ax * s * s, y: hz.y + hz.vy * s + 0.5 * hz.ay * s * s };
        return shapeHitsBox(at, hero);
      }) || bodies.some((b) => boxesOverlap({ ...b.box, x: b.box.x + b.vx * s, y: b.box.y + b.vy * s }, hero));
    if (hit) {
      hitAt = t;
      break;
    }
  }
  return { plan, hitAt, endX: x, endGround: onGround, facing };
}

/** Lower is better: clear for longest first, then near `preferX`, facing the boss, few jumps / dashes. */
export function cost(r: PlanResult, preferX: number, bossSide: 1 | -1): number {
  const B = CT_BOT.cost;
  let c = r.hitAt === Infinity ? 0 : (CT_BOT.horizonMs - r.hitAt + 1) * B.hitPerMs;
  c += Math.abs(r.endX - preferX) * B.perUnit;
  if (r.facing !== bossSide) c += B.facingAway;
  if (r.plan.jumpAt !== null) c += B.jump + r.plan.jumpAt * B.lateJumpPerMs;
  if (r.plan.dash) c += B.dash;
  if (!r.endGround) c += B.airborne;
  return c;
}

/** The best plan now. */
export function choosePlan(h: SimHero, hazards: readonly SimHazard[], bodies: readonly SimBody[], preferX: number, bossSide: 1 | -1): PlanResult {
  let best: PlanResult | null = null;
  let bestCost = Infinity;
  for (const p of plans(h)) {
    const r = simulate(h, p, hazards, bodies);
    const c = cost(r, preferX, bossSide);
    if (c < bestCost) {
      bestCost = c;
      best = r;
    }
  }
  return best ?? simulate(h, { axisX: 0, jumpAt: null, hold: false, dash: false }, hazards, bodies);
}

/** Where the bot likes to stand: a run-up away from the boss's body, on the side it is on. */
export function preferredX(heroX: number, boss: Box | null): number {
  if (!boss) return ARENA.w * 0.3;
  const left = heroX < boss.x + boss.w / 2;
  const x = left ? boss.x - CT_BOT.keep : boss.x + boss.w + CT_BOT.keep;
  const clamped = Math.max(P.minX + CT_BOT.wallGap, Math.min(P.maxX - CT_BOT.wallGap, x));
  // no room on this side: go round to the other one
  if (left && boss.x - clamped < CT_BOT.minRoom) return Math.min(P.maxX - CT_BOT.wallGap, boss.x + boss.w + CT_BOT.keep);
  if (!left && clamped - (boss.x + boss.w) < CT_BOT.minRoom) return Math.max(P.minX + CT_BOT.wallGap, boss.x - CT_BOT.keep);
  return clamped;
}
