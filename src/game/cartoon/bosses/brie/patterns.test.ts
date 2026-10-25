import { describe, expect, it } from 'vitest';
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
