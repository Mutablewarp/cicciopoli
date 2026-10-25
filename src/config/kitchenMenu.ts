/**
 * The REAL Ciccio's Palermo menu (La Lumia / Sperlinga / Stadio), level 7 · CICCIO'S KITCHEN.
 * Source: https://api.cicciosburger.it/menu/static/menu.json, fetched 2026-10-24
 * (snapshot in ref/ciccios_menu_palermo.json). OWNER: integrator. Never invent a product, an
 * ingredient or a price here: names, ingredient lists (in the menu's order, "doppio" / "triplo"
 * expanded) and prices are the menu's. Beers are left out (family game, docs/BRIEF.md §9).
 * Pure data, no Phaser.
 */
import type { DrinkId, IngredientId, SideId, StarterId } from '../art/kitchen/keys';

export type BurgerId =
  | 'hamburger' | 'cheeseburger' | 'baconCheeseburger' | 'americanBaconcheese'
  | 'casaro' | 'crispyGoat' | 'brie' | 'gomuGomu' | 'tale' | 'tuma' | 'pancetta'
  | 'doubleTriple' | 'superCrispy' | 'green' | 'oldSchool' | 'big' | 'zola';

export interface BurgerDef {
  readonly id: BurgerId;
  /** as printed on the menu board */
  readonly name: string;
  readonly line: 'classic' | 'ciccios';
  /** PANINO SINGOLO price, euro cents */
  readonly priceCents: number;
  /** MENÙ price (real list: burger price + 5,00 €), euro cents */
  readonly menuPriceCents: number;
  /** what goes on the bottom bun, in the menu's order, repeats = "doppio" / "triplo" */
  readonly ingredients: readonly IngredientId[];
  /** the menu's own ingredient line */
  readonly text: string;
}

