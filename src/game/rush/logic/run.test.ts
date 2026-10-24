import { describe, expect, it } from 'vitest';
import { RUSH_POWERS, RUSH_RUN, RUSH_SCORE, RUSH_SPEED } from '../../../config/rush';
import { autopilot } from './oracleBot';
import { dailySeed, mulberry32 } from './rng';
import { RushRun } from './run';
import type { RushEvent, RushInput, RushOptions } from './types';

const opts = (o: Partial<RushOptions> = {}): RushOptions => ({ seed: 7, driver: 'riflessi', daily: false, hints: false, ...o });
const IDLE: RushInput = { laneDir: 0, brake: false };

/** Steps of dt until `done` (or the run ends); returns the events. */
function drive(run: RushRun, done: () => boolean, input: RushInput = IDLE, dt = 16): RushEvent[] {
  const out: RushEvent[] = [];
  for (let i = 0; i < 20_000 && !done() && run.snapshot.phase === 'play'; i++) out.push(...run.step(dt, input));
  return out;
}
const of = <T extends RushEvent['type']>(ev: RushEvent[], type: T): Extract<RushEvent, { type: T }>[] =>
  ev.filter((e): e is Extract<RushEvent, { type: T }> => e.type === type);
const at = (run: RushRun, d: number) => (): boolean => run.snapshot.distance >= d;

describe('RushRun · collisions', () => {
  it('a hit costs one heart exactly once, then the truck is invulnerable', () => {
    const run = new RushRun(opts());
    const first = run.traffic.add({ kind: 'car', lane: 1, meetD: 150 });
    const second = run.traffic.add({ kind: 'car', lane: 1, meetD: 240 });
    const ev = drive(run, at(run, 420));
    expect(of(ev, 'hit').map((h) => [h.id, h.hearts, h.shielded])).toEqual([[first.id, 2, false]]);
    expect(of(ev, 'despawn').some((d) => d.id === first.id && d.reason === 'hit')).toBe(true);
    expect(second.touched).toBe(true);
    expect(of(ev, 'pass').some((p) => p.id === second.id)).toBe(false);
    expect(run.summary().collisions).toBe(1);
    // the first order is announced after the crash: its bag is still fresh
    expect(run.hud().fresh).toBeGreaterThanOrEqual(99);
  });

  it('SCUDO NUGGETS absorbs one hit: no heart, no freshness, shield gone', () => {
    const run = new RushRun(opts());
    run.traffic.addPickup('nuggets', 1, 60);
    run.traffic.add({ kind: 'van', lane: 1, meetD: 260 });
    const ev = drive(run, at(run, 420));
    expect(of(ev, 'powerStart').map((p) => p.power)).toEqual(['shield']);
    expect(of(ev, 'hit').map((h) => [h.shielded, h.hearts])).toEqual([[true, 3]]);
    expect(of(ev, 'powerEnd')).toEqual([{ type: 'powerEnd', power: 'shield', reason: 'used' }]);
    expect(run.snapshot.shield).toBe(false);
    expect(run.summary().collisions).toBe(0);
  });

  it('a clean pass scores RUSH_SCORE.pass x combo', () => {
    const run = new RushRun(opts());
    const car = run.traffic.add({ kind: 'car', lane: 0, meetD: 150 });
    const ev = drive(run, at(run, 360));
    expect(of(ev, 'pass')).toEqual([{ type: 'pass', id: car.id, points: RUSH_SCORE.pass, combo: 1 }]);
    expect(run.snapshot.score).toBe(RUSH_SCORE.pass);
  });

  it('sauce: lane changes slower for a while; CHEDDAR GRIP ignores it and is faster', () => {
    const changeSteps = (run: RushRun): number => {
      run.step(10, { laneDir: run.snapshot.truck.lane === 0 ? 1 : -1, brake: false });
      let n = 1;
      for (; run.snapshot.truck.lane !== run.snapshot.truck.target; n++) run.step(10, IDLE);
      return n;
    };
    const plain = new RushRun(opts());
    expect(changeSteps(plain)).toBe(20);
    const slip = new RushRun(opts());
    slip.traffic.add({ kind: 'sauce', lane: 1, meetD: 60 });
    const ev = drive(slip, at(slip, 70));
    expect(of(ev, 'slip')).toHaveLength(1);
    expect(changeSteps(slip)).toBe(36);
    const grip = new RushRun(opts());
    grip.traffic.addPickup('cheddar', 1, 40);
    grip.traffic.add({ kind: 'sauce', lane: 1, meetD: 90 });
    const gev = drive(grip, at(grip, 100));
    expect(of(gev, 'slip')).toHaveLength(0);
    expect(changeSteps(grip)).toBe(14);
  });
});

