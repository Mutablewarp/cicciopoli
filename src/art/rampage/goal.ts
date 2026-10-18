/** Level goal of the rampage world: steel flag pole (intact / ripped), the torn flag cloth, hole, checkpoint. */
import { Mask, paintMask, type Tone } from '../hills/mask';
import { Raster, gridR, hash2, outlineRaster } from '../hills/raster';
import { RC } from './colors';
import { lineR, rectR } from './draw';

interface Cloth { light: string; base: string; shade: string }

const FLAG: Cloth = { light: RC.flagLight, base: RC.flagRed, shade: RC.flagDark };
const PENNANT: Cloth = { light: RC.limeLight, base: RC.lime, shade: RC.limeShade };

/**
 * Waving triangular cloth attached at x0 between y0 and y1 on the pole, pointing right to
 * length `len`. Rising cloth catches the light, falling cloth is shaded.
 */
function cloth(r: Raster, x0: number, y0: number, y1: number, len: number, amp: number, phase: number, c: Cloth): void {
  const half = (y1 - y0) / 2;
  const wave = (u: number): number => amp * Math.sin(u * 0.34 - phase) * Math.min(1, u / 6);
  for (let u = 0; u < len; u++) {
    const shrink = half * (u / len);
    const w = Math.round(wave(u));
    const top = Math.round(y0 + shrink + w);
    const bot = Math.round(y1 - shrink + w);
    const slope = wave(u + 1) - wave(u);
    const col = slope < -0.4 ? c.light : slope > 0.4 ? c.shade : c.base;
    for (let y = top; y <= bot; y++) r.set(x0 + u, y, col);
  }
}

/** Steel pole column (4 px wide with ink sides) from y0 down to the bottom row, `bend(y)` shifts it sideways. */
function pole(r: Raster, y0: number, bend: (y: number) => number): void {
  for (let y = y0; y < 64; y++) {
    const dx = bend(y);
    r.set(7 + dx, y, RC.ink);
    r.set(8 + dx, y, y % 24 === 20 ? RC.steelShade : RC.steelHi);
    r.set(9 + dx, y, y % 24 === 20 ? RC.steelDark : RC.steel);
    r.set(10 + dx, y, RC.ink);
  }
}

/** Concrete footing the pole is bolted into. */
function footing(r: Raster): void {
  gridR(r, [
    '..kkkkkkkkkk..',
    '.kHHHHHHHHSSk.',
    'kHcccccccccSSk',
    'kccccccccccSSk',
    'kssssssssssssk',
  ], { k: RC.ink, H: RC.concHi, c: RC.conc, S: RC.concShade, s: RC.concShade }, 1, 59);
  for (const x of [4, 11]) r.set(x, 61, RC.steelHi);
}

const BALL = [
  '..kkkk..',
  '.kWWsBk.',
  'kWWsssBk',
  'kWssssBk',
  '.kssBBk.',
  '..kkkk..',
];

/** 32x64, pole base at (8,63): 4 waving frames of the red flag. */
export function buildFlag(): Raster[] {
  const frames: Raster[] = [];
  for (let f = 0; f < 4; f++) {
    const r = new Raster(32, 64);
    const flag = new Raster(32, 64);
    cloth(flag, 11, 7, 26, 19, 1.4, (f * Math.PI) / 2, FLAG);
    outlineRaster(flag, RC.ink);
    r.blit(flag, 0, 0);
    pole(r, 6, () => 0);
    gridR(r, BALL, { k: RC.ink, W: RC.steelHi, s: RC.steelLight, B: RC.steelShade }, 5, 0);
    footing(r);
    frames.push(r);
  }
  return frames;
}

/** 32x64 pole after the flag was torn off: bent at the top, a ragged red scrap still caught on it. */
export function buildPoleRipped(): Raster {
  const r = new Raster(32, 64);
  const bend = (y: number): number => (y >= 38 ? 0 : Math.round(7 * Math.pow((38 - y) / 32, 1.6)));
  // torn fabric: ragged strips hanging from the pole top
  const scrap = new Raster(32, 64);
  const x = 11 + bend(12);
  gridR(scrap, [
    'rrrrr',
    'RrrrrR',
    '.RRrrr',
    '.rRRrr',
    '..rRrr',
    '..RRr',
    '...rRr',
    '...rr',
    '....r',
  ], { r: RC.flagRed, R: RC.flagDark }, x, 9);
  lineR(scrap, x, 10, x + 6, 12, RC.flagLight);
  outlineRaster(scrap, RC.ink);
  r.blit(scrap, 0, 0);
  pole(r, 7, bend);
  const tipX = 8 + bend(7);
  r.set(tipX, 6, RC.steelLight);
  r.set(tipX + 1, 5, RC.steelHi);
  r.set(tipX + 2, 6, RC.steelShade);
  r.set(tipX - 1, 6, RC.ink);
  r.set(tipX + 3, 6, RC.ink);
  r.set(tipX, 4, RC.ink);
  r.set(tipX + 1, 4, RC.ink);
  r.set(tipX + 2, 5, RC.ink);
  footing(r);
  return r;
}

/* ------------------------------------------------------------- flag cloth */

const CLOTH_W = 32;
const CLOTH_H = 24;
/** Jagged left (torn) edge: how far the cloth is bitten in at each row. */
const TEAR = [0, 1, 0, 2, 1, 0, 2, 1, 0, 1, 2, 0, 1, 0, 2, 1, 0, 1];

