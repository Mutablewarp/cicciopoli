/**
 * Plain pixel buffer used to compose Ciccio frames without canvas read-backs:
 * every part is painted on its own layer, then stamped with a 1-px ring so
 * overlapping parts keep the cup-style dark separation lines. Pure JS (no DOM)
 * so the frames can be unit-tested in node.
 */
import { hexToRgb, makeCanvas, ctxOf } from '../pixel';

export type Color = string;

export class Raster {
  readonly px: (Color | null)[];

  constructor(readonly w: number, readonly h: number) {
    this.px = new Array<Color | null>(w * h).fill(null);
  }

  get(x: number, y: number): Color | null {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    return this.px[y * this.w + x];
  }

  set(x: number, y: number, c: Color): void {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || iy < 0 || ix >= this.w || iy >= this.h) return;
    this.px[iy * this.w + ix] = c;
  }

  /** Recolours an existing opaque pixel only (keeps details inside a silhouette). */
  tint(x: number, y: number, c: Color): void {
    if (this.get(x, y) !== null) this.set(x, y, c);
  }
}

const N4: readonly (readonly [number, number])[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/**
 * Stamps `layer` over `dst`. With `ring`, every transparent layer pixel that touches
 * an opaque one (4-neighbourhood) is first painted `ring` — this both outlines the
 * silhouette and draws the separating line where the part overlaps earlier parts.
 */
export function stamp(dst: Raster, layer: Raster, ring: Color | null): void {
  const { w, h } = layer;
  if (ring) {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (layer.get(x, y) !== null) continue;
        if (N4.some(([dx, dy]) => layer.get(x + dx, y + dy) !== null)) dst.set(x, y, ring);
      }
    }
  }
  for (let i = 0; i < layer.px.length; i++) {
    const c = layer.px[i];
    if (c !== null) dst.px[i] = c;
  }
}

/**
 * ASCII grid painter for rasters (same convention as pixel.ts paintGrid:
 * '.' and ' ' are transparent, every other char maps through `pal`).
 */
export function grid(
  r: Raster,
  rows: readonly string[],
  pal: Readonly<Record<string, Color>>,
  ox: number,
  oy: number,
): void {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const c = pal[ch];
      if (c === undefined) throw new Error(`ciccio grid: no colour for '${ch}'`);
      r.set(ox + x, oy + y, c);
    }
  });
}

/** Opaque bounding box, or null when the raster is empty. */
export function bounds(r: Raster): { x0: number; y0: number; x1: number; y1: number } | null {
  let x0 = r.w;
  let y0 = r.h;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < r.h; y++) {
    for (let x = 0; x < r.w; x++) {
      if (r.get(x, y) === null) continue;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

const rgbCache = new Map<Color, [number, number, number]>();

/** Converts a raster to a canvas in one putImageData (no per-pixel fillRect). */
export function toCanvas(r: Raster): HTMLCanvasElement {
  const c = makeCanvas(r.w, r.h);
  const ctx = ctxOf(c);
  const img = ctx.createImageData(r.w, r.h);
  r.px.forEach((col, i) => {
    if (col === null) return;
    let rgb = rgbCache.get(col);
    if (!rgb) {
      rgb = hexToRgb(col);
      rgbCache.set(col, rgb);
    }
    img.data[i * 4] = rgb[0];
    img.data[i * 4 + 1] = rgb[1];
    img.data[i * 4 + 2] = rgb[2];
    img.data[i * 4 + 3] = 255;
  });
  ctx.putImageData(img, 0, 0);
  return c;
}
