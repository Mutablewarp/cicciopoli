/**
 * Pixel fire: the 16x24 `flame` loop plus the `paintFlame` brush reused by the
 * crunchy-wings pickup (small tongues licking around the wings).
 */
import { PAL } from '../pixel';
import { Raster } from './raster';

export const FIRE = {
  core: '#fffbe6',
  hot: PAL.lavaHot,
  yellow: PAL.lavaYellow,
  orange: PAL.lavaOrange,
  red: PAL.lavaRed,
  deep: PAL.lavaDeep,
};

const TAU = Math.PI * 2;

/** Flame width profile: rounded base, widest at ~20 % height, sharp tip. */
function profile(t: number): number {
  if (t < 0.2) return 0.62 + 0.38 * (t / 0.2);
  return Math.pow(Math.max(0, 1 - (t - 0.2) / 0.8), 0.8);
}

function fireColor(q: number, t: number, hot: boolean): string {
  if (t > 0.86) return FIRE.deep;
  if (hot && q < 0.24 && t < 0.3) return FIRE.core;
  if (q < 0.4 && t < 0.56) return FIRE.hot;
  if (q < 0.62 && t < 0.72) return FIRE.yellow;
  if (q < 0.84 && t < 0.8) return FIRE.orange;
  return FIRE.red;
}

/**
 * Paints one flame tongue standing on (cx, baseY), `h` tall, `hw` half-width.
 * `phase` (radians) drives sway and edge wobble so consecutive phases animate.
 */
export function paintFlame(r: Raster, cx: number, baseY: number, h: number, hw: number, phase: number, hot = true): void {
  for (let y = Math.floor(baseY - h); y <= baseY; y++) {
    const t = (baseY - y + 0.5) / h;
    if (t > 1) continue;
    const sway = Math.sin(phase + t * 3.4) * t * hw * 0.45;
    const width = hw * profile(t) * (1 + 0.14 * Math.sin(phase * 2 + t * 10));
    if (width < 0.35) continue;
    for (let x = Math.floor(cx - hw * 2); x <= Math.ceil(cx + hw * 2); x++) {
      const q = Math.abs(x + 0.5 - (cx + sway)) / width;
      if (q <= 1) r.set(x, y, fireColor(q, t, hot));
    }
  }
}

/** Detached ember-tips that float above the flame and fade to dark red. */
function tips(r: Raster, cx: number, top: number, phase: number): void {
  for (let k = 0; k < 2; k++) {
    const life = ((phase / TAU + k * 0.5) % 1 + 1) % 1;
    const y = Math.round(top - life * 5);
    const x = Math.round(cx + Math.sin(phase * 1.5 + k * 2.1) * 2.5);
    r.set(x, y, life < 0.5 ? FIRE.red : FIRE.deep);
    if (life < 0.35) r.set(x, y + 1, FIRE.orange);
  }
}

function flameFrame(i: number, n: number): Raster {
  const r = new Raster(16, 24);
  const p = (i / n) * TAU;
  // two side tongues behind, the main tongue in front
  paintFlame(r, 4.5, 23, 11 + 3 * Math.sin(p + 1.3), 3, p + 2.1, false);
  paintFlame(r, 11.5, 23, 12 + 3 * Math.sin(p + 3.7), 3, p + 4.4, false);
  paintFlame(r, 8, 23, 19 + 2 * Math.sin(p * 2), 5.6, p);
  tips(r, 8, 4 + 2 * Math.sin(p * 2), p);
  return r;
}

export function flameFrames(): Raster[] {
  const n = 6;
  return Array.from({ length: n }, (_, i) => flameFrame(i, n));
}
