/** Pixel-perfect lit primitives (no anti-aliasing): tone bands from a top-left light. */
import type { Raster } from './raster';
import type { Tones } from './palette';

const LIGHT = (() => {
  const v = [-0.5, -0.62, 0.6];
  const n = Math.hypot(v[0], v[1], v[2]);
  return v.map((k) => k / n);
})();

/** Picks a tone for a unit-disc normal (nx, ny); `bias` brightens (+) or darkens (-). */
export function toneAt(nx: number, ny: number, t: Tones, bias = 0): string {
  const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
  const lam = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2] + bias;
  if (lam > 0.9) return t.hi;
  if (lam > 0.42) return t.base;
  if (lam > 0.06) return t.sh;
  return t.deep;
}

export interface EllipseOpts {
  angle?: number;
  bias?: number;
  /** Paint only where this returns true (world pixel coords). */
  clip?: (x: number, y: number) => boolean;
}

/** Shaded ellipse rotated by `angle` (radians, clockwise on screen). */
export function litEllipse(
  r: Raster, cx: number, cy: number, rx: number, ry: number, t: Tones, o: EllipseOpts = {},
): void {
  const ca = Math.cos(o.angle ?? 0);
  const sa = Math.sin(o.angle ?? 0);
  const ext = Math.ceil(Math.max(rx, ry)) + 1;
  for (let y = Math.floor(cy - ext); y <= cy + ext; y++) {
    for (let x = Math.floor(cx - ext); x <= cx + ext; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const lx = (dx * ca + dy * sa) / (rx + 0.35);
      const ly = (-dx * sa + dy * ca) / (ry + 0.35);
      if (lx * lx + ly * ly > 1) continue;
      if (o.clip && !o.clip(x, y)) continue;
      r.set(x, y, toneAt(lx * ca - ly * sa, lx * sa + ly * ca, t, o.bias ?? 0));
    }
  }
}

/** Shaded capsule (thick limb segment) of radius `rad` from a to b. */
export function capsule(
  r: Raster, ax: number, ay: number, bx: number, by: number, rad: number, t: Tones, bias = 0,
): void {
  const vx = bx - ax;
  const vy = by - ay;
  const len2 = vx * vx + vy * vy || 1;
  const ext = Math.ceil(rad) + 1;
  for (let y = Math.floor(Math.min(ay, by) - ext); y <= Math.max(ay, by) + ext; y++) {
    for (let x = Math.floor(Math.min(ax, bx) - ext); x <= Math.max(ax, bx) + ext; x++) {
      const k = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / len2));
      const nx = (x - (ax + vx * k)) / (rad + 0.3);
      const ny = (y - (ay + vy * k)) / (rad + 0.3);
      if (nx * nx + ny * ny > 1) continue;
      r.set(x, y, toneAt(nx, ny, t, bias));
    }
  }
}

/** Shaded disc (fists, knees). */
export function litDisc(r: Raster, cx: number, cy: number, rad: number, t: Tones, bias = 0): void {
  litEllipse(r, cx, cy, rad, rad, t, { bias });
}