/** Master cloth shape in cloth-centred coordinates; id 2 marks a fold crease. */
function masterCloth(): Mask {
  const m = new Mask(CLOTH_W, CLOTH_W);
  const cx = 16;
  const cy = 16;
  for (let j = 0; j < 18; j++) {
    const y = cy - 9 + j;
    const shrink = (Math.abs(j - 8.5) / 9) * 19;
    const left = cx - 9 + TEAR[j];
    const right = cx + 11 - Math.round(shrink * 0.95);
    m.span(left, right, y, 1);
  }
  for (let t = 0; t < 14; t++) m.set(cx - 6 + t, cy - 4 + Math.round(t * 0.45), 2);
  return m;
}

/** 32x24 x4: the torn flag flipping over and over (front, edge-on, back, edge-on) while it flies. */
export function buildFlagCloth(): Raster[] {
  const master = masterCloth();
  const poses = [
    { sx: 1, rot: -0.3, back: false },
    { sx: 0.5, rot: 0.15, back: false },
    { sx: -1, rot: 0.3, back: true },
    { sx: -0.5, rot: -0.15, back: true },
  ];
  return poses.map((p) => {
    const m = new Mask(CLOTH_W, CLOTH_H);
    const cos = Math.cos(p.rot);
    const sin = Math.sin(p.rot);
    for (let y = 0; y < CLOTH_H; y++) {
      for (let x = 0; x < CLOTH_W; x++) {
        const dx = x - 15.5;
        const dy = y - 11.5;
        const u = (dx * cos + dy * sin) / p.sx;
        const v = -dx * sin + dy * cos;
        const id = master.get(16 + u, 16 + v);
        if (id !== 0) m.set(x, y, id);
      }
    }
    const tone: Cloth = p.back ? { light: RC.flagRed, base: RC.flagDark, shade: '#7c000c' } : FLAG;
    const r = new Raster(CLOTH_W, CLOTH_H);
    paintMask(m, r, { 1: tone, 2: { light: tone.shade, base: tone.shade, shade: tone.shade } }, { shadeDepth: 2, lightDepth: 1 });
    outlineRaster(r, RC.ink);
    return r;
  });
}

/* --------------------------------------------------------------------- hole */

const CONC: Tone = { light: RC.concHi, base: RC.conc, shade: RC.concMid, dark: RC.concShade };

/** 32x10: a crater punched through the asphalt, ringed by broken concrete slabs; sits on the ground. */
export function buildHole(): Raster {
  const m = new Mask(32, 10);
  m.ellipse(16, 11, 15, 8, 1);
  for (const [cx, cy, rx, ry] of [[3, 5, 3, 2], [8, 3, 3, 2], [25, 3, 3, 2], [29, 5, 3, 2], [14, 2, 3, 1], [20, 2, 2, 1]] as const) m.ellipse(cx, cy, rx, ry, 1);
  const r = new Raster(32, 10);
  paintMask(m, r, { 1: CONC }, { shadeDepth: 2, lightDepth: 1 });
  for (let i = 0; i < 40; i++) {
    const x = 1 + Math.floor(hash2(i, 1, 9) * 30);
    const y = 3 + Math.floor(hash2(i, 2, 9) * 7);
    if (r.get(x, y) !== 0 && hash2(i, 3, 9) < 0.5) r.set(x, y, RC.concMid);
  }
  const pit = new Mask(32, 10);
  pit.ellipse(16, 6, 9, 2, 1);
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 32; x++) {
      if (pit.get(x, y) === 0) continue;
      r.set(x, y, pit.get(x, y - 1) === 0 ? RC.asphDeep : '#06030c');
      if (pit.get(x, y + 1) === 0) r.set(x, y + 1, RC.concHi);
    }
  }
  lineR(r, 3, 9, 7, 9, RC.concDark);
  lineR(r, 24, 9, 28, 9, RC.concDark);
  r.set(23, 4, RC.rebar);
  r.set(24, 3, RC.rebar);
  r.set(25, 2, RC.coneLight);
  outlineRaster(r, RC.ink);
  return r;
}

/* --------------------------------------------------------------- checkpoint */

/** 16x32: 0 = inactive (limp grey pennant), 1-3 = lime pennant with a white star waving. */
export function buildCheckpoint(): Raster[] {
  const frames: Raster[] = [];
  for (let f = 0; f < 4; f++) {
    const r = new Raster(16, 32);
    const cl = new Raster(16, 32);
    if (f === 0) {
      const m = new Mask(16, 32);
      m.poly([[7, 4], [11, 5], [11, 9], [10, 14], [9, 19], [7, 19]], 1);
      paintMask(m, cl, { 1: { light: '#c8c4dc', base: '#9a96b4', shade: '#6c6890' } }, { shadeDepth: 1 });
    } else {
      cloth(cl, 7, 4, 13, 8, 1.1, (f * Math.PI * 2) / 3, PENNANT);
      const dy = 8 + Math.round(1.1 * Math.sin(1.3 - (f * Math.PI * 2) / 3));
      gridR(cl, ['.w.', 'www', '.w.'], { w: RC.white }, 8, dy - 1);
    }
    outlineRaster(cl, RC.ink);
    r.blit(cl, 0, 0);
    for (let y = 3; y < 30; y++) {
      r.set(4, y, RC.ink);
      r.set(5, y, RC.steelHi);
      r.set(6, y, RC.ink);
    }
    gridR(r, ['.kk.', 'kwsk', 'ksbk', '.kk.'], { k: RC.ink, w: RC.steelHi, s: RC.steelLight, b: RC.steelShade }, 3, 0);
    gridR(r, ['..kkkkk..', '.kHHHHHk.', 'kccccccSk', 'kSSSSSSSk'], { k: RC.ink, H: RC.concHi, c: RC.conc, S: RC.concShade }, 1, 28);
    rectR(r, 5, 29, 1, 1, RC.steelHi);
    frames.push(r);
  }
  return frames;
}
