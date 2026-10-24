import { describe, expect, it } from 'vitest';
import type { RushDriverId } from '../../../contracts';
import { autopilot } from './oracleBot';
import { dailySeed } from './rng';
import { RushRun } from './run';

/** Seeds where the oracle bot got hit, missed a delivery or did not reach 0 s. */
function unfair(seeds: readonly number[], driver: RushDriverId = 'riflessi', daily = false): number[] {
  return seeds.filter((seed) => {
    const run = new RushRun({ seed, driver, daily, hints: false });
    const hit = autopilot(run).some((e) => e.type === 'hit');
    const s = run.summary();
    return hit || s.delivered !== 3 || !s.reachedEnd;
  });
}

const range = (from: number, n: number): number[] => Array.from({ length: n }, (_, i) => from + i);

describe('fairness sweep A: the oracle bot drives every road with zero hits and all three deliveries', () => {
  for (let k = 0; k < 4; k++) {
    const seeds = range(1 + k * 250, 250);
    it(`seeds ${seeds[0]}..${seeds[seeds.length - 1]}`, () => expect(unfair(seeds)).toEqual([]));
  }

  it('the daily seeds of 30 days', () => {
    const seeds = range(0, 30).map((i) => dailySeed(new Date(2026, 9, 1 + i)));
    expect(new Set(seeds).size).toBe(30);
    expect(unfair(seeds, 'riflessi', true)).toEqual([]);
  });
});
