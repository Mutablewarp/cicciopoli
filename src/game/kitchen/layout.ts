/**
 * The CUCINA layout of one order on a plan (pure, no Phaser): where the stations, pans, bottles, drinks,
 * tray, board and burger go, the decoys in the places the order leaves free, and the tap targets.
 * Plan px = world px of the kitchen view (its container sits kitchenOffset() right of the counter).
 */
import { BIN, FRY_ITEMS, FRYER, GRIDDLE, GRIDDLE_ITEMS, INGREDIENTS, KITCHEN, LAYER_H, PAPER, SHEET_SPEC, SHELF, TRAY, type DrinkId, type LayerKind } from '../../art/kitchen/keys';
import { STATION_OF } from '../../config/kitchenMenu';
import { DRINK, LABEL, PAN, TRAY_CUTS } from './config';
import { inRect, type Point, type Rect } from './framing';
import { isFryItem, isGriddleItem } from './logic/order';
import type { BinId, KitchenBins, KitchenTarget, TrayPart } from './logic/types';
import { pageOfX, type BoardArt, type Box, type KitchenPlan, type PageArt } from './plan';

export interface BinPlace {
  readonly id: BinId | 'bun';
  readonly kind: 'pan' | 'bottle' | 'bun';
  /** top-left of the pan (drawn at art.pan) */
  readonly x: number;
  readonly y: number;
  /** centre top of the label tape (drawn at art.label) */
  readonly label: Point;
  readonly hit: Rect;
  readonly art: PageArt;
}

export interface DrinkPlace {
  readonly id: DrinkId;
  /** bottom-centre of the can (drawn at `can`, its label tape's top-centre there too) */
  readonly at: Point;
  readonly can: number;
  readonly label: Point;
  readonly hit: Rect;
  readonly art: PageArt;
}

export interface KitchenLayout {
  readonly plan: KitchenPlan;
  /** the burger, its paper, the tray and the trash */
  readonly art: BoardArt;
  readonly griddle: Point;
  readonly fryer: Point;
  readonly tray: Point;
  readonly trash: Point;
  readonly paper: Point;
  readonly board: Rect;
  readonly panel: Rect;
  /** drinks racks (top-left), drawn at the COTTURA page's pan scale */
  readonly shelves: readonly Point[];
  readonly shelfScale: number;
  /** centre of each griddle slot, top-left of each fryer well */
  readonly slots: readonly Point[];
  readonly wells: readonly Point[];
  /** the whole griddle / fryer cut in one column per slot / basket */
  readonly slotHit: readonly Rect[];
  readonly basketHit: readonly Rect[];
  /** the order's pans and bottles, CHIUDI, and in every pan place it leaves free a decoy: a real, labelled,
   * tappable menu item it does not need (a wrong tap makes a wrong layer or a wasted fry), like Good Pizza's; a
   * bottle place it leaves free holds a cold decoy pan (never an empty pan that reads as "missing", never a 2nd decoy bottle) */
  readonly bins: readonly BinPlace[];
  readonly drinks: readonly DrinkPlace[];
  /** bottom-centre of the burger on its paper */
  readonly stackBase: Point;
  /** bottom-centre anchors of what stands on the tray, and the tap area of each place */
  readonly trayAt: Readonly<Record<TrayPart, Point>>;
  readonly trayHit: Readonly<Record<TrayPart, Rect>>;
}

/** a drink can's height, art px */
const CAN_H = SHEET_SPEC[KITCHEN.drink][1];
/** frills over the top layer's body (lettuce edges, crumbs), art px */
export const FRILLS = 3;
/** label tape height of two lines, font px (1 px of tape round the text) */
export const TAPE_H2 = 2 * LABEL.lineH + 1;

/** Drawing scale of a burger with these layers: the plan's stack scale, less (in quarter steps) when the closed burger would not fit its room. */
export function stackScale(kinds: readonly LayerKind[], art: BoardArt, room: number): number {
  const h = LAYER_H.bunBottom + LAYER_H.bunTop + FRILLS + kinds.reduce((a, k) => a + LAYER_H[k], 0);
  return Math.min(art.stack, Math.floor((room / h) * 4) / 4);
}

