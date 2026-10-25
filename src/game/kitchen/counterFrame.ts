/**
 * Pure geometry of the BANCONE (no Phaser): how big the counter is drawn in the free area (the bubble's and
 * the neon's room kept over the customer's head), where the room art goes behind it and where the bubble's
 * room begins (the neon and the disc stay over it).
 */
import { IMAGE_SPEC, KITCHEN, SHEET_SPEC, STAGE } from '../../art/kitchen/keys';
import { COUNTER_VIEW, KITCHEN_VIEW } from './config';
import type { FramingInput, Point, Rect } from './framing';
import type { Orient } from './plan';

/**
 * The BANCONE in its own container, scaled over the kitchen's zoom (counter px x scale = world px).
 * Its stage (STAGE of the area's orientation) sits on the bottom of the area left
 * by the ticket column / the action button, centred across it (landscape: a short screen sinks its counter
 * top's last rows under the screen's bottom). The scale is the one at which the room art covers the screen,
 * but never so big that the customer's head leaves less than the bubble's and the neon's room under the
 * ticket / HUD (counterFit): a wide screen crops the stage's sides (the till stays in the free area).
 * Portrait: a screen the room art does not cover at that scale gets it drawn bigger behind the customer,
 * edge to edge. Landscape: the room art is drawn at the counter's scale (one pixel size with the customer).
 */
export interface CounterFrame {
  orient: Orient;
  /** counter px -> world px */
  scale: number;
  /** device px per counter px */
  zoom: number;
  dpr: number;
  /** counter px */
  stage: Rect;
  /** the screen, counter px */
  view: Rect;
  /** counter px: the free area left by the HUD (ticket, HUD bar, ticket column, action button) */
  free: Rect;
}

/** counter px from the counter top's edge up to the top of the customer's head */
const RISE = SHEET_SPEC[KITCHEN.customer][1] - COUNTER_VIEW.customerSink - COUNTER_VIEW.headTopPx;
/** the room art round each stage (centred on it) */
const ROOM: Readonly<Record<Orient, { w: number; h: number }>> = {
  portrait: { w: IMAGE_SPEC[KITCHEN.roomTall][0], h: IMAGE_SPEC[KITCHEN.roomTall][1] },
  landscape: { w: IMAGE_SPEC[KITCHEN.roomWide][0], h: IMAGE_SPEC[KITCHEN.roomWide][1] },
};

/** CSS px the speech bubble may need over the customer's head on a screen this wide */
export const bubbleCss = (cssW: number): number => COUNTER_VIEW.bubbleCssPx * Math.max(1, COUNTER_VIEW.bubbleRefCssW / Math.max(1, cssW));

/** counter px the neon and its gaps take under the top of the free area */
const NEON_ROOM = SHEET_SPEC[KITCHEN.neon][1] + 2 * COUNTER_VIEW.signs.gapPx;

/**
 * CSS px per counter px for a stage orientation, and the rows of the counter top left on screen. The head keeps
 * the bubble's room under the HUD (its upper half holds the neon). Portrait: the room art covers the screen (drawn
 * bigger behind the customer when it would not: roomPlace). Landscape: the customer as big as that room leaves,
 * the room art at the counter's own scale (one pixel size with the customer) across the free area (to the
 * screen's right edge, shake pad included); a short screen keeps only a strip of the counter top for it.
 */
function counterFit(v: FramingInput, orient: Orient, bottom: number, left: number): { fit: number; head: number; rows: number } {
  const st = STAGE[orient];
  const room = ROOM[orient];
  const C = COUNTER_VIEW;
  const free = bottom - v.insetTop;
  const roomCss = bubbleCss(v.cssW);
  const head = (rows: number): number => (free - roomCss) / (RISE + rows + NEON_ROOM);
  if (orient === 'portrait') {
    // the room reaches the top of the screen, and both its sides
    const top = bottom / (st.h + (room.h - st.h) / 2);
    const sides = v.cssW / room.w;
    const h = head(C.topH);
    return { fit: Math.max(0.25, Math.min(h, Math.max(top, sides))), head: h, rows: C.topH };
  }
  const cover = (v.cssW - left) / (room.w - KITCHEN_VIEW.pad);
  let rows: number = C.topH;
  while (rows > C.minTopPx && head(rows) < cover) rows--;
  const h = Math.max(0.25, head(rows));
  return { fit: h, head: h, rows };
}

