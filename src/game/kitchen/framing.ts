/**
 * Camera framing of level 7 (pure, no Phaser): the free part of the game host (left of the landscape ticket
 * column, under the portrait ticket, above the action button) shows the BANCONE (counterFrame.ts) or one
 * CUCINA page. Each page is fitted on its own (MONTAGGIO and COTTURA get their own zoom: one station per
 * screen), a screen big enough shows both side by side at one zoom; the plan and the way are those that keep
 * every tap area >= KITCHEN_VIEW.tapCss CSS px and come closest to the v7 sizes (pans, label letters, a patty, a
 * portrait griddle's share), then the biggest stations. The counter is framed at the
 * smallest of the zooms: the camera only zooms in from it, and both backdrops cover every frame of a glide.
 */
import { BIN, GRIDDLE, GRIDDLE_ITEM } from '../../art/kitchen/keys';
import { FONT_H } from '../../art/rush/font';
import { KITCHEN_VIEW } from './config';
import { counterFrame, type CounterFrame } from './counterFrame';
import { KITCHEN_PLANS, planBox, type Box, type KitchenPage, type KitchenPlan } from './plan';

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

/** One camera stop in the kitchen: device px per world px, and the world rect on screen (kitchen px). */
export interface PageFrame {
  zoom: number;
  view: Rect;
}

export interface KitchenFraming {
  plan: KitchenPlan;
  /** device px per world px at the counter (the smallest page zoom) */
  zoom: number;
  dpr: number;
  /** world rect on screen at the counter */
  view: Rect;
  counter: CounterFrame;
  /** one: both pages on one screen; two: MONTAGGIO, COTTURA, each framed on its own */
  pages: readonly PageFrame[];
  /** kitchen px the worktop must cover: every page's screen at the counter's zoom (every frame of a glide) */
  backdrop: Rect;
}

const EPS = 1e-6;
const centre = (b: Box): Point => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });

/** an integer device zoom when it keeps enough of the ideal one (and the taps and the v7 sizes stay) */
function snapZoom(fit: number, ok: (z: number) => boolean): number {
  const z = Math.floor(fit);
  return z >= 1 && z / fit >= KITCHEN_VIEW.integerKeepPage && ok(z) ? z : fit;
}

interface Option {
  plan: KitchenPlan;
  boxes: readonly Box[];
  zooms: readonly number[];
  /** smallest tap side, label letter and pan on screen, a patty (CSS px); the griddle's share of the free width */
  tap: number;
  label: number;
  pan: number;
  patty: number;
  griddle: number;
}

/** CSS px of a page's pans, label letters and (COTTURA) patties at `k` CSS px per world px */
const sizesOf = (p: KitchenPage, cook: boolean, k: number): number[] => [BIN.w * p.art.pan * k, FONT_H * p.art.label * k, cook ? GRIDDLE_ITEM.w * k : 0];
const TARGETS = [KITCHEN_VIEW.panCss, KITCHEN_VIEW.labelCss, KITCHEN_VIEW.pattyCss];