const TRAY_PARTS: readonly TrayPart[] = ['burger', 'cone', 'side', 'drink'];
/** stack tap area (art px x the stack scale): half width, air above the top layer */
const STACK_HALF_W = 24;
const STACK_AIR = 4;

/** The page art of a plan x. */
const artAt = (plan: KitchenPlan, x: number): PageArt => plan.pages[pageOfX(plan, x)].art;

function place(plan: KitchenPlan, id: BinId | 'bun', kind: BinPlace['kind'], c: Box): BinPlace {
  const art = artAt(plan, c.x);
  const lip = Math.min(PAN.dy + PAN.lip * art.pan, c.h - TAPE_H2 * art.label);
  // a place taller than its pan and label tape holds them in its middle
  const top = c.y + Math.max(0, (c.h - lip - TAPE_H2 * art.label) / 2);
  return {
    id,
    kind,
    x: c.x + (c.w - BIN.w * art.pan) / 2,
    y: top + PAN.dy * art.pan,
    label: { x: c.x + c.w / 2, y: top + lip },
    hit: { x: c.x, y: c.y, w: c.w, h: c.h },
    art,
  };
}

const centreOf = (b: Box): Point => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
const dist2 = (a: Point, b: Point): number => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

/** The order's pans in their places: the cooking ones on their station's rail (the other station's when it is
 * full, nearest first), the cold ones round the board. Returns the free places of each kind. */
function fill(plan: KitchenPlan, bins: KitchenBins): { pans: BinPlace[]; cook: Box[]; cold: Box[] } {
  const taken = new Set<Box>();
  const pans: BinPlace[] = [];
  const put = (ids: readonly BinId[], rails: readonly (readonly Box[])[], at: Point): void => {
    for (const id of ids) {
      const c = rails.map((cells) => cells.filter((x) => !taken.has(x)).sort((a, b) => dist2(centreOf(a), at) - dist2(centreOf(b), at))[0]).find((x) => x !== undefined);
      if (!c) continue;
      taken.add(c);
      pans.push(place(plan, id, 'pan', c));
    }
  };
  const { griddleRail, fryRail, coldRail } = plan;
  put(bins.griddle, [griddleRail, fryRail], centreOf({ ...plan.griddle, w: GRIDDLE.w, h: GRIDDLE.h }));
  put(bins.fryer, [fryRail, griddleRail], centreOf({ ...plan.fryer, w: FRYER.w, h: FRYER.h }));
  for (const id of bins.cold) {
    const c = coldRail.find((x) => !taken.has(x));
    if (!c) continue;
    taken.add(c);
    pans.push(place(plan, id, 'pan', c));
  }
  const free = (cells: readonly Box[]): Box[] => cells.filter((c) => !taken.has(c));
  return { pans, cook: free([...griddleRail, ...fryRail]), cold: free(coldRail) };
}

/** What a free place holds: next to the griddle what it cooks, next to the fryer what fries (each the other's
 * when its own run out), round the board the cold toppings. */
const COLD_POOL: readonly BinId[] = INGREDIENTS.filter((i) => STATION_OF[i] === 'bin');

/** A decoy in each free pan place (things the order does not show, a different pick per order, never twice). */
function decoys(plan: KitchenPlan, cook: readonly Box[], cold: readonly Box[], shown: readonly BinId[]): BinPlace[] {
  const used = new Set<BinId>(shown);
  const from = [...shown.join('')].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const take = (pools: readonly (readonly BinId[])[]): BinId | undefined => {
    for (const pool of pools) {
      const id = pool.map((_, i) => pool[(from + i) % pool.length]).find((x) => !used.has(x));
      if (id) {
        used.add(id);
        return id;
      }
    }
    return undefined;
  };
  const griddle = new Set(plan.griddleRail);
  const pans: BinPlace[] = [];
  for (const c of cook) {
    const id = take(griddle.has(c) ? [GRIDDLE_ITEMS, FRY_ITEMS] : [FRY_ITEMS, GRIDDLE_ITEMS]);
    if (id) pans.push(place(plan, id, 'pan', c));
  }
  for (const c of cold) {
    const id = take([COLD_POOL]);
    if (id) pans.push(place(plan, id, 'pan', c));
  }
  return pans;
}

