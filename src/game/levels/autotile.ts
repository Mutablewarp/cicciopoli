/**
 * Neighbour-based autotiler (pure): terrain grid -> tileset indices (see T in art/keys).
 * Ground gets TOP / FILL / DEEP rows with L / M / R / SINGLE edges; plain middle tiles
 * swap to their ALT variant from a deterministic per-cell hash.
 */
import { T } from '../../art/keys';
import type { Terrain } from './types';

export const EMPTY = -1;

/** Share of plain middle tiles replaced by their ALT variant. */
const ALT_PERCENT = 22;

/** Deterministic 0..99 hash of a cell. */
export function cellHash(col: number, row: number): number {
  let h = Math.imul(col + 1, 73856093) ^ Math.imul(row + 7, 19349663);
  h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);
  return ((h ^ (h >>> 15)) >>> 0) % 100;
}

function isGround(t: Terrain[][], row: number, col: number): boolean {
  if (row >= t.length) return true; // below the map: continuous earth
  if (row < 0) return false;
  const c = Math.max(0, Math.min(t[row].length - 1, col)); // map edges continue the edge column
  return t[row][c] === 'ground';
}

function edge(l: boolean, r: boolean, left: number, mid: number, right: number, alone: number): number {
  if (l && r) return alone;
  if (l) return left;
  if (r) return right;
  return mid;
}

function groundTile(t: Terrain[][], row: number, col: number): number {
  const openL = !isGround(t, row, col - 1);
  const openR = !isGround(t, row, col + 1);
  const alt = cellHash(col, row) < ALT_PERCENT;
  if (!isGround(t, row - 1, col)) {
    const mid = alt ? T.GROUND_TOP_M_ALT : T.GROUND_TOP_M;
    return edge(openL, openR, T.GROUND_TOP_L, mid, T.GROUND_TOP_R, T.GROUND_TOP_SINGLE);
  }
  const deep = isGround(t, row - 2, col);
  const mid = deep ? T.GROUND_FILL_DEEP : alt ? T.GROUND_FILL_M_ALT : T.GROUND_FILL_M;
  return edge(openL, openR, T.GROUND_FILL_L, mid, T.GROUND_FILL_R, T.GROUND_FILL_SINGLE);
}

function platTile(t: Terrain[][], row: number, col: number): number {
  const openL = col === 0 || t[row][col - 1] !== 'plat';
  const openR = col === t[row].length - 1 || t[row][col + 1] !== 'plat';
  return edge(openL, openR, T.PLAT_L, T.PLAT_M, T.PLAT_R, T.PLAT_SINGLE);
}

export function autotile(t: Terrain[][]): number[][] {
  return t.map((line, row) =>
    line.map((cell, col) => {
      if (cell === 'ground') return groundTile(t, row, col);
      if (cell === 'plat') return platTile(t, row, col);
      if (cell === 'block') return T.BLOCK;
      return EMPTY;
    }),
  );
}

export const SOLID_TILES: readonly number[] = [
  T.GROUND_TOP_L, T.GROUND_TOP_M, T.GROUND_TOP_R, T.GROUND_TOP_SINGLE,
  T.GROUND_FILL_L, T.GROUND_FILL_M, T.GROUND_FILL_R, T.GROUND_FILL_SINGLE,
  T.BLOCK, T.GROUND_TOP_M_ALT, T.GROUND_FILL_M_ALT, T.GROUND_FILL_DEEP,
];

export const PLAT_TILES: readonly number[] = [T.PLAT_L, T.PLAT_M, T.PLAT_R, T.PLAT_SINGLE];
