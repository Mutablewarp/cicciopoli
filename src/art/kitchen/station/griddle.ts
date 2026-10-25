/**
 * The plancha (GRIDDLE geometry in ../keys.ts, 176x92): a big seasoned black-steel top in a polished
 * chrome frame (back splash and side guards), a broad grease sheen from the hood light, three
 * burnished cooking spots under the pieces (griddleItems.ts PIECE_DY) with oil beads round them, the
 * grease trough with its drain, the brushed front panel (a knob under every spot, the pilot light) and,
 * on the back splash, the PIASTRA name plate and Ciccio's red badge: up there the game's cue badges
 * (GIRA! / OK! on the front panel) and a basket lifted out of a fryer under the griddle never cover
 * them. Plus the heat shimmer sheet (GRIDDLE.surface x4) the game lays over the surface at low alpha.
 */
import { Raster, hash2, outlineRaster } from '../../hills/raster';
import { bayer } from '../../pixel';
import { rectR } from '../../rampage/draw';
import { PIECE_DY } from '../food/griddleItems';
import { GRIDDLE } from '../keys';
import { ST } from './colors';
import { BADGE, FACE, IRON, PLATE_H, brushedRect, chrome, frameRect, grain, knob, namePlate, roundCorners } from './draw';

const S = GRIDDLE.surface;
/** Rows below the surface: the grease trough (2 rows), its lit lip, the bend; then the front panel. */
const TROUGH_Y = S.y + S.h + 1;
const PANEL_Y = TROUGH_Y + 4;
/** The name plates fill the back splash (its rows above the iron), between the slots. */
const BACK_PLATE_Y = S.y - PLATE_H;
/** Cooking spot radii (griddle items are 40x40, patties ~34 across). */
const SPOT_RX = 18;
const SPOT_RY = 16;
/** Polished oil sheen: the hood light reflected along a band of slope SHEEN_SLOPE (rows per px). */
const SHEEN_SLOPE = 0.12;
const SHEEN_AT = 10;
const SHEEN_HALF = 9;

/** Chrome frame round the surface: tone by depth from the outer edge (lit rim, bright face, dark lip). */
function frame(r: Raster, w: number): void {
  for (let y = 1; y < PANEL_Y; y++) {
    for (let x = 1; x < w - 1; x++) {
      const inSurface = x >= S.x && x < S.x + S.w && y >= S.y && y < S.y + S.h;
      if (inSurface) continue;
      const back = y < S.y; // back splash: its top edge, then its face turned to the player
      const side = x < S.x ? (x - 1) / (S.x - 1) : x >= S.x + S.w ? (w - 2 - x) / (S.x - 1) : 1;
      const t = back ? (y - 1) / (S.y - 1) : 0.15 + (1 - side) * 0.55;
      chrome(r, x, y, x >= S.x + S.w ? t + 0.25 : t); // the right guard turns away from the light
    }
  }
  rectR(r, 1, 1, w - 2, 1, ST.steelShine);
  rectR(r, 1, 1, 1, PANEL_Y - 1, ST.steelShine);
  rectR(r, w - 2, 1, 1, PANEL_Y - 1, ST.steelShade);
}

/** 0..1: how much of the hood light the oily iron reflects at (x, y) (strongest on the left). */
function sheenAt(x: number, y: number): number {
  const d = Math.abs(y - S.y - SHEEN_AT - (x - S.x) * SHEEN_SLOPE) / SHEEN_HALF;
  return Math.max(0, 1 - d) * (1 - (x - S.x) / (S.w * 1.3));
}

function surface(r: Raster): void {
  for (let y = S.y; y < S.y + S.h; y++) {
    for (let x = S.x; x < S.x + S.w; x++) {
      const g = grain(x, y, 64, 31);
      let col: string = g > 0.62 ? IRON.light : g < -0.62 ? IRON.shade : IRON.base;
      const sh = sheenAt(x, y);
      if (sh > 0 && bayer(x, y) < sh * 0.9 && g > -0.3) col = sh > 0.65 && g > 0.25 ? ST.ironGloss : ST.ironSheen;
      if (hash2(x, y, 5) < 0.012) col = ST.ironLight; // seasoning flecks
      r.set(x, y, col);
    }
  }
  for (const s of GRIDDLE.slots) spot(r, s.x, s.y + PIECE_DY);
  oilBeads(r);
  // the back splash and the left guard throw a dark line on the iron
  rectR(r, S.x, S.y, S.w, 1, ST.ironDark);
  rectR(r, S.x, S.y, 1, S.h, ST.ironDark);
}

/** A burnished cooking spot: polished darker steel, a worn brown seasoning ring lit on the top-left. */
function spot(r: Raster, cx: number, cy: number): void {
  for (let y = cy - SPOT_RY; y <= cy + SPOT_RY; y++) {
    for (let x = cx - SPOT_RX; x <= cx + SPOT_RX; x++) {
      const d = Math.hypot((x - cx) / (SPOT_RX + 0.5), (y - cy) / (SPOT_RY + 0.5)) + (hash2(x, y, 23) - 0.5) * 0.08;
      if (d > 1) continue;
      const lit = x - cx + (y - cy) < 0;
      if (d > 0.9) r.set(x, y, lit ? ST.ironSheen : ST.ironWorn);
      else if (d > 0.8) r.set(x, y, ST.ironWorn);
      else if (grain(x, y, 64, 37) > 0.35 - d * 0.3) r.set(x, y, ST.ironWorn); // seasoned brown streaks
      else r.set(x, y, ST.ironDark);
    }
  }
}

