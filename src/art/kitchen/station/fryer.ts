/**
 * The double friggitrice (FRYER geometry in ../keys.ts): steel top with two oil wells, the basket
 * hook rail at the back, a front panel with a thermostat dial and a pilot light per well and the
 * FRIGGITRICE name plate across both units. Plus the
 * bubbling oil of one well (32x22 x4) and the wire basket with its red handle (34x30: 0 raised,
 * 1 lowered = rim + handle over the oil).
 */
import { Raster, hash2, outlineRaster } from '../../hills/raster';
import { bayer } from '../../pixel';
import { rectR } from '../../rampage/draw';
import { FRYER } from '../keys';
import { ST } from './colors';
import { FACE, FRAME, PLATE_H, bevel, brushedRect, dial, namePlate, roundCorners } from './draw';

const WELL = FRYER.well;
/** Front rim right under the wells, then the front panel. */
const RIM_Y = FRYER.wells[0].y + WELL.h + 1;
const PANEL_Y = RIM_Y + 3;
const RAIL_Y = 4;

function well(r: Raster, x: number, y: number): void {
  rectR(r, x, y, WELL.w, WELL.h, ST.ironDark); // hidden by the oil, shows in its rounded corners
  rectR(r, x - 1, y - 1, WELL.w + 2, 1, ST.steelEdge); // back and left inner walls in shadow
  rectR(r, x - 1, y - 1, 1, WELL.h + 2, ST.steelEdge);
  rectR(r, x, y + WELL.h, WELL.w + 1, 1, ST.steelShine); // lit front lip
  rectR(r, x + WELL.w, y, 1, WELL.h, ST.steelLight);
}

function hookRail(r: Raster, w: number): void {
  rectR(r, 4, RAIL_Y, w - 8, 2, ST.black);
  rectR(r, 4, RAIL_Y, w - 8, 1, ST.blackLight);
  for (const wl of FRYER.wells) {
    const cx = wl.x + WELL.w / 2;
    for (const hx of [cx - 9, cx + 8]) {
      rectR(r, hx, RAIL_Y - 2, 1, 4, ST.blackEdge); // two hooks per well
      r.set(hx, RAIL_Y - 2, ST.blackLight);
    }
  }
}

function frontPanel(r: Raster, w: number, h: number): void {
  brushedRect(r, 1, PANEL_Y, w - 2, h - 1 - PANEL_Y, FACE, 43);
  rectR(r, 1, PANEL_Y, w - 2, 1, ST.steel);
  rectR(r, 1, h - 2, w - 2, 1, ST.steelShade);
  const seam = Math.round(w / 2) - 1;
  rectR(r, seam, PANEL_Y + 1, 1, h - PANEL_Y - 3, ST.steelDark); // two units side by side
  rectR(r, seam + 1, PANEL_Y + 1, 1, h - PANEL_Y - 3, ST.steel);
  for (const wl of FRYER.wells) {
    const cx = wl.x + WELL.w / 2;
    dial(r, cx, PANEL_Y + 6);
    rectR(r, cx - 1, PANEL_Y + 11, 2, 2, ST.amber); // pilot light
    r.set(cx - 1, PANEL_Y + 11, ST.amberHot);
  }
  const plateY = h - 2 - PLATE_H;
  for (const vx of [5, 12, w - 17, w - 10]) {
    rectR(r, vx, plateY + 2, 5, 1, ST.steelEdge); // vent slots either side of the plate
    rectR(r, vx, plateY + 3, 5, 1, ST.steel);
  }
  namePlate(r, 'FRIGGITRICE', w / 2, plateY);
}

export function buildFryer(): Raster {
  const { w, h } = FRYER;
  const r = new Raster(w, h);
  brushedRect(r, 1, 1, w - 2, PANEL_Y - 1, FRAME, 41);
  bevel(r, 1, 1, w - 2, PANEL_Y - 1, ST.steelShine, ST.steelShade);
  hookRail(r, w);
  for (const wl of FRYER.wells) well(r, wl.x, wl.y);
  rectR(r, 1, RIM_Y, w - 2, 1, ST.steelShine);
  rectR(r, 1, RIM_Y + 2, w - 2, 1, ST.steelDark);
  frontPanel(r, w, h);
  roundCorners(r, 1, 1, w - 2, h - 2);
  outlineRaster(r, ST.ink);
  return r;
}

/** [x, y, phase] of the oil bubbles: each grows over 3 frames and pops on the 4th. */
const BUBBLES = [
  [5, 6, 0], [13, 13, 1], [22, 8, 2], [27, 16, 3], [9, 18, 2], [18, 3, 3], [25, 4, 1], [4, 13, 3], [16, 17, 0],
] as const;

function bubble(r: Raster, x: number, y: number, stage: number): void {
  if (stage === 0) {
    r.set(x, y, ST.oilFoam);
  } else if (stage === 1) {
    for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]] as const) r.set(x + dx, y + dy, ST.oilFoam);
    r.set(x, y, ST.oilLight);
    r.set(x - 1, y - 1, ST.oilHot);
  } else if (stage === 2) {
    rectR(r, x - 1, y - 1, 3, 3, ST.oilFoam);
    rectR(r, x - 2, y, 1, 1, ST.oilFoam);
    rectR(r, x + 2, y, 1, 1, ST.oilFoam);
    r.set(x, y, ST.oil);
    r.set(x - 1, y - 1, ST.oilHot);
  } else {
    for (const [dx, dy] of [[-2, -1], [2, -1], [-1, 1], [2, 1]] as const) r.set(x + dx, y + dy, ST.oilFoam); // pop
  }
}

