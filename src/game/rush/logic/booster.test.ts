import { describe, expect, it } from 'vitest';
import { RUSH_BOOSTER } from '../../../config/rush';
import { Booster } from './booster';
import { isTraffic } from './entity';
import { OracleBot } from './oracleBot';
import { RushRun } from './run';
import type { RushEvent, RushInput } from './types';
import { SafeTable, cellOf } from './validator';

const IDLE: RushInput = { laneDir: 0, brake: false };

describe('PROPULSORE', () => {
  it('appears only in zone 3 window, only after a clean streak, retried every second, once', () => {
    const b = new Booster();
    const clean = RUSH_BOOSTER.cleanMs;
    expect(b.wantsCrate(RUSH_BOOSTER.fromMs - 1, clean)).toBe(false);
    expect(b.wantsCrate(RUSH_BOOSTER.fromMs, clean - 1)).toBe(false);
    expect(b.wantsCrate(RUSH_BOOSTER.fromMs + 500, clean)).toBe(false); // waits for the retry
    expect(b.wantsCrate(RUSH_BOOSTER.fromMs + RUSH_BOOSTER.retryMs, clean)).toBe(true);
    b.placed = true;
    expect(b.wantsCrate(RUSH_BOOSTER.fromMs + 5000, clean)).toBe(false);
    const late = new Booster();
    expect(late.wantsCrate(RUSH_BOOSTER.untilMs + 1, clean)).toBe(false);
  });

  it('flies 5 s over traffic untouched, then lands safely on a cleared road', () => {
    const run = new RushRun({ seed: 3, driver: 'riflessi', daily: false, hints: false });
    run.traffic.addPickup('booster', 1, 60);
    for (let i = 0; i < 6; i++) run.traffic.add({ kind: 'bus', lane: 1, meetD: 200 + i * 130 });
    const ev: RushEvent[] = [];
    let flightMs = 0;
    for (let i = 0; i < 2000 && !ev.some((e) => e.type === 'flightEnd'); i++) {
      ev.push(...run.step(16, IDLE));
      if (run.snapshot.truck.flying) flightMs += 16;
    }
    expect(ev.find((e) => e.type === 'flightStart')).toMatchObject({ title: 'ROADCOASTER ATTIVATA!', sub: '0–100 in 1,61 secondi' });
    expect(Math.abs(flightMs - RUSH_BOOSTER.flightMs)).toBeLessThanOrEqual(16);
    expect(ev.filter((e) => e.type === 'hit')).toHaveLength(0);
    expect(ev.some((e) => e.type === 'spawn' && e.entity.kind === 'airNugget')).toBe(true);
    const snap = run.snapshot;
    expect(snap.entities.filter((e) => isTraffic(e.kind) && e.y >= -RUSH_BOOSTER.landClearBehindPx)).toHaveLength(0);
    expect(snap.entities.filter((e) => e.kind === 'airNugget')).toHaveLength(0);
    expect(snap.truck.invulnMs).toBeGreaterThan(900);
    expect(run.summary().flew).toBe(true);
    // new traffic comes in from the top of the road, never pops up near the truck
    const spawnY: number[] = [];
    for (let i = 0; i < 300; i++) for (const e of run.step(16, IDLE)) if (e.type === 'spawn' && isTraffic(e.entity.kind)) spawnY.push(e.entity.y);
    expect(spawnY.length).toBeGreaterThan(0);
    expect(Math.min(...spawnY)).toBeGreaterThan(300);
  });

  it('an open delivery zone holds the landing at full height until its hand-off', () => {
    const b = new Booster();
    b.start();
    for (let t = 0; t < 3 * RUSH_BOOSTER.flightMs; t += 16) expect(b.update(16, true)).toBe(false);
    expect(b.leftMs).toBe(RUSH_BOOSTER.holdLeftMs);
    let landMs = 0;
    while (!b.update(16, false)) landMs += 16;
    expect(Math.abs(landMs - RUSH_BOOSTER.holdLeftMs)).toBeLessThanOrEqual(16);
    // a descent already under way is never lifted back up
    const late = new Booster();
    late.start();
    late.update(RUSH_BOOSTER.flightMs - 300, false);
    expect(late.update(16, true)).toBe(false);
    expect(late.leftMs).toBeLessThan(300);
  });

  it('a clean driver who takes the crate delivers the last order from the sky', () => {
    let flew = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const run = new RushRun({ seed, driver: 'riflessi', daily: false, hints: false });
      const bot = new OracleBot(run);
      const ev: RushEvent[] = [];
      while (run.snapshot.phase === 'play') {
        const snap = run.snapshot;
        const t = snap.truck;
        const crate = snap.entities.find((e) => e.kind === 'booster');
        const dir = crate && t.lane === t.target && crate.lane !== t.lane ? (crate.lane > t.lane ? 1 : -1) : 0;
        const cell = cellOf(snap.distance);
        const seek = dir !== 0 && new SafeTable(run.traffic.allBlocks, cell).changeOk(t.lane, t.lane + dir, cell);
        ev.push(...run.step(33, seek ? { laneDir: dir, brake: false } : bot.decide(33)));
      }
      if (!run.summary().flew) continue;
      flew++;
      expect(ev.find((e) => e.type === 'delivered' && e.order === 2)).toMatchObject({ sky: true, title: 'CONSEGNA DAL CIELO!' });
      expect(run.summary().points.sky).toBe(200);
    }
    expect(flew).toBeGreaterThan(20);
  });

  it('the crate only ever shows up between fromMs and untilMs, at most once', () => {
    let seen = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const run = new RushRun({ seed, driver: 'riflessi', daily: false, hints: false });
      const bot = new OracleBot(run);
      const crates: number[] = [];
      while (run.snapshot.phase === 'play') {
        for (const e of run.step(33, bot.decide(33))) if (e.type === 'spawn' && e.entity.kind === 'booster') crates.push(run.snapshot.timeMs);
      }
      expect(crates.length).toBeLessThanOrEqual(1);
      for (const t of crates) expect(t >= RUSH_BOOSTER.fromMs && t <= RUSH_BOOSTER.untilMs + 1000).toBe(true);
      seen += crates.length;
    }
    expect(seen).toBeGreaterThan(30);
  });
});
