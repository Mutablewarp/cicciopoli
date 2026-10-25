/**
 * The double friggitrice (FRYER geometry in ../keys.ts, 132x92): a polished chrome deck with two deep
 * oil wells (their inner walls in shade), the basket hook rail at the back, and the brushed front
 * panel: per unit a thermostat dial, a pilot light, vents and a drain valve, the FRIGGITRICE name
 * plate across both. Plus the hot oil of one well (FRYER.well x4: big lively bubbles growing and
 * popping, a hot glint) and the wire basket with its red grip (BASKET: 0 raised, 1 lowered).
 */
import { Raster, hash2, outlineRaster } from '../../hills/raster';
import { bayer } from '../../pixel';
import { rectR } from '../../rampage/draw';
import { BASKET, FRYER } from '../keys';
import { ST } from './colors';
import { FACE, PLATE_H, bevel, brushedRect, chrome, dial, frameRect, namePlate, roundCorners } from './draw';

const WELL = FRYER.well;
/** Front lip of the wells (2 rows), the bend, then the front panel. */
const LIP_Y = FRYER.wells[0].y + WELL.h;
const PANEL_Y = LIP_Y + 4;
const RAIL_Y = 4;
/** Rows of the inner back wall seen above the oil. */
const BACK_WALL = 3;

function deck(r: Raster, w: number): void {
  for (let y = 1; y < PANEL_Y; y++) for (let x = 1; x < w - 1; x++) chrome(r, x, y, 0.12 + (y / PANEL_Y) * 0.35 + (x / w) * 0.15);
  bevel(r, 1, 1, w - 2, PANEL_Y - 1, ST.steelShine, ST.steelShade);
}

/** A deep well: the inner back wall in shade, a dark left wall, a lit right wall, the bright front lip. */
function well(r: Raster, x: number, y: number): void {
  rectR(r, x, y, WELL.w, WELL.h, ST.ironDark); // hidden by the oil, shows in its rounded corners
  const wall = [ST.steelEdge, ST.steelDark, ST.steelShade];
  wall.forEach((c, k) => rectR(r, x - 1, y - BACK_WALL + k, WELL.w + 2, 1, c));
  rectR(r, x - 2, y - BACK_WALL, 1, WELL.h + BACK_WALL + 1, ST.steelEdge);
  rectR(r, x - 1, y - BACK_WALL + 1, 1, WELL.h + BACK_WALL - 1, ST.steelDark);
  rectR(r, x + WELL.w, y - BACK_WALL + 1, 1, WELL.h + BACK_WALL - 1, ST.steelLight);
  rectR(r, x + WELL.w + 1, y - BACK_WALL, 1, WELL.h + BACK_WALL + 1, ST.steelShade);
  rectR(r, x - 2, y + WELL.h, WELL.w + 4, 1, ST.steelShine);
  rectR(r, x - 2, y + WELL.h + 1, WELL.w + 4, 1, ST.steelLight);
}

function hookRail(r: Raster, w: number): void {
  rectR(r, 4, RAIL_Y, w - 8, 2, ST.black);
  rectR(r, 4, RAIL_Y, w - 8, 1, ST.blackLight);
  for (const wl of FRYER.wells) {
    const cx = wl.x + WELL.w / 2;
    for (const hx of [cx - 16, cx + 15]) {
      rectR(r, hx, RAIL_Y - 2, 1, 5, ST.blackEdge); // two hooks per well
      r.set(hx, RAIL_Y - 2, ST.blackLight);
    }
  }
}

