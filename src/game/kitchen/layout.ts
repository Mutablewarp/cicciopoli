/**
 * Pure geometry of level 7 (no Phaser): the camera framing in the free part of the game host
 * (left of the landscape ticket column, under the portrait ticket, above the action button; the
 * counter's part: counterFrame.ts), the CUCINA layout of one order (stations, pans, sauces, drinks,
 * tray, board, decoy and locked pans) and the tap targets.
 * World px = art px; the kitchen plan's top-left is the origin of both views. A plan shows on one
 * screen when every tap area stays >= 44 CSS px there; else, when it has pages, one page at a time.
 */
import { BIN, FRY_ITEMS, FRYER, GRIDDLE, GRIDDLE_ITEMS, INGREDIENTS, LAYER_H, PAPER, SAUCES, SHELF, TRAY, type DrinkId, type LayerKind } from '../../art/kitchen/keys';
import { STATION_OF } from '../../config/kitchenMenu';
import { DRINK, FURNITURE, KITCHEN_VIEW, MONTAGGIO, PAN, STATION_HIT, TRAY_CUTS } from './config';
import { counterFrame, type CounterFrame } from './counterFrame';
import type { BinId, KitchenBins, KitchenTarget, TrayPart } from './logic/types';
import { HIT_MIN, KITCHEN_PLAN, type Box, type KitchenPlan, type Orient } from './plan';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Point {
  x: number;
  y: number;
}

export const inRect = (r: Rect, x: number, y: number): boolean => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

export interface FramingInput {
  cssW: number;
  cssH: number;
  dpr: number;
  insetTop: number;
  insetBottom: number;
  insetLeft?: number;
}

export interface KitchenFraming {
  orient: Orient;
  plan: KitchenPlan;
  /** device px per world px */
  zoom: number;
  dpr: number;
  /** world rect on screen in the counter view; the kitchen view shows the same rect, kitchenOffset() to the right */
  view: Rect;
  counter: CounterFrame;
  /** one page at a time (plan.pages): the camera's y offset of each page (one screen: [0]) */
  pages: readonly number[];
}

const byFit = <T extends { fit: number }>(a: T, b: T): number => b.fit - a.fit;
/** every tap area >= KITCHEN_VIEW.tapCss at `zoom` device px per world px */
const bigEnough = (zoom: number, dpr: number): boolean => (zoom / dpr) * HIT_MIN >= KITCHEN_VIEW.tapCss - 1e-6;

/** an integer zoom when it keeps enough of the ideal one (and `ok` agrees) */
function snapZoom(fit: number, dpr: number, ok: (z: number) => boolean): number {
  const z = Math.floor(fit);
  const keep = dpr >= 2 ? KITCHEN_VIEW.integerKeepHiDpi : KITCHEN_VIEW.integerKeepLoDpi;
  return z >= 1 && z / fit >= keep && ok(z) ? z : fit;
}

interface Option {
  orient: Orient;
  paged: boolean;
  /** what has to fit the free area (the plan, or each page) */
  boxes: readonly Box[];
  fit: number;
}

/**
 * The plan (portrait or landscape) shown whole when every tap area stays big enough there (the bigger
 * zoom of the two), else page by page; centred in the free rectangle.
 */
export function computeFraming(v: FramingInput): KitchenFraming {
  const devW = Math.max(1, v.cssW * v.dpr);
  const devH = Math.max(1, v.cssH * v.dpr);
  const left = Math.min((v.insetLeft ?? 0) * v.dpr, devW * 0.5);
  const top = Math.min(v.insetTop * v.dpr, devH * 0.6);
  const bottom = Math.max(top + 1, devH - v.insetBottom * v.dpr);
  const fitOf = (b: Box): number => Math.min((devW - left) / b.w, (bottom - top) / b.h);
  const options: Option[] = [];
  for (const orient of ['portrait', 'landscape'] as const) {
    const plan = KITCHEN_PLAN[orient];
    const whole = [{ x: 0, y: 0, ...plan.size }];
    options.push({ orient, paged: false, boxes: whole, fit: fitOf(whole[0]) });
    if (plan.pages) {
      const boxes = plan.pages.map((p) => p.view);
      options.push({ orient, paged: true, boxes, fit: Math.min(...boxes.map(fitOf)) });
    }
  }
  const ok = (o: Option): boolean => bigEnough(o.fit, v.dpr);
  const best =
    options.filter((o) => !o.paged && ok(o)).sort(byFit)[0] ?? options.filter((o) => o.paged && ok(o)).sort(byFit)[0] ?? [...options].sort(byFit)[0];
  const plan = KITCHEN_PLAN[best.orient];
  const zoom = snapZoom(best.fit, v.dpr, (z) => bigEnough(z, v.dpr));
  const centre = (b: Box): Point => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
  const c0 = centre(best.boxes[0]);
  const w = devW / zoom;
  const h = devH / zoom;
  const view = { x: c0.x - (left + devW) / 2 / zoom, y: c0.y - (top + bottom) / 2 / zoom, w, h };
  const pages = best.boxes.map((b) => centre(b).y - c0.y);
  return { orient: best.orient, plan, zoom, dpr: v.dpr, view, counter: counterFrame(v, view, zoom), pages };
}

