/**
 * Shared types of the level 7 logic (no Phaser, no DOM). Slots / baskets are indexed 0..n-1 in
 * the order of GRIDDLE.slots / FRYER.wells (src/art/kitchen/keys.ts).
 */
import type { CustomerId, DrinkId, FryItemId, GRIDDLE_ITEMS, IngredientId, SideId, StarterId } from '../../../art/kitchen/keys';
import type { BurgerId } from '../../../config/kitchenMenu';
import type { KitchenTicket } from '../../../contracts';

export type GriddleItemId = (typeof GRIDDLE_ITEMS)[number];
/** CRUDO -> PERFETTO -> troppo cotto -> BRUCIATO */
export type CookPhase = 'raw' | 'perfect' | 'over' | 'burnt';
/** What a cooked item is worth once taken off (burnt items only go in the bin). */
export type CookQuality = Exclude<CookPhase, 'burnt'>;
export type OrderForm = 'singolo' | 'menu';
/** A bin on the worktop: an ingredient pan, a sauce bottle or a fryer pan (fries / starter). */
export type BinId = IngredientId | SideId;
export type TrayPart = 'burger' | 'cone' | 'side' | 'drink';
export type Mood = 'neutral' | 'happy' | 'angry';

export type KitchenPhase = 'walkIn' | 'ordering' | 'cooking' | 'serving' | 'reaction' | 'walkOut' | 'finished';

/** What the deck rotates through: the burgers, starters and drinks of the menu and the regulars. */
export type SeenId = BurgerId | StarterId | DrinkId | CustomerId;
/** Times each one came in a served order, all shifts together: the deck favours the least seen, so a
 * few shifts show the whole menu and every regular. */
export type CookedCounts = Readonly<Partial<Record<SeenId, number>>>;

export interface KitchenOptions {
  seed: number;
  /** first run: orders 1-2 guided (pointer hand, hint lines, frozen patience) */
  tutorial: boolean;
  /** AIUTI: the next useful target pulses */
  hints: boolean;
  /** KitchenProgress: what earlier shifts served (none = a fresh player) */
  cooked?: CookedCounts;
}

/** What the worktop shows for one order: the needed bins plus a few decoys, in display order. */
export interface KitchenBins {
  griddle: readonly GriddleItemId[];
  fryer: readonly FryItemId[];
  cold: readonly IngredientId[];
  sauces: readonly IngredientId[];
  drinks: readonly DrinkId[];
}

export interface KitchenOrder {
  readonly index: number;
  readonly burger: BurgerId;
  /** "BRIE" */
  readonly name: string;
  readonly form: OrderForm;
  readonly customer: CustomerId;
  /** menù parts (null for a singolo); the fries are implied by the menù */
  readonly starter: StarterId | null;
  readonly drink: DrinkId | null;
  /** real price of this form, euro cents */
  readonly priceCents: number;
  /** what the customer says at the counter */
  readonly line: string;
  readonly bins: KitchenBins;
}

/** Something the player can tap; the scene turns it into screen coordinates. */
export type KitchenTarget =
  /** the big DOM button (PRENDI L'ORDINE / SERVI) */
  | { kind: 'action' }
  | { kind: 'bin'; id: BinId }
  /** the top-bun pan: closes the burger */
  | { kind: 'bun' }
  | { kind: 'griddle'; slot: number }
  | { kind: 'fryer'; basket: number }
  | { kind: 'drink'; id: DrinkId }
  | { kind: 'stackTop' }
  | { kind: 'tray'; part: TrayPart };

export type GuideStep =
  | 'order' | 'griddleBin' | 'waitFlip' | 'flip' | 'waitTake' | 'take' | 'hurry' | 'trash' | 'fryBin' | 'waitFry' | 'lift'
  | 'topping' | 'drink' | 'removeTop' | 'trayTrash' | 'close' | 'serve';

/** Next useful step (tutorial pointer + line, AIUTI pulse). wait = nothing to tap yet, just watch. */
export interface KitchenGuide {
  readonly step: GuideStep;
  readonly target: KitchenTarget;
  readonly text: string;
  readonly wait: boolean;
}

