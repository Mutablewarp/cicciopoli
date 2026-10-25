import { describe, expect, it } from 'vitest';
import { KITCHEN_GRIDDLE, KITCHEN_PATIENCE, KITCHEN_SHIFT, KITCHEN_TIMING } from '../../../config/kitchen';
import { mulberry32 } from '../../rush/logic/rng';
import { autopilot, CAREFUL, KitchenBot } from './bot';
import { KitchenShift } from './shift';
import type { KitchenEvent } from './types';

const T = KITCHEN_TIMING;
/** seed 8 opens (without the tutorial) with a HAMBURGER singolo, cooked step by step below */
const make = (o: { seed?: number; tutorial?: boolean; hints?: boolean } = {}): KitchenShift =>
  new KitchenShift({ seed: o.seed ?? 8, tutorial: o.tutorial ?? false, hints: o.hints ?? false });

/** Steps `ms` in 50 ms frames, collecting the events. */
function advance(sh: KitchenShift, ms: number): KitchenEvent[] {
  const out: KitchenEvent[] = [];
  for (let t = 0; t < ms; t += 50) out.push(...sh.step(50));
  return out;
}
const types = (ev: KitchenEvent[]): string[] => ev.map((e) => e.type);
const PATTY = KITCHEN_GRIDDLE.cook.manzo;

/** Order 1 (HAMBURGER) cooked PERFETTO and wrapped through the public actions. */
function cookHamburger(sh: KitchenShift): KitchenEvent[] {
  const ev = [...sh.tapBin('manzo')];
  ev.push(...advance(sh, PATTY.perfectAtMs + 500), ...sh.flipOrTake(0));
  ev.push(...advance(sh, PATTY.perfectAtMs + 500), ...sh.flipOrTake(0));
  ev.push(...sh.tapBin('salsaCiccios'), ...sh.closeBurger());
  return ev;
}

