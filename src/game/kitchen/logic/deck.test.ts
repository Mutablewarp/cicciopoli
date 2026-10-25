import { describe, expect, it } from 'vitest';
import { CUSTOMERS, DRINKS, SAUCES, SIDES, STARTERS } from '../../../art/kitchen/keys';
import { KITCHEN_CUSTOMERS, KITCHEN_DECK } from '../../../config/kitchen';
import { BURGERS, burger, menuStarters, STATION_OF, type BurgerId } from '../../../config/kitchenMenu';
import { buildDeck, seenOf } from './deck';
import { complexity, isFryItem, isIngredient, needs, priceOf } from './order';
import type { KitchenOrder, SeenId } from './types';
import { ACHIEVEMENT_TEXT, BANNER, BUTTON, CUSTOMER_NAME, LINE_VARIANTS, orderLine, plusEuro, REACTION, shareText, TIP_TEXT, tipLine } from './strings';

const SEEDS = Array.from({ length: 500 }, (_, i) => i * 7919 + 1);
const ALL = BURGERS.map((b) => b.id);
const fans = (id: BurgerId): string[] => CUSTOMERS.filter((c) => KITCHEN_CUSTOMERS[c].burgers.includes(id));

/** `n` shifts in a row, each one counting what the previous ones served, as KitchenProgress does in the game. */
function shifts(seed: number, n: number, firstRun: boolean): KitchenOrder[][] {
  const cooked = new Map<SeenId, number>();
  const out: KitchenOrder[][] = [];
  for (let i = 0; i < n; i++) {
    out.push(buildDeck(seed + i, firstRun && i === 0, Object.fromEntries(cooked)));
    for (const k of out[i].flatMap(seenOf)) cooked.set(k, (cooked.get(k) ?? 0) + 1);
  }
  return out;
}
const served = (decks: KitchenOrder[][], part: 'burger' | 'starter' | 'drink' | 'customer'): Set<string | null> =>
  new Set(decks.flat().map((o) => o[part]).filter((x) => x !== null));
const FORBIDDEN = /tesla|elon|spacex|starman|hulk|pac-?man|mondello/i;

