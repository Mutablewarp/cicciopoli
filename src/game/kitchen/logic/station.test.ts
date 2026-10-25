import { describe, expect, it } from 'vitest';
import { FRY_ITEMS, FRY_STATE, GRIDDLE_ITEMS, GRIDDLE_STATE } from '../../../art/kitchen/keys';
import { KITCHEN_FRYER, KITCHEN_GRIDDLE, KITCHEN_STACK } from '../../../config/kitchen';
import { burger } from '../../../config/kitchenMenu';
import { Bench } from './bench';
import { cookPhase, makeFryer, makeGriddle } from './station';
import type { CookEvent, KitchenEvent } from './types';

const always = (): boolean => true;
const sink = (): CookEvent[] => [];
/** Advances a station by `ms` in 50 ms frames; returns the cook events. */
function run(st: { step(dt: number, out: { push(e: CookEvent): number }): void }, ms: number): CookEvent[] {
  const out = sink();
  for (let t = 0; t < ms; t += 50) st.step(Math.min(50, ms - t), out);
  return out;
}

describe('PIASTRA', () => {
  const M = KITCHEN_GRIDDLE.cook.manzo;

  it('a patty goes CRUDO -> PERFETTO -> troppo cotto -> BRUCIATO with an event at every change', () => {
    expect(cookPhase(M, M.perfectAtMs - 1)).toBe('raw');
    expect(cookPhase(M, M.perfectAtMs)).toBe('perfect');
    expect(cookPhase(M, M.perfectAtMs + M.windowMs)).toBe('over');
    expect(cookPhase(M, M.perfectAtMs + M.windowMs + M.overMs)).toBe('burnt');
    const g = makeGriddle();
    expect(g.put('manzo')).toBe(0);
    const ev = run(g, M.perfectAtMs + M.windowMs + M.overMs);
    expect(ev.map((e) => e.type)).toEqual(['perfect', 'burning', 'burnt']);
    expect(ev[2]).toMatchObject({ station: 'griddle', index: 0, text: 'BRUCIATO!' });
    expect(g.view()[0]).toMatchObject({ phase: 'burnt', tap: 'trash', frame: GRIDDLE_STATE.burnt });
    expect(g.tap(0, always)).toEqual({ kind: 'trashed', item: 'manzo' });
    expect(g.view()[0]).toBeNull();
  });

  it('burgers need GIRA: flip in the window, take when side 2 is perfect', () => {
    const g = makeGriddle();
    g.put('manzo');
    run(g, M.perfectAtMs + M.windowMs / 2);
    expect(g.view()[0]).toMatchObject({ tap: 'flip', side: 1, phase: 'perfect' });
    expect(g.tap(0, always)).toEqual({ kind: 'flipped', item: 'manzo' });
    expect(g.tap(0, always)).toEqual({ kind: 'guard' });
    expect(g.view()[0]).toMatchObject({ tap: 'take', side: 2, phase: 'raw', ms: 0 });
    run(g, M.perfectAtMs + 100);
    expect(g.tap(0, always)).toEqual({ kind: 'taken', item: 'manzo', quality: 'perfect' });
  });

  it('the served quality is the worse side: a raw flip stays raw, an over side spoils a perfect one', () => {
    const g = makeGriddle();
    g.put('manzo');
    run(g, 1000);
    g.tap(0, always);
    run(g, M.perfectAtMs + 100);
    expect(g.tap(0, always)).toMatchObject({ quality: 'raw' });
    g.put('vegetale');
    run(g, M.perfectAtMs + 100);
    g.tap(0, always);
    run(g, M.perfectAtMs + M.windowMs + 100);
    expect(g.tap(0, always)).toMatchObject({ item: 'vegetale', quality: 'over' });
  });

  it('bacon and guanciale cook one side, faster than a patty', () => {
    const B = KITCHEN_GRIDDLE.cook.bacon;
    expect(B.perfectAtMs).toBeLessThan(M.perfectAtMs);
    expect(KITCHEN_GRIDDLE.sides).toMatchObject({ bacon: 1, guanciale: 1, manzo: 2, vegetale: 2 });
    const g = makeGriddle();
    g.put('bacon');
    run(g, B.perfectAtMs + 50);
    expect(g.view()[0]).toMatchObject({ tap: 'take', sides: 1 });
    expect(g.tap(0, always)).toEqual({ kind: 'taken', item: 'bacon', quality: 'perfect' });
  });

  it('3 slots; a ready item with nowhere to go stays on the griddle; frames follow the manifest', () => {
    const g = makeGriddle();
    expect([g.put('manzo'), g.put('manzo'), g.put('bacon'), g.put('bacon')]).toEqual([0, 1, 2, null]);
    run(g, KITCHEN_GRIDDLE.cook.bacon.perfectAtMs + 50);
    expect(g.tap(2, () => false)).toEqual({ kind: 'blocked' });
    expect(g.view()[2]?.frame).toBe(GRIDDLE_ITEMS.indexOf('bacon') * GRIDDLE_STATE.count + GRIDDLE_STATE.perfect);
    expect(g.view()[0]?.frame).toBe(GRIDDLE_STATE.cooking);
    expect(g.tap(9, always)).toEqual({ kind: 'empty' });
    expect(g.trash(1)).toBe('manzo');
    expect(g.trash(1)).toBeNull();
  });
});

