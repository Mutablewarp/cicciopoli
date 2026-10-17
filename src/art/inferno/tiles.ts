/**
 * 'inferno-tiles' (layout T from keys.ts): dark volcanic bricks with a glowing
 * cooling-lava crust on walkable tops, floating ledges, obsidian blocks.
 */
import { T, TILE } from '../keys';
import { PAL } from '../pixel';
import { CLEAR, PixBuf, rgba } from './buf';

const C = {
  ink: rgba('#16080c'),
  mortar: rgba('#1a0c12'),
  hi: rgba('#5c4450'),
  light: rgba('#4a3640'),
  base: rgba(PAL.stone),
  alt: rgba('#33242a'),
  shade: rgba('#2a1c22'),
  speck: rgba('#22161c'),
  warm: rgba('#4e2a2c'),
  warmHi: rgba('#6a3430'),
  rim: rgba('#4a2228'),
  under: rgba('#1e1016'),
  hot: rgba(PAL.lavaHot),
  yellow: rgba(PAL.lavaYellow),
  amber: rgba('#fca028'),
  orange: rgba(PAL.lavaOrange),
  red: rgba(PAL.lavaRed),
  deep: rgba(PAL.lavaDeep),
  crustLine: rgba('#1c0a0e'),
  glowFaint: rgba('#5a1418'),
  cooled: rgba('#6a1a0c'),
};

const DEEP = {
  mortar: rgba('#120a0e'), hi: rgba('#33242c'), light: rgba('#2c2026'), base: rgba('#251a20'),
  alt: rgba('#20161c'), shade: rgba('#1a1016'), speck: rgba('#160e12'),
};

type Px = (x: number, y: number, c: number) => void;
type Get = (x: number, y: number) => number;

function hash(a: number, b: number, c = 0): number {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Running-bond bricks 8x4 (7x3 face + mortar); period 16 so every tile is seamless. */
function brick(x: number, y: number, deep: boolean, salt: number): number {
  const p = deep ? DEEP : C;
  const row = y >> 2;
  const yy = y & 3;
  const sx = x + (row & 1 ? 4 : 0);
  const bx = sx & 7;
  if (yy === 3 || bx === 7) return p.mortar;
  const tone = hash(row, (sx >> 3) & 1, salt);
  const body = tone < 0.3 ? p.alt : p.base;
  if (yy === 0) return tone > 0.75 ? p.hi : p.light;
  if (yy === 2) return p.shade;
  if (bx === 0) return p.light;
  return hash(x, y, salt + 7) < 0.08 ? p.speck : body;
}

function fillBricks(px: Px, deep: boolean, salt: number): void {
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) px(x, y, brick(x, y, deep, salt));
}

const DEPTH_M = [3, 3, 4, 4, 3, 3, 3, 4, 5, 5, 4, 3, 3, 3, 4, 3];
const DEPTH_ALT = [3, 4, 5, 4, 3, 3, 4, 6, 6, 5, 4, 3, 4, 4, 3, 3];

/** Glowing crust on rows 1..d, dark wavy line under it, heated bricks just below. */
function crust(px: Px, get: Get, depth: readonly number[], salt: number): void {
  for (let x = 0; x < TILE; x++) {
    const d = depth[x];
    px(x, 0, C.ink);
    for (let k = 1; k <= d; k++) {
      const h = hash(x, k, salt);
      let c: number;
      if (k === 1) c = h < 0.25 ? C.hot : h < 0.85 ? C.yellow : C.amber;
      else if (k === 2) c = h < 0.12 ? C.cooled : h < 0.6 ? C.amber : C.orange;
      else if (k === 3) c = h < 0.3 ? C.red : C.orange;
      else c = k === d ? C.deep : C.red;
      px(x, k, c);
    }
    px(x, d + 1, C.crustLine);
    const below = get(x, d + 2);
    if (below !== C.mortar) px(x, d + 2, below === C.light || below === C.hi ? C.warmHi : C.warm);
  }
}

/**
 * Left/right exposed edge: ink column plus a rim. Under a crust (crustDepth given) the rim
 * glows like lava dripping down the side and the top corner is rounded off.
 */
function sideEdge(px: Px, side: 'l' | 'r', crustDepth: number | null): void {
  const ox = side === 'l' ? 0 : TILE - 1;
  const ix = side === 'l' ? 1 : TILE - 2;
  for (let y = 0; y < TILE; y++) {
    px(ox, y, C.ink);
    if (crustDepth !== null && y <= crustDepth + 3) {
      px(ix, y, y <= crustDepth ? C.orange : y === crustDepth + 1 ? C.red : C.deep);
    } else {
      px(ix, y, side === 'l' ? C.rim : C.under);
    }
  }
  if (crustDepth !== null) px(ox, 0, CLEAR);
}

/** Glowing crack: orange core, dark-red halo, one yellow-hot pixel mid-way. */
function crack(px: Px, path: readonly (readonly [number, number])[]): void {
  for (const [x, y] of path) {
    px(x - 1, y, C.deep);
    px(x + 1, y, C.deep);
  }
  for (const [x, y] of path) px(x, y, C.orange);
  const [mx, my] = path[Math.floor(path.length / 2)];
  px(mx, my, C.yellow);
}

