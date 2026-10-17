/**
 * 'hills-tiles': 8x2 tiles of 16x16 laid out as `T` in keys.ts.
 * Cup ground band: ink top line, lime grass with a light top line, mid-green and
 * teal-green bands whose jagged drips hang over very dark soil, then brick rows.
 */
import { mix } from '../pixel';
import { T, TILE } from '../keys';
import { HC } from './colors';
import { Raster, hash2 } from './raster';

const enum K { E, O, LN, LI, MI, DK, S }
type Grid = K[][];
type SoilFn = (x: number, y: number) => string;

interface Profile { lime: number[]; mid: number[]; drip: number[] }

/** Stepped tooth (period 8): 0 at the tooth edges, up to `depth` in its centre. */
function tooth(x: number, phase: number, depth: number): number {
  const m = (((x - phase) % 8) + 8) % 8;
  return Math.min(depth, Math.floor(3.5 - Math.abs(m - 3.5) + 0.001));
}

function profile(plat: boolean): Profile {
  const lime: number[] = [];
  const mid: number[] = [];
  const drip: number[] = [];
  for (let x = 0; x < TILE; x++) {
    const d = plat ? 6 + tooth(x, 3, 3) : 7 + tooth(x, 3, 3);
    const m = Math.min(d - 1, (plat ? 5 : 6) + tooth(x, 7, x < 8 ? 2 : 1));
    const l = Math.min(m - 1, 4 + tooth(x, 5, x < 8 ? 1 : 2));
    drip.push(d);
    mid.push(m);
    lime.push(l);
  }
  return { lime, mid, drip };
}

function grassGrid(p: Profile): Grid {
  const g: Grid = [];
  for (let y = 0; y < TILE; y++) {
    const row: K[] = [];
    for (let x = 0; x < TILE; x++) {
      if (y === 0) row.push(K.O);
      else if (y === 1) row.push(K.LN);
      else if (y < p.lime[x]) row.push(K.LI);
      else if (y < p.mid[x]) row.push(K.MI);
      else if (y < p.drip[x]) row.push(K.DK);
      else row.push(K.S);
    }
    g.push(row);
  }
  // ink outline hugging the drips (4-neighbourhood, wraps so M tiles stay seamless)
  const isGrass = (x: number, y: number): boolean => {
    const k = g[y]?.[(x + TILE) % TILE];
    return k === K.LN || k === K.LI || k === K.MI || k === K.DK;
  };
  const marks: [number, number][] = [];
  for (let y = 1; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      if (g[y][x] === K.S && (isGrass(x, y - 1) || isGrass(x - 1, y) || isGrass(x + 1, y))) marks.push([x, y]);
    }
  }
  for (const [x, y] of marks) g[y][x] = K.O;
  return g;
}

function fillGrid(): Grid {
  return Array.from({ length: TILE }, () => Array.from({ length: TILE }, () => K.S));
}

/** Rounded grass cap + soil inset on the open side; `mirror` = right edge. */
function carve(g: Grid, mirror: boolean, cap: number | null, roundBottom: boolean): void {
  const set = (x: number, y: number, k: K): void => { g[y][mirror ? TILE - 1 - x : x] = k; };
  if (cap === null) {
    for (let y = 0; y < TILE; y++) { set(0, y, K.E); set(1, y, K.O); }
    return;
  }
  set(0, 0, K.E); set(1, 0, K.E); set(0, 1, K.E); set(1, 1, K.O);
  for (let y = 2; y <= cap; y++) set(0, y, K.O);
  set(0, cap + 1, K.O); set(1, cap + 1, K.O);
  for (let y = cap + 2; y < TILE; y++) { set(0, y, K.E); set(1, y, K.O); }
  if (roundBottom) set(1, TILE - 1, K.E);
}

/** Forces the grass at the open edge down to the cap so the overhang reads clean. */
function capProfile(p: Profile, left: boolean, right: boolean, cap: number): Profile {
  const q: Profile = { lime: [...p.lime], mid: [...p.mid], drip: [...p.drip] };
  const cols = [...(left ? [0, 1] : []), ...(right ? [TILE - 2, TILE - 1] : [])];
  for (const x of cols) q.drip[x] = cap + 1;
  return q;
}

