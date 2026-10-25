import { describe, expect, it } from 'vitest';
import type { IngredientId } from '../../../art/kitchen/keys';
import { KITCHEN_SCORE } from '../../../config/kitchen';
import { burger, type BurgerId } from '../../../config/kitchenMenu';
import { buildDeck } from './deck';
import { isCooked } from './order';
import { rateOrder } from './rating';
import { breakdown, comboFor, scoreOrder, shiftStars } from './score';
import { emptyTray, type Tray } from './stack';
import type { CookQuality, KitchenOrder, StackLayer } from './types';

const layer = (kind: IngredientId, quality: CookQuality | null = isCooked(kind) ? 'perfect' : null): StackLayer => ({
  kind, quality, melted: false, look: quality === 'raw' ? 'raw' : quality === 'over' ? 'burnt' : 'normal', atMs: 0,
});
const order = (id: BurgerId, menu: { starter: 'nuggets' | 'meatball'; drink: 'cocaCola' | 'fanta' } | null = null): KitchenOrder => ({
  ...buildDeck(1)[0], burger: id, name: burger(id).name, form: menu ? 'menu' : 'singolo',
  starter: menu?.starter ?? null, drink: menu?.drink ?? null,
});
/** The burger exactly as the menu lists it, everything cooked PERFETTO. */
const perfect = (id: BurgerId): StackLayer[] => burger(id).ingredients.map((k) => layer(k));
const tray = (burgerLayers: StackLayer[], parts: Partial<Tray> = {}): Tray => ({ ...emptyTray(), burger: burgerLayers, ...parts });
const MENU = { starter: 'nuggets', drink: 'cocaCola' } as const;
const fullMenu: Partial<Tray> = { cone: 'perfect', side: { id: 'nuggets', quality: 'perfect' }, drink: 'cocaCola' };

describe('rateOrder', () => {
  it('a flawless burger is 5 stars with praise; PERFETTO cooks are counted', () => {
    const r = rateOrder(order('doubleTriple'), tray(perfect('doubleTriple')), 0.8, 0);
    expect(r.stars).toBe(5);
    expect(r.line).toBe('MIZZICA, CHE BONTÀ!');
    expect(r.mood).toBe('happy');
    expect([r.perfect, r.perfectPatties, r.bacon, r.perfectBacon]).toEqual([4, 2, 2, 2]);
    expect(rateOrder(order('hamburger'), tray(perfect('hamburger')), 1, 1).line).toBe('Talìa che panino!');
  });

  it('layer order does not matter (a multiset), menù parts included', () => {
    const r = rateOrder(order('brie', MENU), tray(perfect('brie').reverse(), fullMenu), 0.9, 0);
    expect(r.stars).toBe(5);
    expect(r.perfect).toBe(4);
  });

  it('missing, wrong and extra layers: -1, -1, -0.5 with the first issue speaking', () => {
    const noBacon = perfect('baconCheeseburger').filter((l) => l.kind !== 'bacon');
    const r = rateOrder(order('baconCheeseburger'), tray(noBacon), 1, 0);
    expect([r.stars, r.line, r.wrong]).toEqual([4, 'Ma... e il bacon?', true]);
    const wrong = rateOrder(order('hamburger'), tray([...perfect('hamburger'), layer('pomodoro')]), 1, 0);
    expect([wrong.stars, wrong.line]).toEqual([4, 'Ma che ci fa il pomodoro qui?']);
    const extra = rateOrder(order('hamburger'), tray([...perfect('hamburger'), layer('salsaCiccios')]), 1, 0);
    expect([extra.stars, extra.line]).toEqual([4, 'Bello carico... troppo, però!']);
  });

  it('raw costs 2 stars ("È crudo!"); over-cooked 0.5 each, capped at 1 ("Bruciacchiato... vabbè.")', () => {
    const raw = perfect('cheeseburger').map((l) => (l.kind === 'manzo' ? layer('manzo', 'raw') : l));
    expect(rateOrder(order('cheeseburger'), tray(raw), 1, 0)).toMatchObject({ stars: 3, line: 'È crudo!', raw: true, mood: 'neutral' });
    const over = perfect('doubleTriple').map((l) => (isCooked(l.kind) ? layer(l.kind, 'over') : l));
    expect(rateOrder(order('doubleTriple'), tray(over), 1, 0)).toMatchObject({ stars: 4, line: 'Bruciacchiato... vabbè.', over: true, perfect: 0 });
  });

  it('menù parts: missing, wrong starter / drink, raw fries', () => {
    const o = order('cheeseburger', MENU);
    const b = perfect('cheeseburger');
    expect(rateOrder(o, tray(b), 1, 0)).toMatchObject({ stars: 2, line: 'Ma... e le patatine?', menuError: true });
    expect(rateOrder(o, tray(b, { ...fullMenu, side: { id: 'meatball', quality: 'perfect' } }), 1, 0))
      .toMatchObject({ stars: 4, line: 'Avevo chiesto i nuggets, non le meat balls!' });
    expect(rateOrder(o, tray(b, { ...fullMenu, drink: 'fanta' }), 1, 0)).toMatchObject({ stars: 4, line: 'Avevo chiesto la Coca Cola, non la Fanta!' });
    expect(rateOrder(o, tray(b, { ...fullMenu, cone: 'raw' }), 1, 0)).toMatchObject({ stars: 4, line: 'Le patatine sono crude!' });
    expect(rateOrder(order('cheeseburger'), tray(b, { drink: 'fanta' }), 1, 0).stars).toBe(4);
  });

  it('slow service costs stars; the rating never goes below 1', () => {
    const b = perfect('hamburger');
    expect(rateOrder(order('hamburger'), tray(b), 0.2, 0)).toMatchObject({ stars: 4, slow: true, line: 'Finalmente! Che attesa...' });
    expect(rateOrder(order('hamburger'), tray(b), 0.1, 0).stars).toBe(4);
    expect(rateOrder(order('hamburger'), tray(b), 0.31, 0).stars).toBe(5);
    const junk = rateOrder(order('pancetta', MENU), tray([layer('manzo', 'raw'), layer('noci'), layer('noci')]), 0, 0);
    expect(junk).toMatchObject({ stars: 1, mood: 'angry', line: 'È crudo!' });
    expect(rateOrder(order('hamburger'), { ...emptyTray(), burger: [] }, 1, 0)).toMatchObject({ stars: 1, line: 'Ma... e la carne?' });
    const noPatty = perfect('cheeseburger').filter((l) => l.kind !== 'manzo');
    expect(rateOrder(order('cheeseburger'), tray(noPatty), 1, 0).stars).toBe(2);
  });
});

