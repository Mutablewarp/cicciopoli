import { describe, expect, it } from 'vitest';
import { RUSH_DELIVERY, RUSH_SPEED } from '../../../config/rush';
import { Deliveries } from './deliveries';
import { LaneController, laneX } from './lanes';
import { mulberry32 } from './rng';
import { ScoreBook } from './score';
import { TrafficManager } from './traffic';
import type { Lane, RushEvent } from './types';

const BASE = RUSH_SPEED.base.centro;

/** Drives the order book alone: the truck sits in `lane(zoneLane)` when it reaches a zone. */
function world(hitFreshMul = 1) {
  const traffic = new TrafficManager(mulberry32(5), 1200);
  const book = new Deliveries(mulberry32(9), hitFreshMul);
  const score = new ScoreBook();
  const events: RushEvent[] = [];
  const log: RushEvent[] = [];
  let timeMs = 0;
  let d = 0;
  let zoneLane = 1;
  const step = (ms: number, laneFor: (zoneLane: number) => number, flying = false, braking = false): void => {
    for (let t = 0; t < ms; t += 20) {
      timeMs += 20;
      d += (BASE * 20) / 1000;
      book.update(20, { timeMs, d, base: BASE, truckX: laneX(laneFor(zoneLane)), braking, flying, traffic, score, emit: (e) => events.push(e) });
      for (const e of events.splice(0)) {
        if (e.type === 'deliveryZone') zoneLane = e.lane;
        log.push(e);
      }
    }
  };
  return { book, score, log, step, time: () => timeMs };
}

const types = (log: RushEvent[]): string[] => log.map((e) => e.type);

/**
 * Order 1 with a real lane slide: the truck waits in `startIn` ('zone' lane or the 'next' one) and
 * presses once (into / out of the zone lane) when the zone is `pressAtY` px ahead; null = never.
 */
function handOff(startIn: 'zone' | 'next', pressAtY: number | null, changeMs: number, base: number): 'delivered' | 'missed' {
  const traffic = new TrafficManager(mulberry32(5), 1200);
  const book = new Deliveries(mulberry32(9), 1);
  const score = new ScoreBook();
  const events: RushEvent[] = [];
  let lanes: LaneController | null = null;
  let meetD = Infinity;
  let zone: Lane = 1;
  let other: Lane = 1;
  let d = 0;
  for (let timeMs = 0; timeMs < RUSH_DELIVERY.dueMs[1]; timeMs += 1000 / 60) {
    d += base / 60;
    if (lanes && pressAtY !== null && meetD - d <= pressAtY) {
      lanes.press((lanes.lane === zone ? other : zone) > lanes.lane ? 1 : -1);
      pressAtY = null;
    }
    lanes?.update(1000 / 60);
    book.update(1000 / 60, { timeMs, d, base, truckX: lanes?.x ?? laneX(1), braking: false, flying: false, traffic, score, emit: (e) => events.push(e) });
    for (const e of events.splice(0)) {
      if (e.type === 'deliveryZone' && !lanes) {
        meetD = d + (e.etaMs / 1000) * base;
        zone = e.lane;
        other = (e.lane === 2 ? 1 : e.lane + 1) as Lane;
        lanes = new LaneController(() => changeMs, startIn === 'zone' ? e.lane : other);
      }
      if ((e.type === 'delivered' || e.type === 'missed') && e.order === 0) return e.type;
    }
  }
  throw new Error('order 1 never resolved');
}

