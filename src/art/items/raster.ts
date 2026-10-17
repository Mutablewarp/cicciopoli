/**
 * Tiny RGBA raster used by the items pack: per-pixel colour + alpha in a typed array,
 * converted to a canvas once per frame (much faster than thousands of fillRect calls).
 */
import type { SheetDef } from '../../contracts';
import { bayer, ctxOf, hexToRgb, makeCanvas, packSheet } from '../pixel';

type Rgb = readonly [number, number, number];
const rgbCache = new Map<string, Rgb>();

function rgbOf(hex: string): Rgb {
  let c = rgbCache.get(hex);
  if (!c) {
    c = hexToRgb(hex);
    rgbCache.set(hex, c);
  }
  return c;
}

export class Raster {
  readonly data: Uint8ClampedArray;

  constructor(readonly w: number, readonly h: number) {
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  /** Alpha 0..255 (0 outside the raster). */
  alpha(x: number, y: number): number {
    return this.inside(x, y) ? this.data[(y * this.w + x) * 4 + 3] : 0;
  }

  /** Overwrite one pixel (alpha 0..1). Out-of-bounds writes are ignored. */
  set(x: number, y: number, color: string, a = 1): void {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (!this.inside(ix, iy)) return;
    const [r, g, b] = rgbOf(color);
    const i = (iy * this.w + ix) * 4;
    this.data[i] = r;
    this.data[i + 1] = g;
    this.data[i + 2] = b;
    this.data[i + 3] = Math.round(a * 255);
  }

  clear(x: number, y: number): void {
    if (this.inside(x, y)) this.data[(y * this.w + x) * 4 + 3] = 0;
  }

  /** True when the pixel has exactly this colour (any alpha > 0). */
  is(x: number, y: number, color: string): boolean {
    if (this.alpha(x, y) === 0) return false;
    const [r, g, b] = rgbOf(color);
    const i = (y * this.w + x) * 4;
    return this.data[i] === r && this.data[i + 1] === g && this.data[i + 2] === b;
  }

  /** Mix the existing colour towards `color` by t, keeping alpha. */
  tint(x: number, y: number, color: string, t: number): void {
    if (this.alpha(x, y) === 0) return;
    const [r, g, b] = rgbOf(color);
    const i = (y * this.w + x) * 4;
    this.data[i] += (r - this.data[i]) * t;
    this.data[i + 1] += (g - this.data[i + 1]) * t;
    this.data[i + 2] += (b - this.data[i + 2]) * t;
  }

  /** Same rasterisation as pixel.fillEllipse, so shapes match the other packs. */
  ellipse(cx: number, cy: number, rx: number, ry: number, color: string, a = 1): void {
    for (let y = -ry; y <= ry; y++) {
      const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.0001))));
      for (let x = -half; x <= half; x++) this.set(cx + x, cy + y, color, a);
    }
  }

  /** ASCII art: '.' and ' ' are skipped, every other char maps through `pal`. */
  grid(rows: readonly string[], pal: Readonly<Record<string, string>>, ox = 0, oy = 0): void {
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.' || ch === ' ') continue;
        const c = pal[ch];
        if (c === undefined) throw new Error(`items grid: no colour for '${ch}'`);
        this.set(ox + x, oy + y, c);
      }
    });
  }

  /** 1-px outline on transparent pixels touching opaque ones (4- or 8-neighbourhood). */
  outline(color: string, diagonal = false, a = 1): void {
    const hits: number[] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.alpha(x, y) > 0) continue;
        const n4 = this.alpha(x - 1, y) > 127 || this.alpha(x + 1, y) > 127 || this.alpha(x, y - 1) > 127 || this.alpha(x, y + 1) > 127;
        const n8 = diagonal && (this.alpha(x - 1, y - 1) > 127 || this.alpha(x + 1, y - 1) > 127 || this.alpha(x - 1, y + 1) > 127 || this.alpha(x + 1, y + 1) > 127);
        if (n4 || n8) hits.push(x, y);
      }
    }
    for (let k = 0; k < hits.length; k += 2) this.set(hits[k], hits[k + 1], color, a);
  }

  /** Ordered-dither erase: keeps a pixel only where bayer(x,y) < keep (0..1). */
  dither(keep: number): void {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (bayer(x, y) >= keep) this.clear(x, y);
  }

  /** Multiplies every alpha by `m`. */
  fade(m: number): void {
    for (let i = 3; i < this.data.length; i += 4) this.data[i] *= m;
  }

  /** Copies opaque pixels of `src` onto this raster at (ox, oy). */
  draw(src: Raster, ox = 0, oy = 0): void {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const si = (y * src.w + x) * 4;
        if (src.data[si + 3] === 0 || !this.inside(x + ox, y + oy)) continue;
        const di = ((y + oy) * this.w + x + ox) * 4;
        for (let k = 0; k < 4; k++) this.data[di + k] = src.data[si + k];
      }
    }
  }

  clone(): Raster {
    const r = new Raster(this.w, this.h);
    r.data.set(this.data);
    return r;
  }

  canvas(): HTMLCanvasElement {
    const c = makeCanvas(this.w, this.h);
    const img = new ImageData(this.data.slice(), this.w, this.h);
    ctxOf(c).putImageData(img, 0, 0);
    return c;
  }
}

/** Packs raster frames into a Phaser-ready sprite sheet definition. */
export function sheetOf(key: string, frames: readonly Raster[]): SheetDef {
  const { w, h } = frames[0];
  return { key, canvas: packSheet(frames.map((f) => f.canvas()), w, h), frameWidth: w, frameHeight: h };
}

/**
 * Specular glint: brightens the listed pixels towards white, skipping transparent
 * and outline-coloured pixels so the silhouette never changes.
 */
export function glint(r: Raster, pts: readonly (readonly [number, number])[], outlineColor: string, t = 0.7): void {
  for (const [x, y] of pts) if (r.alpha(x, y) > 0 && !r.is(x, y, outlineColor)) r.tint(x, y, '#ffffff', t);
}

/** Pixels of a short "/" diagonal starting at (x, y) going up-right. */
export function diag(x: number, y: number, len: number): [number, number][] {
  return Array.from({ length: len }, (_, i): [number, number] => [x + i, y - i]);
}