/** CSS px on the game host -> world px of the view on screen (page 0). */
export function toWorld(f: KitchenFraming, cssX: number, cssY: number): Point {
  return { x: f.view.x + (cssX * f.dpr) / f.zoom, y: f.view.y + (cssY * f.dpr) / f.zoom };
}

/** World px of the view on screen (page 0) -> CSS px on the game host. */
export function toCss(f: KitchenFraming, x: number, y: number): Point {
  return { x: ((x - f.view.x) * f.zoom) / f.dpr, y: ((y - f.view.y) * f.zoom) / f.dpr };
}

export interface BinPlace {
  readonly id: BinId | 'bun';
  readonly kind: 'pan' | 'bottle' | 'bun';
  /** top-left of the pan */
  readonly x: number;
  readonly y: number;
  /** centre top of the label tape */
  readonly label: Point;
  readonly hit: Rect;
}

/** A pan place an order leaves free, locked: a pan of something it does not need, under a padlock. */
export type LockedPan = BinPlace & { readonly id: BinId };

export interface DrinkPlace {
  readonly id: DrinkId;
  /** bottom-centre of the can */
  readonly at: Point;
  readonly label: Point;
  readonly hit: Rect;
}

export interface KitchenLayout {
  readonly griddle: Point;
  readonly fryer: Point;
  readonly tray: Point;
  readonly trash: Point;
  readonly paper: Point;
  readonly board: Rect;
  readonly panel: Rect;
  readonly shelves: readonly Point[];
  /** centre of each griddle slot, top-left of each fryer well */
  readonly slots: readonly Point[];
  readonly wells: readonly Point[];
  readonly slotHit: readonly Rect[];
  readonly basketHit: readonly Rect[];
  /** the order's pans and bottles, CHIUDI, and in every place it leaves free a decoy: a real, labelled,
   * tappable menu item it does not need (a wrong tap makes a wrong layer or a wasted fry), so the panel
   * is always full, like Good Pizza's */
  readonly bins: readonly BinPlace[];
  /** at most FURNITURE.lock.keep free places (the farthest from the board) hold a locked pan instead
   * (dimmed, a padlock, no label, not tappable), like Good Pizza's lone locked pan */
  readonly locked: readonly LockedPan[];
  readonly drinks: readonly DrinkPlace[];
  /** bottom-centre of the burger on its paper */
  readonly stackBase: Point;
  /** bottom-centre anchors of what stands on the tray, and the tap area of each place */
  readonly trayAt: Readonly<Record<TrayPart, Point>>;
  readonly trayHit: Readonly<Record<TrayPart, Rect>>;
}

/** frills over the top layer's body (lettuce edges, crumbs), art px */
export const FRILLS = 3;

/** Drawing scale of a burger with these layers: MONTAGGIO.scale, less (in quarter steps) when the closed burger would not fit its room. */
export function stackScale(kinds: readonly LayerKind[]): number {
  const h = LAYER_H.bunBottom + LAYER_H.bunTop + FRILLS + kinds.reduce((a, k) => a + LAYER_H[k], 0);
  return Math.min(MONTAGGIO.scale, Math.floor((MONTAGGIO.room / h) * 4) / 4);
}

const TRAY_PARTS: readonly TrayPart[] = ['burger', 'cone', 'side', 'drink'];
/** stack tap area (paper px): half width, air above the top layer */
const STACK_HALF_W = 24;
const STACK_AIR = 4;