describe('deliveries', () => {
  it('orders are real menu pairs; the third goes to the new Terrasini shop', () => {
    const { book } = world();
    expect(book.orders).toHaveLength(3);
    expect(book.orders[0].text).toMatch(/^.+ \+ .+ per .+, .+$/);
    expect(book.orders[2].place).toBe("Ciccio's Terrasini");
    expect(book.orders[2].text).toContain('PROSSIMA APERTURA');
  });

  it('announce, zone ~4 s ahead, hand-off in the lane: +1000 + freshness', () => {
    const w = world();
    w.step(RUSH_DELIVERY.dueMs[0] + 2000, (z) => z);
    expect(types(w.log).slice(0, 3)).toEqual(['orderNew', 'deliveryZone', 'delivered']);
    const zone = w.log.find((e) => e.type === 'deliveryZone');
    if (zone?.type !== 'deliveryZone') throw new Error('no zone');
    expect(zone.etaMs).toBeCloseTo(RUSH_DELIVERY.leadMs, -2);
    const done = w.log.find((e) => e.type === 'delivered');
    if (done?.type !== 'delivered') throw new Error('no delivery');
    expect(done.fresh).toBe(Math.round(100 - (RUSH_DELIVERY.freshDecayPerS * (RUSH_DELIVERY.dueMs[0] - RUSH_DELIVERY.announceMs[0])) / 1000));
    expect(done.perfect).toBe(true);
    expect(done.title).toBe('CONSEGNA PERFETTA!');
    expect(done.points).toBe(1000 + Math.round(done.fresh * 5));
    expect(w.score.points.deliveries).toBe(1000);
    expect(w.book.delivered).toBe(1);
  });

  it('a miss gives one ULTIMA CHANCE zone (-20 freshness), a second miss loses the order and the run goes on', () => {
    const w = world();
    w.step(RUSH_DELIVERY.announceMs[1] - 100, (z) => (z + 1) % 3);
    expect(types(w.log)).toEqual(['orderNew', 'deliveryZone', 'missed', 'deliveryZone', 'missed']);
    const [first, second] = w.log.filter((e) => e.type === 'missed');
    expect(first).toMatchObject({ lost: false, title: 'CONSEGNA MANCATA!', sub: 'ULTIMA CHANCE' });
    expect(second).toMatchObject({ lost: true, title: 'ORDINE PERSO' });
    expect(w.book.orders[0].state).toBe('lost');
    w.step(RUSH_DELIVERY.dueMs[1] + 2000 - w.time(), (z) => z);
    expect(w.book.delivered).toBe(1);
    expect(w.book.orders[1].state).toBe('delivered');
  });

  it('recovery: deliver on the second chance', () => {
    const w = world();
    let missedOnce = false;
    w.step(RUSH_DELIVERY.announceMs[1] - 100, (z) => {
      missedOnce ||= w.log.some((e) => e.type === 'missed');
      return missedOnce ? z : (z + 1) % 3;
    });
    const done = w.log.find((e) => e.type === 'delivered');
    if (done?.type !== 'delivered') throw new Error('no delivery');
    expect(done.perfect).toBe(false);
    expect(done.fresh).toBeLessThan(80);
  });

  it('the hand-off is a window, not an instant: a late entry or an early exit still delivers', () => {
    for (const changeMs of [200, 250]) {
      for (const base of [RUSH_SPEED.base.centro, RUSH_SPEED.base.mare]) {
        // the truck slides onto the zone after it already reached the truck centre (zone 10 px ahead at the press)
        expect(handOff('next', 10, changeMs, base)).toBe('delivered');
        expect(handOff('next', 0, changeMs, base)).toBe('delivered');
        // the truck leaves the zone lane before its centre (15 px ahead at the press)
        expect(handOff('zone', 15, changeMs, base)).toBe('delivered');
        // staying in the next lane all the way through is still a miss
        expect(handOff('next', null, changeMs, base)).toBe('missed');
        // and so is leaving well before the zone (not driven through it)
        expect(handOff('zone', 120, changeMs, base)).toBe('missed');
      }
    }
  });

  it('a zone passed while flying is a delivery from the sky (+200), any lane', () => {
    const w = world();
    w.step(RUSH_DELIVERY.dueMs[0] + 2000, (z) => (z + 2) % 3, true);
    const done = w.log.find((e) => e.type === 'delivered');
    expect(done).toMatchObject({ sky: true, title: 'CONSEGNA DAL CIELO!' });
    expect(w.score.points.sky).toBe(200);
  });

  it('the last order is handed over at the Ciccio\'s Terrasini door, in the shop-side lane', () => {
    const w = world();
    w.step(RUSH_DELIVERY.dueMs[2] + 3000, (z) => z);
    const last = w.log.filter((e) => e.type === 'deliveryZone')[2];
    expect(last).toMatchObject({ order: 2, lane: RUSH_DELIVERY.shop.lane, recovery: false });
    const { periodPx, doorRow } = RUSH_DELIVERY.shop;
    const door = w.book.shopD ?? Number.NaN;
    expect((((-door % periodPx) + periodPx) % periodPx)).toBe(doorRow);
    expect(w.book.delivered).toBe(3);
  });

  it('FRENA cools the order faster', () => {
    const coast = world();
    const brake = world();
    coast.step(6000, (z) => z);
    brake.step(6000, (z) => z, false, true);
    const lost = (coast.book.current?.fresh ?? 0) - (brake.book.current?.fresh ?? 0);
    expect(lost).toBeCloseTo((RUSH_DELIVERY.freshBrakePerS * (6000 - RUSH_DELIVERY.announceMs[0])) / 1000, 0);
  });

  it('a hit spoils 20 freshness (10 for RE DELLE CONSEGNE)', () => {
    for (const [mul, loss] of [
      [1, 20],
      [0.5, 10],
    ]) {
      const w = world(mul);
      w.step(RUSH_DELIVERY.announceMs[0] + 500, (z) => z);
      const before = w.book.current?.fresh ?? 0;
      w.book.hit();
      expect(before - (w.book.current?.fresh ?? 0)).toBeCloseTo(loss, 5);
    }
  });
});
