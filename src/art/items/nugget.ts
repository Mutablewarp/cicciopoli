/**
 * The COIN: a round breaded chicken nugget (ref photo, bottom box) spinning like a coin,
 * 12x12, 6 frames (half a turn: both faces look alike, so it loops seamlessly).
 */
import { PAL, rng } from '../pixel';
import { Raster } from './raster';
import { Mask, shadeMask } from './shapes';

const CRUMB = {
  rim: '#fbd07a',
  light: '#e8a64c',
  base: '#cc8232',
  dark: '#8e4e1a',
  deep: '#5e2e10',
  crumbLight: '#f4c878',
  crumbDark: '#7a3e14',
  white: '#fff6dc',
};

const N = 6;
const CX = 6;
const CY = 6;
const RY = 4.65;

/** Crumb texture on the nugget's surface: [longitude bucket + 8][row], seeded. */
const CRUMBS: readonly (readonly number[])[] = (() => {
  const rand = rng(1212);
  return Array.from({ length: 28 }, () => Array.from({ length: 12 }, () => rand()));
})();

function nuggetFrame(i: number): Raster {
  const theta = (i / N) * Math.PI;
  const c = Math.cos(theta);
  const rx = 1.9 + 2.85 * Math.abs(c);
  const m = Mask.of(12, 12, (x, y) => {
    const dx = (x - CX) / rx;
    const dy = (y - CY) / RY;
    return dx * dx + dy * dy <= 1;
  });
  const r = new Raster(12, 12);
  shadeMask(r, m, CRUMB);
  for (let y = 0; y < 12; y++) {
    for (let x = 0; x < 12; x++) {
      if (!m.has(x, y) || m.edge(x, y)) continue;
      // crumbs live on the surface: their longitude shifts with the spin
      const lon = Math.asin(Math.max(-1, Math.min(1, (x + 0.5 - CX) / rx))) + theta;
      const h = CRUMBS[Math.floor(lon * 4) + 8][y];
      if (h < 0.15) r.set(x, y, CRUMB.crumbLight);
      else if (h > 0.88) r.set(x, y, CRUMB.crumbDark);
      else r.tint(x, y, CRUMB.dark, 0.3 * Math.abs(Math.sin(theta))); // face turning away gets darker
    }
  }
  // specular glint sliding left -> right across the face
  const gx = Math.round(CX - 0.5 + rx * (-0.55 + (1.1 * i) / (N - 1)));
  for (const [x, y, col] of [[gx, 3, CRUMB.white], [gx, 4, CRUMB.rim], [gx - 1, 4, CRUMB.rim]] as const) {
    if (m.has(x, y) && !m.edge(x, y)) r.set(x, y, col);
  }
  r.outline(PAL.ink);
  return r;
}

export function nuggetFrames(): Raster[] {
  return Array.from({ length: N }, (_, i) => nuggetFrame(i));
}
