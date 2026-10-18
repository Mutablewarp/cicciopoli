/**
 * Lets a sprite drawn on a 16-pixel grid be painted on a bigger grid: shapes (spheres,
 * ellipses, lines, rectangles) scale smoothly, single-pixel details stay single pixels.
 * Per-pixel loops must iterate the big grid and map back with `back()`.
 */
import type { Buf, Tones } from './buf';

export class Zoom {
  /** pixel centres of the small grid land on the big grid's centre line */
  private readonly shift: number;

  constructor(readonly b: Buf, readonly k: number) {
    this.shift = (k - 1) / 2;
  }

  /** Small-grid coordinate -> big-grid coordinate. */
  p(v: number): number {
    return v * this.k + this.shift;
  }

  /** Big-grid pixel -> small-grid coordinate. */
  back(v: number): number {
    return (v - this.shift) / this.k;
  }

  sphere(cx: number, cy: number, rx: number, ry: number, t: Tones, onlyOver = false): void {
    this.b.sphere(this.p(cx), this.p(cy), rx * this.k, ry * this.k, t, onlyOver);
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, hex: string): void {
    this.b.ellipse(this.p(cx), this.p(cy), rx * this.k, ry * this.k, hex);
  }

  line(x0: number, y0: number, x1: number, y1: number, hex: string): void {
    this.b.line(this.p(x0), this.p(y0), this.p(x1), this.p(y1), hex);
  }

  rect(x: number, y: number, w: number, h: number, hex: string): void {
    const x0 = Math.ceil(this.p(x - 0.5));
    const y0 = Math.ceil(this.p(y - 0.5));
    this.b.rect(x0, y0, Math.ceil(this.p(x + w - 0.5)) - x0, Math.ceil(this.p(y + h - 0.5)) - y0, hex);
  }

  set(x: number, y: number, hex: string): void {
    this.b.set(Math.round(this.p(x)), Math.round(this.p(y)), hex);
  }

  paint(x: number, y: number, hex: string): void {
    this.b.paint(Math.round(this.p(x)), Math.round(this.p(y)), hex);
  }

  outline(hex: string): void {
    this.b.outline(hex);
  }
}