export const BURGERS: readonly BurgerDef[] = [
  { id: 'hamburger', name: 'HAMBURGER', line: 'classic', priceCents: 650, menuPriceCents: 1150,
    ingredients: ['manzo', 'salsaCiccios'], text: "bun, burger di manzo 170g, salsa Ciccio's" },
  { id: 'cheeseburger', name: 'CHEESEBURGER', line: 'classic', priceCents: 790, menuPriceCents: 1290,
    ingredients: ['manzo', 'cheddar', 'salsaCiccios'], text: "bun, burger di manzo 170g, cheddar, salsa Ciccio's" },
  { id: 'baconCheeseburger', name: 'BACON CHEESEBURGER', line: 'classic', priceCents: 890, menuPriceCents: 1390,
    ingredients: ['manzo', 'cheddar', 'bacon', 'salsaCiccios'], text: "bun, burger di manzo 170g, cheddar, bacon, salsa Ciccio's" },
  { id: 'americanBaconcheese', name: 'AMERICAN BACONCHEESE', line: 'classic', priceCents: 890, menuPriceCents: 1390,
    ingredients: ['manzo', 'cheddar', 'bacon', 'pomodoro', 'lattuga', 'salsaCiccios'],
    text: "bun, burger di manzo 170g, cheddar, bacon, pomodoro, lattuga, salsa Ciccio's" },
  { id: 'casaro', name: 'CASARO', line: 'ciccios', priceCents: 990, menuPriceCents: 1490,
    ingredients: ['manzo', 'songino', 'provola', 'cipollaCaramellata', 'salsaWhite', 'capuliato'],
    text: "bun, burger di manzo 170g, songino, provola, cipolla caramellata, salsa white Ciccio's, capuliato di pomodoro ciliegino" },
  { id: 'crispyGoat', name: 'CRISPY GOAT', line: 'ciccios', priceCents: 990, menuPriceCents: 1490,
    ingredients: ['polloPastellato', 'cheddar', 'bacon', 'lattuga', 'salsaCiccios'],
    text: "bun, burger di pollo pastellato e fritto, cheddar, bacon, lattuga, salsa Ciccio's" },
  { id: 'brie', name: 'BRIE', line: 'ciccios', priceCents: 990, menuPriceCents: 1490,
    ingredients: ['manzo', 'songino', 'brie', 'cipollaCaramellata', 'bacon', 'salsaCiccios'],
    text: "bun, burger di manzo 170g, songino, brie, cipolla caramellata, bacon, salsa Ciccio's" },
  { id: 'gomuGomu', name: 'GOMU GOMU', line: 'ciccios', priceCents: 990, menuPriceCents: 1490,
    ingredients: ['cosciaPanko', 'salsaJalapeno', 'lattuga', 'peperoncino'],
    text: 'bun, coscia di pollo marinata e fritta con panatura al panko, salsa special jalapeno, lattuga, peperoncino' },
  { id: 'tale', name: 'TALÈ', line: 'ciccios', priceCents: 990, menuPriceCents: 1490,
    ingredients: ['manzo', 'songino', 'taleggio', 'guanciale', 'pere', 'nocciole', 'salsaCiccios'],
    text: "bun, burger di manzo 170g, songino, taleggio, guanciale croccante, pere caramellate, nocciole, salsa Ciccio's" },
  { id: 'tuma', name: 'TUMA', line: 'ciccios', priceCents: 990, menuPriceCents: 1490,
    ingredients: ['manzo', 'songino', 'cipollaCaramellata', 'tuma', 'cipollaCroccante', 'salsaCiccios'],
    text: "bun, burger di manzo 170g, songino, cipolla caramellata, tuma caramellata al miele, cipolla croccante, salsa Ciccio's" },
  { id: 'pancetta', name: 'PANCETTA', line: 'ciccios', priceCents: 990, menuPriceCents: 1490,
    ingredients: ['manzo', 'songino', 'scamorza', 'pancetta', 'cipollaCaramellata', 'fichi', 'cipollaCroccante', 'salsaCiccios'],
    text: "bun, burger di manzo 170g, songino, scamorza, pancetta dolce, cipolla caramellata, confettura di fichi, cipolla croccante, salsa Ciccio's" },
  { id: 'doubleTriple', name: 'DOUBLE TRIPLE', line: 'ciccios', priceCents: 1190, menuPriceCents: 1690,
    ingredients: ['manzo', 'manzo', 'cheddar', 'cheddar', 'cheddar', 'bacon', 'bacon', 'salsaCiccios'],
    text: "bun, doppio burger di manzo 170g, triplo cheddar, doppio bacon, salsa Ciccio's" },
  { id: 'superCrispy', name: 'SUPER CRISPY', line: 'ciccios', priceCents: 990, menuPriceCents: 1490,
    ingredients: ['polloCroccante', 'lattuga', 'pomodoro', 'maionese'],
    text: 'bun, burger di pollo fritto con panatura super croccante, lattuga, pomodoro, maionese' },
  { id: 'green', name: 'GREEN', line: 'ciccios', priceCents: 990, menuPriceCents: 1490,
    ingredients: ['vegetale', 'lattuga', 'cheddar', 'cipollaCaramellata', 'salsaCiccios'],
    text: "bun, burger vegetale, lattuga, cheddar, cipolla caramellata, salsa Ciccio's" },
  { id: 'oldSchool', name: 'OLD SCHOOL', line: 'ciccios', priceCents: 990, menuPriceCents: 1490,
    ingredients: ['manzo', 'cheddar', 'cheddar', 'cipollaCaramellata', 'bacon', 'bacon', 'salsaWhite', 'salsaBbq'],
    text: "bun, burger di manzo 170g, doppio cheddar, cipolla caramellata, doppio bacon, salsa white Ciccio's, salsa bbq" },
  { id: 'big', name: 'BIG', line: 'ciccios', priceCents: 1190, menuPriceCents: 1690,
    ingredients: ['manzo', 'manzo', 'pomodoro', 'lattuga', 'cheddar', 'scamorza', 'bacon', 'salsaCiccios'],
    text: "bun, doppio burger di manzo 170g, pomodoro, lattuga, cheddar, scamorza, bacon, salsa Ciccio's" },
  { id: 'zola', name: 'ZOLA', line: 'ciccios', priceCents: 990, menuPriceCents: 1490,
    ingredients: ['manzo', 'songino', 'gorgonzola', 'pere', 'noci'],
    text: 'bun, burger di manzo 170g, songino, gorgonzola, pere caramellate, noci' },
];

export function burger(id: BurgerId): BurgerDef {
  const b = BURGERS.find((x) => x.id === id);
  if (!b) throw new Error(`unknown burger ${id}`);
  return b;
}

/** Real menù rule: "BURGER + PATATINE + STARTER*** + BIBITA, +5,00€ al costo del panino". */
export const MENU_RULE = {
  extraCents: 500,
  text: 'BURGER + PATATINE + STARTER + BIBITA',
  /** "*** Starters a scelta tra: nuggets, meatball, chicken pop corn, green nuggets (la variante green è solo per il menu Green)" */
  starters: ['nuggets', 'meatball', 'chickenPopCorn', 'greenNuggets'] as readonly StarterId[],
  greenOnly: 'greenNuggets' as StarterId,
  greenBurger: 'green' as BurgerId,
} as const;

/** Starters allowed in the menù of this burger (green nuggets only with the GREEN). */
export function menuStarters(id: BurgerId): readonly StarterId[] {
  return MENU_RULE.starters.filter((s) => s !== MENU_RULE.greenOnly || id === MENU_RULE.greenBurger);
}

