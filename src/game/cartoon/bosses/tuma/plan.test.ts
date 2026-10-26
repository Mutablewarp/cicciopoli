import { describe, expect, it } from 'vitest';
import { CT_PLAYER } from '../../../../config/cartoon';
import { ARENA } from '../../api';
import { TUMA_CFG as C, TUMA_RIG } from './config';
import { landingSpans, widestGap } from './kit/geom';
import { MIN_TELEGRAPH_MS } from './kit/sched';
import { honeyRain, lemonVolley, sunBeams } from './plan';

const lcg = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const APEX = CT_PLAYER.jumpVy ** 2 / (2 * CT_PLAYER.gravity);
const [A, B] = C.field;

describe('DON TUMA patterns', () => {
  it('every attack telegraphs >= 500 ms', () => {
    for (const phase of C.attacks) for (const a of phase) expect(a.telegraphMs).toBeGreaterThanOrEqual(MIN_TELEGRAPH_MS);
  });

  it('citrus volleys always leave a safe stretch of floor, and the pink one comes when asked', () => {
    const rng = lcg(21);
    for (let i = 0; i < 400; i++) {
      const phase = i % 2;
      const shots = lemonVolley(rng, phase, { x: 470, y: 150 }, A + rng() * (B - A), i % 4 === 1);
      expect(shots).toHaveLength(C.lemon.n[phase]);
      expect(widestGap(landingSpans(shots, ARENA.floorY, C.lemon.splash), A, B)).toBeGreaterThanOrEqual(C.safeW);
      expect(shots.filter((s) => s.pink)).toHaveLength(i % 4 === 1 ? 1 : 0);
    }
  });

  it('sun beams: one on the player, the others apart, a safe gap always left', () => {
    const rng = lcg(4);
    for (let i = 0; i < 400; i++) {
      const phase = i % 2;
      const px = A + rng() * (B - A);
      const spans = sunBeams(rng, phase, px);
      expect(spans).toHaveLength(C.beam.n[phase]);
      expect(spans[0][0] <= px + 1 && spans[0][1] >= px - 1 || px < A + C.beam.w || px > B - C.beam.w).toBe(true);
      expect(widestGap(spans, A, B)).toBeGreaterThanOrEqual(C.safeW);
    }
  });

  it('honey rain leaves a safe stretch of floor', () => {
    const rng = lcg(8);
    for (let i = 0; i < 400; i++) {
      const drops = honeyRain(rng, A + rng() * (B - A));
      expect(widestGap(landingSpans(drops, ARENA.floorY, C.honey.splash), A, B)).toBeGreaterThanOrEqual(C.safeW);
    }
  });

  it('the chair jaws and the wheel of tuma can be jumped (they stay well under the jump apex)', () => {
    expect(C.jaws.h + 5).toBeLessThan(APEX * 0.6);
    expect(C.spin.r * 2).toBeLessThan(APEX * 0.6);
  });

  it('the first volley of the fight is the gentle one (fewer citrus, slower)', () => {
    const shots = lemonVolley(lcg(5), 0, { x: 420, y: 140 }, 100, false, true);
    expect(shots).toHaveLength(C.firstLemons.n);
    expect(C.firstLemons.n).toBeLessThan(C.lemon.n[0]);
    expect(C.firstLemons.flightMs).toBeGreaterThan(C.lemon.flightMs[0]);
  });

  it('straight shots from a hero on the ground hit him (hurt boxes reach the floor), touching the chair hurts', () => {
    const F = ARENA.floorY;
    const ay = TUMA_RIG.anchor[1];
    const top = (b: readonly number[]): number => F + (b[1] - ay) * C.scale;
    const bottom = (b: readonly number[]): number => F + (b[1] + b[3] - ay) * C.scale;
    // every height a standing hero can fire from (its whole hit box, feet excluded) is covered
    expect(Math.min(...C.hurt.map(top))).toBeLessThanOrEqual(F - CT_PLAYER.hitH);
    expect(Math.max(...C.hurt.map(bottom))).toBeGreaterThanOrEqual(F - 6);
    // the field ends where his body box starts
    const left = Math.min(...C.bodyBox.map((b) => C.x + (b[0] - TUMA_RIG.anchor[0]) * C.scale));
    expect(left).toBeGreaterThanOrEqual(C.field[1]);
  });
});