const GRASS_LIGHT: Partial<Record<K, string>> = { [K.LI]: HC.grassLine, [K.MI]: '#78c81c', [K.DK]: HC.grassMid };
const GRASS_DARKER: Partial<Record<K, string>> = { [K.LN]: HC.grass, [K.LI]: '#90c80c', [K.MI]: HC.grassDark, [K.DK]: HC.grassDeep };

function paint(r: Raster, ox: number, g: Grid, soil: SoilFn, left: boolean, right: boolean, cap: number): void {
  const oy = ox >= 8 * TILE ? TILE : 0;
  const bx = ox % (8 * TILE);
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const k = g[y][x];
      let col: string | null = null;
      if (k === K.O) col = HC.ink;
      else if (k === K.LN) col = HC.grassLine;
      else if (k === K.LI) col = HC.grass;
      else if (k === K.MI) col = HC.grassMid;
      else if (k === K.DK) col = HC.grassDark;
      else if (k === K.S) col = soil(x, y);
      if (col !== null && k !== K.S && k !== K.O) {
        if (left && x === 1 && y <= cap) col = GRASS_LIGHT[k] ?? col;
        if (right && x === TILE - 2 && y <= cap) col = GRASS_DARKER[k] ?? col;
      }
      if (col !== null && k === K.S) {
        if (left && x === 2) col = mix(col, '#ffffff', 0.14);
        if (right && x === TILE - 3) col = mix(col, '#000000', 0.25);
      }
      r.set(bx + x, oy + y, col);
    }
  }
}

interface BrickTones { base: string; light: string; shade: string; speck: string; mortar: string }
const BRICK: BrickTones = { base: HC.brick, light: HC.brickLight, shade: HC.brickShade, speck: HC.brickSpeck, mortar: HC.soil };
const BRICK_DEEP: BrickTones = {
  base: HC.brickDeep, light: HC.brickDeepLight, shade: HC.brickDeepShade, speck: HC.brickDeepShade, mortar: HC.soilDeep,
};

/** Staggered 15x3 bricks with 1-px dark mortar; `seed` varies the speckles. */
function brick(t: BrickTones, seed: number, firstRow = 0): SoilFn {
  return (x, y) => {
    if (y < firstRow) return t.mortar;
    const ry = y & 3;
    if (ry === 3) return t.mortar;
    const joint = (y >> 2) % 2 === 0 ? 0 : 8;
    const bxl = (x - joint + TILE) % TILE;
    if (bxl === 0) return t.mortar;
    if (bxl === TILE - 1 || (ry === 2 && bxl > 9)) return t.shade;
    if (ry === 0 || bxl === 1) return t.light;
    return hash2(x, y, seed) < 0.16 ? t.speck : t.base;
  };
}

/** Platform underside: soil, one row of short bricks, soil. */
function platBrick(x: number, y: number): string {
  if (y < 11 || y > 13) return HC.soil;
  const bxl = (x + 4) % 8;
  if (bxl === 0) return HC.soil;
  if (bxl === 7) return HC.brickShade;
  if (y === 11 || bxl === 1) return HC.brickLight;
  return hash2(x, y, 9) < 0.18 ? HC.brickSpeck : HC.brick;
}

function grassTile(r: Raster, idx: number, plat: boolean, left: boolean, right: boolean, soil: SoilFn): void {
  const cap = plat ? 7 : 8;
  const g = grassGrid(capProfile(profile(plat), left, right, cap));
  if (plat) for (let x = 0; x < TILE; x++) g[TILE - 1][x] = K.O;
  if (left) carve(g, false, cap, plat);
  if (right) carve(g, true, cap, plat);
  paint(r, idx * TILE, g, soil, left, right, cap);
}

function fillTile(r: Raster, idx: number, left: boolean, right: boolean, soil: SoilFn): void {
  const g = fillGrid();
  if (left) carve(g, false, null, false);
  if (right) carve(g, true, null, false);
  paint(r, idx * TILE, g, soil, left, right, -1);
}