/** Where each ingredient comes from in the kitchen. */
export type Station = 'griddle' | 'fryer' | 'bin' | 'sauce';
export const STATION_OF: Readonly<Record<IngredientId, Station>> = {
  manzo: 'griddle', vegetale: 'griddle', bacon: 'griddle', guanciale: 'griddle',
  polloPastellato: 'fryer', polloCroccante: 'fryer', cosciaPanko: 'fryer',
  cheddar: 'bin', brie: 'bin', provola: 'bin', taleggio: 'bin', tuma: 'bin', scamorza: 'bin', gorgonzola: 'bin',
  pancetta: 'bin', songino: 'bin', lattuga: 'bin', pomodoro: 'bin', cipollaCaramellata: 'bin',
  cipollaCroccante: 'bin', capuliato: 'bin', peperoncino: 'bin', pere: 'bin', fichi: 'bin', nocciole: 'bin', noci: 'bin',
  salsaCiccios: 'sauce', salsaWhite: 'sauce', salsaBbq: 'sauce', maionese: 'sauce', salsaJalapeno: 'sauce',
};

/** Ticket / bin label of each ingredient (Italian, as on the menu, short enough for a bin label). */
export const INGREDIENT_NAME: Readonly<Record<IngredientId, { short: string; full: string }>> = {
  manzo: { short: 'MANZO', full: 'burger di manzo 170g' },
  vegetale: { short: 'VEGETALE', full: 'burger vegetale' },
  polloPastellato: { short: 'POLLO PASTELLATO', full: 'burger di pollo pastellato e fritto' },
  polloCroccante: { short: 'POLLO CROCCANTE', full: 'burger di pollo con panatura super croccante' },
  cosciaPanko: { short: 'COSCIA PANKO', full: 'coscia di pollo con panatura al panko' },
  cheddar: { short: 'CHEDDAR', full: 'cheddar' },
  brie: { short: 'BRIE', full: 'brie' },
  provola: { short: 'PROVOLA', full: 'provola' },
  taleggio: { short: 'TALEGGIO', full: 'taleggio' },
  tuma: { short: 'TUMA AL MIELE', full: 'tuma caramellata al miele' },
  scamorza: { short: 'SCAMORZA', full: 'scamorza' },
  gorgonzola: { short: 'GORGONZOLA', full: 'gorgonzola' },
  bacon: { short: 'BACON', full: 'bacon' },
  guanciale: { short: 'GUANCIALE', full: 'guanciale croccante' },
  pancetta: { short: 'PANCETTA', full: 'pancetta dolce' },
  songino: { short: 'SONGINO', full: 'songino' },
  lattuga: { short: 'LATTUGA', full: 'lattuga' },
  pomodoro: { short: 'POMODORO', full: 'pomodoro' },
  cipollaCaramellata: { short: 'CIPOLLA CARAMELLATA', full: 'cipolla caramellata' },
  cipollaCroccante: { short: 'CIPOLLA CROCCANTE', full: 'cipolla croccante' },
  capuliato: { short: 'CAPULIATO', full: 'capuliato di pomodoro ciliegino' },
  peperoncino: { short: 'PEPERONCINO', full: 'peperoncino' },
  pere: { short: 'PERE CARAMELLATE', full: 'pere caramellate' },
  fichi: { short: 'CONFETTURA DI FICHI', full: 'confettura di fichi' },
  nocciole: { short: 'NOCCIOLE', full: 'nocciole' },
  noci: { short: 'NOCI', full: 'noci' },
  salsaCiccios: { short: "SALSA CICCIO'S", full: "salsa Ciccio's" },
  salsaWhite: { short: 'SALSA WHITE', full: "salsa white Ciccio's" },
  salsaBbq: { short: 'SALSA BBQ', full: 'salsa bbq' },
  maionese: { short: 'MAIONESE', full: 'maionese' },
  salsaJalapeno: { short: 'SALSA JALAPENO', full: 'salsa special jalapeno' },
};

/** Menù parts (fryer): names as on the menu. */
export const SIDE_NAME: Readonly<Record<SideId, string>> = {
  patatine: 'PATATINE',
  nuggets: 'NUGGETS',
  meatball: 'MEAT BALLS',
  chickenPopCorn: 'CHICKEN POP CORN',
  greenNuggets: 'GREEN NUGGETS VEGGIE',
};

/** Drinks as on the menu (sizes kept); in a menù they are included in the price. */
export const DRINK_NAME: Readonly<Record<DrinkId, string>> = {
  acquaNaturale: 'ACQUA NATURALE 50CL',
  acquaFrizzante: 'ACQUA FRIZZANTE 50CL',
  fuzePesca: 'FUZE TEA PESCA 33CL',
  fuzeLimone: 'FUZE TEA LIMONE 33CL',
  lemonSoda: 'LEMON SODA 33CL',
  sprite: 'SPRITE 33CL',
  fanta: 'FANTA 33CL',
  cocaCola: 'COCA COLA 33CL',
  cocaZero: 'COCA COLA ZERO 33CL',
  chinotto: 'CHINOTTO 20CL',
};

/** "14,90 €" */
export function euro(cents: number): string {
  const e = Math.floor(cents / 100);
  return `${e},${String(cents % 100).padStart(2, '0')} €`;
}