describe('FRIGGITRICE', () => {
  it('2 baskets; chicken burgers take longer than fries and starters; lift when golden', () => {
    const C = KITCHEN_FRYER.cook;
    expect(C.polloPastellato.perfectAtMs).toBeGreaterThan(C.patatine.perfectAtMs);
    expect(C.cosciaPanko.perfectAtMs).toBeGreaterThan(C.nuggets.perfectAtMs);
    const f = makeFryer();
    expect([f.put('patatine'), f.put('cosciaPanko'), f.put('nuggets')]).toEqual([0, 1, null]);
    run(f, 300);
    expect(f.tap(0, always)).toEqual({ kind: 'taken', item: 'patatine', quality: 'raw' });
    run(f, C.cosciaPanko.perfectAtMs);
    expect(f.view()[1]).toMatchObject({ phase: 'perfect', tap: 'take', frame: FRY_ITEMS.indexOf('cosciaPanko') * FRY_STATE.count + FRY_STATE.perfect });
    expect(f.tap(1, always)).toEqual({ kind: 'taken', item: 'cosciaPanko', quality: 'perfect' });
  });

  it('a forgotten basket burns and can only go in the bin', () => {
    const S = KITCHEN_FRYER.cook.meatball;
    const f = makeFryer();
    f.put('meatball');
    const ev = run(f, S.perfectAtMs + S.windowMs + S.overMs);
    expect(ev.map((e) => e.type)).toEqual(['perfect', 'burning', 'burnt']);
    expect(f.view()[0]).toMatchObject({ tap: 'trash', frame: FRY_ITEMS.indexOf('meatball') * FRY_STATE.count + FRY_STATE.burnt });
    expect(f.tap(0, () => false)).toEqual({ kind: 'trashed', item: 'meatball' });
  });
});