/** Golden oil beads scattered round the spots (each with a hot glint). */
function oilBeads(r: Raster): void {
  for (let k = 0; k < 26; k++) {
    const s = GRIDDLE.slots[k % GRIDDLE.slots.length];
    const a = hash2(k, 1, 71) * 2 * Math.PI;
    const d = 1.05 + hash2(k, 2, 71) * 0.35;
    const x = Math.round(s.x + Math.cos(a) * SPOT_RX * d);
    const y = Math.round(s.y + PIECE_DY + Math.sin(a) * SPOT_RY * d);
    if (y < S.y + 2 || y > S.y + S.h - 3) continue;
    r.set(x, y, ST.grease);
    if (k % 3 === 0) {
      r.set(x + 1, y, ST.grease);
      r.set(x, y - 1, ST.greaseHot);
    }
  }
}

/** The grease trough along the front of the iron: a golden channel draining to the right. */
function trough(r: Raster, w: number): void {
  frameRect(r, S.x - 1, S.y - 1, S.w + 2, S.h + 2, ST.steelEdge);
  rectR(r, S.x - 1, TROUGH_Y, S.w + 2, 1, ST.ironDark);
  rectR(r, S.x - 1, TROUGH_Y + 1, S.w + 2, 1, ST.grease);
  for (let x = S.x; x < S.x + S.w; x++) {
    if (hash2(x, 0, 17) < 0.14) r.set(x, TROUGH_Y + 1, ST.greaseHot);
    if (hash2(x, 1, 17) < 0.1) r.set(x, TROUGH_Y, ST.grease);
  }
  const dx = S.x + S.w - 8; // drain hole
  rectR(r, dx, TROUGH_Y, 4, 2, ST.ink);
  r.set(dx + 1, TROUGH_Y, ST.ironDark);
  rectR(r, 1, TROUGH_Y + 2, w - 2, 1, ST.steelShine);
  rectR(r, 1, TROUGH_Y + 3, w - 2, 1, ST.steelDark);
}

function frontPanel(r: Raster, w: number, h: number): void {
  brushedRect(r, 1, PANEL_Y, w - 2, h - 1 - PANEL_Y, FACE, 33);
  rectR(r, 1, PANEL_Y, w - 2, 1, ST.steel);
  rectR(r, 1, h - 2, w - 2, 1, ST.steelShade);
  rectR(r, w - 2, PANEL_Y, 1, h - 1 - PANEL_Y, ST.steelShade);
  const ky = PANEL_Y + 8;
  for (const s of GRIDDLE.slots) {
    knob(r, s.x, ky);
    r.set(s.x - 5, ky - 3, ST.steelEdge); // low / high marks
    r.set(s.x + 5, ky - 3, ST.red);
    r.set(s.x - 5, ky + 2, ST.steelEdge);
  }
  // pilot light: the plancha is on
  rectR(r, 7, ky - 1, 2, 2, ST.amber);
  r.set(7, ky - 1, ST.amberHot);
  frameRect(r, 6, ky - 2, 4, 4, ST.steelDark);
}

export function buildGriddle(): Raster {
  const { w, h } = GRIDDLE;
  const r = new Raster(w, h);
  frame(r, w);
  surface(r);
  trough(r, w);
  frontPanel(r, w, h);
  const [left, middle, right] = GRIDDLE.slots;
  namePlate(r, 'PIASTRA', (left.x + middle.x) / 2, BACK_PLATE_Y);
  namePlate(r, "CICCIO'S", (middle.x + right.x) / 2, BACK_PLATE_Y, BADGE);
  roundCorners(r, 1, 1, w - 2, h - 2);
  outlineRaster(r, ST.ink);
  return r;
}

/** Loop length (rows) of the shimmer: every wisp climbs PERIOD / 4 rows per frame. */
const PERIOD = 48;
/** [x on the surface, phase] of the shimmer squiggles: three over each cooking spot. */
const WISPS = GRIDDLE.slots.flatMap((s, k) => [-10, 0, 10].map((dx, i) => [s.x - S.x + dx, (k * 17 + i * 29) % PERIOD] as const));

/** Heat shimmer: sparse wavy squiggles rising over the spots (loops in 4 frames). */
export function buildGriddleHeat(): Raster[] {
  return [0, 1, 2, 3].map((f) => {
    const r = new Raster(S.w, S.h);
    for (const [x0, phase] of WISPS) {
      const head = (((PERIOD - 4 - phase - f * (PERIOD / 4)) % PERIOD) + PERIOD) % PERIOD;
      for (let k = 0; k < 8; k += 2) {
        const y = head + k + 4;
        if (y >= S.h) continue;
        const x = x0 + Math.round(Math.sin((y + phase) * 0.7) * 1.5);
        r.set(x, y, k === 0 ? ST.spark : ST.sparkWarm);
      }
    }
    return r;
  });
}