function frontPanel(r: Raster, w: number, h: number): void {
  rectR(r, 1, LIP_Y + 2, w - 2, 1, ST.steelMid);
  rectR(r, 1, LIP_Y + 3, w - 2, 1, ST.steelDark);
  brushedRect(r, 1, PANEL_Y, w - 2, h - 1 - PANEL_Y, FACE, 43);
  rectR(r, 1, PANEL_Y, w - 2, 1, ST.steel);
  rectR(r, 1, h - 2, w - 2, 1, ST.steelShade);
  const seam = Math.round(w / 2) - 1;
  rectR(r, seam, PANEL_Y + 1, 1, h - PANEL_Y - 3, ST.steelDark); // two units side by side
  rectR(r, seam + 1, PANEL_Y + 1, 1, h - PANEL_Y - 3, ST.steel);
  for (const wl of FRYER.wells) {
    const cx = wl.x + WELL.w / 2;
    dial(r, cx, PANEL_Y + 8);
    rectR(r, cx + 9, PANEL_Y + 7, 2, 2, ST.amber); // pilot light
    r.set(cx + 9, PANEL_Y + 7, ST.amberHot);
    frameRect(r, cx + 8, PANEL_Y + 6, 4, 4, ST.steelDark);
    for (const vy of [PANEL_Y + 16, PANEL_Y + 19]) {
      rectR(r, cx - 12, vy, 24, 1, ST.steelEdge); // vents
      rectR(r, cx - 12, vy + 1, 24, 1, ST.steel);
    }
    rectR(r, cx - 2, PANEL_Y + 25, 5, 3, ST.black); // drain valve with its red lever
    rectR(r, cx - 2, PANEL_Y + 25, 5, 1, ST.blackLight);
    rectR(r, cx + 3, PANEL_Y + 26, 6, 2, ST.red);
    r.set(cx + 3, PANEL_Y + 26, ST.redLight);
  }
  namePlate(r, 'FRIGGITRICE', w / 2, h - 2 - PLATE_H);
}

export function buildFryer(): Raster {
  const { w, h } = FRYER;
  const r = new Raster(w, h);
  deck(r, w);
  hookRail(r, w);
  for (const wl of FRYER.wells) well(r, wl.x, wl.y);
  frontPanel(r, w, h);
  roundCorners(r, 1, 1, w - 2, h - 2);
  outlineRaster(r, ST.ink);
  return r;
}

/** [x, y, size 1..3, phase] of the oil bubbles: each grows over 3 frames and pops on the 4th. */
const BUBBLES = [
  [7, 7, 2, 0], [18, 12, 3, 1], [31, 8, 2, 2], [43, 13, 3, 3], [10, 22, 3, 2], [25, 23, 2, 3], [38, 25, 3, 0],
  [47, 6, 1, 1], [4, 15, 1, 3], [21, 4, 1, 0], [30, 17, 1, 1], [15, 29, 1, 1], [46, 28, 1, 2], [35, 3, 1, 3],
] as const;

/** One bubble of radius ~size at growth stage 0..2, or its pop (stage 3: a ring of droplets). */
function bubble(r: Raster, x: number, y: number, size: number, stage: number): void {
  const rad = size * (0.5 + stage * 0.35);
  if (stage === 3) {
    const rr = size + 1;
    for (let a = 0; a < 6; a++) r.set(Math.round(x + Math.cos(a * 1.05) * rr), Math.round(y + Math.sin(a * 1.05) * rr * 0.8), ST.oilFoam);
    r.set(x, y, ST.oilLight);
    return;
  }
  const R = Math.max(1, Math.round(rad));
  for (let j = -R; j <= R; j++) {
    for (let i = -R; i <= R; i++) {
      const d = Math.hypot(i, j) / (R + 0.4);
      if (d > 1) continue;
      r.set(x + i, y + j, d > 0.62 ? ST.oilFoam : i + j > 0 ? ST.oil : ST.oilLight); // foamy skin, see-through middle
    }
  }
  r.set(x - Math.ceil(R / 2), y - Math.ceil(R / 2), ST.oilHot); // hot glint
}

/** One well of hot oil: shadowed back edge, golden body lit towards the front, the hood light gliding on
 * it, boiling fizz and big bubbles growing and popping. */
export function buildFryOil(): Raster[] {
  return [0, 1, 2, 3].map((f) => {
    const r = new Raster(WELL.w, WELL.h);
    for (let y = 0; y < WELL.h; y++) {
      for (let x = 0; x < WELL.w; x++) {
        const t = y / WELL.h + x / (WELL.w * 4);
        let col: string = t < 0.1 ? ST.oilDeep : ST.oil;
        if (t >= 0.1 && t < 0.2 && bayer(x, y) < 0.5) col = ST.oilDeep;
        if (t > 0.6 && bayer(x, y) < (t - 0.6) * 1.4) col = ST.oilLight; // lit front of the well
        r.set(x, y, col);
      }
    }
    // the hood light reflected: a soft diagonal glint drifting with the boil
    for (let y = 3; y < 12; y++) {
      for (let x = 0; x < WELL.w; x++) {
        const d = Math.abs(x - 6 - y * 1.6 - f) - 3;
        if (d < 0) r.set(x, y, d < -2 ? ST.oilHot : ST.oilFoam);
        else if (d < 2 && bayer(x, y) < 0.5) r.set(x, y, ST.oilLight);
      }
    }
    for (let k = 0; k < 30; k++) {
      // fizz: small light dots dancing over the whole well
      const x = Math.floor(hash2(k, f, 61) * WELL.w);
      const y = 2 + Math.floor(hash2(f, k, 63) * (WELL.h - 4));
      r.set(x, y, k % 3 === 0 ? ST.oilFoam : ST.oilLight);
    }
    for (const [x, y, size, phase] of BUBBLES) bubble(r, x, y, size, (f + phase) % 4);
    roundCorners(r, 0, 0, WELL.w, WELL.h);
    return r;
  });
}

