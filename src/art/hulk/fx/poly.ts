/** Small raster helpers shared by the Hulk FX: polygon fill, ring (outline) pass, chunky crumble fade. */
import { rng } from '../../pixel';
import { Raster, stamp, type Color } from '../../ciccio/raster';

export type Pt = readonly [number, number];

/** Even-odd polygon fill (pixel centres), no anti-aliasing. */
export function fillPoly(r: Raster, pts: readonly Pt[], color: Color | ((x: number, y: number) => Color)): void {
  let y0 = r.h;
  let y1 = -1;
  for (const [, y] of pts) {
    y0 = Math.min(y0, Math.floor(y));
    y1 = Math.max(y1, Math.ceil(y));
  }
  for (let y = Math.max(0, y0); y <= Math.min(r.h - 1, y1); y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[(i + 1) % pts.length];
      if ((ay <= y + 0.5 && by > y + 0.5) || (by <= y + 0.5 && ay > y + 0.5)) {
        xs.push(ax + ((y + 0.5 - ay) / (by - ay)) * (bx - ax));
      }
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.max(0, Math.round(xs[k])); x < Math.min(r.w, Math.round(xs[k + 1])); x++) {
        r.set(x, y, typeof color === 'string' ? color : color(x, y));
      }
    }
  }
}

/** Returns a copy of `src` surrounded by a 1-px ring of `color`. */
export function ringed(src: Raster, color: Color): Raster {
  const out = new Raster(src.w, src.h);
  stamp(out, src, color);
  return out;
}

/** Breaks a sprite up: drops random 2x2 blocks (`frac` 0 keeps everything), so fading reads as chunks, not noise. */
export function crumble(src: Raster, frac: number, seed: number): Raster {
  const out = new Raster(src.w, src.h);
  const rand = rng(seed);
  const gone = new Set<number>();
  for (let by = 0; by < Math.ceil(src.h / 2); by++) {
    for (let bx = 0; bx < Math.ceil(src.w / 2); bx++) if (rand() < frac) gone.add(by * 1000 + bx);
  }
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      const c = src.get(x, y);
      if (c !== null && !gone.has((y >> 1) * 1000 + (x >> 1))) out.set(x, y, c);
    }
  }
  return out;
}
