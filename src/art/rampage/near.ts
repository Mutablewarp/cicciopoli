/**
 * 'rampage-near' 512x192: the nearer street front. Plastered apartment blocks with lit
 * windows and balconies, a half-demolished one (slabs and rebar sticking out of the bite)
 * and a bare concrete frame under construction. Jagged tops only: nothing looks walkable.
 */
import { Raster, hash2, outlineRaster } from '../hills/raster';
import { RC } from './colors';
import { lineR, rectR } from './draw';
import { LAYER_W } from './sky';

const NEAR_H = 192;
const CELL_W = 14;
const CELL_H = 18;
const SHOP_H = 22;

interface Block {
  x: number;
  w: number;
  top: number;
  kind: 'flat' | 'ruin' | 'frame';
  seed: number;
}

const BLOCKS: readonly Block[] = [
  { x: 2, w: 70, top: 40, kind: 'flat', seed: 1 },
  { x: 78, w: 48, top: 56, kind: 'ruin', seed: 2 },
  { x: 134, w: 92, top: 52, kind: 'frame', seed: 3 },
  { x: 232, w: 72, top: 22, kind: 'flat', seed: 4 },
  { x: 310, w: 56, top: 36, kind: 'ruin', seed: 5 },
  { x: 374, w: 84, top: 46, kind: 'flat', seed: 6 },
  { x: 464, w: 46, top: 48, kind: 'ruin', seed: 7 },
];

function windowAt(r: Raster, x: number, y: number, seed: number): void {
  const h = hash2(x, y, seed);
  rectR(r, x - 1, y - 1, 8, 11, RC.wallLine);
  if (h < 0.4) {
    rectR(r, x, y, 6, 9, RC.winLit);
    rectR(r, x, y, 6, 2, RC.winLitHi);
    rectR(r, x + 3, y, 1, 9, RC.wallLine);
    if (h < 0.06) rectR(r, x, y + 3, 3, 4, RC.tv);
  } else if (h < 0.75) {
    rectR(r, x, y, 6, 9, RC.winDim);
    rectR(r, x + 3, y, 1, 9, RC.wallLine);
    r.set(x, y, RC.plaster);
  } else {
    rectR(r, x, y, 6, 9, RC.winDark);
    lineR(r, x + 1, y + 7, x + 4, y + 1, RC.wallShade);
  }
  rectR(r, x - 1, y + 10, 8, 1, RC.wallLight);
}

function balcony(r: Raster, x: number, y: number): void {
  rectR(r, x - 3, y + 11, 12, 2, RC.plaster);
  rectR(r, x - 3, y + 13, 12, 1, RC.wallShade);
  for (const bx of [-3, 0, 3, 6, 8]) rectR(r, x + bx, y + 8, 1, 3, RC.wallLine);
  rectR(r, x - 3, y + 8, 12, 1, RC.wallLine);
}

function facade(r: Raster, b: Block): void {
  const body = b.seed % 2 === 0 ? RC.wallAlt : RC.wall;
  rectR(r, b.x, b.top, b.w, NEAR_H - b.top, body);
  rectR(r, b.x, b.top, 1, NEAR_H - b.top, RC.wallLight);
  rectR(r, b.x + b.w - 1, b.top, 1, NEAR_H - b.top, RC.wallShade);
  rectR(r, b.x, b.top, b.w, 3, RC.plaster);
  rectR(r, b.x, b.top + 3, b.w, 1, RC.wallShade);
  for (let i = 0; i < b.w * 2; i++) {
    const x = b.x + 1 + Math.floor(hash2(i, 3, b.seed) * (b.w - 2));
    const y = b.top + 6 + Math.floor(hash2(i, 4, b.seed) * (NEAR_H - b.top - SHOP_H - 8));
    rectR(r, x, y, 3, 2, hash2(i, 5, b.seed) < 0.5 ? RC.wallLight : RC.wallShade);
  }
  let floor = 0;
  for (let wy = b.top + 9; wy + 10 < NEAR_H - SHOP_H; wy += CELL_H, floor++) {
    for (let wx = b.x + 6, c = 0; wx + 7 < b.x + b.w - 2; wx += CELL_W, c++) {
      windowAt(r, wx, wy, b.seed);
      if (floor > 0 && hash2(c, floor, b.seed + 40) < 0.4) balcony(r, wx, wy);
    }
  }
  const shopY = NEAR_H - SHOP_H;
  for (let sx = b.x + 4; sx + 13 < b.x + b.w - 2; sx += 18) {
    rectR(r, sx, shopY + 2, 14, SHOP_H - 2, RC.wallLine);
    for (let sy = shopY + 4; sy < NEAR_H; sy += 3) rectR(r, sx + 1, sy, 12, 1, RC.wallShade);
  }
}

