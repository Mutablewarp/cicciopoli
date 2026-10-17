/**
 * Material masks: shapes are drawn as material ids, then painted with automatic
 * top-left lighting (light rim on the top-left, shade crescent bottom-right).
 */
import { Raster, packColor } from './raster';

export interface Tone {
  light: string;
  base: string;
  shade: string;
  /** optional extra-dark rim on the bottom-right edge */
  dark?: string;
}

export class Mask {
  readonly v: Uint8Array;

  constructor(readonly w: number, readonly h: number, readonly wrapX = false) {
    this.v = new Uint8Array(w * h);
  }

  private ix(x: number, y: number): number {
    if (y < 0 || y >= this.h) return -1;
    if (this.wrapX) x = ((x % this.w) + this.w) % this.w;
    else if (x < 0 || x >= this.w) return -1;
    return y * this.w + x;
  }

  get(x: number, y: number): number {
    const i = this.ix(Math.round(x), Math.round(y));
    return i < 0 ? 0 : this.v[i];
  }

  set(x: number, y: number, id: number): void {
    const i = this.ix(Math.round(x), Math.round(y));
    if (i >= 0) this.v[i] = id;
  }

  span(x0: number, x1: number, y: number, id: number): void {
    for (let x = Math.round(x0); x <= Math.round(x1); x++) this.set(x, y, id);
  }

  rect(x: number, y: number, w: number, h: number, id: number): void {
    for (let j = y; j < y + h; j++) this.span(x, x + w - 1, j, id);
  }

  /** Pixel ellipse; `shear` shifts each row by shear * (cy - y) (lean forward/back). */
  ellipse(cx: number, cy: number, rx: number, ry: number, id: number, shear = 0): void {
    for (let y = -ry; y <= ry; y++) {
      // ry + 0.5 avoids the lone 1-px nub at the top/bottom of small ellipses
      const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / ((ry + 0.5) * (ry + 0.5)))));
      const sx = Math.round(cx - shear * y);
      this.span(sx - half, sx + half, Math.round(cy + y), id);
    }
  }

  /** Even-odd polygon fill sampled at pixel centres. */
  poly(pts: readonly (readonly [number, number])[], id: number): void {
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, y] of pts) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const yc = y + 0.5;
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i];
        const [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const x0 = Math.ceil(xs[k] - 0.5);
        const x1 = Math.floor(xs[k + 1] - 0.5);
        if (x1 >= x0) this.span(x0, x1, y, id);
      }
    }
  }
}

/**
 * Paints a mask with top-left lighting. A pixel is "shade" when an edge of its
 * material lies within `shadeDepth` px towards the bottom-right, "light" when an
 * edge lies within `lightDepth` px towards the top-left.
 */
export function paintMask(
  m: Mask,
  r: Raster,
  tones: Readonly<Record<number, Tone>>,
  opts: { ox?: number; oy?: number; shadeDepth?: number; lightDepth?: number; openBottom?: boolean } = {},
): void {
  const ox = opts.ox ?? 0;
  const oy = opts.oy ?? 0;
  const sd = opts.shadeDepth ?? 2;
  const ld = opts.lightDepth ?? 1;
  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) {
      const id = m.v[y * m.w + x];
      if (id === 0) continue;
      const t = tones[id];
      if (!t) continue;
      const out = (dx: number, dy: number): boolean =>
        !(opts.openBottom && y + dy >= m.h) && m.get(x + dx, y + dy) !== id;
      let col = t.base;
      if (t.dark && (out(1, 0) || out(0, 1))) col = t.dark;
      else if (edgeWithin(out, 1, sd)) col = t.shade;
      else if (edgeWithin(out, -1, ld)) col = t.light;
      r.set(ox + x, oy + y, packColor(col));
    }
  }
}

function edgeWithin(out: (dx: number, dy: number) => boolean, dir: 1 | -1, depth: number): boolean {
  for (let k = 1; k <= depth; k++) {
    if (out(dir * k, dir * k) || out(dir * k, 0) || out(0, dir * k)) return true;
  }
  return false;
}
