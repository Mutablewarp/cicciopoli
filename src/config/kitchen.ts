/**
 * Every number of level 7 · CICCIO'S KITCHEN (BRIEF §9). Units: ms for timers, euro cents for money.
 * Tuned for a human on a phone (src/game/kitchen/logic/playability.test.ts): an attentive player
 * makes 5-star orders, a sloppy one gets 2-3 stars, nobody needs superhuman speed.
 * Pure data, no Phaser.
 */
import type { CustomerId, DrinkId, FryItemId, GRIDDLE_ITEMS, StarterId } from '../art/kitchen/keys';
import type { BurgerId } from './kitchenMenu';

type GriddleItemId = (typeof GRIDDLE_ITEMS)[number];

/** One turno (shift). */
export const KITCHEN_SHIFT = {
  customers: 8,
  hearts: 3,
  /** longest frame integrated at once (a stalled tab must not burn every patty) */
  maxStepMs: 50,
  /** first run: orders 0..tutorialOrders-1 are guided, their patience frozen */
  tutorialOrders: 2,
} as const;

/** Phase lengths and camera moves; the scene animates inside them. */
export const KITCHEN_TIMING = {
  /** doorbell, the customer walks to the counter */
  walkInMs: 1400,
  /** camera slide counter <-> kitchen (the scene's tween length) */
  cameraMs: 600,
  /** SERVI: camera back to the counter, the tray slides over it */
  servingMs: 1300,
  /** stars, reaction line, price and tip */
  reactionMs: 2600,
  /** the angry customer's line before leaving */
  angryMs: 2400,
  walkOutMs: 1100,
  /** a skip (tap on the bubble) works only after this long in the phase */
  skipMinMs: 300,
} as const;

/** Patience of a customer, running while ordering and cooking (not in guided orders). */
export const KITCHEN_PATIENCE = {
  baseMs: 26_000,
  /** per ingredient on the bun (DOUBLE TRIPLE: 8) */
  perItemMs: 1500,
  /** menù: fries, starter and drink to prepare */
  menuMs: 6000,
  /** per layer that cooks first (the second patty, the bacon, the chicken): big burgers are not a cliff */
  perCookMs: 3000,
} as const;

export interface CookSpec {
  /** cooking time until the PERFETTO window opens */
  readonly perfectAtMs: number;
  readonly windowMs: number;
  /** "troppo cotto" after the window, then BRUCIATO */
  readonly overMs: number;
}

/** PIASTRA: 3 slots; burgers cook 2 sides, bacon / guanciale one side and faster. */
export const KITCHEN_GRIDDLE = {
  slots: 3,
  /** taps on a slot this soon after it changed are ignored (no double-tap flip-and-take) */
  tapGuardMs: 250,
  /** side 1 shows the 'cooking' frame (GRIDDLE_STATE) after this share of perfectAtMs, 'raw' before */
  cookingLookAt: 0.5,
  sides: { manzo: 2, vegetale: 2, bacon: 1, guanciale: 1 } as Readonly<Record<GriddleItemId, 1 | 2>>,
  cook: {
    manzo: { perfectAtMs: 4000, windowMs: 2200, overMs: 2500 },
    vegetale: { perfectAtMs: 4000, windowMs: 2200, overMs: 2500 },
    bacon: { perfectAtMs: 2800, windowMs: 2000, overMs: 2200 },
    guanciale: { perfectAtMs: 2800, windowMs: 2000, overMs: 2200 },
  } as Readonly<Record<GriddleItemId, CookSpec>>,
} as const;

/** FRIGGITRICE: 2 baskets; chicken burgers take longer than fries and starters. */
export const KITCHEN_FRYER = {
  baskets: 2,
  tapGuardMs: 250,
  cook: {
    polloPastellato: { perfectAtMs: 6000, windowMs: 2400, overMs: 2500 },
    polloCroccante: { perfectAtMs: 6000, windowMs: 2400, overMs: 2500 },
    cosciaPanko: { perfectAtMs: 6000, windowMs: 2400, overMs: 2500 },
    patatine: { perfectAtMs: 4500, windowMs: 2400, overMs: 2500 },
    nuggets: { perfectAtMs: 4000, windowMs: 2400, overMs: 2500 },
    meatball: { perfectAtMs: 4000, windowMs: 2400, overMs: 2500 },
    chickenPopCorn: { perfectAtMs: 4000, windowMs: 2400, overMs: 2500 },
    greenNuggets: { perfectAtMs: 4000, windowMs: 2400, overMs: 2500 },
  } as Readonly<Record<FryItemId, CookSpec>>,
} as const;

