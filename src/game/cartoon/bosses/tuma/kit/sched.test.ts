import { describe, expect, it } from 'vitest';
import { landX, lob, spread, widestGap, type Shot } from './geom';
import { type AttackDef, Later, MIN_TELEGRAPH_MS, Scheduler, type SchedEvent } from './sched';

type K = 'a' | 'b' | 'c' | 'z';
const lcg = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const P0: AttackDef<K>[] = [
  { kind: 'a', telegraphMs: 700, activeMs: 900, recoverMs: 800, weight: 3 },
  { kind: 'b', telegraphMs: 300, activeMs: 500, recoverMs: 600, weight: 1 },
  { kind: 'c', telegraphMs: 900, activeMs: 1200, recoverMs: 700, weight: 2 },
];
const P1: AttackDef<K>[] = [{ kind: 'z', telegraphMs: 600, activeMs: 400, recoverMs: 500, weight: 1 }];

function run(s: Scheduler<K>, ms: number, from = 0): { at: number; e: SchedEvent<K> }[] {
  const out: { at: number; e: SchedEvent<K> }[] = [];
  for (let t = from; t < from + ms; t += 16) for (const e of s.update(16)) out.push({ at: t + 16, e });
  return out;
}

describe('Scheduler', () => {
  it('telegraphs every attack at least MIN_TELEGRAPH_MS before it fires, even if the def asks less', () => {
    const log = run(new Scheduler<K>([P0], lcg(3), 1000), 120_000);
    const fires = log.filter((l) => l.e.type === 'fire');
    expect(fires.length).toBeGreaterThan(30);
    for (const f of fires) {
      const tele = [...log].reverse().find((l) => l.at <= f.at && l.e.type === 'telegraph');
      expect(tele?.e.kind).toBe(f.e.kind);
      expect(f.at - (tele?.at ?? 0)).toBeGreaterThanOrEqual(MIN_TELEGRAPH_MS - 16);
    }
  });

  it('never repeats an attack twice in a row and uses every attack', () => {
    const kinds = run(new Scheduler<K>([P0], lcg(11), 0), 120_000)
      .filter((l) => l.e.type === 'telegraph')
      .map((l) => l.e.kind);
    for (let i = 1; i < kinds.length; i++) expect(kinds[i]).not.toBe(kinds[i - 1]);
    expect(new Set(kinds)).toEqual(new Set(['a', 'b', 'c']));
  });

  it('rests through the transformation, then only uses the new phase', () => {
    const s = new Scheduler<K>([P0, P1], lcg(5), 0);
    run(s, 5000);
    s.setPhase(1, 2000);
    expect(s.state).toBe('rest');
    const log = run(s, 20_000, 5000);
    const first = log.find((l) => l.e.type === 'telegraph');
    expect(first?.at).toBeGreaterThanOrEqual(7000);
    expect(log.every((l) => l.e.kind === 'z')).toBe(true);
  });

  it('stops for good on a knockout', () => {
    const s = new Scheduler<K>([P0], lcg(2), 0);
    s.stop();
    expect(run(s, 10_000)).toEqual([]);
  });
});

describe('Later', () => {
  it('runs callbacks in time order once, and clear drops them', () => {
    const l = new Later();
    const seen: number[] = [];
    l.add(300, () => seen.push(2));
    l.add(100, () => seen.push(1));
    l.update(50);
    expect(seen).toEqual([]);
    l.update(300);
    expect(seen).toEqual([1, 2]);
    l.add(10, () => seen.push(3));
    l.clear();
    l.update(100);
    expect(seen).toEqual([1, 2]);
  });
});

describe('geometry', () => {
  it('lob lands where it was aimed', () => {
    const v = lob(500, 150, 120, 311, 1100, 520);
    const s: Shot = { delayMs: 0, x: 500, y: 150, vx: v.vx, vy: v.vy, ay: 520, r: 7, frame: 0, pink: false };
    expect(landX(s, 311)).toBeCloseTo(120, 3);
  });

  it('spread keeps a hole of the asked width, away from the player, inside the range', () => {
    const rng = lcg(9);
    for (let i = 0; i < 300; i++) {
      const px = 20 + rng() * 380;
      const xs = spread(rng, 5, 30, 400, 90, 30, px);
      expect(xs.every((x) => x >= 30 && x <= 400)).toBe(true);
      expect(widestGap(xs.map((x) => [x, x] as const), 30, 400)).toBeGreaterThanOrEqual(90 - 1e-6);
    }
  });

  it('widestGap measures free floor between overlapping spans', () => {
    expect(widestGap([[10, 30], [20, 50], [80, 90]], 0, 100)).toBe(30);
    expect(widestGap([], 0, 100)).toBe(100);
  });
});