/** One column per slot / basket across a station (boundaries half way between the centres). */
function columns(x: number, y: number, w: number, h: number, centres: readonly number[]): Rect[] {
  const cuts = [0, ...centres.slice(1).map((c, i) => (c + centres[i]) / 2), w];
  return centres.map((_, i) => ({ x: x + cuts[i], y, w: cuts[i + 1] - cuts[i], h }));
}

export function kitchenLayout(plan: KitchenPlan, bins: KitchenBins): KitchenLayout {
  const g = plan.griddle;
  const f = plan.fryer;
  const t = plan.tray;
  const art = plan.art;
  const { pans, cook, cold } = fill(plan, bins);
  const sauces = bins.sauces.slice(0, plan.sauces.length);
  const shown = [...bins.griddle, ...bins.fryer, ...bins.cold, ...sauces];
  const extra = decoys(plan, cook, [...cold, ...plan.sauces.slice(sauces.length)], shown);
  const bottles = sauces.map((id, i) => place(plan, id, 'bottle', plan.sauces[i]));
  const out: BinPlace[] = [...pans, ...bottles, ...extra, place(plan, 'bun', 'bun', plan.bun)];
  const cookArt = plan.pages[1].art;
  const shelfScale = cookArt.pan;
  // a can stands on its rack over the middle of its place, as big as the place leaves over its label tape (at the bottom
  // of the place, over the rack's front); a rack under each pair of places, its floor under the cans
  const floor = (hit: Box): number => hit.y + hit.h - TAPE_H2 * cookArt.label;
  const drinks = bins.drinks.slice(0, plan.drinks.length).map((id, i): DrinkPlace => {
    const hit = plan.drinks[i];
    const at = { x: hit.x + hit.w / 2, y: floor(hit) };
    const can = Math.min(DRINK.canMax * shelfScale, (at.y - hit.y) / CAN_H);
    return { id, at, label: { ...at }, hit: { ...hit }, art: cookArt, can };
  });
  const shelves = plan.drinks.flatMap((a, i) => {
    const b = plan.drinks[i + 1];
    if (i % 2 || !b) return [];
    return [{ x: (a.x + b.x + b.w) / 2 - (SHELF.w * shelfScale) / 2, y: floor(a) - SHELF.slots[0].y * shelfScale }];
  });
  const ts = art.tray;
  const trayAt = Object.fromEntries(TRAY_PARTS.map((p) => [p, { x: t.x + TRAY[p].x * ts, y: t.y + TRAY[p].y * ts }])) as Record<TrayPart, Point>;
  const cuts = [0, ...TRAY_CUTS];
  const trayHit = Object.fromEntries(
    TRAY_PARTS.map((p, i) => [p, { x: t.x + cuts[i] * ts, y: t.y, w: (cuts[i + 1] - cuts[i]) * ts, h: TRAY.h * ts }]),
  ) as Record<TrayPart, Rect>;
  const rect = (b: Box): Rect => ({ x: b.x, y: b.y, w: b.w, h: b.h });
  return {
    plan,
    art,
    griddle: { ...g },
    fryer: { ...f },
    tray: { ...t },
    trash: { ...plan.trash },
    paper: { ...plan.paper },
    board: rect(plan.board),
    panel: rect(plan.panel),
    shelves,
    shelfScale,
    slots: GRIDDLE.slots.map((s) => ({ x: g.x + s.x, y: g.y + s.y })),
    wells: FRYER.wells.map((w) => ({ x: f.x + w.x, y: f.y + w.y })),
    slotHit: columns(g.x, g.y, GRIDDLE.w, GRIDDLE.h, GRIDDLE.slots.map((s) => s.x)),
    basketHit: columns(f.x, f.y, FRYER.w, FRYER.h, FRYER.wells.map((w) => w.x + FRYER.well.w / 2)),
    bins: out,
    drinks,
    stackBase: { x: plan.paper.x + PAPER.baseX * art.paper, y: plan.paper.y + PAPER.baseY * art.paper },
    trayAt,
    trayHit,
  };
}

