/**
 * Provola Goat = fried battered provola STICKS (ref/photo_provola_fries_nuggets.jpg, top box):
 * 16x16 pickup (two sticks), 8x8 T-shirt badge and the 12x8 flying-stick shot.
 */
import { PAL, rng } from '../pixel';
import { Raster, glint } from './raster';
import { Mask, shadeMask } from './shapes';

/** Golden-beige batter, light from the top-left. */
export const BATTER = {
  rim: '#fff4cc',
  light: '#f8da8e',
  base: '#ecbc60',
  dark: '#cf8f38',
  deep: '#a46224',
  spot: '#d9a04a',
  spot2: '#bf7c2c',
  crisp: '#fffbea',
};

interface Stick {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  /** half thickness (px) */
  half: number;
  seed: number;
}

/**
 * Rounded-rectangle stick along A->B. Batter lumps: wide low bulges on the top edge
 * and soft drips under the bottom edge (runs of 2-3 px, never 1-px spikes).
 */
function stickMask(w: number, h: number, s: Stick): Mask {
  const len = Math.hypot(s.bx - s.ax, s.by - s.ay);
  const dx = (s.bx - s.ax) / len;
  const dy = (s.by - s.ay) / len;
  const rand = rng(s.seed);
  const steps = Math.ceil(len) + 3;
  const top: number[] = [];
  const bot: number[] = [];
  while (top.length < steps) {
    const run = 2 + Math.floor(rand() * 2);
    const t = rand() < 0.4 ? 0.45 : 0;
    const b = rand() < 0.3 ? 0.65 : 0;
    for (let k = 0; k < run; k++) {
      top.push(t);
      bot.push(b);
    }
  }
  const rc = s.half - 1.15; // 3-px blunt flat end, never a 1-px nub
  const m = Mask.of(w, h, (x, y) => {
    const u = (x - s.ax) * dx + (y - s.ay) * dy;
    const v = -(x - s.ax) * dy + (y - s.ay) * dx;
    const k = Math.max(0, Math.min(steps - 1, Math.floor(u)));
    const mid = u > rc + 1.5 && u < len - rc - 1.5; // lumps stay off the blunt ends
    const ht = s.half + (mid ? top[k] : 0);
    const hb = s.half + (mid ? bot[k] : 0);
    const cu = Math.max(rc, Math.min(len - rc, u));
    const cv = Math.max(-(ht - rc), Math.min(hb - rc, v));
    return u >= 0 && u <= len && v >= -ht && v <= hb && (u - cu) ** 2 + (v - cv) ** 2 <= rc * rc;
  });
  // tilted blunt ends can leave a lone tip pixel: drop pixels with < 2 orthogonal neighbours
  const spurs: [number, number][] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const n = [m.has(x - 1, y), m.has(x + 1, y), m.has(x, y - 1), m.has(x, y + 1)].filter(Boolean).length;
      if (m.has(x, y) && n < 2) spurs.push([x, y]);
    }
  }
  for (const [x, y] of spurs) m.put(x, y, false);
  return m;
}

/** One outlined stick on its own raster (composited back-to-front by the caller). */
function stickRaster(w: number, h: number, s: Stick, shadow = 0): Raster {
  const m = stickMask(w, h, s);
  const r = new Raster(w, h);
  shadeMask(r, m, BATTER);
  const rand = rng(s.seed + 7);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!m.has(x, y) || m.edge(x, y)) continue;
      const q = rand();
      const upper = !m.has(x, y - 2);
      if (upper && q < 0.1) r.set(x, y, BATTER.crisp);
      else if (q > 0.8) r.set(x, y, q > 0.93 ? BATTER.spot2 : BATTER.spot);
    }
  }
  if (shadow > 0) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) r.tint(x, y, BATTER.deep, shadow);
  r.outline(PAL.ink);
  return r;
}

/* ------------------------------------------------------------ pickup */

const BACK: Stick = { ax: 2.4, ay: 6.2, bx: 14.4, by: 4.0, half: 2.3, seed: 31 };
const FRONT: Stick = { ax: 1.5, ay: 10.4, bx: 14.5, by: 10.4, half: 2.35, seed: 57 };

export function provolaFrames(): Raster[] {
  const base = new Raster(16, 16);
  base.draw(stickRaster(16, 16, BACK, 0.12)); // slightly darker: it sits behind
  base.draw(stickRaster(16, 16, FRONT));
  // shine: a short "/" glint slides along both sticks, left to right
  return [3, 6, 9, 12].map((x0) => {
    const f = base.clone();
    const pts: [number, number][] = [];
    for (let i = 0; i < 3; i++) pts.push([x0 + i, 10 - i], [x0 + 1 + i, 6 - i - Math.round((x0 + i) / 4)]);
    glint(f, pts, PAL.ink, 0.9);
    return f;
  });
}

/* ------------------------------------------------------------- badge */

const BADGE = [
  '........',
  '....kkk.',
  '..kkHHck',
  '.kHcbbdk',
  'kHcbsDk.',
  'kcdDkk..',
  '.kkk....',
  '........',
];

export function badgeRaster(): Raster {
  const r = new Raster(8, 8);
  r.grid(BADGE, { k: PAL.ink, H: BATTER.rim, c: BATTER.light, b: BATTER.base, s: BATTER.spot2, d: BATTER.dark, D: BATTER.deep });
  return r;
}

/* -------------------------------------------------------- shot (faces right) */

const SHOT = [
  '............',
  '....kkkkkkk.',
  '...kHHcHHcHk',
  '...kcbbsbbdk',
  '...kbsbbbsdk',
  '...kddDddDDk',
  '....kkkkkkk.',
  '............',
];

/** Speed streak behind the stick (cream, never yellow: partial alpha must not turn green on the sky). */
const STREAKS: readonly (readonly (readonly [number, number, number])[])[] = [
  [[2, 2, 0.8], [1, 2, 0.45], [0, 2, 0.2], [2, 4, 0.6], [1, 4, 0.3], [2, 5, 0.35]],
  [[2, 3, 0.8], [1, 3, 0.45], [0, 3, 0.2], [2, 5, 0.6], [1, 5, 0.3], [2, 2, 0.35]],
];

export function cheeseShotFrames(): Raster[] {
  return STREAKS.map((streak, i) => {
    const r = new Raster(12, 8);
    r.grid(SHOT, { k: PAL.ink, H: BATTER.rim, c: BATTER.light, b: BATTER.base, s: BATTER.spot, d: BATTER.dark, D: BATTER.deep });
    r.set(i === 0 ? 6 : 8, 3, BATTER.crisp); // glint hops along the stick
    for (const [x, y, a] of streak) r.set(x, y, BATTER.crisp, a);
    return r;
  });
}
