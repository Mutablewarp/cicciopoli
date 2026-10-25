import { describe, expect, it } from 'vitest';
import { ARENA } from '../../../api';
import { arc, ballistic, hopClearSpan, HERO, minGap, spreadLandings } from './geometry';
import { seeded } from './paint';
import { Scheduler, type AttackDef, type SchedEvent } from './scheduler';

type A = 'a' | 'b' | 'c';
const DECK: readonly AttackDef<A>[] = [
  { id: 'a', teleMs: 600, actMs: 900, restMs: 500, fireAt: [0, 300, 600] },
  { id: 'b', teleMs: 700, actMs: 400, restMs: 400, fireAt: [100] },
  { id: 'c', teleMs: 550, actMs: 1200, restMs: 450, fireAt: [0, 1100] },
];

function run(s: Scheduler<A>, ms: number, step = 16): { t: number; e: SchedEvent<A> }[] {
  const out: { t: number; e: SchedEvent<A> }[] = [];
  for (let t = 0; t < ms; t += step) for (const e of s.update(step)) out.push({ t: t + step, e });
  return out;
}

describe('BOSS-C scheduler', () => {
  it('telegraphs every attack for its full teleMs before the first volley', () => {
    const log = run(new Scheduler(DECK, seeded(3), 1000), 60_000);
    let teleAt = -1;
    let id: A | null = null;
    let checked = 0;
    for (const { t, e } of log) {
      if (e.kind === 'tele') {
        teleAt = t;
        id = e.id;
      } else if (e.kind === 'fire' && e.n === 0) {
        const def = DECK.find((d) => d.id === id);
        expect(def).toBeDefined();
        expect(t - teleAt).toBeGreaterThanOrEqual((def?.teleMs ?? 0) + (def?.fireAt[0] ?? 0) - 16);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(20);
  });

  it('plays every attack once per cycle and never the same one twice in a row', () => {
    const teles = run(new Scheduler(DECK, seeded(9), 0), 120_000).flatMap(({ e }) => (e.kind === 'tele' ? [e.id] : []));
    for (let i = 1; i < teles.length; i++) expect(teles[i]).not.toBe(teles[i - 1]);
    for (let i = 0; i + 3 <= teles.length; i += 3) expect(new Set(teles.slice(i, i + 3)).size).toBe(3);
  });

  it('fires every volley of an attack, then ends it', () => {
    const log = run(new Scheduler([DECK[0]], seeded(1), 0), 3000).map(({ e }) => e);
    expect(log.slice(0, 5).map((e) => e.kind)).toEqual(['tele', 'fire', 'fire', 'fire', 'end']);
  });

  it('a new deck cancels the attack in progress and pauses; stop() silences it', () => {
    const s = new Scheduler(DECK, seeded(2), 0);
    run(s, 800);
    s.setDeck([DECK[1]], 2000);
    expect(s.attack).toBeNull();
    expect(run(s, 1900)).toEqual([]);
    expect(run(s, 300).map(({ e }) => e)).toContainEqual({ kind: 'tele', id: 'b' });
    s.stop();
    expect(run(s, 5000)).toEqual([]);
  });
});

describe('BOSS-C fairness geometry', () => {
  it('spread landings always leave a hero-wide gap between drops', () => {
    for (let seed = 1; seed < 300; seed++) {
      const xs = spreadLandings(seeded(seed), 5, 30, 460, 28);
      expect(minGap(xs, 9)).toBeGreaterThanOrEqual(HERO.w + 8);
      for (const x of xs) expect(x).toBeGreaterThanOrEqual(30);
    }
  });

  it('ballistic throws land where planned', () => {
    const from = { x: 400, y: 180 };
    const v = ballistic(from, 120, ARENA.floorY, 1000, 900);
    expect(from.x + v.x).toBeCloseTo(120);
    expect(from.y + v.y + 0.5 * 900).toBeCloseTo(ARENA.floorY);
  });

  it('a hop ends where it aims and leaves room underneath around its apex', () => {
    const p = arc({ x: 500, y: ARENA.floorY }, { x: 100, y: ARENA.floorY }, 120, 1);
    expect(p).toEqual({ x: 100, y: ARENA.floorY });
    const [s0, s1] = hopClearSpan(120);
    expect(s1 - s0).toBeGreaterThan(0.6);
    const mid = arc({ x: 500, y: ARENA.floorY }, { x: 100, y: ARENA.floorY }, 120, 0.5);
    expect(ARENA.floorY - mid.y).toBeGreaterThanOrEqual(HERO.h + 10);
  });
});
