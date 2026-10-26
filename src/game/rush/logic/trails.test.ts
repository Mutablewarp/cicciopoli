import { describe, expect, it } from 'vitest';
import { RUSH_DELIVERY, RUSH_ROAD, RUSH_TRAILS } from '../../../config/rush';
import { laneX } from './lanes';
import { OracleBot } from './oracleBot';
import { RushRun } from './run';
import type { RushEntityView, RushEvent, RushInput } from './types';

const DT = 1000 / 30;
const range = (from: number, n: number): number[] => Array.from({ length: n }, (_, i) => from + i);

interface Laid {
  readonly trail: number;
  readonly index: number;
  readonly of: number;
  readonly x: number;
  readonly d: number;
  readonly zone: number;
}

/** Plays a run with `input`; returns its events, every fry and delivery zone laid (road d of their meeting point). */
function play(seed: number, input: (run: RushRun, ev: readonly RushEvent[]) => RushInput) {
  const run = new RushRun({ seed, driver: 'riflessi', daily: false, hints: false });
  const events: RushEvent[] = [];
  const fries: Laid[] = [];
  const zones: number[] = [];
  let last: RushEvent[] = [];
  while (run.snapshot.phase === 'play') {
    last = run.step(DT, input(run, last));
    events.push(...last);
    const snap = run.snapshot;
    for (const e of last) {
      if (e.type !== 'spawn') continue;
      // pickups and zones stand still: d of contact = d now + px ahead
      if (e.entity.kind === 'zone') zones.push(snap.distance + e.entity.y);
      const t = e.entity.trail;
      if (t) fries.push({ trail: t.id, index: t.index, of: t.of, x: e.entity.x, d: snap.distance + e.entity.y, zone: snap.zoneIndex });
    }
  }
  return { run, events, fries, zones };
}

const oracle = (): ((run: RushRun) => RushInput) => {
  let bot: OracleBot | null = null;
  return (run) => (bot ??= new OracleBot(run)).decide(DT);
};

/**
 * The oracle until it picks the first fry of a trail, then follows the line BLINDLY (no look at the
 * traffic): it stays in the fries' lane and starts each shift either right away (early) or only once
 * the first fry after the shift is about to be picked (late). Back to the oracle after the last fry.
 */
function follower(mode: 'early' | 'late'): (run: RushRun, ev: readonly RushEvent[]) => RushInput {
  let bot: OracleBot | null = null;
  let on: { id: number; of: number; next: number } | null = null;
  return (run, ev) => {
    for (const e of ev) {
      if (e.type !== 'trail') continue;
      if (e.index === 0) on = { id: e.trail, of: e.of, next: 1 };
      else if (on && e.trail === on.id) on.next = e.index + 1;
    }
    const snap = run.snapshot;
    const fry = (i: number): RushEntityView | undefined => snap.entities.find((x) => x.trail?.id === on?.id && x.trail?.index === i);
    let target = on && on.next < on.of ? fry(on.next) : undefined;
    if (!on || !target) {
      on = null;
      return (bot ??= new OracleBot(run)).decide(DT);
    }
    // halfway between two lanes: aim at the fry after it
    if (target.x !== laneX(target.lane)) target = fry(on.next + 1) ?? target;
    const t = snap.truck;
    if (t.target === target.lane || (mode === 'late' && target.y > 20)) return { laneDir: 0, brake: false };
    return { laneDir: target.lane > t.target ? 1 : -1, brake: false };
  };
}

describe('FRIES TRAILS', () => {
  it('a few per zone, 5-8 fries along lanes and one-lane shifts, never near a delivery zone', () => {
    const bad: string[] = [];
    for (const seed of range(1, 150)) {
      const { fries, zones } = play(seed, oracle());
      const trails = new Map<number, Laid[]>();
      for (const f of fries) trails.set(f.trail, [...(trails.get(f.trail) ?? []), f]);
      const perZone = [0, 1, 2].map((z) => [...trails.values()].filter((t) => t[0].zone === z).length);
      if (perZone.some((n) => n < 2)) bad.push(`seed ${seed}: trails per zone ${perZone.join('/')}`);
      const lastId = Math.max(...trails.keys());
      for (const [id, t] of trails) {
        const [min, max] = RUSH_TRAILS.count;
        // the run may end before the last line is all on the road
        const whole = t.length === t[0].of || id === lastId;
        const shape = whole && t[0].of >= min && t[0].of <= max && t.every((f, i) => f.index === i && f.of === t[0].of);
        const steps = t.every((f, i) => i === 0 || (Math.abs(f.x - t[i - 1].x) <= RUSH_ROAD.laneW / 2 && Math.abs(f.d - t[i - 1].d - RUSH_TRAILS.gapPx) < 1e-6));
        const lanes = t.every((f) => (f.x - RUSH_ROAD.laneW / 2) % (RUSH_ROAD.laneW / 2) === 0);
        if (!shape || !steps || !lanes) bad.push(`seed ${seed}: trail ${id} shape`);
      }
      for (const f of fries) if (zones.some((z) => Math.abs(z - f.d) <= RUSH_DELIVERY.clearPx)) bad.push(`seed ${seed}: fry by a zone`);
    }
    expect(bad).toEqual([]);
  });

  it('the oracle bot picks almost every trail whole, with zero hits and all deliveries', () => {
    let trails = 0;
    let chains = 0;
    const bad: number[] = [];
    for (const seed of range(2001, 200)) {
      const { run, events } = play(seed, oracle());
      trails += events.filter((e) => e.type === 'trail' && e.index === 0).length;
      chains += events.filter((e) => e.type === 'chain').length;
      if (events.some((e) => e.type === 'hit') || run.summary().delivered !== 3) bad.push(seed);
      expect(run.summary().chains).toBe(events.filter((e) => e.type === 'chain').length);
    }
    expect(bad).toEqual([]);
    expect(chains / trails).toBeGreaterThan(0.95);
  });

  for (const mode of ['early', 'late'] as const) {
    it(`following a line blindly (shifts ${mode}) is never a risky move: zero hits, every line picked whole`, () => {
      const bad: string[] = [];
      for (const seed of range(3001, 200)) {
        const { events } = play(seed, follower(mode));
        const started = events.filter((e) => e.type === 'trail' && e.index === 0).length;
        const chains = events.filter((e) => e.type === 'chain').length;
        if (events.some((e) => e.type === 'hit')) bad.push(`seed ${seed}: hit`);
        // the run may end in the middle of the last line
        if (chains < started - 1) bad.push(`seed ${seed}: ${chains}/${started} lines`);
      }
      expect(bad).toEqual([]);
    });
  }
});