describe('points and shift stars', () => {
  const r5 = rateOrder(order('brie'), tray(perfect('brie')), 1, 0);

  it('order points follow the real price and the stars; speed, PERFETTO and tips on top', () => {
    const s = scoreOrder(r5, 990, 0.8, 1);
    expect(s.orders).toBe(990);
    expect(s.speed).toBe(Math.round(0.8 * KITCHEN_SCORE.speedMax));
    expect(s.perfect).toBe(2 * KITCHEN_SCORE.perfectCook);
    expect([s.combo, s.tipCents]).toEqual([0, KITCHEN_SCORE.bigTipCents]);
    expect(s.total).toBe(s.orders + s.speed + s.perfect + s.combo);
    const r2 = rateOrder(order('brie'), tray([layer('manzo')]), 1, 0);
    expect(r2.stars).toBe(1);
    expect(scoreOrder(r2, 990, 1, 0)).toMatchObject({ orders: 198, speed: 0, tipCents: 0 });
  });

  it('combo: x1, x1.5, x2 … capped; only 5-star orders get it', () => {
    expect([1, 2, 3, 5, 20].map(comboFor)).toEqual([1, 1.5, 2, 3, KITCHEN_SCORE.comboMax]);
    const s = scoreOrder(r5, 990, 0.5, 3);
    expect(s.combo).toBe(Math.round((s.orders + s.speed + s.perfect) * 1));
  });

  it('shift stars: 1 = 3 served with 3+, 2 = all served avg 3.5, 3 = all served avg 4.5 nobody angry', () => {
    const base = { completed: true, served: 8, total: 8, angry: 0 };
    expect(shiftStars({ ...base, ratings: [5, 5, 5, 5, 4, 4, 5, 4] })).toBe(3);
    expect(shiftStars({ ...base, ratings: [5, 5, 5, 4, 4, 4, 4, 4] })).toBe(2);
    expect(shiftStars({ ...base, ratings: [3, 3, 3, 4, 4, 4, 4, 4] })).toBe(2);
    expect(shiftStars({ ...base, ratings: [3, 3, 3, 3, 3, 3, 3, 3] })).toBe(1);
    expect(shiftStars({ ...base, served: 7, angry: 1, ratings: [5, 5, 5, 5, 5, 5, 5] })).toBe(1);
    expect(shiftStars({ ...base, completed: false, served: 2, angry: 3, ratings: [5, 5] })).toBe(0);
    expect(shiftStars({ ...base, ratings: [2, 2, 3, 2, 3, 2, 2, 2] })).toBe(0);
  });

  it('breakdown rows add up to the score and hide an empty combo row', () => {
    const p = { orders: 9000, speed: 1800, perfect: 1500, combo: 0 };
    expect(breakdown(p).map((r) => r.label)).toEqual(['Panini serviti', 'Velocità', 'Cotture perfette']);
    const q = { ...p, combo: 4040 };
    expect(breakdown(q).reduce((a, r) => a + r.points, 0)).toBe(16_340);
  });
});