/** The burger's tap area (the stack's top layer; null: nothing on the bun). */
function stackRect(l: KitchenLayout, stackTop: number | null): Rect {
  const s = l.stackBase;
  const k = l.art.stack;
  const top = stackTop ?? s.y - 10 * k;
  const bottom = s.y + (PAPER.h - PAPER.baseY) * l.art.paper;
  // never shorter than MONTAGGIO's smallest tap side (a bare bun is a thin target)
  const h = Math.max(bottom - top + STACK_AIR * k, l.plan.pages[0].hit);
  return { x: s.x - STACK_HALF_W * k, y: bottom - h, w: 2 * STACK_HALF_W * k, h };
}

/**
 * What a tap at world point (x, y) of the kitchen hits. `stackTop` = world y of the top of the burger on
 * the paper (null: nothing on the bun). Wrapped burgers on the tray are not tappable.
 */
export function hitKitchen(l: KitchenLayout, x: number, y: number, stackTop: number | null): KitchenTarget | null {
  const slot = l.slotHit.findIndex((r) => inRect(r, x, y));
  if (slot >= 0) return { kind: 'griddle', slot };
  const basket = l.basketHit.findIndex((r) => inRect(r, x, y));
  if (basket >= 0) return { kind: 'fryer', basket };
  const bin = l.bins.find((b) => inRect(b.hit, x, y));
  if (bin) return bin.id === 'bun' ? { kind: 'bun' } : { kind: 'bin', id: bin.id };
  const drink = l.drinks.find((d) => inRect(d.hit, x, y));
  if (drink) return { kind: 'drink', id: drink.id };
  const part = TRAY_PARTS.find((p) => p !== 'burger' && inRect(l.trayHit[p], x, y));
  if (part) return { kind: 'tray', part };
  if (stackTop !== null && inRect(stackRect(l, stackTop), x, y)) return { kind: 'stackTop' };
  return null;
}

/** Where a target sits (pointer hand, AIUTI pulse, nope shake); null for the DOM action button. */
export function targetRect(l: KitchenLayout, t: KitchenTarget, stackTop: number | null): Rect | null {
  switch (t.kind) {
    case 'action':
      return null;
    case 'bin':
      return l.bins.find((b) => b.id === t.id)?.hit ?? null;
    case 'bun':
      return l.bins.find((b) => b.id === 'bun')?.hit ?? null;
    case 'griddle':
      return l.slotHit[t.slot] ?? null;
    case 'fryer':
      return l.basketHit[t.basket] ?? null;
    case 'drink':
      return l.drinks.find((d) => d.id === t.id)?.hit ?? null;
    case 'tray':
      return l.trayHit[t.part];
    case 'stackTop':
      return stackRect(l, stackTop);
  }
}

/** Where a picked-up source goes: the griddle, the fryer, the board (the burger), the tray; null = nowhere to drag it. */
export function destination(l: KitchenLayout, t: KitchenTarget): Rect | null {
  if (t.kind === 'drink') return { ...l.tray, w: TRAY.w * l.art.tray, h: TRAY.h * l.art.tray };
  if (t.kind === 'bun') return l.board;
  if (t.kind !== 'bin') return null;
  if (isGriddleItem(t.id)) return { ...l.griddle, w: GRIDDLE.w, h: GRIDDLE.h };
  if (isFryItem(t.id)) return { ...l.fryer, w: FRYER.w, h: FRYER.h };
  return l.board;
}
