/** Inferno props: torch, spire, chain, burning golf flag, glowing hole, brazier checkpoint. */
import { PAL, buildFrames, ctxOf, fillEllipse, makeCanvas, outline, paintGrid, px, rect, rng, type Ctx } from '../pixel';
import { drawFlame } from './flame';

const INK = '#16080c';
const IRON = { hi: '#7a6e78', light: '#5a5058', mid: '#3e363e', dark: '#241e24' };

/* ----------------------------------------------------------------- TORCH */

export function buildTorch(): HTMLCanvasElement {
  return buildFrames(4, 8, 16, (ctx, i) => {
    paintGrid(ctx, [
      'kkkkkkkk',
      'khlllmdk',
      '.kmmmdk.',
      '..kmdk..',
      '..kwek..',
      '..kmdk..',
      '..kwek..',
      '..kwek..',
      '...kk...',
    ], { k: INK, h: IRON.hi, l: IRON.light, m: IRON.mid, d: IRON.dark, w: '#6a3a24', e: '#3a2014' }, 0, 7);
    drawFlame(ctx, { cx: 3.5, base: 6, w: 6, h: 7, frame: i, seed: 2 });
    px(ctx, 3, 7, PAL.lavaYellow);
    px(ctx, 4, 7, PAL.lavaOrange);
  });
}

/* ----------------------------------------------------------------- SPIRE */

export function buildSpire(): HTMLCanvasElement {
  const c = makeCanvas(16, 48);
  const ctx = ctxOf(c);
  const r = rng(404);
  const edgeL: number[] = [];
  const edgeR: number[] = [];
  for (let y = 1; y < 48; y++) {
    const t = y / 47;
    const hw = 0.6 + 6.6 * Math.pow(t, 0.8);
    const jag = y % 5 === 0 ? 1 : 0;
    const l = Math.round(7.5 - hw + (r() < 0.35 ? 1 : 0) - (y > 30 ? jag : 0));
    const rr = Math.round(7.5 + hw - (r() < 0.35 ? 1 : 0) + jag);
    edgeL.push(l);
    edgeR.push(rr);
    for (let x = l; x <= rr; x++) {
      const u = (x - l) / Math.max(1, rr - l);
      const col = u < 0.2 ? PAL.stoneLight : u < 0.62 ? PAL.stone : PAL.stoneDark;
      px(ctx, x, y, col);
    }
  }
  // glowing veins: two zig-zag cracks running up from the base
  const vein = (x0: number, y0: number, y1: number, dir: number): void => {
    let x = x0;
    for (let y = y0; y > y1; y--) {
      if (y % 4 === 0) x += dir;
      if (y % 7 === 0) dir = -dir;
      const lo = edgeL[y - 1] + 1;
      const hi = edgeR[y - 1] - 1;
      const xx = Math.max(lo, Math.min(hi, x));
      px(ctx, xx + 1, y, PAL.lavaDeep);
      px(ctx, xx, y, y > y0 - 6 ? PAL.lavaYellow : PAL.lavaOrange);
    }
  };
  vein(6, 46, 14, 1);
  vein(10, 46, 30, -1);
  px(ctx, 7, 24, PAL.lavaHot);
  outline(c, INK);
  return c;
}

/* ----------------------------------------------------------------- CHAIN */

const CHAIN_LINK = [
  '...ld...',
  '...ld...',
  '..klmk..',
  '.kllmdk.',
  '.lkldkd.',
  '.l.kk.d.',
  '.l....d.',
  '.l....d.',
  '.l.kk.d.',
  '.lkldkd.',
  '.kmmddk.',
  '..kmdk..',
  '...ld...',
  '...ld...',
  '...ld...',
  '...ld...',
];

export function buildChain(): HTMLCanvasElement {
  const c = makeCanvas(8, 32);
  const ctx = ctxOf(c);
  const pal = { k: '#120c10', l: IRON.hi, m: IRON.light, d: IRON.dark };
  paintGrid(ctx, CHAIN_LINK, pal, 0, 0);
  paintGrid(ctx, CHAIN_LINK, pal, 0, 16);
  return c;
}

/* ------------------------------------------------------------------ FLAG */