describe('RushRun · power-ups', () => {
  it('timed powers last their duration, warn before the end, then expire', () => {
    const run = new RushRun(opts());
    run.traffic.addPickup('waffle', 1, 40);
    const ev = drive(run, () => run.snapshot.power === 'radar');
    const t0 = run.snapshot.timeMs;
    expect(of(ev, 'powerStart')[0]).toMatchObject({ power: 'radar', ms: RUSH_POWERS.ms.radar, title: 'WAFFLE RADAR' });
    expect(run.snapshot.radar).toHaveLength(3);
    const rest = drive(run, () => run.snapshot.power === null);
    expect(run.snapshot.timeMs - t0).toBeGreaterThanOrEqual(RUSH_POWERS.ms.radar - 16);
    expect(run.snapshot.timeMs - t0).toBeLessThanOrEqual(RUSH_POWERS.ms.radar + 16);
    expect(of(rest, 'powerWarn')).toHaveLength(1);
    expect(of(rest, 'powerEnd')).toEqual([{ type: 'powerEnd', power: 'radar', reason: 'expired' }]);
    expect(run.snapshot.radar).toBeNull();
  });

  it('one timed power at a time (a new one replaces it), the shield runs alongside', () => {
    const run = new RushRun(opts());
    run.traffic.addPickup('waffle', 1, 40);
    run.traffic.addPickup('popcorn', 1, 100);
    run.traffic.addPickup('nuggets', 1, 160);
    const ev = drive(run, at(run, 200));
    expect(of(ev, 'powerEnd')).toEqual([{ type: 'powerEnd', power: 'radar', reason: 'replaced' }]);
    expect(run.snapshot.power).toBe('sprint');
    expect(run.snapshot.shield).toBe(true);
    drive(run, () => run.snapshot.timeMs > 2500);
    expect(run.snapshot.speed / RUSH_SPEED.base.centro).toBeCloseTo(RUSH_POWERS.sprintMul, 2);
    expect(run.hud().powers).toMatchObject({ sprint: true, shield: true, radar: false });
  });

  it('FRENA eases the speed down and back', () => {
    const run = new RushRun(opts());
    drive(run, () => run.snapshot.timeMs > 1500, { laneDir: 0, brake: true });
    expect(run.snapshot.speed / RUSH_SPEED.base.centro).toBeCloseTo(RUSH_SPEED.brakeMul, 2);
    expect(run.snapshot.truck.braking).toBe(true);
    drive(run, () => run.snapshot.timeMs > 3500);
    expect(run.snapshot.speed / RUSH_SPEED.base.centro).toBeCloseTo(1, 2);
  });
});

