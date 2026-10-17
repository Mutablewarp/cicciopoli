/**
 * Boolean pixel masks + material shading (light from the top-left) for the items pack.
 */
import { Raster } from './raster';

export class Mask {
  readonly a: Uint8Array;

  constructor(readonly w: number, readonly h: number) {
    this.a = new Uint8Array(w * h);
  }

  /** Mask of every pixel whose centre satisfies `fn`. */
  static of(w: number, h: number, fn: (x: number, y: number) => boolean): Mask {
    const m = new Mask(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (fn(x + 0.5, y + 0.5)) m.a[y * w + x] = 1;
    return m;
  }

  has(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h && this.a[y * this.w + x] === 1;
  }

  put(x: number, y: number, on: boolean): void {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.a[y * this.w + x] = on ? 1 : 0;
  }

  /** True for mask pixels with at least one 4-neighbour outside the mask. */
  edge(x: number, y: number): boolean {
    return this.has(x, y) && (!this.has(x - 1, y) || !this.has(x + 1, y) || !this.has(x, y - 1) || !this.has(x, y + 1));
  }

  /** Bumpy crust: randomly grows / bites single pixels along the border (seeded). */
  roughen(rand: () => number, grow: number, bite: number): this {
    const add: number[] = [];
    const del: number[] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.edge(x, y) && rand() < bite) del.push(x, y);
        const touches = !this.has(x, y) && (this.has(x - 1, y) || this.has(x + 1, y) || this.has(x, y - 1) || this.has(x, y + 1));
        if (touches && rand() < grow) add.push(x, y);
      }
    }
    for (let k = 0; k < del.length; k += 2) this.put(del[k], del[k + 1], false);
    for (let k = 0; k < add.length; k += 2) this.put(add[k], add[k + 1], true);
    return this;
  }
}

/** Tapered capsule from A (radius ra) to B (radius rb): drumsticks, bones, flames. */
export function capsule(ax: number, ay: number, bx: number, by: number, ra: number, rb: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  return (x: number, y: number): boolean => {
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2));
    const cx = ax + dx * t;
    const cy = ay + dy * t;
    const r = ra + (rb - ra) * t;
    return (x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r;
  };
}

export function disc(cx: number, cy: number, r: number) {
  return (x: number, y: number): boolean => (x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r;
}

/** Even-odd point-in-polygon test (splinters, star bursts). */
export function poly(pts: readonly (readonly [number, number])[]) {
  return (x: number, y: number): boolean => {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i];
      const [xj, yj] = pts[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
}

export interface Tones {
  light: string;
  base: string;
  dark: string;
  /** outermost bottom-right rim (defaults to dark) */
  deep?: string;
  /** top-left rim pixels (defaults to light) */
  rim?: string;
}

/**
 * Fills mask pixels with a 2-step bevel: top-left facing rims lit, bottom-right facing
 * rims shaded. Pixels thin enough to face both ways keep the base tone.
 */
export function shadeMask(r: Raster, m: Mask, t: Tones): void {
  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) {
      if (!m.has(x, y)) continue;
      const tl1 = !m.has(x - 1, y) || !m.has(x, y - 1);
      const br1 = !m.has(x + 1, y) || !m.has(x, y + 1);
      const tl2 = !m.has(x - 1, y - 1) || !m.has(x - 2, y) || !m.has(x, y - 2);
      const br2 = !m.has(x + 1, y + 1) || !m.has(x + 2, y) || !m.has(x, y + 2);
      let c = t.base;
      if (br1 && !tl1) c = t.deep ?? t.dark;
      else if (tl1 && !br1) c = t.rim ?? t.light;
      else if (br2 && !tl2) c = t.dark;
      else if (tl2 && !br2) c = t.light;
      r.set(x, y, c);
    }
  }
}

/** Sprinkles `colors` over interior (non-edge) mask pixels with probability `p`. */
export function speckle(r: Raster, m: Mask, rand: () => number, colors: readonly string[], p: number): void {
  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) {
      if (!m.has(x, y) || m.edge(x, y)) continue;
      if (rand() < p) r.set(x, y, colors[Math.floor(rand() * colors.length)]);
    }
  }
}
