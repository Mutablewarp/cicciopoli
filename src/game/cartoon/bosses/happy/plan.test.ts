import { describe, expect, it } from 'vitest';
import { CT_PLAYER } from '../../../../config/cartoon';
import { ARENA } from '../../api';
import { landingSpans, widestGap } from '../tuma/kit/geom';
import { MIN_TELEGRAPH_MS } from '../tuma/kit/sched';
import { BODY, HAPPY_CFG as C, PINK } from './config';
import { miniDrops, paintDrips, rocketLanes, sprayPuffs } from './plan';

const lcg = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const APEX = CT_PLAYER.jumpVy ** 2 / (2 * CT_PLAYER.gravity);

describe('HAPPY BOX patterns', () => {
  it('every attack telegraphs >= 500 ms', () => {
    for (const phase of C.attacks) for (const a of phase) expect(a.telegraphMs).toBeGreaterThanOrEqual(MIN_TELEGRAPH_MS);
  });

  it('spray clouds settle leaving a safe stretch of floor; exactly one PINK when asked, never otherwise', () => {
    const rng = lcg(17);
    for (let i = 0; i < 400; i++) {
      const phase = i % 2;
      const [a, b] = C.field[phase];
      const puffs = sprayPuffs(rng, phase, { x: 400, y: 160 }, a + rng() * (b - a), i % 3 === 0);
      expect(puffs).toHaveLength(C.spray.n[phase]);
      expect(widestGap(landingSpans(puffs, ARENA.floorY, C.spray.splash), a, b)).toBeGreaterThanOrEqual(C.safeW);
      expect(puffs.filter((p) => p.pink)).toHaveLength(i % 3 === 0 ? 1 : 0);
      for (const p of puffs) expect(p.frame === PINK).toBe(p.pink);
    }
  });

  it('paint drips leave a safe stretch of floor and are never pink', () => {
    const rng = lcg(6);
    for (let i = 0; i < 400; i++) {
      const phase = i % 2;
      const [a, b] = C.field[phase];
      const drops = paintDrips(rng, phase, a + rng() * (b - a));
      expect(widestGap(landingSpans(drops, ARENA.floorY, C.drips.splash), a, b)).toBeGreaterThanOrEqual(C.safeW);
      expect(drops.every((d) => !d.pink && d.frame !== PINK)).toBe(true);
    }
  });

  it('rockets: one low lane to jump, one high lane to stand under', () => {
    const lanes = rocketLanes(lcg(1)).sort((p, q) => p - q);
    const [high, low] = lanes;
    expect(ARENA.floorY - (low - C.rocket.h / 2)).toBeLessThan(APEX * 0.5);
    expect(ARENA.floorY - (high + C.rocket.h / 2)).toBeGreaterThan(CT_PLAYER.hitH + 8);
  });

  it('mini boxes land in front of Happy, inside the field, and hop lower than the jump apex', () => {
    const rng = lcg(3);
    for (let p = 0; p < 2; p++) {
      const xs = miniDrops(rng, p);
      expect(xs).toHaveLength(C.minis.n[p]);
      expect(xs.every((x) => x >= C.minis.landX[0] && x <= C.minis.landX[1] && x <= C.field[p][1])).toBe(true);
    }
    expect(C.minis.hopVy ** 2 / (2 * C.minis.g) + C.minis.r * 2).toBeLessThan(APEX);
  });

  it('straight shots from a hero on the ground hit him in both phases (the hurt box reaches the floor)', () => {
    const F = ARENA.floorY;
    const [, by, , bh] = C.hurt;
    // every height a standing hero can fire from (its whole hit box, feet excluded) is covered
    for (const scale of [C.scale, C.scale * C.grow]) {
      expect(F + (by - BODY.footY) * scale).toBeLessThanOrEqual(F - CT_PLAYER.hitH);
      expect(F + (by + bh - BODY.footY) * scale).toBeGreaterThanOrEqual(F - 6);
    }
  });
});