/** Cook ring of a slot / basket: ms on the current side and where the bands start. */
export interface CookRing {
  readonly ms: number;
  readonly perfectAtMs: number;
  /** end of the PERFETTO window */
  readonly overAtMs: number;
  readonly burntAtMs: number;
  readonly phase: CookPhase;
}

/** A griddle slot or a fryer basket with something in it. */
export interface CookSlotView<T extends string> extends CookRing {
  readonly item: T;
  /** 2 = burger patty (GIRA), 1 = bacon / guanciale / everything fried */
  readonly sides: 1 | 2;
  /** side cooking now */
  readonly side: 1 | 2;
  /** KITCHEN.griddleItem frame (GRIDDLE_ITEMS index * 5 + GRIDDLE_STATE) / KITCHEN.fryItem frame (FRY_ITEMS index * 3 + FRY_STATE) */
  readonly frame: number;
  /** what a tap does now (fryer: take = lift the basket) */
  readonly tap: 'flip' | 'take' | 'trash';
}
export type GriddleSlotView = CookSlotView<GriddleItemId>;
export type BasketView = CookSlotView<FryItemId>;

export interface StackLayer {
  readonly kind: IngredientId;
  /** cooked items only (griddle / fryer); null = cold ingredient or sauce */
  readonly quality: CookQuality | null;
  /** cheddar on a hot burger: drapes and melts */
  readonly melted: boolean;
  /** art to use: KITCHEN.layer (normal) or KITCHEN.layerCook raw / burnt ("troppo cotto") */
  readonly look: 'normal' | 'raw' | 'burnt';
  /** shift time it went on the stack */
  readonly atMs: number;
}

export interface TrayView {
  /** the wrapped burger's layers (bottom to top, buns excluded); null = no burger yet */
  readonly burger: readonly StackLayer[] | null;
  /** fries cup */
  readonly cone: CookQuality | null;
  readonly side: { readonly id: StarterId; readonly quality: CookQuality } | null;
  readonly drink: DrinkId | null;
}

export type Stars = 1 | 2 | 3 | 4 | 5;

export interface RatedResult {
  readonly kind: 'rated';
  readonly stars: Stars;
  readonly line: string;
  readonly mood: Mood;
  readonly priceCents: number;
  readonly tipCents: number;
  readonly points: number;
}
export type OrderResult = RatedResult | { readonly kind: 'angry'; readonly line: string };

export interface KitchenSnapshot {
  readonly phase: KitchenPhase;
  /** ms spent in this phase (tweens) */
  readonly phaseMs: number;
  readonly timeMs: number;
  readonly view: 'counter' | 'kitchen';
  /** current order 0..total-1 */
  readonly index: number;
  readonly total: number;
  readonly order: KitchenOrder | null;
  readonly customer: CustomerId | null;
  readonly mood: Mood;
  readonly say: { readonly text: string; readonly mood: Mood } | null;
  /** 0..1 while the customer waits (ordering, cooking); null otherwise */
  readonly patience: number | null;
  /** guided order: patience frozen */
  readonly frozen: boolean;
  readonly hearts: number;
  readonly score: number;
  /** multiplier the next 5-star order gets */
  readonly combo: number;
  readonly takingsCents: number;
  readonly served: number;
  readonly griddle: readonly (GriddleSlotView | null)[];
  readonly fryer: readonly (BasketView | null)[];
  /** layers on the bottom bun (buns excluded) */
  readonly stack: readonly StackLayer[];
  readonly tray: TrayView;
  readonly ticket: KitchenTicket | null;
  /** tutorial or AIUTI; null when both are off */
  readonly guide: KitchenGuide | null;
  /** tutorial order: draw the pointing hand and the hint line */
  readonly tutorial: boolean;
  /** SERVI enabled */
  readonly canServe: boolean;
  /** shown during reaction / walkOut */
  readonly result: OrderResult | null;
}