function place(id: BinId | 'bun', kind: BinPlace['kind'], c: Box): BinPlace {
  return {
    id,
    kind,
    x: c.x + Math.floor((c.w - BIN.w) / 2),
    y: c.y + PAN.dy,
    label: { x: c.x + c.w / 2, y: c.y + PAN.labelDy },
    hit: { x: c.x, y: c.y, w: c.w, h: c.h },
  };
}

const centreOf = (b: Box): Point => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
const dist2 = (a: Point, b: Point): number => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

/** Pan places of the griddle, fryer and cold pans: each group's own rail first, then the free places
 * nearest its station (the griddle / fryer groups on the cooking side first); the places left free. */
function fill(plan: KitchenPlan, bins: KitchenBins): { pans: BinPlace[]; free: Box[] } {
  const taken = new Set<Box>();
  const pans: BinPlace[] = [];
  const nearest = (at: Point, cells: readonly Box[]): Box | undefined =>
    cells.filter((c) => !taken.has(c)).sort((a, b) => dist2(centreOf(a), at) - dist2(centreOf(b), at))[0];
  const put = (ids: readonly BinId[], own: readonly Box[], at: Point, spill: readonly (readonly Box[])[]): void => {
    for (const id of ids) {
      const c = own.find((x) => !taken.has(x)) ?? spill.map((cells) => nearest(at, cells)).find((x) => x !== undefined);
      if (!c) continue;
      taken.add(c);
      pans.push(place(id, 'pan', c));
    }
  };
  const { griddleRail, fryRail, coldRail } = plan;
  put(bins.griddle, griddleRail, centreOf({ ...plan.griddle, w: GRIDDLE.w, h: GRIDDLE.h }), [fryRail, coldRail]);
  put(bins.fryer, fryRail, centreOf({ ...plan.fryer, w: FRYER.w, h: FRYER.h }), [griddleRail, coldRail]);
  put(bins.cold, coldRail, centreOf(plan.board), [[...griddleRail, ...fryRail]]);
  return { pans, free: [...griddleRail, ...fryRail, ...coldRail].filter((c) => !taken.has(c)) };
}

/** What a free place holds: next to the griddle what it cooks, next to the fryer what fries (each the
 * other's when its own run out), round the board the cold toppings, in a bottle place a sauce. */
const COLD_POOL: readonly BinId[] = INGREDIENTS.filter((i) => STATION_OF[i] === 'bin');

/**
 * The free places of an order: a decoy in each (things it does not show, a different pick per order,
 * never twice), the FURNITURE.lock.keep pan places farthest from the board locked instead.
 */
function decoys(plan: KitchenPlan, free: readonly Box[], bottles: readonly Box[], shown: readonly BinId[]): { pans: BinPlace[]; locked: LockedPan[] } {
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
  const fry = new Set(plan.fryRail);
  const poolsOf = (c: Box): readonly (readonly BinId[])[] =>
    griddle.has(c) ? [GRIDDLE_ITEMS, FRY_ITEMS] : fry.has(c) ? [FRY_ITEMS, GRIDDLE_ITEMS] : [COLD_POOL];
  const board = centreOf(plan.board);
  const lock = new Set([...free].sort((a, b) => dist2(centreOf(b), board) - dist2(centreOf(a), board)).slice(0, FURNITURE.lock.keep));
  const pans: BinPlace[] = [];
  const locked: LockedPan[] = [];
  for (const c of free) {
    const id = take(poolsOf(c));
    if (id && lock.has(c)) locked.push({ ...place(id, 'pan', c), id });
    else if (id) pans.push(place(id, 'pan', c));
  }
  for (const c of bottles) {
    const id = take([SAUCES]);
    if (id) pans.push(place(id, 'bottle', c));
  }
  return { pans, locked };
}

const rect = (b: Box): Rect => ({ x: b.x, y: b.y, w: b.w, h: b.h });

