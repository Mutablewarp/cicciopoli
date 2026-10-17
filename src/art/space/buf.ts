/**
 * Small RGBA pixel buffer for the space pack: per-pixel writes, lit spheres (light from the
 * top-left), ASCII grids and outlines, converted to a canvas once. Pure DOM, no Phaser.
 */
import { bayer, ctxOf, hexToRgb, makeCanvas, packSheet } from '../pixel';

export interface Tones {
  hi: string;
  base: string;
  shade: string;
  dark: string;
}

const rgbCache = new Map<string, readonly [number, number, number]>();
function rgbOf(hex: string): readonly [number, number, number] {
  let c = rgbCache.get(hex);
  if (!c) {
    c = hexToRgb(hex);
    rgbCache.set(hex, c);
  }
  return c;
}

// top-left-front light, normalised
const LX = -0.5;
const LY = -0.62;
const LZ = 0.6;

export class Buf {
  readonly data: Uint8ClampedArray;

  constructor(readonly w: number, readonly h: number) {
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  alpha(x: number, y: number): number {
    return this.inside(x, y) ? this.data[(y * this.w + x) * 4 + 3] : 0;
  }

  set(x: number, y: number, hex: string, a = 1): void {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (!this.inside(ix, iy)) return;
    const [r, g, b] = rgbOf(hex);
    const i = (iy * this.w + ix) * 4;
    this.data[i] = r;
    this.data[i + 1] = g;
    this.data[i + 2] = b;
    this.data[i + 3] = Math.round(a * 255);
  }

  /** Writes only where the buffer is already opaque (details painted onto a shape). */
  paint(x: number, y: number, hex: string): void {
    if (this.alpha(Math.round(x), Math.round(y)) > 0) this.set(x, y, hex);
  }

  clear(x: number, y: number): void {
    if (this.inside(x, y)) this.data[(y * this.w + x) * 4 + 3] = 0;
  }

  rect(x: number, y: number, w: number, h: number, hex: string): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, hex);
  }

  line(x0: number, y0: number, x1: number, y1: number, hex: string): void {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let k = 0; k <= n; k++) this.set(x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n, hex);
  }

  /** ASCII grid; '.' and ' ' are skipped. */
  grid(rows: readonly string[], pal: Readonly<Record<string, string>>, ox = 0, oy = 0): void {
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.' || ch === ' ') continue;
        const c = pal[ch];
        if (c === undefined) throw new Error(`space grid: no colour for '${ch}'`);
        this.set(ox + x, oy + y, c);
      }
    });
  }

  /** Ellipse lit as a sphere from the top-left; tones blend with an ordered dither. */
  sphere(cx: number, cy: number, rx: number, ry: number, t: Tones, onlyOver = false): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const u = (x - cx) / (rx + 0.35);
        const v = (y - cy) / (ry + 0.35);
        const r2 = u * u + v * v;
        if (r2 > 1) continue;
        if (onlyOver && this.alpha(x, y) === 0) continue;
        const z = Math.sqrt(1 - r2);
        const lit = u * LX + v * LY + z * LZ + (bayer(x, y) - 0.5) * 0.16;
        this.set(x, y, lit > 0.86 ? t.hi : lit > 0.42 ? t.base : lit > 0.1 ? t.shade : t.dark);
      }
    }
  }

  /** Flat ellipse (no shading). */
  ellipse(cx: number, cy: number, rx: number, ry: number, hex: string): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const u = (x - cx) / (rx + 0.35);
        const v = (y - cy) / (ry + 0.35);
        if (u * u + v * v <= 1) this.set(x, y, hex);
      }
    }
  }

  /** 1-px outline (4-neighbourhood) around every opaque pixel. */
  outline(hex: string): void {
    const src = new Uint8ClampedArray(this.data);
    const a = (x: number, y: number): number => (this.inside(x, y) ? src[(y * this.w + x) * 4 + 3] : 0);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (a(x, y) > 0) continue;
        if (a(x - 1, y) > 127 || a(x + 1, y) > 127 || a(x, y - 1) > 127 || a(x, y + 1) > 127) this.set(x, y, hex);
      }
    }
  }

  /** Copies another buffer on top (opaque pixels only). */
  stamp(src: Buf, ox: number, oy: number, flipX = false): void {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const i = (y * src.w + x) * 4;
        if (src.data[i + 3] === 0) continue;
        const tx = ox + (flipX ? src.w - 1 - x : x);
        const ty = oy + y;
        if (!this.inside(tx, ty)) continue;
        const j = (ty * this.w + tx) * 4;
        this.data.set(src.data.subarray(i, i + 4), j);
      }
    }
  }

  toCanvas(): HTMLCanvasElement {
    const c = makeCanvas(this.w, this.h);
    const img = new ImageData(new Uint8ClampedArray(this.data), this.w, this.h);
    ctxOf(c).putImageData(img, 0, 0);
    return c;
  }
}

/** Builds `count` frames with `draw` and packs them into a sheet canvas. */
export function sheetOf(count: number, w: number, h: number, draw: (b: Buf, i: number) => void): HTMLCanvasElement {
  const frames: HTMLCanvasElement[] = [];
  for (let i = 0; i < count; i++) {
    const b = new Buf(w, h);
    draw(b, i);
    frames.push(b.toCanvas());
  }
  return packSheet(frames, w, h);
}

/** Mirrors left-half rows (last char = centre column) into full symmetric rows. */
export function mirrorRows(half: readonly string[]): string[] {
  return half.map((r) => r + [...r.slice(0, -1)].reverse().join(''));
}