/** The AIUTI / tutorial guide: a wanted item on the griddle / fryer this close to PERFETTO keeps the player at the
 * stations (on a phone the board is a page away: the hand-off, the glide, a look, a topping and the tab back take
 * ~3 s at 1 tap a second; at 2500 a menù with a fried chicken burger sent the player to the board and back to lift
 * the starter before any tap there). */
export const KITCHEN_GUIDE = { holdMs: 4000 } as const;

/** MONTAGGIO. */
export const KITCHEN_STACK = {
  /** ingredient layers between the buns (DOUBLE TRIPLE needs 8) */
  maxLayers: 14,
  /** cheddar melts on a griddle / fryer item put on the stack this recently (or on melted cheddar) */
  meltWindowMs: 12_000,
} as const;

/** The order deck (seeded). Arrays are per order index 0..7. */
export const KITCHEN_DECK = {
  /** decoy ingredient bins next to the needed ones (never a needed item) */
  decoys: [0, 1, 2, 2, 3, 3, 4, 4],
  /** one of the decoys is a sauce bottle from this order on */
  sauceDecoyFrom: 2,
  /** v7 (adult fingers: fewer, bigger pans): most cold pans the deck sends to MONTAGGIO (needed + decoys; the
   * smallest plan has this many places, a bigger one fills its spare place with one more decoy, never more than
   * 8 pans), most sauce bottles (the order's + at most one decoy), most raw pans on COTTURA (griddle + fryer,
   * needed first: a burger needs at most 4 with its menù) */
  maxBins: 6,
  maxSauces: 2,
  maxCook: 5,
  /** decoy fryer bins (fries / starters the order does not want) */
  fryDecoys: [0, 0, 1, 1, 1, 2, 2, 2],
  /** places on the drinks shelf */
  drinkSlots: 4,
  /** how many of the 5 Ciccio's burgers come in menù: min..max (which ones: those that could bring a starter or a
   * drink never served first, then by the customers' menù weight) */
  menuCount: [2, 3],
  /** after the tutorial the shift opens with this many classic burgers (the least cooked, easiest first), min..max in menù */
  openers: 3,
  openerMenus: [1, 2],
} as const;

export interface CustomerProfile {
  /** the slice of the real menu this regular orders (3 fans a burger, the GREEN 2: any 8 burgers of a shift find 8 different regulars) */
  readonly burgers: readonly BurgerId[];
  /** weight (> 0) of being one of the shift's menù orders; low = mostly singolo */
  readonly menu: number;
  /** favourite menù starters (green nuggets only count with the GREEN) and drinks */
  readonly starters: readonly StarterId[];
  readonly drinks: readonly DrinkId[];
}

/**
 * The 10 regulars (keys.ts CUSTOMERS): together they order all 17 burgers, singolo and menù, every
 * starter and every drink, each drink liked by 3 of them (deck.test.ts). Names and voices: logic/strings.ts.
 */
