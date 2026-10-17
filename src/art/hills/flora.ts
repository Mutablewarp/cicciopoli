/** Foreground decoration: round cup tree, bush, swaying flower. */
import { Mask, paintMask, type Tone } from './mask';
import { Raster, hash2, outlineRaster, packColor } from './raster';

const LEAF: Tone = { light: '#86d040', base: '#4cb428', shade: '#2e8a22', dark: '#227018' };
const LEAF_B: Tone = { light: '#74c438', base: '#40a424', shade: '#2a8020', dark: '#1f6a18' };
const BARK: Tone = { light: '#a06c3c', base: '#7a4c28', shade: '#56341a' };
const LEAF_LINE = '#173a14';

/** Canopy built from overlapping lumps with alternating materials so each lump gets its own rim light. */
function lumps(m: Mask, list: readonly (readonly [number, number, number, number])[]): void {
  list.forEach(([x, y, rx, ry], i) => m.ellipse(x, y, rx, ry, i % 2 === 0 ? 1 : 2));
}

export function buildTree(): Raster {
  const m = new Mask(32, 48);
  m.rect(14, 28, 4, 20, 3);
  m.rect(12, 46, 8, 2, 3);
  m.rect(13, 45, 6, 1, 3);
  lumps(m, [[9, 24, 7, 5], [23, 24, 7, 5], [16, 27, 8, 4], [16, 19, 11, 7], [9, 13, 7, 6], [22, 13, 7, 6], [15, 8, 8, 6]]);
  const r = new Raster(32, 48);
  paintMask(m, r, { 1: LEAF, 2: LEAF_B, 3: BARK }, { shadeDepth: 2, lightDepth: 1 });
  for (const [x, y] of [[11, 4], [12, 4], [10, 5], [5, 10], [6, 9]] as const) r.set(x, y, '#b0e060');
  // bark knot + a couple of leaf glints
  r.set(15, 36, BARK.shade);
  r.set(16, 37, BARK.shade);
  r.map((c, x, y) => (c === packColor(LEAF.base) && hash2(x, y, 5) < 0.05 ? packColor(LEAF.light) : c));
  outlineRaster(r, LEAF_LINE);
  return r;
}

export function buildBush(): Raster {
  const m = new Mask(32, 16);
  m.rect(3, 12, 26, 4, 2);
  lumps(m, [[8, 11, 6, 5], [24, 11, 6, 4], [16, 9, 7, 6], [20, 7, 4, 3]]);
  const r = new Raster(32, 16);
  paintMask(m, r, { 1: LEAF, 2: LEAF_B }, { shadeDepth: 2, lightDepth: 1 });
  for (const [x, y] of [[13, 4], [14, 4], [12, 5], [5, 7]] as const) r.set(x, y, '#b0e060');
  // two red berries
  r.set(20, 10, '#e83020');
  r.set(9, 9, '#e83020');
  outlineRaster(r, LEAF_LINE);
  return r;
}

const SWAY = [0, 1, 0, -1];

/** 8x8, 4 sway frames: red-orange daisy on a bending stem. */
export function buildFlower(): Raster[] {
  return SWAY.map((s) => {
    const r = new Raster(8, 8);
    const hx = 3 + s;
    r.set(3, 7, '#2e8a22');
    r.set(3, 6, '#2e8a22');
    r.set(3, 5, '#2e8a22');
    r.set(3 + s, 4, '#2e8a22');
    r.set(4, 6, '#4cb428');
    r.set(2, 5, '#4cb428');
    r.set(hx, 1, '#ff6a4a');
    r.set(hx - 1, 2, '#ff6a4a');
    r.set(hx + 1, 2, '#e8402a');
    r.set(hx, 3, '#e8402a');
    r.set(hx, 2, '#fcd400');
    outlineRaster(r, LEAF_LINE);
    return r;
  });
}
