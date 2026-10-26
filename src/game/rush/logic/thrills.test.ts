import { describe, expect, it } from 'vitest';
import { RUSH_FEVER, RUSH_NEAR_MISS, RUSH_SCORE } from '../../../config/rush';
import { CAP_STREAK } from './fever';
import { OracleBot } from './oracleBot';
import { RushRun } from './run';
import { ScoreBook } from './score';
import type { RushEvent, RushInput, RushOptions } from './types';

const opts = (o: Partial<RushOptions> = {}): RushOptions => ({ seed: 7, driver: 'riflessi', daily: false, hints: false, ...o });
const IDLE: RushInput = { laneDir: 0, brake: false };
const LEFT: RushInput = { laneDir: -1, brake: false };

function drive(run: RushRun, done: () => boolean, input: RushInput = IDLE, dt = 16): RushEvent[] {
  const out: RushEvent[] = [];
  for (let i = 0; i < 20_000 && !done() && run.snapshot.phase === 'play'; i++) out.push(...run.step(dt, input));
  return out;
}
const of = <T extends RushEvent['type']>(ev: RushEvent[], type: T): Extract<RushEvent, { type: T }>[] =>
  ev.filter((e): e is Extract<RushEvent, { type: T }> => e.type === type);
const at = (run: RushRun, d: number) => (): boolean => run.snapshot.distance >= d;
const sum = (run: RushRun): number => Object.values(run.summary().points).reduce((a, b) => a + b, 0);

/** Waits until the obstacle is `ttcMs` from the truck, steers left, drives past it. */
function dodgeAt(kind: 'car' | 'cone', ttcMs: number): { run: RushRun; id: number; ev: RushEvent[] } {
  const run = new RushRun(opts());
  const e = run.traffic.add({ kind, lane: 1, meetD: 220 });
  const ev = drive(run, () => e.spawned && e.ttcMs <= ttcMs);
  ev.push(...run.step(16, LEFT), ...drive(run, at(run, 400)));
  return { run, id: e.id, ev };
}

describe('SFIORATO! (near miss)', () => {
  it('a late dodge scores nearMiss x combo, on top of the clean pass, and feeds the combo', () => {
    const { run, id, ev } = dodgeAt('car', RUSH_NEAR_MISS.windowMs - 50);
    expect(of(ev, 'hit')).toEqual([]);
    expect(of(ev, 'pass').map((p) => p.id)).toEqual([id]);
    // the car went by on the right of the truck (now in lane 0)
    expect(of(ev, 'nearMiss')).toEqual([{ type: 'nearMiss', id, side: 1, points: RUSH_SCORE.nearMiss, combo: 1, title: 'SFIORATO!' }]);
    const s = run.summary();
    expect(s.nearMisses).toBe(1);
    expect(s.points.nearMiss).toBe(RUSH_SCORE.nearMiss);
    expect(s.score).toBe(RUSH_SCORE.pass + RUSH_SCORE.nearMiss);
    expect(sum(run)).toBe(s.score);
  });

  it('roadworks count too (no clean-pass points, still the near miss)', () => {
    const { run, ev } = dodgeAt('cone', RUSH_NEAR_MISS.windowMs - 100);
    expect(of(ev, 'pass')).toEqual([]);
    expect(of(ev, 'nearMiss')).toHaveLength(1);
    expect(run.summary().nearMisses).toBe(1);
  });

  it('an early dodge is just a clean pass; a dodge too late is a hit, never a near miss', () => {
    const early = dodgeAt('car', 900);
    expect(of(early.ev, 'pass')).toHaveLength(1);
    expect(of(early.ev, 'nearMiss')).toEqual([]);
    const late = dodgeAt('car', 20);
    expect(of(late.ev, 'hit')).toHaveLength(1);
    expect(of(late.ev, 'nearMiss')).toEqual([]);
  });

  it('the oracle bot (it dodges at the last safe moment) collects plenty', () => {
    const run = new RushRun(opts({ seed: 11 }));
    const bot = new OracleBot(run);
    const ev: RushEvent[] = [];
    while (run.snapshot.phase === 'play') ev.push(...run.step(1000 / 30, bot.decide(1000 / 30)));
    expect(of(ev, 'hit')).toEqual([]);
    expect(run.summary().nearMisses).toBe(of(ev, 'nearMiss').length);
    expect(run.summary().nearMisses).toBeGreaterThanOrEqual(5);
  });
});

