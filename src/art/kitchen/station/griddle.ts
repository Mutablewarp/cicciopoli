/**
 * The plancha (GRIDDLE geometry in ../keys.ts): black seasoned steel with a grease sheen and three
 * burnished cooking spots under the slot centres, a brushed steel frame with the back splash, the
 * grease trough, and the front panel: a knob under each outer spot, the PIASTRA name plate under the
 * middle one, the pilot light. Plus the heat shimmer sheet (104x40 x4)
 * the game lays over the surface at low alpha.
 */
import { Raster, hash2, outlineRaster } from '../../hills/raster';
import { rectR } from '../../rampage/draw';
import { GRIDDLE } from '../keys';
import { ST } from './colors';
import { FACE, FRAME, IRON, bevel, brushedRect, frameRect, grain, knob, namePlate, roundCorners } from './draw';

const S = GRIDDLE.surface;
/** Rows below the surface: recess edge, grease trough, lit rim edge, rim, bend; then the front panel. */
const TROUGH_Y = S.y + S.h + 1;
const PANEL_Y = TROUGH_Y + 4;
/** Cooking spot radii (the griddle items are 28x28, patties ~24 across). */
const SPOT_RX = 12;
const SPOT_RY = 11;

function surface(r: Raster): void {
  for (let y = S.y; y < S.y + S.h; y++) {
    for (let x = S.x; x < S.x + S.w; x++) {
      const g = grain(x, y, 64, 31);
      // grease sheen: the kitchen light reflected in long streaks on the back half, strongest top-left
      const sheen = (1 - (y - S.y) / (S.h * 0.5)) * (1 - ((x - S.x) / S.w) * 0.5);
      let col: string = g > 0.5 ? IRON.light : g < -0.55 ? IRON.shade : IRON.base;
      if (sheen > 0 && g > 0.5 - sheen * 0.45) col = sheen > 0.6 && g > 0.7 - sheen * 0.3 ? ST.ironGloss : ST.ironSheen;
      if (hash2(x, y, 5) < 0.02) col = ST.ironLight; // seasoning flecks
      r.set(x, y, col);
    }
  }
  for (const s of GRIDDLE.slots) {
    for (let y = s.y - SPOT_RY; y <= s.y + SPOT_RY; y++) {
      for (let x = s.x - SPOT_RX; x <= s.x + SPOT_RX; x++) {
        const d = Math.hypot((x - s.x) / (SPOT_RX + 0.5), (y - s.y) / (SPOT_RY + 0.5));
        if (d > 1) continue;
        const lit = x - s.x + (y - s.y) < 0;
        if (d > 0.86) r.set(x, y, lit ? ST.ironGloss : ST.ironWorn); // burnished ring, lit on the top-left
        else if (grain(x, y, 64, 37) > 0.2 - d * 0.3) r.set(x, y, ST.ironWorn); // worn brown streaks
      }
    }
  }
  // the back splash and the left rim throw a dark line on the iron
  rectR(r, S.x, S.y, S.w, 1, ST.ironDark);
  rectR(r, S.x, S.y, 1, S.h, ST.ironDark);
}

function frontPanel(r: Raster, w: number, h: number): void {
  brushedRect(r, 1, PANEL_Y, w - 2, h - 1 - PANEL_Y, FACE, 33);
  rectR(r, 1, PANEL_Y, w - 2, 1, ST.steel);
  rectR(r, 1, h - 2, w - 2, 1, ST.steelShade);
  rectR(r, w - 2, PANEL_Y, 1, h - 1 - PANEL_Y, ST.steelShade);
  const ky = PANEL_Y + 4;
  const [left, middle, right] = GRIDDLE.slots;
  for (const s of [left, right]) {
    knob(r, s.x, ky);
    r.set(s.x - 5, ky - 1, ST.steelEdge); // low / high marks
    r.set(s.x + 5, ky - 1, ST.red);
  }
  namePlate(r, 'PIASTRA', middle.x, PANEL_Y + 1);
  // pilot light: the plancha is on
  rectR(r, 7, ky - 1, 2, 2, ST.amber);
  r.set(7, ky - 1, ST.amberHot);
  frameRect(r, 6, ky - 2, 4, 4, ST.steelDark);
}

export function buildGriddle(): Raster {
  const { w, h } = GRIDDLE;
  const r = new Raster(w, h);
  brushedRect(r, 1, 1, w - 2, PANEL_Y - 1, FRAME, 32);
  bevel(r, 1, 1, w - 2, PANEL_Y - 1, ST.steelShine, ST.steelShade);
  rectR(r, 2, 2, w - 4, 1, ST.steelLight);
  surface(r);
  frameRect(r, S.x - 1, S.y - 1, S.w + 2, S.h + 2, ST.steelEdge);
  // grease trough along the front of the iron, a few golden drops in it
  rectR(r, S.x - 1, TROUGH_Y, S.w + 2, 1, ST.ironDark);
  for (let x = S.x; x < S.x + S.w; x++) if (hash2(x, 0, 17) < 0.08) r.set(x, TROUGH_Y, ST.grease);
  rectR(r, 1, TROUGH_Y + 1, w - 2, 1, ST.steelShine);
  rectR(r, 1, TROUGH_Y + 2, w - 2, 1, ST.steel);
  rectR(r, 1, TROUGH_Y + 3, w - 2, 1, ST.steelDark);
  frontPanel(r, w, h);
  roundCorners(r, 1, 1, w - 2, h - 2);
  outlineRaster(r, ST.ink);
  return r;
}

/** [x on the surface, phase] of the shimmer squiggles: three over each cooking spot. */
const WISPS = GRIDDLE.slots.flatMap((s, k) => [-7, 0, 7].map((dx, i) => [s.x - S.x + dx, (k * 13 + i * 23) % 40] as const));

/** Heat shimmer: sparse wavy squiggles rising over the spots (10 px per frame, loops in 4). */
export function buildGriddleHeat(): Raster[] {
  return [0, 1, 2, 3].map((f) => {
    const r = new Raster(S.w, S.h);
    for (const [x0, phase] of WISPS) {
      const head = (((36 - phase - f * 10) % 40) + 40) % 40;
      for (let k = 0; k < 6; k += 2) {
        const y = head + k;
        if (y >= S.h) continue;
        const x = x0 + Math.round(Math.sin((y + phase) * 0.8));
        r.set(x, y, k === 0 ? ST.spark : ST.sparkWarm);
      }
    }
    return r;
  });
}
