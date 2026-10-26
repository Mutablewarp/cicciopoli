import { describe, expect, it } from 'vitest';
import { ARENA, type Box } from '../../api';
import { CT_PLAYER } from '../../../../config/cartoon';
import { BRIE_ATTACKS, BRIE_BRAIN, restPose, type BrieAttack } from './patterns';
import { hazardEndMs, survivable } from './kit/fairness';
import { rng } from './kit/paths';

// the free floor left of the boss (his body starts near x 425)
const PLAYER_XS = [30, 110, 200, 290, 360, 405];
const SEEDS = [1, 2, 3];

function ctx(id: BrieAttack, playerX: number, seed: number) {
  const spec = BRIE_ATTACKS.find((a) => a.id === id);
  const phase = spec?.phases[0] ?? 0;
  return { phase, playerX, from: restPose(phase, seed * 900), rng: rng(seed) };
}

describe('MONSIEUR BRIE patterns', () => {
  it('has 3-5 attacks per phase, each with a readable wind-up and a breather', () => {
    for (const phase of [0, 1]) {
      const n = BRIE_ATTACKS.filter((a) => a.phases.includes(phase)).length;
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(5);
    }
    for (const a of BRIE_ATTACKS) {
      expect(a.telegraphMs, a.id).toBeGreaterThanOrEqual(500);
      expect(a.recoverMs, a.id).toBeGreaterThanOrEqual(400);
    }
  });

  it('every hazard is gone before its attack ends (attacks never overlap)', () => {
    for (const a of BRIE_ATTACKS)
      for (const x of PLAYER_XS) {
        const plan = BRIE_BRAIN.plan(a.id, ctx(a.id, x, 1));
        for (const h of plan.hazards) expect(hazardEndMs(h), a.id).toBeLessThanOrEqual(a.activeMs);
      }
  });

  it('every attack leaves a way out to a hero who only runs and jumps', () => {
    for (const a of BRIE_ATTACKS)
      for (const x of PLAYER_XS)
        for (const seed of SEEDS) expect(survivable(BRIE_BRAIN, a.id, ctx(a.id, x, seed)), `${a.id} from x=${x}`).toBe(true);
  });

  it('both phases throw something pink to parry', () => {
    for (const phase of [0, 1]) {
      const pink = BRIE_ATTACKS.filter((a) => a.phases.includes(phase)).some((a) => BRIE_BRAIN.plan(a.id, ctx(a.id, 200, 1)).hazards.some((h) => h.pink));
      expect(pink).toBe(true);
    }
  });

  it('each phase opens gently: a hero who just stands there is never touched by the opener', () => {
    const F = ARENA.floorY;
    const hit = (a: Box, b: Box): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    for (const [phase, id] of Object.entries(BRIE_BRAIN.openers)) {
      const spec = BRIE_ATTACKS.find((a) => a.id === id);
      if (!spec) throw new Error(`opener ${id}`);
      for (const x of PLAYER_XS)
        for (const seed of SEEDS) {
          const c = { ...ctx(spec.id, x, seed), opening: true };
          const plan = BRIE_BRAIN.plan(spec.id, c);
          const hero = { x: x - CT_PLAYER.hitW / 2, y: F - CT_PLAYER.hitH, w: CT_PLAYER.hitW, h: CT_PLAYER.hitH };
          for (let t = 0; t <= spec.activeMs; t += 20) {
            const live = plan.hazards.filter((h) => t >= h.atMs && t <= h.atMs + h.lifeMs);
            const boxes = live.map((h): Box => {
              const p = h.path(t - h.atMs);
              const w = h.w ?? (h.r ?? 6) * 2;
              const hh = h.h ?? (h.r ?? 6) * 2;
              return { x: p.x - w / 2, y: p.y - hh / 2, w, h: hh };
            });
            boxes.push(...BRIE_BRAIN.boxes(plan.move ? plan.move(t) : c.from, Number(phase)).body);
            expect(boxes.some((b) => hit(b, hero)), `${spec.id} opener, hero at x=${x}, t=${t}`).toBe(false);
          }
        }
    }
  });

  it('charge and hop come back home and mark their landing', () => {
    for (const id of ['charge', 'hop'] as const) {
      const c = ctx(id, 200, 1);
      const plan = BRIE_BRAIN.plan(id, c);
      const spec = BRIE_ATTACKS.find((a) => a.id === id);
      const end = plan.move?.(spec?.activeMs ?? 0);
      expect(end?.x).toBeCloseTo(c.from.x, 0);
      expect(end?.f).toBe(-1);
      expect(plan.marks.length).toBeGreaterThan(0);
    }
  });
});