export type Station = 'griddle' | 'fryer';
/** full = no free slot / basket / stack room; trayFull = the burger is already wrapped or that tray place is taken */
export type NopeReason = 'full' | 'empty' | 'trayFull' | 'notCold' | 'noBurger';
export type TrashFrom = 'griddle' | 'fryer' | 'stack' | 'tray';
export type TrashTarget =
  | { from: 'griddle'; slot: number }
  | { from: 'fryer'; basket: number }
  | { from: 'tray'; part: TrayPart };

/** perfect = a slot / basket entered its PERFETTO window ("ding" + sparkle); burning = it left it
 * (troppo cotto, smoke starts); burnt = BRUCIATO, only the bin now. */
export type CookEvent =
  | { type: 'perfect' | 'burning'; station: Station; index: number }
  | { type: 'burnt'; station: Station; index: number; text: string };

export type KitchenEvent =
  | { type: 'phase'; phase: KitchenPhase }
  | { type: 'customerIn'; customer: CustomerId; index: number }
  | { type: 'say'; text: string; mood: Mood }
  | { type: 'ticketChanged'; ticket: KitchenTicket | null }
  | { type: 'griddlePlaced'; slot: number; item: GriddleItemId }
  | { type: 'flipped'; slot: number; item: GriddleItemId }
  | CookEvent
  | { type: 'griddleTaken'; slot: number; item: GriddleItemId; quality: CookQuality; text: string | null }
  | { type: 'fryDropped'; basket: number; item: FryItemId }
  | { type: 'fryLifted'; basket: number; item: FryItemId; quality: CookQuality; to: 'stack' | TrayPart; text: string | null }
  | { type: 'stacked'; layer: StackLayer; height: number }
  | { type: 'removed'; kind: IngredientId }
  /** the top bun is on: `stars` = the burger alone (no menù parts, no clock), shown before the wrap */
  | { type: 'wrapped'; stars: Stars }
  | { type: 'trayPut'; part: Exclude<TrayPart, 'burger'> }
  | { type: 'trashed'; from: TrashFrom; what: string }
  | { type: 'nope'; target: KitchenTarget; reason: NopeReason }
  | { type: 'served' }
  | ({ type: 'rated' } & Omit<RatedResult, 'kind'>)
  | { type: 'angryLeave'; text: string }
  | { type: 'heartLost'; hearts: number }
  | { type: 'combo'; combo: number; text: string }
  | { type: 'tutorialStep'; step: GuideStep; text: string; target: KitchenTarget }
  | { type: 'tutorialDone' }
  | { type: 'golden'; title: string }
  | { type: 'shiftEnd'; completed: boolean; stars: 0 | 1 | 2 | 3; title: string };

/** Points by source; their sum is the score. */
export interface KitchenPoints {
  orders: number;
  speed: number;
  perfect: number;
  combo: number;
}

/** Everything the results screen, achievements and records need from a finished shift. */
export interface KitchenShiftSummary {
  readonly seed: number;
  /** all 8 customers reached (false = TURNO CHIUSO) */
  readonly completed: boolean;
  readonly stars: 0 | 1 | 2 | 3;
  readonly golden: boolean;
  readonly score: number;
  readonly points: Readonly<KitchenPoints>;
  readonly total: number;
  readonly served: number;
  /** stars of every served order */
  readonly ratings: readonly number[];
  /** burger, starter, drink and regular of every served order (KitchenProgress counts them) */
  readonly seen: readonly SeenId[];
  readonly angry: number;
  readonly takingsCents: number;
  /** needed items served PERFETTO (burgers, bacon, fried) */
  readonly perfectCooks: number;
  /** of them: manzo / vegetale patties */
  readonly perfectPatties: number;
  /** bacon / guanciale strips served, and how many PERFETTO */
  readonly bacon: number;
  readonly perfectBacon: number;
  /** a menù order got 5 stars */
  readonly menuFive: boolean;
  /** orders with something raw / over-cooked / a wrong or missing item / a menù error / served slowly */
  readonly rawOrders: number;
  readonly overOrders: number;
  readonly wrongOrders: number;
  readonly menuErrors: number;
  readonly slowOrders: number;
  /** the guided orders were reached (mark the tutorial done) */
  readonly tutorialDone: boolean;
}
