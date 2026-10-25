/**
 * Fairness checker for the BOSS-A pattern tests (pure, no Phaser): can a hero who only runs and does
 * full jumps (no dash, no parry, a bit slower than the real one) get through an attack from the moment
 * its wind-up starts? A backward search over (time, x, jump phase) with the core's own player numbers.
 */
import { ARENA, type Box } from '../../../api';
import { CT_PLAYER } from '../../../../../config/cartoon';
import type { AttackPlan, Brain, HazardPlan, PlanCtx } from './timeline';

/** Search resolution and the safety margins of the model hero. */
const FAIR = {
  dtMs: 20,
  /** the model hero runs slower than the real one */
  runFactor: 0.85,
  /** extra padding around the hero hit box */
  pad: 2,
  /** a hazard counts as gone this far outside the arena */
  outside: 40,
} as const;

function hazardBox(h: HazardPlan, t: number): Box | null {
  if (t < h.atMs || t > h.atMs + h.lifeMs) return null;
  const p = h.path(t - h.atMs);
  if (h.w !== undefined && h.h !== undefined) return { x: p.x - h.w / 2, y: p.y - h.h / 2, w: h.w, h: h.h };
  const r = h.r ?? 6;
  return { x: p.x - r, y: p.y - r, w: r * 2, h: r * 2 };
}

function outside(b: Box): boolean {
  const o = FAIR.outside;
  return b.x + b.w < -o || b.x > ARENA.w + o || b.y > ARENA.h + o || b.y + b.h < -o * 4;
}

/** When a hazard is gone for good: its life ends or it has left the arena. */
export function hazardEndMs(h: HazardPlan): number {
  for (let t = h.atMs; t <= h.atMs + h.lifeMs; t += FAIR.dtMs) {
    const b = hazardBox(h, t);
    if (b && outside(b)) return t;
  }
  return h.atMs + h.lifeMs;
}

/** Jump heights above the floor per step of a full jump (index 0 = on the ground). */
function jumpTable(): number[] {
  const g = CT_PLAYER.gravity;
  const v = CT_PLAYER.jumpVy;
  const air = (2 * v) / g;
  const out = [0];
  for (let i = 1; ; i++) {
    const t = (i * FAIR.dtMs) / 1000;
    if (t >= air) break;
    out.push(v * t - 0.5 * g * t * t);
  }
  return out;
}

const JUMP = jumpTable();

/**
 * True when the hero, standing still on the ground at ctx.playerX when the wind-up starts, has a way
 * to dodge every hazard and the boss's body until the attack is over.
 */
export function survivable<A extends string>(brain: Brain<A>, id: A, ctx: PlanCtx, plan: AttackPlan = brain.plan(id, ctx)): boolean {
  const spec = brain.attacks.find((s) => s.id === id);
  if (!spec) throw new Error(`unknown attack ${id}`);
  const tele = spec.telegraphMs;
  const steps = Math.ceil((tele + spec.activeMs) / FAIR.dtMs);
  const cell = ((CT_PLAYER.runSpeed * FAIR.runFactor) * FAIR.dtMs) / 1000;
  const x0 = CT_PLAYER.minX;
  const nx = Math.floor((CT_PLAYER.maxX - x0) / cell) + 1;
  const nj = JUMP.length;
  const hw = CT_PLAYER.hitW / 2 + FAIR.pad;
  const hh = CT_PLAYER.hitH + FAIR.pad * 2;

  const blockedAt = (step: number): Uint8Array => {
    const tAll = step * FAIR.dtMs;
    const t = tAll - tele;
    const boxes: Box[] = [];
    const pose = t >= 0 && plan.move ? plan.move(t) : ctx.from;
    boxes.push(...brain.boxes(pose, ctx.phase).body);
    if (t >= 0)
      for (const h of plan.hazards) {
        const b = hazardBox(h, t);
        if (b) boxes.push(b);
      }
    const blocked = new Uint8Array(nx * nj);
    for (let j = 0; j < nj; j++) {
      const top = ARENA.floorY - (JUMP[j] ?? 0) - CT_PLAYER.hitH - FAIR.pad;
      for (const b of boxes) {
        if (b.y >= top + hh || b.y + b.h <= top) continue;
        const lo = Math.max(0, Math.ceil((b.x - hw - x0) / cell));
        const hi = Math.min(nx - 1, Math.floor((b.x + b.w + hw - x0) / cell));
        for (let i = lo; i <= hi; i++) blocked[j * nx + i] = 1;
      }
    }
    return blocked;
  };

  let next = new Uint8Array(nx * nj);
  const last = blockedAt(steps);
  for (let k = 0; k < next.length; k++) next[k] = last[k] ? 0 : 1;
  for (let step = steps - 1; step >= 0; step--) {
    const blocked = blockedAt(step);
    const cur = new Uint8Array(nx * nj);
    for (let j = 0; j < nj; j++) {
      const nexts = j === 0 ? [0, 1] : [j + 1 >= nj ? 0 : j + 1];
      for (let i = 0; i < nx; i++) {
        if (blocked[j * nx + i]) continue;
        let ok = false;
        for (const jn of nexts) {
          for (let d = -1; d <= 1 && !ok; d++) {
            const ii = Math.max(0, Math.min(nx - 1, i + d));
            if (next[jn * nx + ii]) ok = true;
          }
        }
        if (ok) cur[j * nx + i] = 1;
      }
    }
    next = cur;
  }
  const start = Math.max(0, Math.min(nx - 1, Math.round((ctx.playerX - x0) / cell)));
  return next[start] === 1;
}