describe('KitchenShift: one customer', () => {
  it('walkIn -> ordering -> cooking -> serving -> reaction -> walkOut -> next customer', () => {
    const sh = make();
    const first = sh.step(16);
    expect(types(first)).toEqual(expect.arrayContaining(['phase', 'customerIn']));
    expect(sh.snapshot).toMatchObject({ phase: 'walkIn', view: 'counter', index: 0, total: 8, hearts: 3, say: null });
    const ordering = advance(sh, T.walkInMs);
    expect(ordering).toContainEqual({ type: 'say', text: sh.orders[0].line, mood: 'neutral' });
    expect(ordering.find((e) => e.type === 'ticketChanged')).toMatchObject({ ticket: { title: 'HAMBURGER', form: 'SINGOLO', price: '6,50 €' } });
    expect(sh.snapshot.say?.text).toBe(sh.orders[0].line);
    expect(sh.serve()).toEqual([]);
    expect(types(sh.takeOrder())).toContain('phase');
    expect(sh.snapshot).toMatchObject({ phase: 'cooking', view: 'kitchen', canServe: false, say: null });
    expect(sh.serve()).toContainEqual({ type: 'nope', target: { kind: 'action' }, reason: 'noBurger' });

    const cooked = cookHamburger(sh);
    expect(types(cooked)).toEqual(expect.arrayContaining(['griddlePlaced', 'perfect', 'flipped', 'griddleTaken', 'stacked', 'wrapped', 'ticketChanged']));
    expect(cooked.find((e) => e.type === 'griddleTaken')).toMatchObject({ quality: 'perfect', text: 'PERFETTO!' });
    expect(sh.snapshot.ticket?.lines.every((l) => l.done === l.count)).toBe(true);
    expect(sh.snapshot.canServe).toBe(true);
    expect(types(sh.serve())).toEqual(['phase', 'served', 'ticketChanged']);
    expect(sh.snapshot).toMatchObject({ phase: 'serving', view: 'counter', patience: null, ticket: null });
    expect(sh.snapshot.tray.burger).not.toBeNull();

    const tasted = advance(sh, T.servingMs);
    const rated = tasted.find((e) => e.type === 'rated');
    expect(rated).toMatchObject({ stars: 5, priceCents: 650, mood: 'happy' });
    expect(sh.snapshot).toMatchObject({ phase: 'reaction', served: 1, takingsCents: 650 + (rated?.type === 'rated' ? rated.tipCents : 0) });
    expect(sh.snapshot.result).toMatchObject({ kind: 'rated', stars: 5 });
    expect(sh.score).toBeGreaterThan(650);
    advance(sh, T.reactionMs);
    expect(sh.snapshot.phase).toBe('walkOut');
    const next = advance(sh, T.walkOutMs);
    expect(next).toContainEqual({ type: 'customerIn', customer: sh.orders[1].customer, index: 1 });
    expect(sh.snapshot).toMatchObject({ index: 1, phase: 'walkIn', result: null });
    expect(sh.snapshot.tray.burger).toBeNull();
  });

  it('patience runs out -> angry leave, one heart lost, the next customer comes in', () => {
    const sh = make();
    sh.step(16);
    // HAMBURGER singolo: 2 layers, one of them cooks
    const patience = KITCHEN_PATIENCE.baseMs + 2 * KITCHEN_PATIENCE.perItemMs + KITCHEN_PATIENCE.perCookMs;
    const ev = advance(sh, T.walkInMs + patience + 100);
    expect(ev).toContainEqual({ type: 'angryLeave', text: 'Troppo lento, me ne vado!' });
    expect(ev).toContainEqual({ type: 'heartLost', hearts: 2 });
    expect(sh.snapshot).toMatchObject({ phase: 'reaction', hearts: 2, mood: 'angry', result: { kind: 'angry' } });
    advance(sh, T.angryMs + T.walkOutMs);
    expect(sh.snapshot).toMatchObject({ index: 1, phase: 'walkIn' });
    expect(sh.summary).toMatchObject({ angry: 1, served: 0 });
  });

  it('a skip hurries the walk-in and the reaction, never the cooking', () => {
    const sh = make();
    sh.step(16);
    expect(sh.skipDialog()).toEqual([]);
    advance(sh, T.skipMinMs);
    expect(sh.skipDialog()).toContainEqual({ type: 'say', text: sh.orders[0].line, mood: 'neutral' });
    sh.takeOrder();
    advance(sh, T.skipMinMs);
    expect(sh.skipDialog()).toEqual([]);
    expect(sh.snapshot.phase).toBe('cooking');
  });
});