function plat(px: Px, l: boolean, r: boolean): void {
  const DEPTH_P = [2, 2, 3, 2, 2, 2, 3, 3, 2, 2, 2, 3, 2, 2, 2, 2];
  for (let x = 0; x < TILE; x++) {
    px(x, 0, C.ink);
    const d = DEPTH_P[x];
    px(x, 1, hash(x, 5) < 0.3 ? C.hot : C.yellow);
    px(x, 2, C.orange);
    if (d === 3) px(x, 3, C.red);
    px(x, d + 1, C.crustLine);
    for (let y = d + 2; y <= 10; y++) px(x, y, brick(x, y, false, 3));
    px(x, d + 2, brick(x, d + 2, false, 3) === C.mortar ? C.mortar : C.warm);
    px(x, 11, C.under);
    px(x, 12, C.ink);
  }
  const edge = (ox: number, ix: number): void => {
    px(ox, 0, CLEAR);
    for (let y = 1; y <= 11; y++) px(ox, y, C.ink);
    px(ix, 1, C.yellow);
    px(ix, 2, C.orange);
    px(ix, 3, C.red);
    px(ox, 11, CLEAR);
    px(ox, 12, CLEAR);
    px(ix, 11, C.ink);
    px(ix, 12, CLEAR);
  };
  if (l) edge(0, 1);
  if (r) edge(TILE - 1, TILE - 2);
}

function obsidian(px: Px): void {
  const base = rgba('#1e1428');
  const facet = rgba('#2a1e36');
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      let c = x + y < 13 ? facet : base;
      if (x === 0 || y === 0 || x === TILE - 1 || y === TILE - 1) c = C.ink;
      else if (y === 1 || x === 1) c = rgba('#54446a');
      else if (y === TILE - 2 || x === TILE - 2) c = rgba('#0e0a14');
      else if (y === TILE - 3 && x % 3 !== 0) c = rgba('#4a1c22'); // lava light bouncing off the base
      px(x, y, c);
    }
  }
  for (let k = 0; k < 7; k++) px(7 + k, 2 + k, rgba('#6a5882'));
  for (let k = 0; k < 4; k++) px(4 + k, 9 + k, rgba('#3a2c4c'));
  px(3, 3, rgba('#d8c8f0'));
  px(4, 3, rgba('#a490c4'));
  px(3, 4, rgba('#a490c4'));
}

export function buildInfernoTiles(): HTMLCanvasElement {
  const buf = new PixBuf(TILE * 8, TILE * 2);
  const tile = (index: number, draw: (px: Px, get: Get) => void): void => {
    const ox = (index % 8) * TILE;
    const oy = Math.floor(index / 8) * TILE;
    const px: Px = (x, y, c) => {
      if (x >= 0 && y >= 0 && x < TILE && y < TILE) buf.set(ox + x, oy + y, c);
    };
    draw(px, (x, y) => buf.get(ox + x, oy + y));
  };
  const top = (l: boolean, r: boolean, depth: readonly number[], salt: number) => (px: Px, get: Get): void => {
    fillBricks(px, false, salt);
    crust(px, get, depth, salt);
    if (l) sideEdge(px, 'l', depth[0]);
    if (r) sideEdge(px, 'r', depth[TILE - 1]);
  };
  // exposed side columns repeat at every depth: they use the deep bricks so they continue
  // GROUND_FILL_DEEP without a lit seam, and read as the island's shaded flank (QA VIS-10)
  const fill = (l: boolean, r: boolean) => (px: Px): void => {
    fillBricks(px, l || r, 1);
    if (l) sideEdge(px, 'l', null);
    if (r) sideEdge(px, 'r', null);
  };
  tile(T.GROUND_TOP_L, top(true, false, DEPTH_M, 0));
  tile(T.GROUND_TOP_M, top(false, false, DEPTH_M, 0));
  tile(T.GROUND_TOP_R, top(false, true, DEPTH_M, 0));
  tile(T.GROUND_TOP_SINGLE, top(true, true, DEPTH_M, 0));
  tile(T.GROUND_FILL_L, fill(true, false));
  tile(T.GROUND_FILL_M, fill(false, false));
  tile(T.GROUND_FILL_R, fill(false, true));
  tile(T.GROUND_FILL_SINGLE, fill(true, true));
  tile(T.PLAT_L, (px) => plat(px, true, false));
  tile(T.PLAT_M, (px) => plat(px, false, false));
  tile(T.PLAT_R, (px) => plat(px, false, true));
  tile(T.PLAT_SINGLE, (px) => plat(px, true, true));
  tile(T.BLOCK, obsidian);
  tile(T.GROUND_TOP_M_ALT, (px, get) => {
    fillBricks(px, false, 2);
    crust(px, get, DEPTH_ALT, 2);
    crack(px, [[10, 9], [10, 10], [11, 11], [11, 12], [10, 13]]);
    px(4, 1, C.hot);
    px(5, 1, C.hot);
  });
  tile(T.GROUND_FILL_M_ALT, (px) => {
    fillBricks(px, false, 4);
    crack(px, [[3, 3], [4, 4], [5, 5], [6, 5], [7, 6], [8, 7], [9, 8], [9, 9], [10, 10], [11, 11], [12, 12]]);
  });
  tile(T.GROUND_FILL_DEEP, (px) => {
    fillBricks(px, true, 6);
    px(10, 7, C.glowFaint);
  });
  return buf.toCanvas();
}