describe('order deck', () => {
  it('opens with HAMBURGER singolo, CHEESEBURGER menù, BACON CHEESEBURGER singolo', () => {
    for (const seed of SEEDS) {
      const d = buildDeck(seed);
      expect(d).toHaveLength(8);
      expect(d.slice(0, 3).map((o) => [o.burger, o.form])).toEqual([
        ['hamburger', 'singolo'], ['cheeseburger', 'menu'], ['baconCheeseburger', 'singolo'],
      ]);
    }
  });

  it('after the tutorial: 3 distinct classic burgers, easiest first, 1-2 in menù, varying between shifts', () => {
    const openings = new Set<string>();
    for (const seed of SEEDS) {
      const d = buildDeck(seed, false);
      const open = d.slice(0, KITCHEN_DECK.openers);
      const ids = open.map((o) => o.burger);
      expect(new Set(ids).size).toBe(3);
      for (const id of ids) expect(burger(id).line).toBe('classic');
      for (let i = 1; i < ids.length; i++) expect(complexity(ids[i])).toBeGreaterThanOrEqual(complexity(ids[i - 1]));
      const menus = open.filter((o) => o.form === 'menu').length;
      expect(menus).toBeGreaterThanOrEqual(KITCHEN_DECK.openerMenus[0]);
      expect(menus).toBeLessThanOrEqual(KITCHEN_DECK.openerMenus[1]);
      // the rest of the shift is the same as with the tutorial
      expect(d.slice(3).map((o) => o.burger)).toEqual(buildDeck(seed).slice(3).map((o) => o.burger));
      openings.add(open.map((o) => o.burger + o.form).join());
    }
    expect(openings.size).toBeGreaterThan(12);
  });

  it("then 5 distinct Ciccio's burgers, easiest first, with a fried chicken, a double patty and 2-3 menù", () => {
    for (const seed of SEEDS) {
      const rest = buildDeck(seed).slice(3);
      const ids = rest.map((o) => o.burger);
      expect(new Set(ids).size).toBe(5);
      for (const id of ids) expect(burger(id).line).toBe('ciccios');
      expect(ids.some((id) => burger(id).ingredients.some((i) => STATION_OF[i] === 'fryer'))).toBe(true);
      expect(ids.some((id) => (needs(id).get('manzo') ?? 0) >= 2)).toBe(true);
      const menus = rest.filter((o) => o.form === 'menu').length;
      expect(menus).toBeGreaterThanOrEqual(2);
      expect(menus).toBeLessThanOrEqual(3);
      for (let i = 1; i < ids.length; i++) expect(complexity(ids[i])).toBeGreaterThanOrEqual(complexity(ids[i - 1]));
    }
  });

  it('uses only real menu items and prices; menù = burger + 5,00 €; green nuggets only with the GREEN', () => {
    for (const seed of SEEDS) {
      for (const o of buildDeck(seed)) {
        const b = BURGERS.find((x) => x.id === o.burger);
        expect(b?.name).toBe(o.name);
        expect(o.priceCents).toBe(o.form === 'menu' ? (b?.priceCents ?? 0) + 500 : b?.priceCents);
        expect(priceOf(o.burger, 'menu')).toBe(burger(o.burger).priceCents + 500);
        if (o.form === 'singolo') {
          expect([o.starter, o.drink]).toEqual([null, null]);
          continue;
        }
        expect(menuStarters(o.burger)).toContain(o.starter);
        if (o.starter === 'greenNuggets') expect(o.burger).toBe('green');
        expect(DRINKS).toContain(o.drink);
      }
    }
  });

  it('every order goes to a fan of that burger, 8 different regulars a shift; menù parts to their taste', () => {
    for (const seed of SEEDS) {
      const d = buildDeck(seed, seed % 2 === 0, seed % 3 === 0 ? {} : { kevin: 4, emma: 4, cocaCola: 2, meatball: 3 });
      expect(new Set(d.map((o) => o.customer)).size).toBe(8);
      for (const o of d) {
        const taste = KITCHEN_CUSTOMERS[o.customer];
        expect(taste.burgers).toContain(o.burger);
        if (o.drink) expect(taste.drinks).toContain(o.drink);
        if (o.starter) expect(taste.starters).toContain(o.starter);
      }
    }
  });

  it('the 10 regulars together order all 17 burgers, singolo and menù, every starter and every drink', () => {
    expect(Object.keys(KITCHEN_CUSTOMERS).sort()).toEqual([...CUSTOMERS].sort());
    expect(new Set(CUSTOMERS.flatMap((c) => KITCHEN_CUSTOMERS[c].burgers))).toEqual(new Set(ALL));
    expect(new Set(CUSTOMERS.flatMap((c) => KITCHEN_CUSTOMERS[c].starters))).toEqual(new Set(STARTERS));
    expect(new Set(CUSTOMERS.flatMap((c) => KITCHEN_CUSTOMERS[c].drinks))).toEqual(new Set(DRINKS));
    for (const id of ALL) expect(fans(id).length, id).toBe(id === 'green' ? 2 : 3);
    for (const d of DRINKS) expect(CUSTOMERS.filter((c) => KITCHEN_CUSTOMERS[c].drinks.includes(d)).length, d).toBe(3);
    for (const c of CUSTOMERS) {
      const t = KITCHEN_CUSTOMERS[c];
      expect(t.menu).toBeGreaterThan(0);
      expect(t.menu).toBeLessThanOrEqual(1);
      // a starter they like fits every burger they order (green nuggets only with the GREEN)
      for (const id of t.burgers) expect(menuStarters(id).some((s) => t.starters.includes(s)), `${c} ${id}`).toBe(true);
    }
    // the vegetarian only orders the GREEN, and gets the green nuggets in the menù
    expect(KITCHEN_CUSTOMERS.chiara).toMatchObject({ burgers: ['green'], starters: ['greenNuggets'] });
    expect(fans('green')).toEqual(['giulia', 'chiara']);
    expect(KITCHEN_CUSTOMERS.salvo.burgers).toEqual(expect.arrayContaining(['big', 'doubleTriple', 'oldSchool']));
    expect(KITCHEN_CUSTOMERS.tommaso.burgers).toEqual(expect.arrayContaining(['tale', 'zola', 'tuma', 'pancetta']));
    expect(fans('gomuGomu')).toContain('peppe');
    expect(KITCHEN_CUSTOMERS.emma.burgers).toEqual(expect.arrayContaining(['casaro', 'brie']));
    // and the decks really serve all of it
    const decks = SEEDS.flatMap((s) => buildDeck(s, false, s % 3 === 0 ? {} : { green: 0, hamburger: 5, cheeseburger: 5 }));
    expect(new Set(decks.map((o) => o.customer))).toEqual(new Set(CUSTOMERS));
    expect(new Set(decks.map((o) => o.burger))).toEqual(new Set(ALL));
    expect(new Set(decks.map((o) => o.form))).toEqual(new Set(['singolo', 'menu']));
    expect(new Set(decks.map((o) => o.starter).filter((x) => x !== null))).toEqual(new Set(STARTERS));
    expect(new Set(decks.map((o) => o.drink).filter((x) => x !== null))).toEqual(new Set(DRINKS));
    // big eaters take the menù more often than the classic lovers
    const menuShare = (c: string): number => {
      const mine = decks.filter((o) => o.customer === c);
      return mine.filter((o) => o.form === 'menu').length / mine.length;
    };
    expect(menuShare('salvo')).toBeGreaterThan(menuShare('rosalia'));
  });

  it('any 8 burgers a shift can draw find 8 different regulars (Hall: every k of them have >= k fans)', () => {
    const combos = <T>(a: readonly T[], k: number): T[][] => (k === 0 ? [[]] : a.flatMap((x, i) => combos(a.slice(i + 1), k - 1).map((r) => [x, ...r])));
    const line = (l: 'classic' | 'ciccios'): BurgerId[] => ALL.filter((id) => burger(id).line === l);
    const chicken = (id: BurgerId): boolean => burger(id).ingredients.some((i) => STATION_OF[i] === 'fryer');
    let decks = 0;
    for (const open of combos(line('classic'), KITCHEN_DECK.openers)) {
      for (const picks of combos(line('ciccios'), 5)) {
        if (!picks.some(chicken) || !picks.some((id) => (needs(id).get('manzo') ?? 0) >= 2)) continue;
        const ids = [...open, ...picks];
        decks++;
        for (let mask = 1; mask < 1 << ids.length; mask++) {
          const sub = ids.filter((_, i) => mask & (1 << i));
          expect(new Set(sub.flatMap(fans)).size, sub.join()).toBeGreaterThanOrEqual(sub.length);
        }
      }
    }
    expect(decks).toBe(2516);
  });

  it('favours what was served least: 3 shifts show all 17 burgers, every starter and regular; 5 every drink', () => {
    let drinksIn4 = 0;
    for (const seed of SEEDS) {
      for (const firstRun of [true, false]) {
        const career = shifts(seed, 5, firstRun);
        const three = career.slice(0, 3);
        expect(served(three, 'burger'), `seed ${seed}`).toEqual(new Set(ALL));
        expect(served(three, 'starter'), `seed ${seed}`).toEqual(new Set(STARTERS));
        expect(served(three, 'customer'), `seed ${seed}`).toEqual(new Set(CUSTOMERS));
        expect(served(career, 'drink'), `seed ${seed}`).toEqual(new Set(DRINKS));
        if (served(career.slice(0, 4), 'drink').size === DRINKS.length) drinksIn4++;
        // a regular never says the same thing as on their previous visit
        const last = new Map<string, string>();
        for (const o of career.flat()) {
          const said = o.line.replace(o.name, '#');
          expect(said, `${seed} ${o.customer}`).not.toBe(last.get(o.customer));
          last.set(o.customer, said);
        }
      }
    }
    // measured: 999 / 1000 careers have had all 10 drinks after 4 shifts
    expect(drinksIn4).toBeGreaterThanOrEqual(0.99 * 2 * SEEDS.length);
    // the one burger never served comes in the next shift
    for (const missing of ALL) {
      const cooked = Object.fromEntries(ALL.map((id) => [id, id === missing ? 0 : 4]));
      for (const seed of SEEDS.slice(0, 50)) expect(buildDeck(seed, false, cooked).map((o) => o.burger)).toContain(missing);
    }
  });

  it('shows every needed bin, decoys never include a needed item, the drink is on the shelf', () => {
    for (const seed of SEEDS) {
      for (const o of buildDeck(seed)) {
        const need = [...needs(o.burger).keys()];
        const { griddle, fryer, cold, sauces, drinks } = o.bins;
        const shown = [...griddle, ...fryer, ...cold, ...sauces];
        for (const k of need) expect(shown).toContain(k);
        expect(griddle.filter((k) => !need.includes(k))).toEqual([]);
        const decoys = [...cold, ...sauces].filter((k) => !need.includes(k)).length;
        expect(decoys).toBeLessThanOrEqual(KITCHEN_DECK.decoys[o.index]);
        expect(cold.length).toBeLessThanOrEqual(Math.max(KITCHEN_DECK.maxBins, need.filter((k) => STATION_OF[k] === 'bin').length));
        expect(griddle.length + fryer.length + cold.length).toBeLessThanOrEqual(KITCHEN_DECK.maxRail);
        expect(sauces.length).toBeLessThanOrEqual(KITCHEN_DECK.maxSauces);
        const menuParts = o.starter ? ['patatine', o.starter] : [];
        for (const k of fryer) {
          if (isIngredient(k)) expect(need).toContain(k);
          else expect(SIDES).toContain(k);
        }
        for (const k of menuParts) expect(fryer).toContain(k);
        for (const k of sauces) expect(SAUCES).toContain(k);
        for (const k of cold) expect(STATION_OF[k]).toBe('bin');
        expect(new Set(shown).size).toBe(shown.length);
        expect(drinks.length).toBe(4);
        expect(new Set(drinks).size).toBe(4);
        if (o.drink) expect(drinks).toContain(o.drink);
        expect(fryer.filter((k) => !isFryItem(k))).toEqual([]);
      }
    }
  });

  it('is deterministic per seed and differs between seeds', () => {
    expect(buildDeck(42)).toEqual(buildDeck(42));
    const keys = new Set(SEEDS.slice(0, 50).map((s) => buildDeck(s).map((o) => o.burger + o.form + o.customer).join()));
    expect(keys.size).toBeGreaterThan(40);
  });
});