function blockTile(r: Raster, idx: number): void {
  const ox = (idx % 8) * TILE;
  const oy = Math.floor(idx / 8) * TILE;
  const n = TILE - 1;
  for (let y = 0; y <= n; y++) {
    for (let x = 0; x <= n; x++) {
      const corner = (x === 0 || x === n) && (y === 0 || y === n);
      let col: string | null;
      if (corner) col = null;
      else if (x === 0 || y === 0 || x === n || y === n) col = HC.ink;
      else if (x === 1 || y === 1) col = x === n - 1 || y === n - 1 ? HC.blockFace : HC.blockLight;
      else if (x === n - 1 || y === n - 1) col = HC.blockShade;
      else {
        // pyramid bevel: four facets meeting a flat centre
        const dx = Math.min(x - 2, n - 2 - x);
        const dy = Math.min(y - 2, n - 2 - y);
        const ring = Math.min(dx, dy);
        if (ring >= 3) col = HC.blockFace;
        else if (dy <= dx) col = y < 8 ? mix(HC.blockFace, HC.blockLight, 0.55) : mix(HC.blockFace, HC.blockShade, 0.6);
        else col = x < 8 ? mix(HC.blockFace, HC.blockLight, 0.3) : mix(HC.blockFace, HC.blockShade, 0.35);
        if (ring >= 3 && hash2(x, y, 4) < 0.12) col = mix(HC.blockFace, HC.blockShade, 0.3);
      }
      r.set(ox + x, oy + y, col);
    }
  }
}

function decorateTopAlt(r: Raster, idx: number): void {
  const ox = (idx % 8) * TILE;
  const oy = Math.floor(idx / 8) * TILE;
  const daisy = (x: number, y: number, petal: string): void => {
    r.set(ox + x, oy + y - 1, petal);
    r.set(ox + x - 1, oy + y, petal);
    r.set(ox + x + 1, oy + y, petal);
    r.set(ox + x, oy + y + 1, petal);
    r.set(ox + x, oy + y, '#fcd400');
  };
  daisy(3, 3, '#fcfcf4');
  daisy(11, 3, '#fc7a9a');
  r.set(ox + 7, oy + 2, HC.grassLine);
  r.set(ox + 14, oy + 3, HC.grassLine);
  // pebble in the soil band between two drips
  r.set(ox + 2, oy + 10, '#8a8088');
  r.set(ox + 3, oy + 10, '#b4aab0');
}

function decorateFillAlt(r: Raster, idx: number): void {
  const ox = (idx % 8) * TILE;
  const oy = Math.floor(idx / 8) * TILE;
  // a cracked brick and a small embedded stone
  for (const [x, y] of [[5, 0], [6, 1], [6, 2], [12, 5], [11, 6]] as const) r.set(ox + x, oy + y, HC.soil);
  r.set(ox + 3, oy + 9, '#8a8088');
  r.set(ox + 4, oy + 9, '#b4aab0');
  r.set(ox + 3, oy + 10, '#6a6068');
  r.set(ox + 4, oy + 10, '#8a8088');
}

export function buildHillsTiles(): HTMLCanvasElement {
  const r = new Raster(8 * TILE, 2 * TILE);
  const top = brick(BRICK, 1, 12);
  const fill = brick(BRICK, 2);
  grassTile(r, T.GROUND_TOP_L, false, true, false, top);
  grassTile(r, T.GROUND_TOP_M, false, false, false, top);
  grassTile(r, T.GROUND_TOP_R, false, false, true, top);
  grassTile(r, T.GROUND_TOP_SINGLE, false, true, true, top);
  fillTile(r, T.GROUND_FILL_L, true, false, fill);
  fillTile(r, T.GROUND_FILL_M, false, false, fill);
  fillTile(r, T.GROUND_FILL_R, false, true, fill);
  fillTile(r, T.GROUND_FILL_SINGLE, true, true, fill);
  grassTile(r, T.PLAT_L, true, true, false, platBrick);
  grassTile(r, T.PLAT_M, true, false, false, platBrick);
  grassTile(r, T.PLAT_R, true, false, true, platBrick);
  grassTile(r, T.PLAT_SINGLE, true, true, true, platBrick);
  blockTile(r, T.BLOCK);
  grassTile(r, T.GROUND_TOP_M_ALT, false, false, false, brick(BRICK, 3, 12));
  decorateTopAlt(r, T.GROUND_TOP_M_ALT);
  fillTile(r, T.GROUND_FILL_M_ALT, false, false, brick(BRICK, 5));
  decorateFillAlt(r, T.GROUND_FILL_M_ALT);
  fillTile(r, T.GROUND_FILL_DEEP, false, false, brick(BRICK_DEEP, 6));
  return r.toCanvas();
}