export const KITCHEN_CUSTOMERS: Readonly<Record<CustomerId, CustomerProfile>> = {
  // classic lover, mostly singolo; the mild BRIE too
  rosalia: { burgers: ['hamburger', 'cheeseburger', 'americanBaconcheese', 'brie'], menu: 0.3, starters: ['meatball'], drinks: ['acquaNaturale', 'chinotto', 'fuzePesca'] },
  // old-style classics and the Sicilian cheeses
  turi: { burgers: ['hamburger', 'baconCheeseburger', 'casaro', 'tale', 'tuma', 'oldSchool'], menu: 0.3, starters: ['meatball'], drinks: ['chinotto', 'acquaFrizzante', 'fanta'] },
  // student: light burgers, the GREEN too, menù deals
  giulia: { burgers: ['cheeseburger', 'baconCheeseburger', 'superCrispy', 'green'], menu: 0.7, starters: ['chickenPopCorn', 'greenNuggets'], drinks: ['fuzePesca', 'fuzeLimone', 'cocaZero'] },
  // big eater: BIG, DOUBLE TRIPLE, OLD SCHOOL, PANCETTA, CRISPY GOAT, nearly always in menù
  salvo: { burgers: ['baconCheeseburger', 'americanBaconcheese', 'crispyGoat', 'doubleTriple', 'oldSchool', 'big', 'pancetta'], menu: 0.9, starters: ['meatball', 'nuggets'], drinks: ['cocaCola', 'fanta', 'sprite'] },
  // sporty chicken fan, the DOUBLE TRIPLE after training
  martina: { burgers: ['crispyGoat', 'superCrispy', 'gomuGomu', 'doubleTriple'], menu: 0.6, starters: ['chickenPopCorn', 'nuggets'], drinks: ['cocaZero', 'lemonSoda', 'fuzePesca'] },
  // teenager: cheese, crispy chicken, spicy, double patties
  kevin: { burgers: ['hamburger', 'cheeseburger', 'crispyGoat', 'gomuGomu', 'doubleTriple', 'big'], menu: 0.8, starters: ['nuggets', 'chickenPopCorn'], drinks: ['fanta', 'sprite', 'cocaCola'] },
  // vegetarian: the GREEN, green nuggets in the menù
  chiara: { burgers: ['green'], menu: 0.6, starters: ['greenNuggets'], drinks: ['acquaNaturale', 'fuzeLimone', 'acquaFrizzante'] },
  // gourmet: TALÈ, ZOLA, TUMA, PANCETTA, BRIE
  tommaso: { burgers: ['brie', 'tale', 'tuma', 'pancetta', 'zola'], menu: 0.4, starters: ['meatball'], drinks: ['acquaFrizzante', 'chinotto', 'lemonSoda'] },
  // spicy lover from the port: GOMU GOMU, the Sicilian burgers, strong flavours
  peppe: { burgers: ['gomuGomu', 'casaro', 'tuma', 'oldSchool', 'zola'], menu: 0.5, starters: ['meatball', 'chickenPopCorn'], drinks: ['cocaCola', 'lemonSoda', 'fuzeLimone'] },
  // tourist: CASARO, BRIE, the specialities, the BIG and the SUPER CRISPY
  emma: { burgers: ['americanBaconcheese', 'superCrispy', 'casaro', 'brie', 'tale', 'pancetta', 'zola', 'big'], menu: 0.6, starters: ['chickenPopCorn', 'nuggets'], drinks: ['cocaZero', 'sprite', 'acquaNaturale'] },
};

/** Star penalties of one order: stars = floor(5 - sum), 1..5 (5 = flawless). */
export const KITCHEN_RATING = {
  missing: 1,
  /** the patty / chicken left out: worse than a raw one */
  missingMain: 3,
  wrong: 1,
  extra: 0.5,
  raw: 2,
  /** per over-cooked item, at most overMax for the whole order (one "Bruciacchiato") */
  over: 0.5,
  overMax: 1,
  /** menù: fries / starter / drink missing or wrong, raw or over-fried */
  menuMissing: 1,
  menuWrong: 1,
  menuRaw: 1,
  menuOver: 0.5,
  /** patience left below `below` at SERVI: penalty */
  slow: [
    { below: 0.15, penalty: 1 },
    { below: 0.3, penalty: 0.5 },
  ],
} as const;

/** Points: the real price leads, then speed, PERFETTO cooks and the 5-star combo. */
export const KITCHEN_SCORE = {
  /** order points = price cents x this x stars / 5 */
  pointsPerCent: 1,
  /** speed bonus = patience left x this (orders with at least speedMinStars) */
  speedMax: 400,
  speedMinStars: 3,
  /** every needed item served PERFETTO */
  perfectCook: 100,
  /** consecutive 5-star orders: x1, x1.5, x2 … up to comboMax */
  comboStep: 0.5,
  comboMax: 3,
  /** tips (takings only): 4+ stars with this much patience left */
  tipPatience: 0.5,
  tipCents: 50,
  /** 5 stars and this much patience: the big tip */
  bigTipPatience: 0.7,
  bigTipCents: 100,
  /** results tip "Ti mancavano N punti per il tuo record!" when a finished shift missed it by at most this */
  recordTipGap: 1000,
} as const;

/** Shift stars (BRIEF §9). */
export const KITCHEN_STARS = {
  /** 1 star: this many customers served with at least oneMinRating */
  oneServed: 3,
  oneMinRating: 3,
  /** 2 stars: all served, average >= twoAvg; 3 stars: all served, average >= threeAvg, nobody angry */
  twoAvg: 3.5,
  threeAvg: 4.5,
} as const;

/** Achievements: PIASTRA D'ORO = this many PERFETTO burgers served (all shifts together). */
export const KITCHEN_ACHIEVE = { goldPatties: 10 } as const;

export const KITCHEN_STORE = { key: 'cicciopoli.kitchen.v1' } as const;

/** Salts of the independent random streams of one seed. */
export const KITCHEN_SEED = { deck: 0x9e3779b9, customers: 0x85ebca6b, bins: 0x27d4eb2f, openers: 0x165667b1 } as const;
