/** Small raster drawing helpers shared by the rampage art modules (all integer, no anti-aliasing). */
import { mix } from '../pixel';
import { Raster, packColor } from '../hills/raster';

type Pt = readonly [number, number];

/** 1-px Bresenham line. */
export function lineR(r: Raster, x0: number, y0: number, x1: number, y1: number, color: string): void {
  let x = Math.round(x0);
  let y = Math.round(y0);
  const ex = Math.round(x1);
  const ey = Math.round(y1);
  const dx = Math.abs(ex - x);
  const dy = -Math.abs(ey - y);
  const sx = x < ex ? 1 : -1;
  const sy = y < ey ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    r.set(x, y, color);
    if (x === ex && y === ey) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}

/** Polyline through the points. */
export function pathR(r: Raster, pts: readonly Pt[], color: string): void {
  for (let i = 0; i + 1 < pts.length; i++) lineR(r, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], color);
}

export function rectR(r: Raster, x: number, y: number, w: number, h: number, color: string): void {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) r.set(x + i, y + j, color);
}

/** Packed colour `c` mixed `t` of the way towards the hex `color`. */
export function tint(c: number, color: string, t: number): number {
  return packColor(mix(`#${(c & 0xffffff).toString(16).padStart(6, '0')}`, color, t));
}

/** Mixes every opaque pixel `t` of the way towards `color` (used for hit-flash frames). */
export function washR(r: Raster, color: string, t: number): void {
  const cache = new Map<number, number>();
  r.map((c) => {
    let out = cache.get(c);
    if (out === undefined) {
      out = tint(c, color, t);
      cache.set(c, out);
    }
    return out;
  });
}
