/**
 * The 8 orders of a shift (BRIEF §9), seeded: the guided opening 1 HAMBURGER singolo, 2 CHEESEBURGER
 * in menù, 3 BACON CHEESEBURGER singolo (after the tutorial: 3 classic burgers, easiest first, 1-2 in
 * menù), then 5 Ciccio's burgers of growing complexity (at least one fried chicken burger and one
 * double patty, 2-3 of them in menù). What earlier shifts served least comes first (`cooked`): the
 * burgers, then 8 different regulars who like them, the starters and drinks they pick in menù, and
 * each regular's next phrasing, so a few shifts show the whole menu. Only real menu items and prices.
 */
import { CUSTOMERS, DRINKS, INGREDIENTS, SAUCES, SIDES, type CustomerId, type DrinkId, type FryItemId, type SideId, type StarterId } from '../../../art/kitchen/keys';
import { KITCHEN_CUSTOMERS, KITCHEN_DECK, KITCHEN_SEED, KITCHEN_SHIFT } from '../../../config/kitchen';
import { BURGERS, burger, menuStarters, STATION_OF, type BurgerId } from '../../../config/kitchenMenu';
import { randInt, shuffled, streamRng, type Rng } from '../../rush/logic/rng';
import { complexity, isFryItem, isGriddleItem, needs, priceOf } from './order';
import { orderLine } from './strings';
import type { CookedCounts, KitchenBins, KitchenOrder, OrderForm, SeenId } from './types';

const OPENERS: readonly { id: BurgerId; form: OrderForm }[] = [
  { id: 'hamburger', form: 'singolo' },
  { id: 'cheeseburger', form: 'menu' },
  { id: 'baconCheeseburger', form: 'singolo' },
];

const CICCIOS = BURGERS.filter((b) => b.line === 'ciccios').map((b) => b.id);
const CLASSICS = BURGERS.filter((b) => b.line === 'classic').map((b) => b.id);
const isChicken = (id: BurgerId): boolean => burger(id).ingredients.some((i) => STATION_OF[i] === 'fryer');
const isDouble = (id: BurgerId): boolean => (needs(id).get('manzo') ?? 0) >= 2;
const byComplexity = (a: BurgerId, b: BurgerId): number => complexity(a) - complexity(b);

/** After the openers: distinct Ciccio's burgers (5 in a shift of 8). */
const PICKS = KITCHEN_SHIFT.customers - OPENERS.length;

/** Least seen first, random among equals (shuffled first: Array.prototype.sort is stable). `last`
 * sinks these among equals (the chicken / double burgers, required every shift, leave room for the rest). */
function favoured<T extends SeenId>(rng: Rng, ids: readonly T[], cooked: CookedCounts, last: (id: T) => boolean = () => false): T[] {
  const key = (id: T): number => 2 * (cooked[id] ?? 0) + (last(id) ? 1 : 0);
  return shuffled(rng, ids).sort((a, b) => key(a) - key(b));
}

function ciccios(rng: Rng, cooked: CookedCounts): BurgerId[] {
  const chicken = favoured(rng, CICCIOS.filter(isChicken), cooked)[0];
  const double = favoured(rng, CICCIOS.filter(isDouble), cooked)[0];
  const others = CICCIOS.filter((id) => id !== chicken && id !== double);
  const rest = favoured(rng, others, cooked, (id) => isChicken(id) || isDouble(id)).slice(0, PICKS - 2);
  return shuffled(rng, [chicken, double, ...rest]).sort(byComplexity);
}

/** The opening without the tutorial: distinct classic burgers, easiest first. */
function classics(rng: Rng, cooked: CookedCounts): BurgerId[] {
  return favoured(rng, CLASSICS, cooked).slice(0, KITCHEN_DECK.openers).sort(byComplexity);
}

/**
 * A fan of each burger, the least met first (among equals the narrowest taste: the vegetarian has one
 * burger to come for): a different regular for every order whenever their tastes allow it (bipartite
 * matching by augmenting paths), else a fan comes back, never twice in a row.
 */
function customers(rng: Rng, ids: readonly BurgerId[], cooked: CookedCounts): CustomerId[] {
  const taste = (c: CustomerId): number => KITCHEN_CUSTOMERS[c].burgers.length;
  const byVisits = shuffled(rng, CUSTOMERS).sort((a, b) => (cooked[a] ?? 0) - (cooked[b] ?? 0) || taste(a) - taste(b));
  const fans = ids.map((id) => byVisits.filter((c) => KITCHEN_CUSTOMERS[c].burgers.includes(id)));
  const seat = new Map<CustomerId, number>();
  const place = (i: number, tried: Set<CustomerId>): boolean =>
    fans[i].some((c) => {
      if (tried.has(c)) return false;
      tried.add(c);
      const held = seat.get(c);
      if (held !== undefined && !place(held, tried)) return false;
      seat.set(c, i);
      return true;
    });
  ids.forEach((_, i) => place(i, new Set()));
  const matched: (CustomerId | undefined)[] = ids.map(() => undefined);
  for (const [c, i] of seat) matched[i] = c;
  const out: CustomerId[] = [];
  ids.forEach((_, i) => out.push(matched[i] ?? fans[i].find((c) => c !== out[i - 1] && c !== matched[i + 1]) ?? fans[i][0]));
  return out;
}

/** The menù starters `customer` would pick with burger `id` (deck.test.ts: never none). */
const starters = (id: BurgerId, customer: CustomerId): StarterId[] => menuStarters(id).filter((s) => KITCHEN_CUSTOMERS[customer].starters.includes(s));

