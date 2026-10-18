/** Working image of one hero frame: colour plus, per pixel, the material id and depth layer that produced it. */
import { Raster } from '../ciccio/raster';
import type { Resolved } from './zbuf';

export const FRAME = 64;

/** Material id of the hand-drawn head features (hair, lenses, teeth). */
export const HEAD_MAT = 9;

export const N4: readonly (readonly [number, number])[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

const TONE_KEYS = ['hi', 'base', 'sh', 'deep'] as const;

export interface Img {
  r: Raster;
  mat: Int8Array;
  layer: Int8Array;
}

export function toImg(res: Resolved): Img {
  const img: Img = { r: new Raster(FRAME, FRAME), mat: new Int8Array(FRAME * FRAME).fill(-1), layer: new Int8Array(FRAME * FRAME) };
  for (let i = 0; i < FRAME * FRAME; i++) {
    if (res.mat[i] < 0) continue;
    const m = res.mats[res.mat[i]];
    img.r.px[i] = m.tones[TONE_KEYS[res.tone[i]]];
    img.mat[i] = m.id;
    img.layer[i] = res.layer[i];
  }
  return img;
}

/** Recolours pixel (x, y) when it is opaque, made of one of the `mats` and painted by the part on `layer` (details never leak onto what covers their part). */
export function tintIn(img: Img, x: number, y: number, mats: ReadonlySet<number>, colour: string, layer: number): void {
  const ix = Math.round(x);
  const iy = Math.round(y);
  if (ix < 0 || iy < 0 || ix >= FRAME || iy >= FRAME) return;
  const i = iy * FRAME + ix;
  if (img.mat[i] >= 0 && mats.has(img.mat[i]) && img.layer[i] === layer) img.r.px[i] = colour;
}
