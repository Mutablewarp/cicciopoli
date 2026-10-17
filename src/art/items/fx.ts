/**
 * Generic FX sheets: sparkle, dust puff, defeat poof, hit star, crate splinters.
 */
import { PAL } from '../pixel';
import { Raster } from './raster';
import { Mask, disc, poly, shadeMask, type Tones } from './shapes';

type Pred = (x: number, y: number) => boolean;
type Pt = readonly [number, number];
const TAU = Math.PI * 2;

/* ------------------------------------------------------------ sparkle */

const SPARKLE = [
  ['........', '........', '...g....', '..gWg...', '...g....', '........', '........', '........'],
  ['...g....', '...c....', '...W....', 'gcWWWcg.', '...W....', '...c....', '...g....', '........'],
  ['........', '.d...d..', '...c....', '..cWc...', '...c....', '.d...d..', '........', '........'],
  ['........', '........', '...d....', '..dcd...', '...d....', '........', '........', '........'],
];

export function sparkleFrames(): Raster[] {
  const pal = { W: '#ffffff', c: '#fff4c0', g: '#fcd040', d: '#fcb830' };
  return SPARKLE.map((rows, i) => {
    const r = new Raster(8, 8);
    r.grid(rows, pal);
    if (i === 3) r.fade(0.7); // last twinkle fades out
    return r;
  });
}

/* --------------------------------------------------------------- dust */

const DUST: Tones & { line: string } = { rim: '#fffcf4', light: '#fbf0dc', base: '#eedcbc', dark: '#d2b88e', deep: '#bc9f78', line: '#8a7458' };
/** Puffs (x, y, r) rising and spreading; alpha fades over the last frames. */
const DUST_STAGES: readonly { puffs: readonly (readonly [number, number, number])[]; alpha: number }[] = [
  { puffs: [[4, 5.2, 1.6]], alpha: 1 },
  { puffs: [[3.4, 4.8, 2], [5.6, 5.4, 1.4]], alpha: 1 },
  { puffs: [[3, 4.4, 2.3], [5.6, 4.8, 1.9], [4.2, 2.6, 1.2]], alpha: 0.85 },
  { puffs: [[2.8, 3.8, 2.2], [5.8, 4.2, 1.8], [4.3, 2, 1.2]], alpha: 0.55 },
  { puffs: [[2.6, 3.2, 1.8], [6, 3.6, 1.4], [4.4, 1.6, 1]], alpha: 0.28 },
];

export function dustFrames(): Raster[] {
  return DUST_STAGES.map(({ puffs, alpha }) => {
    const r = new Raster(8, 8);
    const preds = puffs.map(([x, y, rad]) => disc(x, y, rad));
    shadeMask(r, Mask.of(8, 8, (x, y) => preds.some((p) => p(x, y))), DUST);
    r.outline(DUST.line, false, 0.55);
    r.fade(alpha);
    return r;
  });
}

/* --------------------------------------------------------------- poof */

const SMOKE: Tones & { line: string } = { rim: '#ffffff', light: '#f8f5fa', base: '#e4dde8', dark: '#bab0c4', deep: '#998ca6', line: '#4a3c54' };
/** Puff ring per frame: puff count, distance from the centre, puff radius, centre puff radius, opacity. */
const POOF_STAGES: readonly { n: number; dist: number; rad: number; centre: number; keep: number }[] = [
  { n: 4, dist: 0.8, rad: 2.6, centre: 2.8, keep: 1 },
  { n: 5, dist: 2.6, rad: 3, centre: 3, keep: 1 },
  { n: 6, dist: 3.8, rad: 3.2, centre: 3.2, keep: 1 },
  { n: 6, dist: 4.6, rad: 2.8, centre: 2.2, keep: 1 },
  { n: 5, dist: 5.2, rad: 2.2, centre: 0, keep: 0.8 },
  { n: 5, dist: 5.8, rad: 1.4, centre: 0, keep: 0.5 },
];

export function poofFrames(): Raster[] {
  const c = 7.5;
  return POOF_STAGES.map((s, i) => {
    const preds: Pred[] = [];
    for (let k = 0; k < s.n; k++) {
      const a = (k / s.n) * TAU + i * 0.35 - Math.PI / 2;
      preds.push(disc(c + Math.cos(a) * s.dist, c + Math.sin(a) * s.dist * 0.92, s.rad));
    }
    if (s.centre > 0) preds.push(disc(c, c, s.centre));
    const r = new Raster(16, 16);
    shadeMask(r, Mask.of(16, 16, (x, y) => preds.some((p) => p(x, y))), SMOKE);
    r.outline(SMOKE.line);
    if (s.keep < 1) r.fade(s.keep); // white smoke can fade with alpha on any background
    return r;
  });
}

