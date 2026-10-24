import { describe, expect, it } from 'vitest';
import { RUSH_DELIVERY, RUSH_ITEMS, RUSH_ROAD, RUSH_RUN } from '../../../config/rush';
import { OracleBot, autopilot } from './oracleBot';
import { RushRun } from './run';
import type { RushEvent } from './types';

const range = (from: number, n: number): number[] => Array.from({ length: n }, (_, i) => from + i);
const DT = 1000 / 30;

/** Seconds of run time when a swerving scooter showed inside a delivery zone on screen. */
function scooterInZone(seed: number): number[] {
  const run = new RushRun({ seed, driver: 'riflessi', daily: false, hints: false });
  const bot = new OracleBot(run);
  const bad: number[] = [];
  while (run.snapshot.phase === 'play') {
    run.step(DT, bot.decide(DT));
    const live = run.traffic.live;
    for (const z of live) {
      if (z.kind !== 'zone' || z.done || z.y > RUSH_ROAD.viewAheadPx.max + RUSH_ITEMS.zoneH / 2 || z.y < -RUSH_DELIVERY.clearPx) continue;
      const inside = live.some(
        (s) => s.to !== null && Math.abs(s.x - z.x) < (s.w + z.w) / 2 && Math.abs(s.y - z.y) < (s.h + z.h) / 2,
      );
      if (inside) bad.push(Math.round(run.snapshot.timeMs / 100) / 10);
    }
  }
  return bad;
}

describe('delivery zones and the first run', () => {
  it('no swerving scooter ever shows inside a delivery zone on screen', () => {
    const bad = range(1, 300).flatMap((seed) => (scooterInZone(seed).length > 0 ? [seed] : []));
    expect(bad).toEqual([]);
  });

  it('first run: a player who does nothing is not hit before firstRunClearMs (the first lesson is a dodge)', () => {
    const hit: number[] = [];
    for (const seed of range(1, 300)) {
      const run = new RushRun({ seed, driver: 'riflessi', daily: false, hints: true });
      const events: RushEvent[] = [];
      while (run.snapshot.timeMs + DT <= RUSH_RUN.firstRunClearMs) events.push(...run.step(DT, { laneDir: 0, brake: false }));
      if (events.some((e) => e.type === 'hit')) hit.push(seed);
    }
    expect(hit).toEqual([]);
  });

  it('first run: the road with the empty start is still fair for the oracle bot', () => {
    const bad = range(1, 150).filter((seed) => {
      const run = new RushRun({ seed, driver: 'riflessi', daily: false, hints: true });
      const hit = autopilot(run).some((e) => e.type === 'hit');
      const s = run.summary();
      return hit || s.delivered !== 3 || !s.reachedEnd;
    });
    expect(bad).toEqual([]);
  });
});