describe('MONTAGGIO and tray', () => {
  const types = (ev: KitchenEvent[]): string[] => ev.map((e) => e.type);

  it('adds layers, takes the top one back off, closes with the top bun', () => {
    const b = new Bench();
    const ev: KitchenEvent[] = [];
    b.addToStack('salsaCiccios', 0, ev);
    b.addToStack('lattuga', 0, ev);
    b.addToStack('manzo', 0, ev);
    expect(types(ev)).toEqual(['stacked', 'stacked', 'nope']);
    expect(ev[2]).toMatchObject({ reason: 'notCold' });
    b.removeTop(ev);
    expect(b.stack.layers.map((l) => l.kind)).toEqual(['salsaCiccios']);
    expect(ev.slice(3).map((e) => e.type)).toEqual(['removed', 'trashed']);
    b.closeBurger(ev, () => 4);
    expect(ev[ev.length - 1]).toEqual({ type: 'wrapped', stars: 4 });
    expect(b.tray.burger?.map((l) => l.kind)).toEqual(['salsaCiccios']);
    expect(b.stack.layers).toEqual([]);
    const late: KitchenEvent[] = [];
    b.addToStack('cheddar', 0, late);
    b.closeBurger(late, () => 5);
    b.removeTop(late);
    expect(late.map((e) => e.type === 'nope' && e.reason)).toEqual(['trayFull', 'trayFull', 'empty']);
  });

  it('cheddar melts on a hot patty (and on melted cheddar), not on a cold layer or a cold patty', () => {
    const b = new Bench();
    const ev: KitchenEvent[] = [];
    b.griddle.put('manzo');
    b.step(KITCHEN_GRIDDLE.cook.manzo.perfectAtMs + 100, ev);
    b.flipOrTake(0, 0, ev);
    b.step(KITCHEN_GRIDDLE.cook.manzo.perfectAtMs + 100, ev);
    b.flipOrTake(0, 1000, ev);
    b.addToStack('cheddar', 2000, ev);
    b.addToStack('cheddar', 2500, ev);
    b.addToStack('lattuga', 3000, ev);
    b.addToStack('cheddar', 3500, ev);
    expect(b.stack.layers.map((l) => [l.kind, l.quality, l.melted])).toEqual([
      ['manzo', 'perfect', false], ['cheddar', null, true], ['cheddar', null, true], ['lattuga', null, false], ['cheddar', null, false],
    ]);
    const cold = new Bench();
    cold.griddle.put('manzo');
    cold.step(20_000, ev);
    cold.trashItem({ from: 'griddle', slot: 0 }, ev);
    cold.stack.add('manzo', 'perfect', 0);
    cold.addToStack('cheddar', KITCHEN_STACK.meltWindowMs + 1, ev);
    expect(cold.stack.layers[1].melted).toBe(false);
  });

  it("every wanted layer slides into its place of the menu's order; wrong, extra and raw ones stay on top", () => {
    const b = new Bench();
    const ev: KitchenEvent[] = [];
    b.stack.recipe = burger('baconCheeseburger').ingredients;
    const cooked = (item: 'manzo' | 'bacon', at: number): void => {
      b.griddle.put(item);
      b.step(KITCHEN_GRIDDLE.cook[item].perfectAtMs + 100, ev);
      b.flipOrTake(b.griddle.view().findIndex((v) => v?.item === item), at, ev);
    };
    b.addToStack('salsaCiccios', 0, ev);
    b.addToStack('cheddar', 100, ev);
    cooked('bacon', 200);
    b.addToStack('lattuga', 300, ev);
    cooked('manzo', 400); // GIRA, then take: the patty goes under everything
    b.step(KITCHEN_GRIDDLE.cook.manzo.perfectAtMs + 100, ev);
    b.flipOrTake(0, 600, ev);
    b.addToStack('cheddar', 700, ev);
    expect(b.stack.layers.map((l) => l.kind)).toEqual(['manzo', 'cheddar', 'bacon', 'salsaCiccios', 'lattuga', 'cheddar']);
    // the cheddar taken while the patty cooked melts once the patty slides under it
    expect(b.stack.layers[1].melted).toBe(true);
    b.removeTop(ev);
    b.removeTop(ev);
    expect(b.stack.layers.map((l) => l.kind)).toEqual(['manzo', 'cheddar', 'bacon', 'salsaCiccios']);
    const raw = new Bench();
    raw.stack.recipe = burger('hamburger').ingredients;
    raw.addToStack('salsaCiccios', 0, ev);
    raw.stack.add('manzo', 'raw', 0);
    raw.stack.add('manzo', 'perfect', 0);
    expect(raw.stack.layers.map((l) => [l.kind, l.quality])).toEqual([['manzo', 'perfect'], ['salsaCiccios', null], ['manzo', 'raw']]);
  });

  it('the stack holds at most maxLayers; fries go in the cup, the starter in its box, drinks swap', () => {
    const b = new Bench();
    const ev: KitchenEvent[] = [];
    for (let i = 0; i < KITCHEN_STACK.maxLayers + 2; i++) b.addToStack('lattuga', 0, ev);
    expect(b.stack.layers).toHaveLength(KITCHEN_STACK.maxLayers);
    expect(ev[ev.length - 1]).toMatchObject({ type: 'nope', reason: 'full' });
    b.dropInFryer('patatine', ev);
    b.dropInFryer('nuggets', ev);
    b.step(KITCHEN_FRYER.cook.patatine.perfectAtMs + 100, ev);
    b.lift(0, 0, ev);
    b.lift(1, 0, ev);
    expect(b.tray.cone).toBe('perfect');
    expect(b.tray.side).toEqual({ id: 'nuggets', quality: 'perfect' });
    b.pickDrink('fanta', ev);
    b.pickDrink('cocaCola', ev);
    expect(b.tray.drink).toBe('cocaCola');
    b.dropInFryer('patatine', ev);
    b.step(KITCHEN_FRYER.cook.patatine.perfectAtMs + 100, ev);
    b.lift(0, 0, ev);
    expect(ev[ev.length - 1]).toMatchObject({ type: 'nope', reason: 'trayFull' });
    b.trashItem({ from: 'tray', part: 'cone' }, ev);
    b.lift(0, 0, ev);
    expect(ev[ev.length - 2]).toMatchObject({ type: 'fryLifted', to: 'cone', text: 'PERFETTO!' });
    b.trashItem({ from: 'tray', part: 'burger' }, ev);
    expect(ev[ev.length - 1]).toMatchObject({ type: 'nope', reason: 'empty' });
  });
});