export function counterFrame(v: FramingInput, view: Rect, zoom: number): CounterFrame {
  const left = Math.min(v.insetLeft ?? 0, v.cssW * 0.5);
  const top = left > 0 ? v.insetTop : 0;
  const bottom = Math.max(top + 1, v.cssH - v.insetBottom);
  const w = v.cssW - left;
  // the stage that matches the area's shape (the wide room on a wide area)
  const orient: Orient = w >= bottom - top ? 'landscape' : 'portrait';
  const best = { orient, ...counterFit(v, orient, bottom, left) };
  // an integer device zoom when close above (while the bubble's room stays); never below: the room would not cover
  const want = best.fit * v.dpr;
  const keep = v.dpr >= 2 ? KITCHEN_VIEW.integerKeepHiDpi : KITCHEN_VIEW.integerKeepLoDpi;
  const up = Math.ceil(want - 1e-9);
  const cz = up / want <= 1 / keep && up <= best.head * v.dpr + 1e-6 ? up : want;
  const scale = cz / zoom;
  const st = STAGE[best.orient];
  const world = (cssX: number, cssY: number): Point => ({ x: view.x + (cssX * v.dpr) / zoom, y: view.y + (cssY * v.dpr) / zoom });
  const a = world(left + w / 2, bottom);
  const f0 = world(left, v.insetTop);
  const f1 = world(v.cssW, bottom);
  // the rows of the counter top under the screen's bottom go on below it
  const sink = COUNTER_VIEW.topH - best.rows;
  return {
    orient: best.orient,
    scale,
    zoom: cz,
    dpr: v.dpr,
    stage: { x: Math.round(a.x / scale - st.w / 2), y: Math.floor(a.y / scale) - st.h + sink, w: st.w, h: st.h },
    view: { x: view.x / scale, y: view.y / scale, w: view.w / scale, h: view.h / scale },
    free: { x: f0.x / scale, y: f0.y / scale, w: (f1.x - f0.x) / scale, h: (f1.y - f0.y) / scale },
  };
}

/**
 * Where the room art (w x h art px) goes behind the counter (counter px, top-left, scale). Landscape: at the
 * counter's own scale, its right edge on the screen's (the CICCIOPOLY poster's wall on the right, the street
 * window towards the ticket column, as in the photo; never short of the free area's left edge); as the art
 * frames the stage (the customer's head where it expects it), raised so the plaster wall right of the poster
 * reaches over the bubble's room (the disc hangs there, bubbleTop) and never short of the counter top. The
 * concrete ceiling goes on over it, the room fill round it (counterDecor.ts). Portrait: centred on the stage at the
 * counter's scale; drawn bigger (round the art point behind the customer's head, which stays there) when that
 * would not cover the whole screen, KITCHEN_VIEW.pad included. It always reaches the screen's top and the
 * bottom of the stage (behind the counter): never an empty band.
 */
export function roomPlace(f: CounterFrame, w: number, h: number, headTop: number): Point & { scale: number } {
  const v = f.view;
  const s = f.stage;
  const pad = KITCHEN_VIEW.pad;
  const bottom = s.y + s.h;
  if (f.orient === 'landscape') {
    const S = COUNTER_VIEW.signs;
    const x = Math.min(f.free.x, v.x + v.w + pad - w);
    const wall = bubbleTop(f, headTop) - S.gapPx - 2 * S.wall.landscape.r - S.wallTop;
    const y = Math.max(bottom - COUNTER_VIEW.topH - h, Math.min(s.y + (s.h - h) / 2, wall));
    return { x: Math.floor(x), y: Math.floor(y), scale: 1 };
  }
  const cx = s.x + s.w / 2;
  const scale = Math.max(1, (v.w + 2 * pad) / w, (bottom - v.y + pad) / h);
  const x = Math.min(v.x - pad, Math.max(v.x + v.w + pad - w * scale, cx - (w * scale) / 2));
  const top1 = s.y + (s.h - h) / 2;
  const y = Math.min(v.y - pad, Math.max(bottom - h * scale, headTop - (headTop - top1) * scale));
  return { x: Math.floor(x), y: Math.floor(y), scale };
}

/**
 * Counter y where the bubble's room begins over a head at `headTop`: the UI keeps the bubble under the middle
 * of its free area's top and the head (ui/kitchen/text.ts placeBubble), its ink rim a little over it; the neon
 * and the disc hang above it.
 */
export function bubbleTop(f: CounterFrame, headTop: number): number {
  const C = COUNTER_VIEW;
  const css = f.dpr / f.zoom;
  return (f.free.y + C.freeMarginCss * css + headTop) / 2 - C.bubbleRimCss * css;
}