describe('KitchenShift: the whole turno', () => {
  it('0 hearts ends the shift early: TURNO CHIUSO!', () => {
    const sh = make();
    const ev = advance(sh, 10 * 60_000);
    expect(sh.snapshot.phase).toBe('finished');
    expect(types(ev).filter((t) => t === 'heartLost')).toHaveLength(KITCHEN_SHIFT.hearts);
    expect(ev[ev.length - 1]).toEqual({ type: 'shiftEnd', completed: false, stars: 0, title: 'TURNO CHIUSO!' });
    expect(sh.summary).toMatchObject({ completed: false, served: 0, angry: 3, stars: 0, golden: false, score: 0 });
    expect(sh.step(50)).toEqual([]);
  });

  it('ends after 8 customers with TURNO FINITO! (the golden award first when 3 stars)', () => {
    const sh = make({ seed: 11 });
    const ev = autopilot(sh, new KitchenBot(CAREFUL, mulberry32(3)));
    expect(types(ev).filter((t) => t === 'customerIn')).toHaveLength(8);
    expect(types(ev).filter((t) => t === 'rated')).toHaveLength(8);
    const s = sh.summary;
    expect(s).toMatchObject({ completed: true, served: 8, total: 8, stars: 3, golden: true });
    expect(ev.slice(-2)).toEqual([
      { type: 'golden', title: 'YOU ARE SO GOLDEN!' },
      { type: 'shiftEnd', completed: true, stars: 3, title: 'TURNO FINITO!' },
    ]);
    expect(ev.find((e) => e.type === 'combo')).toMatchObject({ combo: 1.5, text: 'COMBO x1,5' });
    expect(s.score).toBe(s.points.orders + s.points.speed + s.points.perfect + s.points.combo);
    expect(s.takingsCents).toBeGreaterThanOrEqual(sh.orders.reduce((a, o) => a + o.priceCents, 0));
    expect(s.perfectCooks).toBeGreaterThan(8);
    expect(sh.snapshot).toMatchObject({ phase: 'finished', order: null, customer: null });
  });

  it('pause = no step: nothing moves; a stalled frame is capped', () => {
    const sh = make();
    advance(sh, T.walkInMs + 100);
    sh.takeOrder();
    sh.tapBin('manzo');
    const before = sh.snapshot;
    expect(sh.step(0)).toEqual([]);
    expect(sh.step(Number.NaN)).toEqual([]);
    expect(sh.step(-20)).toEqual([]);
    expect(sh.snapshot).toEqual(before);
    sh.step(10_000);
    expect(sh.snapshot.timeMs).toBe(before.timeMs + KITCHEN_SHIFT.maxStepMs);
    expect(sh.snapshot.griddle[0]?.ms).toBe(KITCHEN_SHIFT.maxStepMs);
  });

  it('restart = a new shift: same seed, same deck, fresh state', () => {
    const played = make({ seed: 5 });
    autopilot(played, new KitchenBot(CAREFUL, mulberry32(1)));
    const again = make({ seed: 5 });
    expect(again.orders).toEqual(played.orders);
    expect(again.snapshot).toEqual(make({ seed: 5 }).snapshot);
    expect(again.summary).toMatchObject({ served: 0, score: 0, angry: 0, takingsCents: 0 });
    expect(make({ seed: 6 }).orders).not.toEqual(played.orders);
  });
});

describe('KitchenShift: tutorial and AIUTI', () => {
  it('guided orders 1-2: frozen patience, pointer steps with Italian lines, then tutorialDone', () => {
    const sh = make({ tutorial: true });
    const ev = advance(sh, T.walkInMs + 5 * 60_000);
    expect(sh.snapshot).toMatchObject({ phase: 'ordering', frozen: true, tutorial: true, hearts: 3 });
    expect(ev).toContainEqual({ type: 'tutorialStep', step: 'order', text: "Tocca PRENDI L'ORDINE!", target: { kind: 'action' } });
    const cooking = sh.takeOrder();
    expect(cooking).toContainEqual({ type: 'tutorialStep', step: 'griddleBin', text: 'Tocca la carne: va sulla piastra!', target: { kind: 'bin', id: 'manzo' } });
    sh.tapBin('manzo');
    const flip = advance(sh, PATTY.perfectAtMs + 100);
    expect(flip).toContainEqual({ type: 'tutorialStep', step: 'flip', text: 'Girala quando è dorata!', target: { kind: 'griddle', slot: 0 } });
    expect(sh.snapshot.guide).toMatchObject({ step: 'flip', wait: false });
    const auto = autopilot(sh, new KitchenBot(CAREFUL, mulberry32(9)));
    const done = auto.findIndex((e) => e.type === 'tutorialDone');
    const third = auto.findIndex((e) => e.type === 'customerIn' && e.index === 2);
    expect(done).toBeGreaterThanOrEqual(0);
    expect(done).toBeLessThan(third);
    expect(auto.slice(third).some((e) => e.type === 'tutorialStep')).toBe(false);
    expect(sh.summary.tutorialDone).toBe(true);
  });

  it('AIUTI on: a guide (pulse target) without the tutorial; off: none', () => {
    const on = make({ hints: true });
    advance(on, T.walkInMs + 100);
    on.takeOrder();
    expect(on.snapshot).toMatchObject({ tutorial: false, frozen: false, guide: { step: 'griddleBin', target: { kind: 'bin', id: 'manzo' } } });
    const off = make({ hints: false });
    advance(off, T.walkInMs + 100);
    off.takeOrder();
    expect(off.snapshot.guide).toBeNull();
    expect(off.snapshot.patience).toBeLessThan(1);
  });
});
