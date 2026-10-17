/**
 * Pure per-pixel shield mask: hit tests against solid pixels and erosion (ragged blasts,
 * rectangles). Returns the cleared pixels so the caller can erase them from the texture.
 */

export type Px = readonly [number, number];

export class ShieldMask {
  private readonly solid: Uint8Array;

  constructor(readonly w: number, readonly h: number, alpha: ArrayLike<number>) {
    this.solid = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) this.solid[i] = alpha[i] > 0 ? 1 : 0;
  }

  at(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h && this.solid[y * this.w + x] === 1;
  }

  count(): number {
    let n = 0;
    for (const v of this.solid) n += v;
    return n;
  }

  /**
   * First solid pixel inside the rect (local coords), scanning rows from the top (a falling
   * bomb meets the top first) or from the bottom (a rising shot). Null when the rect is clear.
   */
  hit(x: number, y: number, w: number, h: number, fromTop: boolean): Px | null {
    const x0 = Math.max(0, Math.floor(x));
    const x1 = Math.min(this.w - 1, Math.ceil(x + w) - 1);
    const y0 = Math.max(0, Math.floor(y));
    const y1 = Math.min(this.h - 1, Math.ceil(y + h) - 1);
    for (let k = 0; k <= y1 - y0; k++) {
      const yy = fromTop ? y0 + k : y1 - k;
      for (let xx = x0; xx <= x1; xx++) if (this.solid[yy * this.w + xx]) return [xx, yy];
    }
    return null;
  }

  /** Ragged round blast; `rnd` in [0,1) roughens the edge. */
  blast(cx: number, cy: number, r: number, rnd: () => number): Px[] {
    const out: Px[] = [];
    const R = Math.ceil(r + 1);
    for (let y = cy - R; y <= cy + R; y++) {
      for (let x = cx - R; x <= cx + R; x++) {
        if (!this.at(x, y)) continue;
        const d = Math.hypot(x - cx, y - cy);
        if (d <= r + (rnd() - 0.5) * 1.4) {
          this.solid[y * this.w + x] = 0;
          out.push([x, y]);
        }
      }
    }
    return out;
  }

  clearRect(x: number, y: number, w: number, h: number): Px[] {
    const out: Px[] = [];
    for (let yy = Math.max(0, Math.floor(y)); yy < Math.min(this.h, Math.ceil(y + h)); yy++) {
      for (let xx = Math.max(0, Math.floor(x)); xx < Math.min(this.w, Math.ceil(x + w)); xx++) {
        if (!this.solid[yy * this.w + xx]) continue;
        this.solid[yy * this.w + xx] = 0;
        out.push([xx, yy]);
      }
    }
    return out;
  }
}