describe('CICCIO FEVER', () => {
  it('combo x3 lights 6 s of points x2; the extra half has its own row; it burns out; the next needs more passes', () => {
    const b = new ScoreBook();
    const ev: RushEvent[] = [];
    const emit = (e: RushEvent): void => void ev.push(e);
    b.streak = CAP_STREAK - 1;
    b.fever.update(16, b.streak, emit);
    expect(ev).toEqual([]);
    b.pass();
    expect(b.combo).toBe(RUSH_SCORE.comboMax);
    b.fever.update(16, b.streak, emit);
    expect(ev).toEqual([{ type: 'feverStart', ms: RUSH_FEVER.ms, title: 'CICCIO FEVER!', sub: 'Punti doppi per 6 secondi!' }]);
    expect(b.fever.left).toBe(1);
    const before = { ...b.points };
    expect(b.pass().points).toBe(RUSH_SCORE.pass * RUSH_SCORE.comboMax * RUSH_FEVER.mul);
    expect(b.points.passes - before.passes).toBe(RUSH_SCORE.pass * RUSH_SCORE.comboMax);
    expect(b.points.fever - before.fever).toBe(RUSH_SCORE.pass * RUSH_SCORE.comboMax);
    // deliveries, freshness and zone bonuses are not doubled
    expect(b.add('deliveries', 1000)).toBe(1000);
    expect(b.add('pickups', 25)).toBe(50);
    expect(b.total).toBe(Object.values(b.points).reduce((x, y) => x + y, 0));
    b.fever.update(RUSH_FEVER.ms / 2, b.streak, emit);
    expect(b.fever.left).toBeCloseTo(0.5, 5);
    b.fever.update(RUSH_FEVER.ms, b.streak, emit);
    expect(ev.at(-1)).toEqual({ type: 'feverEnd', reason: 'expired' });
    expect(b.fever.mul).toBe(1);
    for (let i = 1; i < RUSH_FEVER.againPasses; i++) b.pass();
    b.fever.update(16, b.streak, emit);
    expect(b.fever.on).toBe(false);
    b.nearMiss();
    b.fever.update(16, b.streak, emit);
    expect(b.fever.on).toBe(true);
    expect(b.fever.count).toBe(2);
  });

  it('a hit puts it out; the next one needs combo x3 again', () => {
    const b = new ScoreBook();
    const ev: RushEvent[] = [];
    const emit = (e: RushEvent): void => void ev.push(e);
    b.streak = CAP_STREAK;
    b.fever.update(16, b.streak, emit);
    b.hit(emit);
    expect(ev.map((e) => e.type)).toEqual(['feverStart', 'feverEnd']);
    expect(ev[1]).toEqual({ type: 'feverEnd', reason: 'hit' });
    expect([b.streak, b.combo, b.fever.left]).toEqual([0, 1, 0]);
    b.streak = CAP_STREAK - 1;
    b.fever.update(16, b.streak, emit);
    expect(b.fever.on).toBe(false);
    b.pass();
    b.fever.update(16, b.streak, emit);
    expect(b.fever.count).toBe(2);
  });

  it('in a run: a clean streak of passes lights it, snapshot / HUD / summary show it', () => {
    const run = new RushRun(opts());
    // a row of cars beside the truck's lane, all passed clean before the generated traffic starts
    for (let i = 0; i < CAP_STREAK + 4; i++) run.traffic.add({ kind: 'car', lane: i % 2 === 0 ? 0 : 2, meetD: 90 + 12 * i });
    const ev = drive(run, () => run.snapshot.fever > 0);
    expect(of(ev, 'feverStart')).toHaveLength(1);
    expect(run.hud().fever).toBe(run.snapshot.fever);
    ev.push(...drive(run, at(run, 700)));
    const doubled = of(ev, 'pass').filter((p) => p.points === RUSH_SCORE.pass * RUSH_SCORE.comboMax * RUSH_FEVER.mul);
    expect(doubled.length).toBeGreaterThan(0);
    const s = run.summary();
    expect(s.fevers).toBe(1);
    expect(s.points.fever).toBeGreaterThan(0);
    expect(sum(run)).toBe(s.score);
  });
});

describe('FRIES TRAILS · scoring', () => {
  const line = (run: RushRun, lanes: readonly (0 | 1 | 2)[]): void =>
    lanes.forEach((lane, index) =>
      run.traffic.add({ kind: 'fry', lane, meetD: 100 + index * 30, trail: { id: 99, index, of: lanes.length } }),
    );

  it('every fry scores, the whole line = CATENA bonus', () => {
    const run = new RushRun(opts());
    line(run, [1, 1, 1, 1, 1]);
    const ev = drive(run, at(run, 320));
    expect(of(ev, 'trail').map((t) => [t.index, t.of, t.points])).toEqual([0, 1, 2, 3, 4].map((i) => [i, 5, RUSH_SCORE.fry]));
    expect(of(ev, 'pickup')).toEqual([]);
    expect(of(ev, 'despawn').filter((d) => d.reason === 'picked')).toHaveLength(5);
    expect(of(ev, 'chain')).toEqual([{ type: 'chain', trail: 99, count: 5, points: RUSH_SCORE.chain, title: 'CATENA x5!' }]);
    const s = run.summary();
    expect(s.chains).toBe(1);
    expect([s.points.pickups, s.points.chains]).toEqual([5 * RUSH_SCORE.fry, RUSH_SCORE.chain]);
  });

  it('one fry missed: no CATENA', () => {
    const run = new RushRun(opts());
    line(run, [1, 1, 0, 1, 1]);
    const ev = drive(run, at(run, 320));
    expect(of(ev, 'trail')).toHaveLength(4);
    expect(of(ev, 'chain')).toEqual([]);
    expect(run.summary().chains).toBe(0);
  });
});
