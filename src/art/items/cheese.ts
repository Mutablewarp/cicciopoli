/**
 * Melted provola FX: the 24x16 impact splat and the 32x32 blob that swallows an enemy.
 */
import { rng } from '../pixel';
import { Raster } from './raster';
import { Mask, capsule, disc, shadeMask } from './shapes';

type Pred = (x: number, y: number) => boolean;

/** Melted provola / mozzarella: creamy yellow, glossy. */
export const MELT = {
  hi: '#fffbe2',
  light: '#fff0a6',
  base: '#fcda62',
  dark: '#e4aa34',
  deep: '#b8781c',
  line: '#6a3c00',
};

const TONES = { rim: MELT.hi, light: MELT.light, base: MELT.base, dark: MELT.dark, deep: MELT.deep };

function maskOf(w: number, h: number, preds: readonly Pred[]): Mask {
  return Mask.of(w, h, (x, y) => preds.some((p) => p(x, y)));
}

/** Thin cheese string from A to B (sub-pixel radius keeps it 1 px wide). */
const string = (ax: number, ay: number, bx: number, by: number): Pred => capsule(ax, ay, bx, by, 0.55, 0.55);
/** Falling drop: slightly tall ellipse. */
const drop = (x: number, y: number, r: number): Pred => (px, py) => ((px - x) / r) ** 2 + ((py - y) / (r * 1.45)) ** 2 <= 1;

/* ------------------------------------------------------- cheese splat */

interface SplatStage {
  rx: number;
  ry: number;
  cy: number;
  /** flying droplets: angle (rad), distance, radius, fall (px) */
  drops: readonly (readonly [number, number, number, number])[];
  /** hanging drips under the puddle: x, length */
  drips: readonly (readonly [number, number])[];
  /** fraction of pixels kept (ordered dither) while the splat fades */
  keep: number;
}

const STAGES: readonly SplatStage[] = [
  { rx: 3, ry: 3, cy: 8, drops: [[-2.6, 5, 1, 0], [-0.5, 5, 1, 0], [0.9, 5, 0.7, 0], [2.3, 5, 0.7, 0], [-1.6, 5, 0.7, 0]], drips: [], keep: 1 },
  { rx: 6, ry: 4, cy: 8, drops: [[-2.7, 8, 1.2, 0], [-0.4, 8, 1.2, 0], [-1.5, 6, 1, 0], [0.8, 8, 1, 0], [2.4, 8, 1, 0]], drips: [], keep: 1 },
  { rx: 7, ry: 3, cy: 9, drops: [[-2.8, 10, 1, 1], [-0.3, 10, 1, 1], [-1.6, 7, 0.8, 1], [0.7, 10, 0.7, 2], [2.5, 10, 0.7, 2]], drips: [[8, 2], [14, 3]], keep: 1 },
  { rx: 7, ry: 2, cy: 10, drops: [[-2.9, 11, 0.7, 3], [-0.2, 11, 0.7, 3], [-1.6, 8, 0.7, 2]], drips: [[8, 3], [14, 4], [11, 2]], keep: 1 },
  { rx: 5, ry: 1, cy: 11, drops: [[-2.9, 11, 0.5, 4], [-0.2, 11, 0.5, 4]], drips: [[9, 3], [14, 2]], keep: 1 },
  { rx: 3, ry: 1, cy: 12, drops: [[-3, 9, 0.5, 4]], drips: [[11, 2]], keep: 0.55 },
];

function splatFrame(s: SplatStage, i: number): Raster {
  const cx = 12;
  const blob = Mask.of(24, 16, (x, y) => ((x - cx) * (x - cx)) / ((s.rx + 0.5) ** 2) + ((y - s.cy) * (y - s.cy)) / ((s.ry + 0.5) ** 2) <= 1);
  blob.roughen(rng(91 + i), 0.35, 0.1);
  const preds: Pred[] = [
    ...s.drops.map(([a, d, rad, fall]) => disc(cx + Math.cos(a) * d * 1.3, s.cy + Math.sin(a) * d * 0.8 + fall, rad)),
    ...s.drips.map(([x, len]) => capsule(x + 0.5, s.cy + s.ry - 0.5, x + 0.5, s.cy + s.ry + len - 0.5, 0.7, 0.9)),
  ];
  // stretched strings between the puddle and the flying droplets while they are still close
  if (i >= 1 && i <= 2) preds.push(string(cx - 4, s.cy, cx - 9, s.cy - 4), string(cx + 4, s.cy, cx + 8, s.cy - 5));
  const m = maskOf(24, 16, preds);
  for (let k = 0; k < m.a.length; k++) if (blob.a[k]) m.a[k] = 1;
  const r = new Raster(24, 16);
  shadeMask(r, m, TONES);
  if (i === 0) r.ellipse(cx - 1, s.cy - 1, 1, 1, '#ffffff');
  r.outline(MELT.line);
  if (s.keep < 1) r.dither(s.keep); // full-colour pixels drop out (alpha would turn green on the sky)
  return r;
}

export function cheeseSplatFrames(): Raster[] {
  return STAGES.map(splatFrame);
}

/* ------------------------------------------------------ cheese engulf */

const CX = 16;
const GROUND = 31.5;

/** Blob rising from the ground: half-width, height, top waviness, superellipse exponent (higher = boxier). */
interface Dome {
  rx: number;
  ry: number;
  wave: number;
  p: number;
}