function flagFrame(ctx: Ctx, i: number): void {
  // dark iron pole, base centred on x = 8, finial glowing at the top
  rect(ctx, 7, 4, 3, 60, IRON.mid);
  rect(ctx, 7, 4, 1, 60, IRON.hi);
  rect(ctx, 9, 4, 1, 60, IRON.dark);
  for (let y = 12; y < 62; y += 10) rect(ctx, 7, y, 3, 1, IRON.dark);
  fillEllipse(ctx, 8, 2, 2, 2, PAL.lavaOrange);
  px(ctx, 7, 1, PAL.lavaHot);
  px(ctx, 8, 1, PAL.lavaYellow);
  px(ctx, 9, 3, PAL.lavaRed);

  const ph = (i / 4) * Math.PI * 2;
  const L = 19;
  const tops: number[] = [];
  for (let k = 0; k <= L; k++) {
    const t = k / L;
    const wave = Math.round(1.6 * Math.sin(k * 0.42 - ph) * t);
    const y0 = 6 + Math.round(t * 7) + wave;
    const y1 = 22 - Math.round(t * 8) + wave;
    tops.push(y0);
    const x = 10 + k;
    for (let y = y0; y <= y1; y++) {
      const shadeBand = Math.sin(k * 0.42 - ph) < -0.3;
      let col = y === y0 ? '#fc5a3a' : y >= y1 - 1 ? PAL.flagRedDark : shadeBand ? '#d40010' : PAL.flagRed;
      if (k >= L - 2 && (y + k + i) % 3 === 0) col = '#3a0a08'; // charred trailing edge
      px(ctx, x, y, col);
    }
  }
  outline(ctx.canvas, '#4a0008', { x: 10, y: 0, w: 22, h: 30 });
  // flames licking off the upper edge and the burning tip
  for (let k = 5; k <= L; k += 4) {
    const h = 3 + ((k * 7 + i * 3) % 5);
    drawFlame(ctx, { cx: 10 + k, base: tops[k] - 1, w: 3 + (k > 12 ? 1 : 0), h, frame: i + k, seed: k, sway: 1 });
  }
  drawFlame(ctx, { cx: 10 + L, base: tops[L] + 4, w: 5, h: 9, frame: i, seed: 9, sway: 2 });
  const sparks = rng(31 + i * 7);
  for (let s = 0; s < 3; s++) px(ctx, 14 + Math.floor(sparks() * 16), Math.floor(sparks() * 6), sparks() < 0.5 ? PAL.lavaYellow : PAL.lavaOrange);
}

export function buildInfernoFlag(): HTMLCanvasElement {
  return buildFrames(4, 32, 64, flagFrame);
}

/* ------------------------------------------------------------------ HOLE */

export function buildInfernoHole(): HTMLCanvasElement {
  const c = makeCanvas(32, 10);
  const ctx = ctxOf(c);
  fillEllipse(ctx, 16, 5, 14, 3, '#2a1e36');
  rect(ctx, 2, 5, 28, 5, '#1e1428');
  for (let x = 5; x < 27; x++) px(ctx, x, 2, '#54446a');
  px(ctx, 6, 3, '#a490c4');
  px(ctx, 7, 3, '#6a5882');
  // opening: dark throat at the back, molten glow rising from below at the front
  fillEllipse(ctx, 16, 5, 11, 2, '#3a0a06');
  for (let x = 6; x < 27; x++) px(ctx, x, 6, PAL.lavaDeep);
  for (let x = 7; x < 26; x++) px(ctx, x, 5, PAL.lavaRed);
  for (let x = 9; x < 24; x++) px(ctx, x, 6, PAL.lavaOrange);
  for (let x = 11; x < 22; x++) px(ctx, x, 5, PAL.lavaOrange);
  for (let x = 12; x < 21; x++) px(ctx, x, 6, PAL.lavaYellow);
  for (let x = 14; x < 19; x++) px(ctx, x, 5, PAL.lavaYellow);
  px(ctx, 15, 6, PAL.lavaHot);
  px(ctx, 16, 6, PAL.lavaHot);
  px(ctx, 17, 6, PAL.lavaHot);
  for (let x = 4; x < 28; x++) px(ctx, x, 8, '#120c18');
  rect(ctx, 1, 9, 30, 1, '#0e0a14');
  outline(c, INK);
  return c;
}

/* --------------------------------------------------------------- BRAZIER */

const BRAZIER = [
  'k............k',
  'hk..........kh',
  'khhhhhhhhhhhhk',
  'klmmmmmmmmmmdk',
  '.kmlmmmmmmldk.',
  '.kmmmmmmmmmdk.',
  '..kmmmmmmmdk..',
  '...kkmmmdkk...',
  '.....kmdk.....',
  '.....kldk.....',
  '.....kldk.....',
  '.....kmdk.....',
  '.....kldk.....',
  '.....kldk.....',
  '....kmmmdk....',
  '...klmmmmdk...',
  '..kkkkkkkkkk..',
];

function brazierFrame(ctx: Ctx, i: number): void {
  const lit = i > 0;
  // lit: the rim and bowl pick up the fire's light
  const pal = lit ? { k: INK, h: '#e8a060', l: '#a0604a', m: '#4a3438', d: IRON.dark } : { k: INK, h: IRON.hi, l: IRON.light, m: IRON.mid, d: IRON.dark };
  paintGrid(ctx, BRAZIER, pal, 1, 15);
  const coal = lit ? [PAL.lavaYellow, PAL.lavaOrange, PAL.lavaRed] : ['#5a5258', '#3a3238', '#2a2226'];
  const bumps = [3, 2, 3, 2, 2, 3, 2, 3, 3, 2];
  for (let x = 0; x < bumps.length; x++) {
    for (let j = 0; j < bumps[x]; j++) px(ctx, 3 + x, 16 - j, coal[Math.min(2, j === bumps[x] - 1 ? 0 : (x + j) % 3)]);
  }
  if (!lit) {
    px(ctx, 7, 12, '#4a4248');
    px(ctx, 8, 10, '#3a3238');
    return;
  }
  drawFlame(ctx, { cx: 7.5, base: 14, w: 12, h: 14, frame: i - 1, seed: 4, sway: 2.2 });
  drawFlame(ctx, { cx: 4.5, base: 14, w: 5, h: 7, frame: i + 1, seed: 7, sway: 1 });
  drawFlame(ctx, { cx: 10.5, base: 14, w: 5, h: 8, frame: i + 2, seed: 11, sway: 1 });
}

export function buildBrazier(): HTMLCanvasElement {
  return buildFrames(4, 16, 32, brazierFrame);
}
