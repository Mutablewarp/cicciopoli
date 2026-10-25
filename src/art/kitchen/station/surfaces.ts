/**
 * The two seamless fillers of the kitchen view: the brushed stainless worktop (128x128, tiles both
 * ways, calm so the food pops) and the back wall band (64x48, tiles horizontally): white tiles with
 * blue grout like La Lumia, a steel shelf lip where the wall meets the worktop.
 */
import { Raster, hash2 } from '../../hills/raster';
import { rectR } from '../../rampage/draw';
import { ST } from './colors';
import { FRAME, brushedRect } from './draw';

const TOP = 128;
const TAU = 2 * Math.PI;

/** [cycles per tile, amplitude] of the brushing along one row: low frequencies only, so every streak
 * runs 20-60 px (long horizontal lines; per-pixel noise would read as felt, not steel). */
const STREAK = [[1, 0.34], [2, 0.26], [3, 0.18]] as const;
/** [cycles per tile, amplitude, phase] of the soft row bands: the sheet catches the light unevenly. */
const BANDS = [[1, 0.18, 0.4], [3, 0.12, 2.1], [8, 0.08, 4.4]] as const;
/** Brushed tone thresholds, light to deep. */
const SHEEN_T = 0.62;
const LIGHT_T = 0.34;
const SHADE_T = -0.34;
const DEEP_T = -0.66;

/** [x, y, length, slope (rows per px, 0 = flat)] of the faint scratches (wrapped both ways). */
const SCRATCHES = [
  [14, 22, 9, 0], [70, 9, 6, 0.25], [101, 48, 11, 0], [33, 77, 7, -0.3], [88, 96, 8, 0],
  [120, 118, 10, 0.2], [52, 120, 5, 0], [6, 60, 6, -0.2],
] as const;

/** Tone of worktop pixel (x, y), about [-1, 1]: the row's own shade (each brushed line differs from
 * its neighbours), long streaks along it, soft bands down the sheet and a wide diagonal reflection. */
function brushTone(x: number, y: number): number {
  let v = (hash2(y, 0, 43) - 0.5) * 0.56;
  for (const [k, a] of STREAK) v += a * Math.sin((TAU * k * x) / TOP + hash2(y, k, 41) * TAU);
  for (const [k, a, p] of BANDS) v += a * Math.cos((TAU * k * y) / TOP + p);
  const sheen = Math.cos((TAU * (x + y)) / TOP);
  return v + Math.max(0, sheen - 0.55) * 1.4;
}

export function buildWorktop(): Raster {
  const r = new Raster(TOP, TOP);
  for (let y = 0; y < TOP; y++) {
    for (let x = 0; x < TOP; x++) {
      const t = brushTone(x, y);
      r.set(x, y, t > SHEEN_T ? ST.topSheen : t > LIGHT_T ? ST.topLight : t < DEEP_T ? ST.topDeep : t < SHADE_T ? ST.topShade : ST.top);
    }
  }
  // brushing grooves: a few long deep hairlines
  for (let y = 0; y < TOP; y++) {
    if (hash2(y, 1, 47) > 0.12) continue;
    const x0 = Math.floor(hash2(y, 2, 47) * TOP);
    const len = 18 + Math.floor(hash2(y, 3, 47) * 30);
    for (let i = 0; i < len; i++) r.set((x0 + i) % TOP, y, ST.topDeep);
  }
  for (const [sx, sy, len, slope] of SCRATCHES) {
    for (let i = 0; i < len; i++) {
      const x = (sx + i) % TOP;
      const y = (((sy + Math.round(i * slope)) % TOP) + TOP) % TOP;
      r.set(x, y, ST.topScratch);
    }
  }
  return r;
}

const WALL_W = 64;
const WALL_H = 48;
/** Tile pitch (7 px tile + 1 px grout) and the row where the steel lip starts. */
const CELL = 8;
const LIP_Y = 40;

function tile(r: Raster, x0: number, y0: number): void {
  const n = CELL - 1;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const lit = i === 0 || j === 0;
      const dark = i === n - 1 || j === n - 1;
      r.set(x0 + i, y0 + j, dark ? ST.tileShade : lit ? ST.tileLight : ST.tile);
    }
  }
  r.set(x0 + 1, y0 + 1, ST.tileLight); // glaze glint
  r.set(x0 + 2, y0 + 1, ST.tileLight);
}

export function buildWallTiles(): Raster {
  const r = new Raster(WALL_W, WALL_H, true);
  rectR(r, 0, 0, WALL_W, LIP_Y, ST.grout);
  for (let ty = 0; ty < LIP_Y / CELL; ty++) {
    for (let tx = 0; tx < WALL_W / CELL; tx++) tile(r, tx * CELL, ty * CELL);
  }
  // grout crossings a touch darker so the grid reads at 2 css px per art px
  for (let y = CELL - 1; y < LIP_Y; y += CELL) for (let x = CELL - 1; x < WALL_W; x += CELL) r.set(x, y, ST.groutDark);
  // steel shelf lip: dark seam, lit edge, brushed top, shaded front, dark foot
  rectR(r, 0, LIP_Y, WALL_W, 1, ST.steelEdge);
  rectR(r, 0, LIP_Y + 1, WALL_W, 1, ST.steelShine);
  brushedRect(r, 0, LIP_Y + 2, WALL_W, 3, FRAME, 9);
  rectR(r, 0, LIP_Y + 5, WALL_W, 1, ST.steelMid);
  rectR(r, 0, LIP_Y + 6, WALL_W, 1, ST.steelShade);
  rectR(r, 0, LIP_Y + 7, WALL_W, 1, ST.steelDark);
  return r;
}
