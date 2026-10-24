import { describe, expect, it } from 'vitest';
import { isTraffic } from './entity';
import { OracleBot } from './oracleBot';
import { RushRun } from './run';

/** Seeds where two road objects (sauce aside) ever overlap on the road, sampled every step. */
function overlapping(from: number, n: number): string[] {
  const bad: string[] = [];
  for (let seed = from; seed < from + n; seed++) {
    const run = new RushRun({ seed, driver: 'riflessi', daily: false, hints: false });
    const bot = new OracleBot(run);
    while (run.snapshot.phase === 'play' && bad.length === 0) {
      run.step(33, bot.decide(33));
      const L = run.snapshot.entities.filter((e) => isTraffic(e.kind) && e.kind !== 'sauce');
      for (let i = 0; i < L.length; i++) {
        for (let j = i + 1; j < L.length; j++) {
          const [a, b] = [L[i], L[j]];
          if (Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2) bad.push(`seed ${seed}: ${a.kind} / ${b.kind}`);
        }
      }
    }
  }
  return bad;
}

describe('traffic never drives through a hazard or another vehicle', () => {
  it('seeds 1..1000, every frame of the run', () => expect(overlapping(1, 1000)).toEqual([]));
});