interface EngulfStage {
  dome?: Dome;
  /** cheese cap draped over the enemy's head: centre y, half-width, height */
  cap?: readonly [number, number, number];
  /** drips hanging under the cap: x, length */
  drips: readonly (readonly [number, number])[];
  extra: readonly Pred[];
  keep: number;
}

/** Puddle spreading on the ground around the enemy's feet. */
const foot = (rx: number, ry: number): Pred => (x, y) => y <= GROUND && ((x - CX) / rx) ** 2 + ((GROUND - y) / ry) ** 2 <= 1;

/** Drips running down both flanks of the blob: [left start y, left end y], [right start y, right end y]. */
function flankDrips(rx: number, [[l0, l1], [r0, r1]]: readonly (readonly [number, number])[]): Pred[] {
  return [capsule(CX - rx + 0.6, l0, CX - rx + 0.3, l1, 0.9, 1.3), capsule(CX + rx - 0.6, r0, CX + rx - 0.3, r1, 0.9, 1.3)];
}

const ENGULF: readonly EngulfStage[] = [
  { drips: [], extra: [drop(11, 4.5, 1.3), drop(20.5, 2.5, 1.5), drop(16, 10, 1.2), foot(4, 1.6)], keep: 1 },
  { cap: [12.5, 8.5, 4.5], drips: [[9.5, 5], [13, 3], [18.5, 6], [22.5, 3]], extra: [foot(9, 2.6)], keep: 1 },
  { dome: { rx: 13.8, ry: 18.5, wave: 1.4, p: 2.4 }, cap: [10.5, 9.5, 5], drips: [[8, 7], [11.5, 5], [16, 4], [20, 6], [24, 7]], extra: [], keep: 1 },
  { dome: { rx: 14.4, ry: 26, wave: 1, p: 4 }, drips: [], extra: [disc(15, 9.5, 7), foot(14.8, 4), ...flankDrips(14.4, [[13, 20], [11, 25]])], keep: 1 },
  { dome: { rx: 14.2, ry: 26.8, wave: 0.8, p: 4 }, drips: [], extra: [disc(16.5, 8.5, 7.2), foot(14.8, 4.5), ...flankDrips(14.2, [[15, 23], [12, 27]])], keep: 1 },
  { dome: { rx: 14.6, ry: 18, wave: 1.5, p: 2.6 }, drips: [], extra: [disc(15, 16, 5), foot(14.8, 5), drop(10.5, 9, 1), ...flankDrips(14, [[20, 26], [19, 28]])], keep: 1 },
  { dome: { rx: 14.8, ry: 9, wave: 1.2, p: 2.2 }, drips: [], extra: [disc(16, 21.5, 2)], keep: 1 },
  { dome: { rx: 12, ry: 3.2, wave: 0.6, p: 2.2 }, drips: [], extra: [], keep: 0.55 },
];

function domePred(d: Dome, phase: number): Pred {
  return (x, y) => {
    if (y > GROUND) return false;
    const nx = (x - CX) / d.rx;
    const top = d.ry + d.wave * Math.sin(x * 0.85 + phase) * (1 - nx * nx);
    return Math.abs(nx) ** d.p + Math.abs((GROUND - y) / top) ** d.p <= 1;
  };
}

/** Glossy arc: lit band 2 px inside the upper-left edge of the dome, plus soft folds near the ground. */
function gloss(r: Raster, m: Mask, d: Dome, seed: number): void {
  const rand = rng(seed);
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      if (!m.has(x, y) || m.edge(x, y)) continue;
      const nx = (x + 0.5 - CX) / d.rx;
      const ny = (GROUND - y - 0.5) / d.ry;
      const e = nx * nx + ny * ny;
      if (nx < -0.15 && ny > 0.35 && e > 0.5 && e < 0.68) r.set(x, y, MELT.hi);
      else if (e < 0.55 && ny < 0.25 && rand() < 0.08) r.set(x, y, MELT.dark);
    }
  }
}

function engulfFrame(s: EngulfStage, i: number): Raster {
  const preds: Pred[] = [...s.extra];
  if (s.dome) preds.push(domePred(s.dome, i * 1.7));
  if (s.cap) {
    const [cy, rx, ry] = s.cap;
    preds.push((x, y) => y <= cy + 0.5 && ((x - CX) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1);
    for (const [x, len] of s.drips) preds.push(capsule(x, cy, x, cy + len, 0.8, 1.2));
  }
  const m = maskOf(32, 32, preds);
  const r = new Raster(32, 32);
  shadeMask(r, m, TONES);
  if (s.dome && s.dome.ry > 8) gloss(r, m, s.dome, 300 + i);
  const spec: [number, number][] = [];
  if (s.cap) spec.push([CX - 4, Math.round(s.cap[0] - s.cap[2] + 2)], [CX - 3, Math.round(s.cap[0] - s.cap[2] + 1)]);
  if (i >= 3 && i <= 5) spec.push([CX - 7, 9], [CX - 6, 8], [CX + 6, 16]);
  for (const [x, y] of spec) if (m.has(x, y) && !m.edge(x, y)) r.set(x, y, '#ffffff');
  r.outline(MELT.line);
  if (s.keep < 1) r.dither(s.keep);
  return r;
}

export function cheeseEngulfFrames(): Raster[] {
  return ENGULF.map(engulfFrame);
}
