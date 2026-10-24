import { describe, expect, it } from 'vitest';
import type { RushDriverId } from '../../../contracts';
import { autopilot } from './oracleBot';
import { RushRun } from './run';
import type { RushInput } from './types';
import { CELL, SafeTable, cellOf } from './validator';

function unfair(seeds: readonly number[], driver: RushDriverId = 'riflessi'): number[] {
  return seeds.filter((seed) => {
    const run = new RushRun({ seed, driver, daily: false, hints: false });
    const hit = autopilot(run).some((e) => e.type === 'hit');
    const s = run.summary();
    return hit || s.delivered !== 3 || !s.reachedEnd;
  });
}

const range = (from: number, n: number): number[] => Array.from({ length: n }, (_, i) => from + i);

/**
 * A player who only knows what the screen showed (the validator's reveal model) and reacts every
 * frame; `skip` = delivery zones he ignores (their hand-off windows are not obstacles for him).
 */
function screenPlayer(run: RushRun, dt: number, skip: ReadonlySet<number>): RushInput {
  const snap = run.snapshot;
  const truck = snap.truck;
  if (truck.lane !== truck.target) return { laneDir: 0, brake: false };
  const cell = cellOf(snap.distance);
  const t = new SafeTable(run.traffic.allBlocks, cell, (b) => cellOf(b.vis) <= cell && !skip.has(b.owner));
  const k = Math.ceil((snap.speed * 1.2 * dt) / 1000 / CELL);
  const l = truck.lane;
  if (t.free(l, cell, cell + k + 1) && t.safe(l, cell + k)) return { laneDir: 0, brake: false };
  for (const dir of [-1, 1] as const) if (t.changeOk(l, l + dir, cell)) return { laneDir: dir, brake: false };
  return { laneDir: 0, brake: false };
}

describe('fairness sweep B', () => {
  for (let k = 0; k < 4; k++) {
    const seeds = range(1001 + k * 250, 250);
    it(`oracle bot, seeds ${seeds[0]}..${seeds[seeds.length - 1]}`, () => expect(unfair(seeds)).toEqual([]));
  }

  it('slower drivers (250 ms lane change) are fine too', () => {
    expect(unfair(range(5001, 100), 'occhio')).toEqual([]);
    expect(unfair(range(6001, 100), 'consegne')).toEqual([]);
  });

  it('a player who only reacts to what is on screen never meets an unavoidable crash', () => {
    const bad: number[] = [];
    for (const seed of range(7001, 250)) {
      const run = new RushRun({ seed, driver: 'riflessi', daily: false, hints: false });
      let hits = 0;
      while (run.snapshot.phase === 'play') for (const e of run.step(33, screenPlayer(run, 33, new Set()))) if (e.type === 'hit') hits++;
      if (hits > 0 || run.summary().delivered !== 3) bad.push(seed);
    }
    expect(bad).toEqual([]);
  });

  it('…also when he ignores the deliveries (the road is fair without them too)', () => {
    const bad: number[] = [];
    for (const seed of range(8001, 120)) {
      const run = new RushRun({ seed, driver: 'riflessi', daily: false, hints: false });
      const zones = new Set<number>();
      let hits = 0;
      while (run.snapshot.phase === 'play') {
        for (const e of run.step(33, screenPlayer(run, 33, zones))) {
          if (e.type === 'deliveryZone') zones.add(e.id);
          if (e.type === 'hit') hits++;
        }
      }
      if (hits > 0) bad.push(seed);
    }
    expect(bad).toEqual([]);
  });
});
