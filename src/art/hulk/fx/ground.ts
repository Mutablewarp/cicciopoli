/** Ground FX: shockwave ring, brick / stone chips and the big dust cloud. */
import { rng } from '../../pixel';
import { Raster } from '../../ciccio/raster';
import { INK } from '../palette';
import { crumble, fillPoly, ringed, type Pt } from './poly';

/* ------------------------------------------------------------- shockwave */
export const SHOCK_W = 96;
export const SHOCK_H = 32;

/** Flattened expanding ring on the ground, white core inside a lime band; centre-bottom (48, 31). */
export function shockFrames(): Raster[] {
  const radii = [9, 19, 29, 37, 43, 47];
  const widths = [5, 6, 6, 5.5, 4.5, 3.5];
  return radii.map((rx, f) => {
    const r = new Raster(SHOCK_W, SHOCK_H);
    const ry = Math.max(3.5, rx * 0.27);
    const cy = SHOCK_H - 1 - ry;
    const inner = (rx - widths[f]) / rx;
    const innerY = Math.max(0.3, (ry - widths[f] * 0.85) / ry);
    const mid = (1 + (inner + innerY) / 2) / 2;
    for (let y = 0; y < SHOCK_H; y++) {
      for (let x = 0; x < SHOCK_W; x++) {
        const dx = (x - 48) / rx;
        const dy = (y - cy) / ry;
        const d = Math.hypot(dx, dy);
        if (d > 1 || (dx * dx) / (inner * inner) + (dy * dy) / (innerY * innerY) <= 1) continue;
        const core = Math.abs(d - mid) < (1 - mid) * 0.55 && f < 5;
        r.set(x, y, core ? '#ffffff' : y >= cy ? '#a3d52c' : '#68a21f');
      }
    }
    return ringed(crumble(r, f >= 4 ? (f - 3) * 0.16 : 0, 70 + f), INK);
  });
}

/* ---------------------------------------------------------------- rubble */
const BRICK = { hi: '#d8825a', base: '#b0553a', sh: '#6e2c24' };
const STONE = { hi: '#c2bfce', base: '#8c8999', sh: '#56535f' };

/** Six 8x8 chips: three brick, three concrete, each an irregular lit polygon. */
export function rubbleChips(): Raster[] {
  return Array.from({ length: 6 }, (_, i) => {
    const tones = i < 3 ? BRICK : STONE;
    const rand = rng(100 + i);
    const n = 5 + (i % 2);
    const pts: Pt[] = [];
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + rand() * 0.5;
      const rad = 2.2 + rand() * 1.5;
      pts.push([4 + Math.cos(a) * rad * (i % 3 === 0 ? 1.25 : 1), 4 + Math.sin(a) * rad * (i % 3 === 1 ? 0.8 : 1)]);
    }
    const r = new Raster(8, 8);
    fillPoly(r, pts, (x, y) => ((x - 4) + (y - 4) < -1.2 ? tones.hi : (x - 4) + (y - 4) > 1.4 ? tones.sh : tones.base));
    return ringed(r, INK);
  });
}

/* ------------------------------------------------------------------ dust */
export const DUST_W = 32;
export const DUST_H = 24;

const DUST = { hi: '#e9dccb', base: '#c4b2a0', sh: '#9a8878', line: '#4a3e3a' };

/** Puff layout: [x offset from centre, lift above the ground, radius]. Wide and low so it never climbs the shins. */
const PUFFS: readonly (readonly [number, number, number])[] = [
  [-10, 0, 4.5], [-5, 0, 5.5], [0, 0.5, 6], [5, 0, 5.5], [10, 0, 4.5], [-6, 2.5, 3.8], [3, 3, 4.2], [8, 2.5, 3.2],
];
/** Puff size per frame: swells to full by frame 2, then thins out into small drifting wisps. */
const DUST_GROW = [0.6, 0.85, 1, 1, 0.8, 0.6];
/** Tallest the cloud may stand (px, outline included): knee height stays clear of the hero's legs. */
export const DUST_MAX_H = 13;

/** Low rolling dust cloud on a flat ground line, bottom-centred: spreads sideways, swells, then thins (no dither). */
export function dustFrames(): Raster[] {
  const ground = DUST_H - 2;
  return DUST_GROW.map((g, f) => {
    const r = new Raster(DUST_W, DUST_H);
    const spread = 0.8 + f * 0.09;
    const lift = f * 0.6;
    for (const [px, up, pr] of PUFFS) {
      const rx = pr * g;
      const ry = rx * 0.9;
      const cx = DUST_W / 2 + px * spread;
      const cy = ground - ry * 0.6 - up * g - lift;
      for (let y = Math.floor(cy - ry); y <= Math.min(ground, cy + ry); y++) {
        for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
          const dx = (x - cx) / rx;
          const dy = (y - cy) / ry;
          if (dx * dx + dy * dy > 1) continue;
          const t = dx * -0.6 + dy * -0.8;
          r.set(x, y, t > 0.35 ? DUST.hi : t < -0.4 ? DUST.sh : DUST.base);
        }
      }
    }
    return ringed(r, DUST.line);
  });
}
