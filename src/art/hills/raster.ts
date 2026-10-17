/**
 * Fast pixel buffers for the hills pack. Pixels are written into typed arrays and
 * flushed with one putImageData per canvas (per-pixel fillRect would blow the
 * 120 ms build budget on the 512-wide parallax layers).
 */
import { hexToRgb, makeCanvas, ctxOf } from '../pixel';

const colorCache = new Map<string, number>();

/** '#rrggbb' -> packed 0xAARRGGBB (opaque). 0 is reserved for "transparent". */
export function packColor(hex: string): number {
  let c = colorCache.get(hex);
  if (c === undefined) {
    const [r, g, b] = hexToRgb(hex);
    c = ((255 << 24) | (r << 16) | (g << 8) | b) >>> 0;
    colorCache.set(hex, c);
  }
  return c;
}

/** Deterministic position hash in [0,1) (used for speckles instead of Math.random). */
export function hash2(x: number, y: number, seed = 0): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export class Raster {
  readonly px: Uint32Array;

  constructor(readonly w: number, readonly h: number, readonly wrapX = false) {
    this.px = new Uint32Array(w * h);
  }

  index(x: number, y: number): number {
    if (y < 0 || y >= this.h) return -1;
    if (this.wrapX) x = ((x % this.w) + this.w) % this.w;
    else if (x < 0 || x >= this.w) return -1;
    return y * this.w + x;
  }

  get(x: number, y: number): number {
    const i = this.index(x, y);
    return i < 0 ? 0 : this.px[i];
  }

  set(x: number, y: number, color: string | number | null): void {
    const i = this.index(x, y);
    if (i < 0) return;
    this.px[i] = color === null ? 0 : typeof color === 'number' ? color : packColor(color);
  }

  /** Copies the opaque pixels of `src` at (ox, oy). */
  blit(src: Raster, ox: number, oy: number): void {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const c = src.px[y * src.w + x];
        if (c !== 0) this.set(ox + x, oy + y, c);
      }
    }
  }

  /** Recolours every opaque pixel (used for flash frames / silhouettes). */
  map(fn: (c: number, x: number, y: number) => number): void {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const i = y * this.w + x;
        if (this.px[i] !== 0) this.px[i] = fn(this.px[i], x, y);
      }
    }
  }

  writeTo(canvas: HTMLCanvasElement, dx = 0, dy = 0): void {
    const ctx = ctxOf(canvas);
    const img = ctx.createImageData(this.w, this.h);
    const d = img.data;
    for (let i = 0; i < this.px.length; i++) {
      const c = this.px[i];
      if (c === 0) continue;
      d[i * 4] = (c >>> 16) & 255;
      d[i * 4 + 1] = (c >>> 8) & 255;
      d[i * 4 + 2] = c & 255;
      d[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, dx, dy);
  }

  toCanvas(): HTMLCanvasElement {
    const c = makeCanvas(this.w, this.h);
    this.writeTo(c);
    return c;
  }
}

/** Adds a 1-px outline (4-neighbourhood) around every opaque pixel. */
export function outlineRaster(r: Raster, color: string): void {
  const c = packColor(color);
  const src = r.px.slice();
  const at = (x: number, y: number): boolean => {
    const i = r.index(x, y);
    return i >= 0 && src[i] !== 0;
  };
  for (let y = 0; y < r.h; y++) {
    for (let x = 0; x < r.w; x++) {
      if (src[y * r.w + x] !== 0) continue;
      if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) r.set(x, y, c);
    }
  }
}

/** Packs equally sized frames side by side (one row) into a sheet canvas. */
export function sheetCanvas(frames: readonly Raster[]): HTMLCanvasElement {
  const fw = frames[0].w;
  const fh = frames[0].h;
  const c = makeCanvas(fw * frames.length, fh);
  frames.forEach((f, i) => f.writeTo(c, i * fw, 0));
  return c;
}

/** Paints ASCII art into a raster ('.' and ' ' transparent). */
export function gridR(r: Raster, rows: readonly string[], pal: Readonly<Record<string, string>>, ox = 0, oy = 0): void {
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const ch = rows[y][x];
      if (ch === '.' || ch === ' ') continue;
      const col = pal[ch];
      if (col === undefined) throw new Error(`gridR: no colour for '${ch}'`);
      r.set(ox + x, oy + y, col);
    }
  }
}