/** The framing of the kitchen and the counter for this viewport. */
export function computeFraming(v: FramingInput): KitchenFraming {
  const devW = Math.max(1, v.cssW * v.dpr);
  const devH = Math.max(1, v.cssH * v.dpr);
  const left = Math.min((v.insetLeft ?? 0) * v.dpr, devW * 0.5);
  const top = Math.min(v.insetTop * v.dpr, devH * 0.6);
  const bottom = Math.max(top + 1, devH - v.insetBottom * v.dpr);
  const V = KITCHEN_VIEW;
  const freeW = (devW - left) / v.dpr;
  const portrait = bottom - top > devW - left;
  const fitOf = (b: Box): number => Math.min((devW - left) / b.w, (bottom - top) / b.h);
  // snapping down never takes a tap under tapCss, nor a size under its target that the ideal zoom holds
  const zoomOf = (b: Box, pages: readonly KitchenPage[], cook: readonly boolean[]): number => {
    const fit = fitOf(b);
    const keeps = (z: number): boolean =>
      pages.every((p, i) => (z / v.dpr) * p.hit >= V.tapCss - EPS && sizesOf(p, cook[i], z / v.dpr).every((x, j) => x >= Math.min(TARGETS[j], (x * fit) / z) - EPS));
    return snapZoom(fit, keeps);
  };
  const option = (plan: KitchenPlan, boxes: readonly Box[], zooms: readonly number[]): Option => {
    const css = plan.pages.map((p, i) => ({ p, k: (zooms[Math.min(i, zooms.length - 1)] ?? 1) / v.dpr }));
    const min = (f: (x: (typeof css)[number]) => number): number => Math.min(...css.map(f));
    const kC = css[1].k;
    return {
      plan,
      boxes,
      zooms,
      tap: min((x) => x.p.hit * x.k),
      label: min((x) => FONT_H * x.p.art.label * x.k),
      pan: min((x) => BIN.w * x.p.art.pan * x.k),
      patty: GRIDDLE_ITEM.w * kC,
      griddle: (GRIDDLE.w * kC) / freeW,
    };
  };
  const whole: Option[] = [];
  const paged: Option[] = [];
  for (const plan of KITCHEN_PLANS) {
    const all = planBox(plan);
    whole.push(option(plan, [all], [zoomOf(all, plan.pages, [true, true])]));
    paged.push(option(plan, plan.pages.map((p) => p.view), plan.pages.map((p, i) => zoomOf(p.view, [p], [i === 1]))));
  }
  const taps = (o: Option): boolean => o.tap >= V.tapCss - EPS;
  // one screen only when every v7 size holds there (taps, labels, pans)
  const sizes = (o: Option): boolean => taps(o) && o.label >= V.labelCss - EPS && o.pan >= V.panCss - EPS;
  // how close an option comes to the v7 sizes: pans, labels, a patty, a portrait griddle's share (1 each when held)
  const meet = (o: Option): number =>
    [o.pan / V.panCss, o.label / V.labelCss, o.patty / V.pattyCss, portrait ? o.griddle / V.griddleShare : 1].reduce((a, r) => a + Math.min(1, r), 0);
  // MONTAGGIO's zoom first (pans, labels), then COTTURA's (the stations), a little less for a board that makes a tall burger shrink
  const score = (o: Option): number => {
    const [m, c] = [o.zooms[0], o.zooms[o.zooms.length - 1]];
    return m ** 0.6 * c ** 0.4 * Math.min(1, o.plan.room / (V.tallestBurger * o.plan.art.stack)) ** 0.15;
  };
  const closest = (a: Option, b: Option): number => (Math.abs(meet(a) - meet(b)) > EPS ? meet(b) - meet(a) : score(b) - score(a));
  const best = (list: Option[], order: (a: Option, b: Option) => number): Option | undefined => [...list].sort(order)[0];
  const pick =
    best(whole.filter(sizes), (a, b) => score(b) - score(a)) ?? best(paged.filter(taps), closest) ?? best(paged, (a, b) => b.tap - a.tap) ?? paged[0];
  const fx = (left + devW) / 2;
  const fy = (top + bottom) / 2;
  const frame = (b: Box, zoom: number): PageFrame => {
    const c = centre(b);
    return { zoom, view: { x: c.x - fx / zoom, y: c.y - fy / zoom, w: devW / zoom, h: devH / zoom } };
  };
  const pages = pick.boxes.map((b, i) => frame(b, pick.zooms[i]));
  const zoom = Math.min(...pick.zooms);
  const view = frame(pick.boxes[0], zoom).view;
  const wide = pick.boxes.map((b) => frame(b, zoom).view);
  const x0 = Math.min(...wide.map((r) => r.x));
  const y0 = Math.min(...wide.map((r) => r.y));
  const backdrop = { x: x0, y: y0, w: Math.max(...wide.map((r) => r.x + r.w)) - x0, h: Math.max(...wide.map((r) => r.y + r.h)) - y0 };
  return { plan: pick.plan, zoom, dpr: v.dpr, view, counter: counterFrame(v, view, zoom), pages, backdrop };
}

/** CSS px on the game host -> world px of the counter view. */
export function toWorld(f: KitchenFraming, cssX: number, cssY: number): Point {
  return { x: f.view.x + (cssX * f.dpr) / f.zoom, y: f.view.y + (cssY * f.dpr) / f.zoom };
}

/** World px of the counter view -> CSS px on the game host. */
export function toCss(f: KitchenFraming, x: number, y: number): Point {
  return { x: ((x - f.view.x) * f.zoom) / f.dpr, y: ((y - f.view.y) * f.zoom) / f.dpr };
}

/** CSS px on the game host -> kitchen px with kitchen page `p` on screen. */
export function pageToWorld(f: KitchenFraming, p: number, cssX: number, cssY: number): Point {
  const g = f.pages[p] ?? f.pages[0];
  return { x: g.view.x + (cssX * f.dpr) / g.zoom, y: g.view.y + (cssY * f.dpr) / g.zoom };
}

/** Kitchen px -> CSS px on the game host with kitchen page `p` on screen. */
export function pageToCss(f: KitchenFraming, p: number, x: number, y: number): Point {
  const g = f.pages[p] ?? f.pages[0];
  return { x: ((x - g.view.x) * g.zoom) / f.dpr, y: ((y - g.view.y) * g.zoom) / f.dpr };
}

/**
 * World x of the kitchen's origin: one whole counter screen plus a gap right of the counter. The counter's
 * screen is the widest (the smallest zoom), so no kitchen page ever shows on the counter's screen at rest and
 * the backdrops' pads (KITCHEN_VIEW.pad) overlap across the gap during a glide.
 */
export function kitchenOffset(f: KitchenFraming): number {
  return Math.ceil(f.view.w) + KITCHEN_VIEW.gap;
}

/**
 * The world rect the camera shows between two stops (u = 0..1): each edge glides in a straight line, so every
 * frame of the glide lies inside the two stops' hull (the backdrops cover it).
 */
export function lerpRect(a: Rect, b: Rect, u: number): Rect {
  const l = (p: number, q: number): number => p + (q - p) * u;
  return { x: l(a.x, b.x), y: l(a.y, b.y), w: l(a.w, b.w), h: l(a.h, b.h) };
}
