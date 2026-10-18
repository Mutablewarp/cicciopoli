/**
 * 'rampage-tiles': 8x2 tiles of 16x16 laid out as `T` in keys.ts.
 * Street: a chipped concrete kerb over cracked asphalt. Platforms: riveted steel
 * girders with an open lattice. Block: poured concrete with form-tie holes.
 */
import { T, TILE } from '../keys';
import { Raster, hash2 } from '../hills/raster';
import { RC } from './colors';
import { pathR, rectR, tint } from './draw';

type Pt = readonly [number, number];

/** Slab thickness per column: the chipped lower edge of the kerb. */
const LIP = [7, 7, 7, 8, 7, 7, 6, 7, 7, 7, 8, 8, 7, 7, 7, 7];

function asphalt(x: number, y: number, salt: number): string {
  const h = hash2(x, y, salt);
  if (h < 0.06) return RC.asphSpeck;
  if (h < 0.2) return RC.asphAlt;
  if (h > 0.94) return RC.asphShade;
  return RC.asph;
}

function slab(x: number, y: number, lip: number, salt: number): string {
  if (x === TILE - 1 && y > 1) return RC.concShade; // expansion joint between two kerb slabs
  if (y === 1) return RC.concHi;
  if (y === lip - 1) return RC.concShade;
  if (y === lip - 2) return RC.concMid;
  return hash2(x, y, salt) < 0.12 ? RC.concMid : RC.conc;
}

/** Walkable street surface: ink edge, lit kerb slab, dark joint, asphalt below. */
function streetTop(t: Raster, salt: number): void {
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const lip = LIP[x];
      if (y === 0) t.set(x, y, RC.ink);
      else if (y < lip) t.set(x, y, slab(x, y, lip, salt));
      else if (y === lip) t.set(x, y, RC.crack);
      else t.set(x, y, asphalt(x, y, salt));
    }
  }
}

function streetFill(t: Raster, salt: number): void {
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) t.set(x, y, asphalt(x, y, salt));
}

function deepFill(t: Raster): void {
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const h = hash2(x, y, 31);
      t.set(x, y, h < 0.16 ? RC.asphStone : h < 0.22 ? RC.asphAlt : RC.asphDeep);
    }
  }
}

/** Vertical outline of an open side: ink at the rim, lit (left) or shaded (right) next to it. */
function edge(t: Raster, left: boolean, top: boolean): void {
  const rim = left ? 0 : TILE - 1;
  const inner = left ? 1 : TILE - 2;
  for (let y = top ? 1 : 0; y < TILE; y++) {
    t.set(inner, y, tint(t.get(inner, y), left ? '#ffffff' : '#000000', left ? 0.16 : 0.3));
    t.set(rim, y, RC.ink);
  }
  if (top) t.set(rim, 0, null);
}

/** Wide hairline crack, darker core, used on the street tiles. */
function crack(t: Raster, pts: readonly Pt[]): void {
  pathR(t, pts, RC.crack);
}

/** Lime weeds fighting through the crack of the kerb. */
function weeds(t: Raster): void {
  for (const [x, y, c] of [
    [9, 1, RC.moss], [10, 1, RC.limeLight], [9, 2, RC.mossDark], [10, 2, RC.moss], [11, 2, RC.mossDark],
    [11, 4, RC.moss], [10, 5, RC.mossDark], [3, 1, RC.moss], [4, 1, RC.mossDark], [3, 2, RC.mossDark],
  ] as const) t.set(x, y, c);
}

/* ----------------------------------------------------------------- girders */

/** Open Warren-truss girder: bright top flange, lattice web (background shows through), bottom flange. */
function girder(t: Raster, left: boolean, right: boolean): void {
  const flange = [RC.ink, RC.steelHi, RC.steelLight, RC.steel, RC.steelShade, RC.steelDark];
  flange.forEach((c, y) => rectR(t, 0, y, TILE, 1, c));
  [RC.steelLight, RC.steel, RC.steelShade, RC.steelDark, RC.ink].forEach((c, k) => rectR(t, 0, 11 + k, TILE, 1, c));
  // lattice: a zig-zag strut that touches the top flange at x=0 and the bottom flange at x=8
  const strut = (x: number, r: number): boolean => {
    const u = (x + TILE) % TILE;
    return Math.abs((u < 8 ? u : TILE - u) / 2 - r) <= 1;
  };
  for (let r = 0; r < 5; r++) {
    for (let x = 0; x < TILE; x++) {
      if (!strut(x, r)) continue;
      t.set(x, 6 + r, !strut(x - 1, r) ? RC.steelLight : !strut(x + 1, r) ? RC.steelShade : RC.steel);
    }
  }
  for (let y = 6; y <= 10; y++) {
    for (let x = 0; x < TILE; x++) {
      if (t.get(x, y) !== 0) continue;
      const near = t.get(x - 1, y) !== 0 || t.get(x + 1, y) !== 0 || t.get(x, y - 1) !== 0 || t.get(x, y + 1) !== 0;
      if (near) t.set(x, y, RC.steelDark);
    }
  }
  for (const x of [3, 11]) {
    t.set(x, 3, RC.steelHi);
    t.set(x, 12, RC.steelHi);
  }
  if (left) endPlate(t, true);
  if (right) endPlate(t, false);
}