export function kitchenLayout(plan: KitchenPlan, bins: KitchenBins): KitchenLayout {
  const g = plan.griddle;
  const f = plan.fryer;
  const t = plan.tray;
  const ts = MONTAGGIO.trayScale;
  const ms = MONTAGGIO.scale;
  const { pans, free } = fill(plan, bins);
  const sauces = bins.sauces.slice(0, plan.sauces.length);
  const shown = [...bins.griddle, ...bins.fryer, ...bins.cold, ...sauces];
  const extra = decoys(plan, free, plan.sauces.slice(sauces.length), shown);
  const out: BinPlace[] = [...pans, ...sauces.map((id, i) => place(id, 'bottle', plan.sauces[i])), ...extra.pans, place('bun', 'bun', plan.bun)];
  // two drinks per rack, each taps on its half of the rack (a little past the rack's ends)
  const half = SHELF.w / 2;
  const drinks = bins.drinks.slice(0, plan.shelves.length * DRINK.at.length).map((id, i) => {
    const s = plan.shelves[Math.floor(i / DRINK.at.length)];
    const p = i % DRINK.at.length;
    const at = { x: s.x + DRINK.at[p], y: s.y + SHELF.slots[0].y };
    const x0 = p === 0 ? s.x - DRINK.reach : s.x + half;
    return { id, at, label: { x: at.x, y: s.y + DRINK.labelDy }, hit: { x: x0, y: s.y - DRINK.top, w: half + DRINK.reach, h: DRINK.h } };
  });
  const trayAt = Object.fromEntries(TRAY_PARTS.map((p) => [p, { x: t.x + TRAY[p].x * ts, y: t.y + TRAY[p].y * ts }])) as Record<TrayPart, Point>;
  const cuts = [0, ...TRAY_CUTS];
  const trayHit = Object.fromEntries(
    TRAY_PARTS.map((p, i) => [p, { x: t.x + cuts[i] * ts, y: t.y, w: (cuts[i + 1] - cuts[i]) * ts, h: TRAY.h * ts }]),
  ) as Record<TrayPart, Rect>;
  // slot / basket taps STATION_HIT.w wide, side by side, centred on the station
  const row = (x: number, w: number, n: number, y: number, h: number): Rect[] =>
    Array.from({ length: n }, (_, i) => ({ x: x + w / 2 - (n * STATION_HIT.w) / 2 + i * STATION_HIT.w, y, w: STATION_HIT.w, h }));
  return {
    griddle: g,
    fryer: f,
    tray: t,
    trash: plan.trash,
    paper: plan.paper,
    board: rect(plan.board),
    panel: rect(plan.panel),
    shelves: plan.shelves,
    slots: GRIDDLE.slots.map((s) => ({ x: g.x + s.x, y: g.y + s.y })),
    wells: FRYER.wells.map((w) => ({ x: f.x + w.x, y: f.y + w.y })),
    slotHit: row(g.x, GRIDDLE.w, GRIDDLE.slots.length, g.y, GRIDDLE.h),
    basketHit: row(f.x, FRYER.w, FRYER.wells.length, f.y, FRYER.h),
    bins: out,
    locked: extra.locked,
    drinks,
    stackBase: { x: plan.paper.x + PAPER.baseX * ms, y: plan.paper.y + PAPER.baseY * ms },
    trayAt,
    trayHit,
  };
}

/**
 * What a tap at world point (x, y) of the kitchen hits. `stackTop` = world y of the top of the
 * burger on the paper (null: nothing on the bun). Wrapped burgers on the tray are not tappable.
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
  const s = l.stackBase;
  const ms = MONTAGGIO.scale;
  if (stackTop !== null && Math.abs(x - s.x) <= STACK_HALF_W * ms && y >= stackTop - STACK_AIR * ms && y < s.y + (PAPER.h - PAPER.baseY) * ms) return { kind: 'stackTop' };
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
    case 'stackTop': {
      const s = l.stackBase;
      const ms = MONTAGGIO.scale;
      const top = stackTop ?? s.y - 10 * ms;
      return { x: s.x - STACK_HALF_W * ms, y: top - STACK_AIR * ms, w: 2 * STACK_HALF_W * ms, h: s.y - top + STACK_AIR * ms };
    }
  }
}

/** The page (0 / 1) a world point of the kitchen belongs to: 0 when the plan is not paged. */
export function pageOf(plan: KitchenPlan, y: number): number {
  return plan.pages && y >= plan.pages[1].view.y ? 1 : 0;
}

/**
 * World x of the kitchen view's origin: one whole screen plus a gap right of the counter (the camera
 * slides by it). Each view's backdrop overscans by KITCHEN_VIEW.pad; the gap keeps the kitchen's pad
 * off the counter's right edge (and the counter's off the kitchen's left edge) even in a shake.
 */
export function kitchenOffset(f: KitchenFraming): number {
  return Math.ceil(f.view.w) + KITCHEN_VIEW.gap;
}