describe('RushRun · timeline', () => {
  it('ends at exactly 90 s with the finale when all three orders were delivered', () => {
    const run = new RushRun(opts({ seed: 11 }));
    const ev = autopilot(run, 16.7);
    expect(run.snapshot.timeMs).toBe(RUSH_RUN.durationMs);
    expect(run.snapshot.timeLeftMs).toBe(0);
    expect(of(ev, 'end')).toEqual([{ type: 'end', reason: 'time', completed: true, title: 'CONSEGNA COMPLETATA!' }]);
    expect(ev.slice(-2).map((e) => e.type)).toEqual(['finale', 'end']);
    expect(of(ev, 'zoneChange').map((z) => z.title)).toEqual(['PALERMO CENTRO', 'ZONA STADIO', 'LUNGOMARE TERRASINI']);
    expect(of(ev, 'orderNew')).toHaveLength(3);
    expect(run.step(16, IDLE)).toEqual([]);
    const s = run.summary();
    expect(s).toMatchObject({ completed: true, reachedEnd: true, delivered: 3, collisions: 0 });
    expect(Object.values(s.points).reduce((a, b) => a + b, 0)).toBe(s.score);
  });

  it('ends early when the last heart is lost', () => {
    const run = new RushRun(opts());
    for (let i = 0; i < 12; i++) run.traffic.add({ kind: 'car', lane: 1, meetD: 200 + i * 600 });
    const ev = drive(run, () => false);
    expect(run.snapshot.phase).toBe('over');
    expect(run.snapshot.hearts).toBe(0);
    expect(run.snapshot.timeMs).toBeLessThan(RUSH_RUN.durationMs);
    expect(of(ev, 'end')).toEqual([{ type: 'end', reason: 'crash', completed: false, title: 'CORSA TERMINATA!' }]);
    expect(of(ev, 'finale')).toHaveLength(0);
    expect(run.summary()).toMatchObject({ reachedEnd: false, collisions: 3 });
  });

  it('pause = no step: time is frozen and the run continues identically', () => {
    const a = new RushRun(opts());
    const b = new RushRun(opts());
    for (let i = 0; i < 200; i++) a.step(16, IDLE);
    for (let i = 0; i < 100; i++) b.step(16, IDLE);
    const frozen = JSON.stringify(b.snapshot);
    expect(b.step(0, IDLE)).toEqual([]);
    expect(JSON.stringify(b.snapshot)).toBe(frozen);
    for (let i = 0; i < 100; i++) b.step(16, IDLE);
    expect(JSON.stringify(b.snapshot)).toBe(JSON.stringify(a.snapshot));
  });

  it('same options and inputs, same run (RIPROVA on a daily seed replays the same road)', () => {
    const rnd = mulberry32(3);
    const inputs: RushInput[] = Array.from({ length: 600 }, () => ({ laneDir: rnd() < 0.05 ? (rnd() < 0.5 ? -1 : 1) : 0, brake: rnd() < 0.2 }));
    const run = new RushRun(opts({ hints: true }));
    const first = inputs.flatMap((inp) => run.step(16, inp));
    const again = new RushRun(opts({ hints: true }));
    expect(JSON.stringify(inputs.flatMap((inp) => again.step(16, inp)))).toBe(JSON.stringify(first));
    expect(of(first, 'hint').map((h) => h.index)).toEqual([0, 1, 2]);
  });

  it('daily challenge: one seed per calendar day, same traffic for everybody', () => {
    expect(dailySeed(new Date(2026, 9, 20, 8))).toBe(dailySeed(new Date(2026, 9, 20, 23, 59)));
    expect(dailySeed(new Date(2026, 9, 21))).not.toBe(dailySeed(new Date(2026, 9, 20)));
    const seed = dailySeed(new Date(2026, 9, 20));
    const a = autopilot(new RushRun(opts({ seed, daily: true })));
    const b = autopilot(new RushRun(opts({ seed, daily: true })));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('RushRun · robustness', () => {
  it('random input never breaks the state machine', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const rnd = mulberry32(seed * 977);
      const run = new RushRun(opts({ seed, driver: (['riflessi', 'occhio', 'consegne'] as const)[seed % 3] }));
      let last = 0;
      for (let i = 0; i < 9000 && run.snapshot.phase === 'play'; i++) {
        const dt = rnd() < 0.02 ? 200 : 4 + rnd() * 30;
        run.step(dt, { laneDir: rnd() < 0.08 ? (rnd() < 0.5 ? -1 : 1) : 0, brake: rnd() < 0.3 });
        const s = run.snapshot;
        expect(s.timeMs).toBeGreaterThanOrEqual(last);
        last = s.timeMs;
        expect(s.hearts).toBeGreaterThanOrEqual(0);
        expect(s.truck.x).toBeGreaterThanOrEqual(20);
        expect(s.truck.x).toBeLessThanOrEqual(100);
        expect(Number.isInteger(s.score)).toBe(true);
      }
      expect(run.snapshot.phase).toBe('over');
    }
  });
});
