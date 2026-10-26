/**
 * The side-strip canvas (128 wide, seamless vertically) in "street space": d = distance from the road
 * edge (0..127), y = along the road (wraps at the strip height), so the same lot code builds the left
 * strip (road on its right) and the mirrored right strip. ./street, ./roofs and ./life draw on it.
 */
import { Raster } from '../hills/raster';
import type { ZonePal } from './colors';

export const STRIP_W = 128;
export const STRIP_H = 256;
/**
 * Height of the centro and mare left strips: each carries its landmark (the Politeama; the coastal
 * tower and the port) once per period, so taller than any view plus the landmark: never twice on screen.
 */
export const SIDE_L_H = 1024;
/** The 12 px kerb + sidewalk band next to the road. */
export const WALK_D = 12;

export class Strip {
  readonly r: Raster;

  constructor(readonly side: 'L' | 'R', readonly pal: ZonePal, readonly h = STRIP_H) {
    this.r = new Raster(STRIP_W, h);
  }

  x(d: number): number {
    return this.side === 'L' ? STRIP_W - 1 - d : d;
  }

  px(d: number, y: number, c: string): void {
    if (d < 0 || d >= STRIP_W) return;
    this.r.set(this.x(d), ((y % this.h) + this.h) % this.h, c);
  }

  rect(d: number, y: number, dw: number, h: number, c: string): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < dw; i++) this.px(d + i, y + j, c);
  }

  /** Screen-space pixel at (x, y) with y wrapping (for upright text and logos). */
  screen(x: number, y: number, c: string): void {
    this.r.set(x, ((y % this.h) + this.h) % this.h, c);
  }

  /** Screen x of the left edge of a box of width w whose near (road-side) edge is at distance d. */
  boxX(d: number, w: number): number {
    return this.side === 'L' ? STRIP_W - d - w : d;
  }
}