describe('Italian texts', () => {
  it('order lines name the real burger and, in menù, the starter and the drink, in each regular\'s own voice', () => {
    for (const seed of SEEDS.slice(0, 100)) {
      for (const o of buildDeck(seed, seed % 2 === 0)) {
        expect(o.line).toContain(o.name);
        if (o.form === 'menu') expect(o.line).toMatch(/ in menù/);
      }
    }
    const menu = { starter: 'greenNuggets', drink: 'acquaNaturale' } as const;
    expect(orderLine('chiara', 'GREEN', 0, null)).toBe('Per me il GREEN, sono vegetariana!');
    expect(orderLine('chiara', 'GREEN', 0, menu)).toBe('Per me il GREEN in menù, sono vegetariana! Con green nuggets e acqua naturale.');
    expect(orderLine('tommaso', 'ZOLA', 0, null)).toBe('Ciccio, uno ZOLA: voglio proprio assaggiarlo!');
    expect(orderLine('peppe', 'GOMU GOMU', 1, null)).toBe('Ciccio, fammi un GOMU GOMU, ca sugnu affamatu!');
    expect(orderLine('emma', 'CASARO', 0, { starter: 'nuggets', drink: 'sprite' })).toBe('Hello Ciccio! Un CASARO in menù, con nuggets e Sprite, please!');
    expect(orderLine('rosalia', 'AMERICAN BACONCHEESE', 0, null)).toBe('Buongiorno Ciccio! Mi fai un AMERICAN BACONCHEESE? Grazie, gioia.');
    expect(orderLine('giulia', 'GREEN', 2, { starter: 'greenNuggets', drink: 'fuzePesca' })).toBe("Ho passato l'esame! Un GREEN in menù, con green nuggets e Fuze Tea pesca!");
    // ten different voices, three phrasings each
    for (let v = 0; v < LINE_VARIANTS; v++) expect(new Set(CUSTOMERS.map((c) => orderLine(c, 'BRIE', v, null))).size).toBe(CUSTOMERS.length);
    for (const c of CUSTOMERS) expect(new Set(Array.from({ length: LINE_VARIANTS }, (_, v) => orderLine(c, 'BRIE', v, null))).size, c).toBe(LINE_VARIANTS);
    for (const c of CUSTOMERS) expect(CUSTOMER_NAME[c].length).toBeGreaterThan(0);
    expect([CUSTOMER_NAME.rosalia, CUSTOMER_NAME.turi, CUSTOMER_NAME.chiara, CUSTOMER_NAME.emma]).toEqual(['Signora Rosalia', 'Nonno Turi', 'Chiara', 'Emma']);
  });

  it('reactions agree in number and never print a forbidden name', () => {
    expect(REACTION.missing('bacon')).toBe('Ma... e il bacon?');
    expect(REACTION.wrong('noci')).toBe('Ma che ci fanno le noci qui?');
    expect(REACTION.wrong('pomodoro')).toBe('Ma che ci fa il pomodoro qui?');
    expect(REACTION.wrongPart('cocaCola', 'fanta')).toBe('Avevo chiesto la Coca Cola, non la Fanta!');
    expect(shareText(12340)).toBe("Ho fatto 12.340 punti su Ciccio's Kitchen! Riesci a battermi?");
    expect([plusEuro(1490), tipLine(50), BUTTON.take]).toEqual(['+14,90 €', 'Mancia +0,50 €', "PRENDI L'ORDINE"]);
    const all = [
      ...CUSTOMERS.flatMap((c) => BURGERS.flatMap((b) => Array.from({ length: LINE_VARIANTS }, (_, v) => [
        orderLine(c, b.name, v, null), orderLine(c, b.name, v, { starter: 'nuggets', drink: 'cocaCola' }),
      ]).flat())),
      ...Object.values(BANNER), ...Object.values(ACHIEVEMENT_TEXT).flatMap((a) => [a.name, a.desc]),
      ...Object.values(TIP_TEXT).map((t) => (typeof t === 'string' ? t : t(100))),
      ...Object.values(REACTION.praise).flat(),
    ];
    for (const t of all) expect(t).not.toMatch(FORBIDDEN);
  });
});
