/**
 * Side-view burger layers (KITCHEN.layer / layerCook, LAYER in keys.ts): the BODY of a layer of
 * kind k fills rows [BASE - LAYER_H[k], BASE); frills may rise up to 3 rows above it (the next layer
 * covers them), drips hang below BASE over the layer underneath. Outlines go round everything except
 * the body's bottom edge: the row under it is the top of the layer below, so the body paints its
 * own dark bottom row instead and stacks never get double lines.
 */
import { Mask, paintMask, type Tone } from '../../hills/mask';
import { Raster, hash2, packColor } from '../../hills/raster';
import { LAYER, LAYER_H, type LayerKind } from '../keys';
import { INK } from './palette';

export const BASE = LAYER.baseRow;
export const CX = LAYER.cx;
export type Look = 'raw' | 'served' | 'burnt';

/** Top row of the body of `kind`. */
export const topOf = (kind: LayerKind): number => BASE - LAYER_H[kind];

/** Builds one layer frame: `shape` fills a mask with material ids, painted with `tones`, then `detail`, then the outline. */
export function layer(shape: (m: Mask) => void, tones: Readonly<Record<number, Tone>>, detail?: (r: Raster, m: Mask) => void, line: string = INK): Raster {
  const r = new Raster(LAYER.w, LAYER.h);
  const m = new Mask(LAYER.w, LAYER.h);
  shape(m);
  paintMask(m, r, tones, { shadeDepth: 1 });
  detail?.(r, m);
  layerLine(r, line);
  return r;
}

/** Outline that skips the row right under the body (the next layer down owns it); drips are outlined fully. */
export function layerLine(r: Raster, color: string): void {
  const c = packColor(color);
  const src = r.px.slice();
  const on = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < r.w && y < r.h && src[y * r.w + x] !== 0;
  for (let y = 0; y < r.h; y++) {
    for (let x = 0; x < r.w; x++) {
      if (on(x, y)) continue;
      const side = on(x - 1, y) || on(x + 1, y) || on(x, y + 1);
      const above = on(x, y - 1) && y !== BASE;
      if (side || above) r.px[y * r.w + x] = c;
    }
  }
}

/** Body rows [top, BASE) from x0 to x1, the four corners rounded off by `round` px. */
export function slab(m: Mask, top: number, x0: number, x1: number, id: number, round = 1): void {
  for (let y = top; y < BASE; y++) {
    const inset = y === top || y === BASE - 1 ? round : 0;
    m.span(x0 + inset, x1 - inset, y, id);
  }
}

/** Hanging drip of width w from row BASE down `len` rows, narrowing to a round drop. */
export function drip(m: Mask, x: number, w: number, len: number, id: number): void {
  for (let k = 0; k < len; k++) m.span(x, x + (k === len - 1 && w > 1 ? w - 2 : w - 1), BASE + k, id);
}

/** Bumpy top edge: random pixels of `id` in the row above `top` between x0 and x1 (hash, deterministic). */
export function bumps(m: Mask, top: number, x0: number, x1: number, id: number, p: number, seed: number): void {
  for (let x = x0; x <= x1; x++) if (hash2(x, top, seed) < p) m.set(x, top - 1, id);
}

/** Scatters `color` on pixels of material `id` with probability `p`, keeping off its outer rim. */
export function grain(r: Raster, m: Mask, id: number, color: string, p: number, seed: number): void {
  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) {
      if (m.get(x, y) !== id || m.get(x - 1, y) !== id || m.get(x + 1, y) !== id || m.get(x, y - 1) !== id) continue;
      if (hash2(x, y, seed) < p) r.set(x, y, color);
    }
  }
}

/** Paints the body's bottom row of material `id` with `color` (the dark seam between stacked layers). */
export function seam(r: Raster, m: Mask, id: number, color: string): void {
  for (let x = 0; x < m.w; x++) if (m.get(x, BASE - 1) === id) r.set(x, BASE - 1, color);
}