/** Jagged bite out of the upper right of a block: slabs and rebar stay where the walls went. */
function demolish(r: Raster, b: Block): void {
  const bite = (y: number): number => {
    const stepped = Math.floor(hash2(Math.floor(y / 5), 7, b.seed) * 7);
    return b.x + Math.floor(b.w * 0.3) + Math.floor((y - b.top) * 0.42) + stepped - 3;
  };
  const depth = Math.floor((b.w * 0.8) / 0.42);
  for (let y = b.top - 2; y < b.top + depth; y++) {
    for (let x = bite(y); x < b.x + b.w + 2; x++) r.set(x, y, null);
  }
  for (let y = b.top + 9 + CELL_H - 4; y < b.top + depth; y += CELL_H) {
    const from = bite(y);
    const len = 4 + Math.floor(hash2(y, 2, b.seed) * 8);
    rectR(r, from, y, len, 1, RC.wallLight);
    rectR(r, from, y + 1, len, 2, RC.plaster);
    rectR(r, from, y + 3, len, 1, RC.wallShade);
    lineR(r, from + len - 1, y, from + len + 2, y - 5, RC.rebar);
    lineR(r, from + 2, y, from + 3, y - 4, RC.rebar);
  }
}

/** Bare concrete frame: columns and slabs, the far skyline shows through the open bays. */
function frame(r: Raster, b: Block): void {
  const floors = Math.floor((NEAR_H - b.top) / 26);
  for (let f = 0; f <= floors; f++) {
    const y = b.top + f * 26;
    rectR(r, b.x, y, b.w, 1, RC.wallLight);
    rectR(r, b.x, y + 1, b.w, 3, RC.plaster);
    rectR(r, b.x, y + 4, b.w, 1, RC.wallShade);
  }
  const cols = Math.floor(b.w / 22);
  for (let c = 0; c <= cols; c++) {
    const x = Math.min(b.x + c * 22, b.x + b.w - 4);
    rectR(r, x, b.top, 4, NEAR_H - b.top, RC.wall);
    rectR(r, x, b.top, 1, NEAR_H - b.top, RC.wallLight);
    rectR(r, x + 3, b.top, 1, NEAR_H - b.top, RC.wallShade);
    lineR(r, x + 1, b.top, x + 1 + (c % 2 === 0 ? 1 : -1), b.top - 7, RC.rebar);
    lineR(r, x + 2, b.top, x + 2, b.top - 5, RC.rebar);
  }
  // one bay on the lowest floors already walled in, with a lit window
  rectR(r, b.x + 22, b.top + 26 * (floors - 1) + 5, 18, 21, RC.wallAlt);
  windowAt(r, b.x + 28, b.top + 26 * (floors - 1) + 10, b.seed);
}

export function buildNear(): Raster {
  const r = new Raster(LAYER_W, NEAR_H, true);
  for (const b of BLOCKS) {
    if (b.kind === 'frame') frame(r, b);
    else {
      facade(r, b);
      if (b.kind === 'ruin') demolish(r, b);
    }
  }
  outlineRaster(r, RC.wallLine);
  return r;
}