/** Basket rim (the mouth) inside a BASKET frame, the same in both frames: the game centres the fryItem
 * on it and the mouth on the oil well. Below it: the front wall (raised only) and the red grip. */
export const BASKET_MOUTH = { x: 3, y: 2, w: 48, h: 30 } as const;
const M = BASKET_MOUTH;
const CX = M.x + M.w / 2;

/** Bracket and red grip hanging from the front of the rim, top row at y. */
function handle(r: Raster, y: number): void {
  rectR(r, CX - 4, y, 2, 3, ST.steelShade); // the bracket's two arms
  rectR(r, CX + 2, y, 2, 3, ST.steelShade);
  r.set(CX - 4, y, ST.steelLight);
  r.set(CX + 2, y, ST.steelLight);
  rectR(r, CX - 8, y + 3, 16, 5, ST.red); // red grip
  rectR(r, CX - 8, y + 3, 16, 1, ST.redLight);
  rectR(r, CX - 8, y + 7, 16, 1, ST.redDark);
  rectR(r, CX - 6, y + 4, 4, 1, ST.spark);
}

function mesh(r: Raster, x: number, y: number, w: number, h: number, pitch: number, wire: string, hole: string): void {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) r.set(i, j, (i - x) % pitch === 0 || (j - y) % pitch === 0 ? wire : hole);
}

/** Thick wire rim: lit outer ring on the top-left, a second inner ring. */
function rim(r: Raster): void {
  bevel(r, M.x, M.y, M.w, M.h, ST.steelShine, ST.steelMid);
  bevel(r, M.x + 1, M.y + 1, M.w - 2, M.h - 2, ST.steelLight, ST.steelShade);
  r.set(M.x + M.w - 1, M.y, ST.steelLight);
}

export function buildBasket(): Raster[] {
  const raised = new Raster(BASKET.w, BASKET.h);
  mesh(raised, M.x + 2, M.y + 2, M.w - 4, 6, 3, ST.steel, ST.steelDark); // back inner wall, lit
  mesh(raised, M.x + 2, M.y + 8, M.w - 4, M.h - 10, 3, ST.steelShade, ST.blackShade); // floor
  mesh(raised, M.x + 1, M.y + M.h, M.w - 2, 6, 3, ST.steelMid, ST.black); // front wall under the rim
  rectR(raised, M.x + 1, M.y + M.h + 5, M.w - 2, 1, ST.steelShade);
  rim(raised);
  handle(raised, M.y + M.h + 6);
  outlineRaster(raised, ST.ink);
  for (const dx of [-17, -6, 9, 19]) {
    // it has just come out of the oil: golden drips under the mesh
    raised.set(CX + dx, M.y + M.h + 6, ST.oilLight);
    raised.set(CX + dx, M.y + M.h + 7, ST.oil);
  }

  const lowered = new Raster(BASKET.w, BASKET.h);
  rim(lowered);
  handle(lowered, M.y + M.h);
  outlineRaster(lowered, ST.ink);
  // inside the rim: no ink ring (a thin wire, not a frame) and no mesh: the food lies ON the submerged
  // mesh, so this frame (drawn over the food) leaves it clear (a wire grid over the fries made them noise)
  for (let y = M.y + 2; y < M.y + M.h - 2; y++) for (let x = M.x + 2; x < M.x + M.w - 2; x++) lowered.set(x, y, null);
  // foam boiling against the wire, inside the rim
  for (let k = 0; k < 18; k++) {
    const t = hash2(k, 0, 81);
    const along = k % 2 === 0;
    const x = along ? M.x + 2 + Math.floor(t * (M.w - 4)) : k % 4 === 1 ? M.x + 2 : M.x + M.w - 3;
    const y = along ? (k % 4 === 0 ? M.y + 2 : M.y + M.h - 3) : M.y + 2 + Math.floor(t * (M.h - 4));
    lowered.set(x, y, ST.oilFoam);
  }
  return [raised, lowered];
}