function endPlate(t: Raster, left: boolean): void {
  const at = (k: number): number => (left ? k : TILE - 1 - k);
  for (let y = 1; y < TILE - 1; y++) {
    t.set(at(0), y, RC.ink);
    t.set(at(1), y, left ? RC.steelHi : RC.steelShade);
    t.set(at(2), y, left ? RC.steelLight : RC.steelShade);
    t.set(at(3), y, left ? RC.steel : RC.steelDark);
  }
  t.set(at(0), 0, null);
  t.set(at(0), TILE - 1, null);
  t.set(at(2), 3, RC.steelHi);
  t.set(at(2), 12, RC.steelHi);
}

/* ------------------------------------------------------------------- block */

function block(t: Raster): void {
  const n = TILE - 1;
  for (let y = 0; y <= n; y++) {
    for (let x = 0; x <= n; x++) {
      let c: string;
      if (x === 0 || y === 0 || x === n || y === n) c = RC.ink;
      else if (x === 1 || y === 1) c = RC.concHi;
      else if (x === n - 1 || y === n - 1) c = RC.concDark;
      else if (x === n - 2 || y === n - 2) c = RC.concShade;
      else c = hash2(x, y, 44) < 0.12 ? RC.concMid : RC.conc;
      t.set(x, y, c);
    }
  }
  for (const [x, y] of [[4, 4], [11, 4], [4, 11], [11, 11]] as const) {
    t.set(x, y, RC.concShade);
    t.set(x + 1, y, RC.concShade);
    t.set(x, y + 1, RC.concShade);
    t.set(x + 1, y + 1, RC.concHi);
    t.set(x, y, RC.concDark);
  }
  pathR(t, [[8, 2], [7, 5], [9, 8], [8, 10]], RC.concShade);
  t.set(7, 6, RC.concMid);
}

/* ------------------------------------------------------------------ sheet */

function place(sheet: Raster, idx: number, draw: (t: Raster) => void): void {
  const t = new Raster(TILE, TILE);
  draw(t);
  sheet.blit(t, (idx % 8) * TILE, Math.floor(idx / 8) * TILE);
}

/** Top / fill tile with optional open left and right sides. */
function ground(top: boolean, left: boolean, right: boolean, salt: number, extra?: (t: Raster) => void): (t: Raster) => void {
  return (t) => {
    if (top) streetTop(t, salt);
    else streetFill(t, salt);
    extra?.(t);
    if (left) edge(t, true, top);
    if (right) edge(t, false, top);
  };
}

export function buildRampageTiles(): Raster {
  const s = new Raster(8 * TILE, 2 * TILE);
  const hair = (t: Raster): void => crack(t, [[10, 8], [11, 9], [10, 11]]);
  const bigCrack = (t: Raster): void => {
    crack(t, [[6, 3], [7, 5], [5, 8], [6, 10], [9, 12], [10, 14]]);
    crack(t, [[7, 5], [10, 6], [12, 6]]);
    for (const [x, y] of [[11, 7], [12, 7], [11, 8]] as const) t.set(x, y, RC.concDark);
  };
  place(s, T.GROUND_TOP_L, ground(true, true, false, 1));
  place(s, T.GROUND_TOP_M, ground(true, false, false, 1, hair));
  place(s, T.GROUND_TOP_R, ground(true, false, true, 1));
  place(s, T.GROUND_TOP_SINGLE, ground(true, true, true, 1));
  place(s, T.GROUND_FILL_L, ground(false, true, false, 2));
  place(s, T.GROUND_FILL_M, ground(false, false, false, 2, hair));
  place(s, T.GROUND_FILL_R, ground(false, false, true, 2));
  place(s, T.GROUND_FILL_SINGLE, ground(false, true, true, 2));
  place(s, T.PLAT_L, (t) => girder(t, true, false));
  place(s, T.PLAT_M, (t) => girder(t, false, false));
  place(s, T.PLAT_R, (t) => girder(t, false, true));
  place(s, T.PLAT_SINGLE, (t) => girder(t, true, true));
  place(s, T.BLOCK, block);
  place(s, T.GROUND_TOP_M_ALT, ground(true, false, false, 3, (t) => {
    crack(t, [[11, 3], [10, 4], [11, 7], [9, 10], [10, 12]]);
    weeds(t);
  }));
  place(s, T.GROUND_FILL_M_ALT, ground(false, false, false, 5, bigCrack));
  place(s, T.GROUND_FILL_DEEP, deepFill);
  return s;
}