/**
 * lo..hi of these orders in menù: first an order that alone could bring a starter never served (the
 * green nuggets come only with the GREEN), then the ones that could bring a starter or a drink never
 * served, then the rest; within each, by the customers' menù weight (weighted sampling without replacement).
 */
function forms(rng: Rng, ids: readonly BurgerId[], who: readonly CustomerId[], [lo, hi]: readonly [number, number], cooked: CookedCounts): OrderForm[] {
  const n = lo + randInt(rng, hi - lo + 1);
  const fresh = ids.map((id, i) => starters(id, who[i]).filter((s) => !cooked[s]));
  const only = (i: number): boolean => fresh[i].some((s) => fresh.every((f, j) => j === i || !f.includes(s)));
  const unseen = (i: number): boolean => fresh[i].length > 0 || KITCHEN_CUSTOMERS[who[i]].drinks.some((d) => !cooked[d]);
  const key = who.map((c, i) => (only(i) ? 2 : unseen(i) ? 1 : 0) + rng() ** (1 / KITCHEN_CUSTOMERS[c].menu));
  const menus = new Set(who.map((_, i) => i).sort((a, b) => key[b] - key[a]).slice(0, n));
  return who.map((_, i) => (menus.has(i) ? 'menu' : 'singolo'));
}

function bins(rng: Rng, index: number, id: BurgerId, starter: SideId | null, drink: DrinkId | null): KitchenBins {
  const D = KITCHEN_DECK;
  const need = [...needs(id).keys()];
  const cold = need.filter((i) => STATION_OF[i] === 'bin');
  const sauces = need.filter((i) => STATION_OF[i] === 'sauce');
  const decoys = D.decoys[index] ?? D.decoys[D.decoys.length - 1];
  const sauceDecoys = Math.min(index >= D.sauceDecoyFrom && decoys > 0 ? 1 : 0, Math.max(0, D.maxSauces - sauces.length));
  const griddle = need.filter(isGriddleItem);
  const fryNeed: FryItemId[] = [];
  for (const i of need) if (isFryItem(i)) fryNeed.push(i);
  if (starter) fryNeed.push('patatine', starter);
  const coldDecoys = Math.max(0, Math.min(decoys - sauceDecoys, D.maxBins - cold.length));
  const coldPool = INGREDIENTS.filter((i) => STATION_OF[i] === 'bin' && !need.includes(i));
  const saucePool = SAUCES.filter((i) => !need.includes(i));
  const fryPool = SIDES.filter((s) => !fryNeed.includes(s));
  const fryDecoys = shuffled(rng, fryPool).slice(0, Math.max(0, Math.min(D.fryDecoys[index] ?? 0, D.maxCook - griddle.length - fryNeed.length)));
  const drinkPool = shuffled(rng, DRINKS.filter((d) => d !== drink));
  return {
    griddle,
    fryer: [...fryNeed, ...fryDecoys],
    cold: shuffled(rng, [...cold, ...shuffled(rng, coldPool).slice(0, coldDecoys)]),
    sauces: shuffled(rng, [...sauces, ...shuffled(rng, saucePool).slice(0, sauceDecoys)]),
    drinks: shuffled(rng, [...(drink ? [drink] : []), ...drinkPool].slice(0, D.drinkSlots)),
  };
}

/** What KitchenProgress counts of a served order (`cooked` of the next shifts). */
export function seenOf(o: Pick<KitchenOrder, 'burger' | 'customer' | 'starter' | 'drink'>): SeenId[] {
  return [o.burger, o.customer, o.starter, o.drink].filter((k): k is SeenId => k !== null);
}

/** `guided` = the tutorial's fixed opening (first run); `cooked` = what earlier shifts served. */
export function buildDeck(seed: number, guided = true, cooked: CookedCounts = {}): KitchenOrder[] {
  const deckRng = streamRng(seed, KITCHEN_SEED.deck);
  const openRng = streamRng(seed, KITCHEN_SEED.openers);
  const binRng = streamRng(seed, KITCHEN_SEED.bins);
  const picks = ciccios(deckRng, cooked);
  const open = guided ? OPENERS.map((o) => o.id) : classics(openRng, cooked);
  const ids = [...open, ...picks];
  const who = customers(streamRng(seed, KITCHEN_SEED.customers), ids, cooked);
  const k = open.length;
  const opening = guided ? OPENERS.map((o) => o.form) : forms(openRng, open, who.slice(0, k), KITCHEN_DECK.openerMenus, cooked);
  const form = [...opening, ...forms(deckRng, picks, who.slice(k), KITCHEN_DECK.menuCount, cooked)];
  // this shift counts too: two menù orders favour two different drinks, a regular's phrasing rotates
  const seen: Partial<Record<SeenId, number>> = { ...cooked };
  return ids.map((id, index) => {
    const customer = who[index];
    const menu = form[index] === 'menu';
    const starter = menu ? favoured(deckRng, starters(id, customer), seen)[0] : null;
    const drink = menu ? favoured(deckRng, KITCHEN_CUSTOMERS[customer].drinks, seen)[0] : null;
    const name = burger(id).name;
    const line = orderLine(customer, name, seen[customer] ?? 0, starter && drink ? { starter, drink } : null);
    for (const key of seenOf({ burger: id, customer, starter, drink })) seen[key] = (seen[key] ?? 0) + 1;
    return {
      index,
      burger: id,
      name,
      form: form[index],
      customer,
      starter,
      drink,
      priceCents: priceOf(id, form[index]),
      line,
      bins: bins(binRng, index, id, starter, drink),
    };
  });
}