/** One well of hot oil: shadowed back edge, golden body, drifting ripples, bubbles growing and popping. */
export function buildFryOil(): Raster[] {
  return [0, 1, 2, 3].map((f) => {
    const r = new Raster(WELL.w, WELL.h);
    for (let y = 0; y < WELL.h; y++) {
      for (let x = 0; x < WELL.w; x++) {
        const t = y / WELL.h + x / (WELL.w * 3);
        let col: string = t < 0.12 ? ST.oilDeep : ST.oil;
        if (t >= 0.12 && t < 0.2 && bayer(x, y) < 0.5) col = ST.oilDeep;
        if (t > 0.55 && bayer(x, y) < (t - 0.55) * 1.2) col = ST.oilLight; // lit front of the well
        r.set(x, y, col);
      }
    }
    for (let k = 0; k < 7; k++) {
      // ripples: short light dashes drifting right one step per frame
      const y = 3 + k * 3;
      const x0 = Math.floor(hash2(k, 0, 51) * WELL.w) + f * 2;
      for (let i = 0; i < 4; i++) r.set((x0 + i) % WELL.w, y, ST.oilLight);
    }
    for (const [x, y, phase] of BUBBLES) bubble(r, x, y, (f + phase) % 4);
    roundCorners(r, 0, 0, WELL.w, WELL.h);
    return r;
  });
}

const BW = 34;
const BH = 30;
/** Basket opening (rim rect) inside the frame; the game draws the fry items in it. */
const RIM = { x: 2, y: 1, w: 30, h: 19 } as const;

function handle(r: Raster): void {
  const cx = RIM.x + RIM.w / 2;
  rectR(r, cx - 1, RIM.y + RIM.h + 3, 2, 2, ST.steelShade); // bracket
  r.set(cx - 1, RIM.y + RIM.h + 3, ST.steelLight);
  rectR(r, cx - 4, RIM.y + RIM.h + 5, 8, 3, ST.red); // red grip
  rectR(r, cx - 4, RIM.y + RIM.h + 5, 8, 1, ST.redLight);
  rectR(r, cx - 4, RIM.y + RIM.h + 7, 8, 1, ST.redDark);
  r.set(cx - 3, RIM.y + RIM.h + 5, ST.spark);
}

function mesh(r: Raster, x: number, y: number, w: number, h: number, pitch: number, wire: string, hole: string): void {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) r.set(i, j, (i - x) % pitch === 0 || (j - y) % pitch === 0 ? wire : hole);
}

function rim(r: Raster): void {
  bevel(r, RIM.x, RIM.y, RIM.w, RIM.h, ST.steelShine, ST.steelMid);
  r.set(RIM.x + RIM.w - 1, RIM.y, ST.steelLight);
}

export function buildBasket(): Raster[] {
  const raised = new Raster(BW, BH);
  mesh(raised, RIM.x + 1, RIM.y + 1, RIM.w - 2, 4, 2, ST.steel, ST.steelDark); // back inner wall, lit
  mesh(raised, RIM.x + 1, RIM.y + 5, RIM.w - 2, RIM.h - 6, 3, ST.steelShade, ST.blackShade); // floor
  mesh(raised, RIM.x, RIM.y + RIM.h, RIM.w, 3, 2, ST.steelMid, ST.black); // front wall
  rim(raised);
  rectR(raised, RIM.x, RIM.y + RIM.h + 2, RIM.w, 1, ST.steelShade);
  handle(raised);
  outlineRaster(raised, ST.ink);

  const lowered = new Raster(BW, BH);
  rim(lowered);
  rectR(lowered, RIM.x, RIM.y + RIM.h, RIM.w, 1, ST.steelShade); // the rim's own thickness, then oil
  handle(lowered);
  rectR(lowered, RIM.x + RIM.w / 2 - 1, RIM.y + RIM.h + 1, 2, 2, ST.steelShade); // bracket rises out of the oil
  outlineRaster(lowered, ST.ink);
  // inside the rim: no ink ring (a thin wire, not a frame), the submerged mesh shows through the oil
  for (let y = RIM.y + 1; y < RIM.y + RIM.h - 1; y++) {
    for (let x = RIM.x + 1; x < RIM.x + RIM.w - 1; x++) {
      const wire = (x - RIM.x) % 4 === 0 || (y - RIM.y) % 4 === 0;
      lowered.set(x, y, wire && (x + y) % 2 === 0 ? ST.oilDeep : null);
    }
  }
  // foam boiling against the wire, inside the rim
  for (const [x, y] of [[4, 2], [5, 2], [13, 2], [24, 2], [30, 8], [3, 15], [19, 18], [20, 18], [30, 14]] as const) lowered.set(x, y, ST.oilFoam);
  return [raised, lowered];
}
