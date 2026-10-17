/** Sky gradient, cream cup clouds and the pale distant hills (all seamless at 512 px). */
import { bayer, mix } from '../pixel';
import { HC } from './colors';
import { Mask } from './mask';
import { Raster, packColor } from './raster';

export const LAYER_W = 512;

interface Stop { at: number; color: string }

/**
 * Smooth per-row vertical gradient. The sky texture is stretched across the whole view,
 * so any dither pattern would smear into long horizontal streaks.
 */
function gradient(r: Raster, stops: readonly Stop[]): void {
  for (let y = 0; y < r.h; y++) {
    const t = y / (r.h - 1);
    let k = 0;
    while (k < stops.length - 2 && t > stops[k + 1].at) k++;
    const a = stops[k];
    const b = stops[k + 1];
    const local = Math.max(0, Math.min(1, (t - a.at) / Math.max(0.0001, b.at - a.at)));
    const c = packColor(mix(a.color, b.color, local));
    for (let x = 0; x < r.w; x++) r.set(x, y, c);
  }
}

export function buildSky(): HTMLCanvasElement {
  const r = new Raster(16, 512);
  gradient(r, [
    { at: 0, color: HC.skyTop },
    { at: 0.16, color: '#3296d8' },
    { at: 0.32, color: HC.skyDeep },
    { at: 0.46, color: '#4cbae8' },
    { at: 0.58, color: HC.sky },
    { at: 0.74, color: HC.sky },
    { at: 0.88, color: HC.skyLow },
    { at: 1, color: HC.skyPale },
  ]);
  return r.toCanvas();
}

interface Cloud { x: number; base: number; w: number; h: number }

const CLOUDS: readonly Cloud[] = [
  { x: 52, base: 46, w: 68, h: 26 },
  { x: 166, base: 96, w: 46, h: 18 },
  { x: 268, base: 38, w: 94, h: 34 },
  { x: 378, base: 108, w: 42, h: 16 },
  { x: 452, base: 68, w: 60, h: 23 },
];

/** Cup cloud: flat rounded slab with a tall main bump, a lower right bump and a small left one. */
function cloudShape(m: Mask, c: Cloud): { x: number; y: number }[] {
  const { x, base, w, h } = c;
  const slabH = Math.max(5, Math.round(h * 0.36));
  const half = Math.round(w / 2);
  const cap = Math.round(slabH / 2);
  m.rect(x - half + cap, base - slabH + 1, 2 * (half - cap) + 1, slabH, 1);
  m.ellipse(x - half + cap, base - cap, cap, cap, 1);
  m.ellipse(x + half - cap, base - cap, cap, cap, 1);
  const big = { x: x - Math.round(w * 0.08), r: Math.round(h * 0.42) };
  const right = { x: x + Math.round(w * 0.2), r: Math.round(h * 0.3) };
  const left = { x: x - Math.round(w * 0.3), r: Math.round(h * 0.22) };
  m.ellipse(big.x, base - h + big.r, big.r + 1, big.r, 1);
  m.ellipse(right.x, base - Math.round(h * 0.62) + right.r, right.r + 1, right.r, 1);
  m.ellipse(left.x, base - slabH - left.r + 3, left.r + 1, left.r, 1);
  for (let i = -half - 3; i <= half + 3; i++) for (let j = 1; j < 10; j++) m.set(x + i, base + j, 0);
  // crease marks where the bumps meet the slab (cup detail)
  return [
    { x: big.x - big.r + 1, y: base - slabH - 1 },
    { x: right.x - right.r, y: base - slabH },
  ];
}

export function buildClouds(): HTMLCanvasElement {
  const m = new Mask(LAYER_W, 128, true);
  const creases: { x: number; y: number }[] = [];
  for (const c of CLOUDS) creases.push(...cloudShape(m, c));
  const r = new Raster(LAYER_W, 128, true);
  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) {
      if (m.get(x, y) === 0) continue;
      let col: string = HC.cloud;
      if (m.get(x, y + 1) === 0) col = HC.cloudBlue;
      else if (m.get(x, y + 3) === 0) col = HC.cloudShade;
      else if (m.get(x, y - 1) === 0) col = HC.cloudLight;
      r.set(x, y, col);
    }
  }
  for (const p of creases) {
    for (const dy of [0, 1]) if (m.get(p.x, p.y + dy) !== 0) r.set(p.x, p.y + dy, HC.cloudBlue);
  }
  return r.toCanvas();
}

/** Smooth periodic ridge: sum of integer-frequency sines so x=0 and x=512 match. */
function ridge(x: number, base: number, waves: readonly [number, number, number][]): number {
  let y = base;
  for (const [amp, freq, phase] of waves) y += amp * Math.sin((x / LAYER_W) * Math.PI * 2 * freq + phase);
  return Math.round(y);
}

export function buildFar(): HTMLCanvasElement {
  const H = 128;
  const r = new Raster(LAYER_W, H, true);
  const back: [number, number, number][] = [[16, 3, 0.4], [9, 5, 1.9], [4, 11, 0.7]];
  const front: [number, number, number][] = [[13, 4, 2.6], [8, 7, 0.2], [3, 13, 1.1]];
  for (let x = 0; x < LAYER_W; x++) {
    const yb = ridge(x, 54, back);
    const yf = ridge(x, 84, front);
    for (let y = Math.max(0, yb); y < H; y++) {
      const isFront = y >= yf;
      const top = isFront ? yf : yb;
      const light = y - top < 2 ? 1 : y - top < 4 ? bayer(x, y) < 0.5 ? 1 : 0 : 0;
      const col = isFront ? (light ? HC.farFrontLight : HC.farFront) : light ? HC.farBackLight : HC.farBack;
      r.set(x, y, col);
    }
  }
  return r.toCanvas();
}