/* ----------------------------------------------------------- hit star */

const HIT = { core: '#ffffff', yellow: PAL.cheeseLight, gold: PAL.lavaYellow, orange: PAL.qOrange, line: '#a81c00' };

/** Polar star: 8 tapered rays (long on the axes, short on the diagonals) around a core. */
function burst(c: number, core: number, long: number, short: number, width: number) {
  return (x: number, y: number): boolean => {
    const dx = x - c;
    const dy = y - c;
    const d = Math.hypot(dx, dy);
    if (d <= core) return true;
    const a = Math.atan2(dy, dx) + TAU;
    const k = Math.round(a / (TAU / 8));
    const off = Math.abs(a - k * (TAU / 8));
    const len = k % 2 === 0 ? long : short;
    return d <= len && off <= width * (1 - d / (len + 0.8));
  };
}

function hitFrame(i: number): Raster {
  const c = 8;
  const r = new Raster(16, 16);
  if (i === 3) {
    // fragments flying out along the rays
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU;
      const d = k % 2 ? 5.4 : 6.6;
      r.set(Math.floor(c + Math.cos(a) * d), Math.floor(c + Math.sin(a) * d), k % 2 ? HIT.orange : HIT.gold);
      r.set(Math.floor(c + Math.cos(a) * (d - 1)), Math.floor(c + Math.sin(a) * (d - 1)), HIT.yellow, 0.8);
    }
    return r;
  }
  const shapes = [burst(c, 1.6, 4.6, 3, 0.5), burst(c, 2.6, 7.6, 5, 0.42), burst(c, 0, 7.8, 5.6, 0.34)];
  const hollow = i === 2 ? disc(c, c, 3.6) : null;
  const m = Mask.of(16, 16, (x, y) => shapes[i](x, y) && !(hollow && hollow(x, y)));
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (!m.has(x, y)) continue;
      const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
      r.set(x, y, d < 2 ? HIT.core : d < 3.5 ? HIT.yellow : d < 5 ? HIT.gold : HIT.orange);
    }
  }
  r.outline(HIT.line);
  return r;
}

export function hitStarFrames(): Raster[] {
  return [0, 1, 2, 3].map(hitFrame);
}

/* -------------------------------------------------------- crate bits */

const WOOD: Tones & { line: string; grain: string; nail: string; nailDark: string } = {
  rim: '#f2c483',
  light: '#dca060',
  base: '#b87838',
  dark: '#8a5424',
  deep: '#6a3c18',
  line: '#2e1a0c',
  grain: '#946030',
  nail: '#c8ccd4',
  nailDark: '#6a6e78',
};

const SPLINTERS: readonly { shape: readonly Pt[]; grain: readonly Pt[]; nail?: Pt }[] = [
  { shape: [[0.5, 5], [4.6, 0.6], [7.4, 2.4], [6.2, 3.4], [6.8, 4], [3, 7.4]], grain: [[2, 5], [3, 4], [4, 3]] },
  { shape: [[1.2, 2.2], [5.8, 1], [6.8, 5.4], [2.4, 6.6]], grain: [[3, 5], [5, 4]], nail: [4, 3] },
  { shape: [[0.4, 6.8], [5.4, 1.2], [5, 0.4], [7.6, 0.6], [7.2, 2], [1.6, 7.6]], grain: [[3, 5], [5, 3]] },
  { shape: [[1, 1.2], [7, 2.6], [5.6, 4], [6.2, 5], [2.4, 7]], grain: [[3, 4], [4, 3]] },
];

export function crateBitsFrames(): Raster[] {
  return SPLINTERS.map(({ shape, grain, nail }) => {
    const r = new Raster(8, 8);
    shadeMask(r, Mask.of(8, 8, poly(shape)), WOOD);
    for (const [x, y] of grain) if (r.alpha(x, y) > 0) r.set(x, y, WOOD.grain);
    if (nail) {
      r.set(nail[0], nail[1], WOOD.nail);
      r.set(nail[0] + 1, nail[1] + 1, WOOD.nailDark);
    }
    r.outline(WOOD.line);
    return r;
  });
}
