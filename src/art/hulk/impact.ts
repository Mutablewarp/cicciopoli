/**
 * Comic impact rays for the ground-slam frame: three tapered lime-white streaks bursting from the planted fists
 * (black rim, bright core), painted only on empty pixels so the body is never touched.
 */
import type { Raster } from '../ciccio/raster';
import { INK, NAIL } from './palette';

/** Ray directions in degrees (0 = right, 90 = up) and lengths in px. */
const RAYS: readonly (readonly [number, number])[] = [[104, 13], [68, 15], [32, 15]];

/** Pixels covered by a tapered streak from (ox, oy) along `deg`, starting `from` px out, `grow` px wide at its root. */
function streak(ox: number, oy: number, deg: number, len: number, grow: number, from: number): Set<string> {
  const dx = Math.cos((deg * Math.PI) / 180);
  const dy = -Math.sin((deg * Math.PI) / 180);
  const hit = new Set<string>();
  for (let t = from; t <= len; t += 0.5) {
    const w = Math.max(0, grow * (1 - (t - from) / (len - from))) + 0.3;
    const cx = ox + dx * t;
    const cy = oy + dy * t;
    for (let y = Math.floor(cy - w); y <= Math.ceil(cy + w); y++) {
      for (let x = Math.floor(cx - w); x <= Math.ceil(cx + w); x++) {
        if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= w * w) hit.add(`${x},${y}`);
      }
    }
  }
  return hit;
}

/** Rays start just in front of the fist at (hx, hy). */
export function impactRays(r: Raster, hx: number, hy: number): void {
  // the frame's last column stays clear (the sheet keeps a 1 px margin)
  const free = (key: string): boolean => {
    const [x, y] = key.split(',').map(Number);
    return x < r.w - 1 && r.get(x, y) === null;
  };
  const rim = new Set<string>();
  const core = new Set<string>();
  for (const [deg, len] of RAYS) {
    for (const k of streak(hx + 3, hy - 4, deg, len, 1.2, 6)) rim.add(k);
    for (const k of streak(hx + 3, hy - 4, deg, len - 1, 0.5, 6.5)) core.add(k);
  }
  const empty = [...rim].filter(free);
  for (const k of empty) {
    const [x, y] = k.split(',').map(Number);
    r.set(x, y, core.has(k) ? NAIL : INK);
  }
}
