/**
 * Fast RGBA pixel buffer for the big procedural inferno layers (vortex, castles, lava):
 * writing a Uint32Array then one putImageData is ~50x faster than per-pixel fillRect.
 */
import { bayer, ctxOf, hexToRgb, makeCanvas } from '../pixel';

/** Packs a hex colour for a little-endian Uint32 view of ImageData (every target CPU is LE). */
export function rgba(hex: string, a = 255): number {
  const [r, g, b] = hexToRgb(hex);
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

export const CLEAR = 0;

export class PixBuf {
  readonly px: Uint32Array;
  private readonly img: ImageData;

  constructor(readonly w: number, readonly h: number) {
    this.img = new ImageData(w, h);
    this.px = new Uint32Array(this.img.data.buffer);
  }

  set(x: number, y: number, c: number): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.px[y * this.w + x] = c;
  }

  get(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return CLEAR;
    return this.px[y * this.w + x];
  }

  /** Horizontal wrap-around write, used by every seamless parallax strip. */
  setW(x: number, y: number, c: number): void {
    this.set(((x % this.w) + this.w) % this.w, y, c);
  }

  getW(x: number, y: number): number {
    return this.get(((x % this.w) + this.w) % this.w, y);
  }

  rectW(x: number, y: number, w: number, h: number, c: number): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.setW(x + i, y + j, c);
  }

  toCanvas(): HTMLCanvasElement {
    const c = makeCanvas(this.w, this.h);
    ctxOf(c).putImageData(this.img, 0, 0);
    return c;
  }
}

/** Picks a colour from `ramp` for value v in [0,1] with ordered dithering between steps. */
export function ditherPick(ramp: readonly number[], v: number, x: number, y: number): number {
  const f = Math.max(0, Math.min(1, v)) * (ramp.length - 1);
  const i = Math.floor(f);
  return f - i > bayer(x, y) && i + 1 < ramp.length ? ramp[i + 1] : ramp[i];
}

/**
 * Integer index variant of ditherPick. `spread` < 1 narrows the dithered zone between
 * two steps, giving crisper colour bands (1 = full ordered dither).
 */
export function ditherIndex(n: number, v: number, x: number, y: number, spread = 1): number {
  const f = Math.max(0, Math.min(1, v)) * (n - 1);
  const i = Math.floor(f);
  return f - i > 0.5 + (bayer(x, y) - 0.5) * spread && i + 1 < n ? i + 1 : i;
}

/** Sine lookup table: the vortex needs ~1.5M sines per build. */
const LUT_N = 4096;
const LUT = new Float32Array(LUT_N);
for (let i = 0; i < LUT_N; i++) LUT[i] = Math.sin((i / LUT_N) * Math.PI * 2);
const LUT_K = LUT_N / (Math.PI * 2);

export function fsin(a: number): number {
  return LUT[(a * LUT_K) & (LUT_N - 1)];
}
