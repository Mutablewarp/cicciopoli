/** Level-2 enemies: bat (24x16), demon imp (24x24), fire spirit (16x24). Default facing LEFT. */
import { PAL, buildFrames, fillEllipse, outline, paintGrid, px, type Ctx } from '../pixel';
import { drawFlame } from './flame';

const INK = '#1a0608';

/* ------------------------------------------------------------------- BAT */

interface BatPal { b: string; B: string; d: string; wing: string; wingHi: string; wingDk: string; y: string; e: string; ink: string }

const BAT: BatPal = {
  b: '#5a1a2a', B: '#7a2a3a', d: '#3a0e1a',
  wing: '#6a2034', wingHi: '#9a3a4a', wingDk: '#40101e',
  y: '#fcb020', e: '#fff27a', ink: INK,
};
const BAT_HIT: BatPal = {
  b: '#fce4e0', B: '#ffffff', d: '#e8b8b8',
  wing: '#f8d0d0', wingHi: '#ffffff', wingDk: '#e0a0a8',
  y: '#d82810', e: '#8c1408', ink: '#8c1408',
};

const BAT_BODY = [
  'b....b',
  'bb..bb',
  'BBBBbb',
  'BBBbbd',
  'Beddeb',
  'Byddyd',
  'bbbbbd',
  'dbbbbd',
  '.dbbd.',
  '..dd..',
];

/** Left wing from the shoulder (9,7) to tip (tx,ty); membrane hangs below the arm bone. */
function batWing(ctx: Ctx, tx: number, ty: number, depth: number, p: BatPal): void {
  const sx = 9;
  const sy = 7;
  const bottom: number[] = [];
  for (let x = tx; x <= sx; x++) {
    const s = (sx - x) / (sx - tx);
    const spine = Math.round(sy + (ty - sy) * s - Math.sin(Math.PI * s) * 1.5);
    // three scallops between the finger tips (deepest at s = 0, 1/3, 2/3)
    const scallop = 1 - 0.7 * Math.pow(Math.abs(Math.sin(3 * Math.PI * s)), 0.6);
    const dep = Math.max(1, Math.round(depth * Math.pow(1 - s * 0.85, 0.6) * scallop + 1));
    bottom[x] = spine + dep - 1;
    for (let k = 0; k < dep; k++) {
      const col = k === 0 ? p.wingHi : k >= dep - 1 ? p.wingDk : p.wing;
      px(ctx, x, spine + k, col);
      px(ctx, 23 - x, spine + k, col);
    }
  }
  // finger bones from the wrist to the scallop points
  for (const s of [1 / 3, 2 / 3]) {
    const fx = Math.round(sx - s * (sx - tx));
    const wy = Math.round(sy + (ty - sy) * s * 0.5);
    for (let x = fx; x < sx; x++) {
      const k = (x - fx) / Math.max(1, sx - fx);
      const y = Math.round(bottom[fx] + (wy - bottom[fx]) * k);
      if (y > Math.round(sy + (ty - sy) * ((sx - x) / (sx - tx)))) {
        px(ctx, x, y, p.wingHi);
        px(ctx, 23 - x, y, p.wingHi);
      }
    }
  }
}

function batFrame(ctx: Ctx, tip: readonly [number, number, number], p: BatPal): void {
  batWing(ctx, tip[0], tip[1], tip[2], p);
  paintGrid(ctx, BAT_BODY, { b: p.b, B: p.B, d: p.d, y: p.y, e: p.e }, 9, 3);
  outline(ctx.canvas, p.ink);
}

export function buildBat(): HTMLCanvasElement {
  const tips: readonly (readonly [number, number, number])[] = [[1, 0, 7], [0, 5, 7], [2, 11, 4], [0, 6, 6]];
  return buildFrames(5, 24, 16, (ctx, i) => batFrame(ctx, tips[i === 4 ? 1 : i], i === 4 ? BAT_HIT : BAT));
}

/* ----------------------------------------------------------------- DEMON */

const DEMON_PAL: Readonly<Record<string, string>> = {
  r: '#d8281c', R: '#fc5a34', s: '#a01810', B: '#f08458',
  h: '#f4e4c8', H: '#c8a882', y: '#fce040', k: INK, t: '#fcfcf4', m: '#5a0808', f: '#3a1010',
};

const DEMON_HEAD = [
  '.h..........h.',
  '.hh........Hh.',
  '..hH......Hh..',
  '..hRRRRRRRRs..',
  '.RRRRRrrrrrrs.',
  '.RRkRrrrrkrrs.',
  'RRrrkkrkkrrrss',
  'Rrrkyyrkyyrrss',
  'Rrrkyyrkyyrrss',
  'Rrrrrrrrrrrrss',
  'rrktttttttkrss',
  'srrrktmmtkrrss',
  '.ssrrkkkkrrss.',
  '..sssssssss...',
];

const DEMON_BODY = [
  'srrrrrss',
  'RRrrrrss',
  'RrBBBrss',
  'RrBBBrss',
  'srrrrsss',
  '.ssssss.',
];

function demonTail(ctx: Ctx, sway: number, bob: number): void {
  const pts: readonly [number, number][] = [[13, 19], [14, 19], [15, 18], [16, 17], [17, 16], [18, 15], [18, 14], [19, 13]];
  for (const [x, y] of pts) px(ctx, x + (y < 16 ? sway : 0), y + bob, DEMON_PAL.s);
  paintGrid(ctx, ['..s..', '.srs.', 'srrrs'], DEMON_PAL, 17 + sway, 10 + bob);
}

/** [x, lifted] for the far leg (shaded) and near leg (red) on each walk frame. */
const DEMON_STEPS: readonly (readonly [number, number, number, number])[] = [
  [11, 0, 5, 0],
  [8, 1, 7, 0],
  [5, 0, 11, 0],
  [7, 0, 8, 1],
];

function demonLegs(ctx: Ctx, i: number): void {
  const [farX, farLift, nearX, nearLift] = DEMON_STEPS[i];
  const leg = (x: number, lift: number, c: string): void => {
    paintGrid(ctx, lift ? ['.aa', '.aa', '.ff'] : ['.aa', '.aa', 'fff'], { a: c, f: DEMON_PAL.f }, x - 1, 21 - lift);
  };
  leg(farX, farLift, DEMON_PAL.s);
  leg(nearX, nearLift, DEMON_PAL.r);
}

function demonFrame(ctx: Ctx, i: number): void {
  const bob = i % 2 === 1 ? -1 : 0;
  demonTail(ctx, [0, 1, 0, -1][i], bob);
  paintGrid(ctx, DEMON_BODY, DEMON_PAL, 5, 15 + bob);
  demonLegs(ctx, i);
  paintGrid(ctx, DEMON_HEAD, DEMON_PAL, 2, 1 + bob);
  // little clawed arms: front arm swings opposite to the front leg
  const swing = i === 0 ? 1 : i === 2 ? -1 : 0;
  px(ctx, 4, 17 + bob + swing, DEMON_PAL.R);
  px(ctx, 3, 18 + bob + swing, DEMON_PAL.h);
  px(ctx, 13, 17 + bob - swing, DEMON_PAL.s);
  outline(ctx.canvas, INK);
}

function demonSquashed(ctx: Ctx): void {
  fillEllipse(ctx, 12, 20, 9, 3, DEMON_PAL.r);
  fillEllipse(ctx, 11, 19, 6, 1, DEMON_PAL.R);
  for (let x = 4; x <= 20; x++) px(ctx, x, 23, DEMON_PAL.s);
  paintGrid(ctx, ['hh...........hh', '.hH.........Hh.'], DEMON_PAL, 4, 15);
  paintGrid(ctx, ['kyk...kyk', 'yky...yky', 'kyk...kyk'], DEMON_PAL, 7, 18);
  paintGrid(ctx, ['kktkk'], DEMON_PAL, 9, 21);
  outline(ctx.canvas, INK);
}

export function buildDemon(): HTMLCanvasElement {
  return buildFrames(5, 24, 24, (ctx, i) => (i < 4 ? demonFrame(ctx, i) : demonSquashed(ctx)));
}

/* ---------------------------------------------------------------- SPIRIT */

function spiritFrame(ctx: Ctx, i: number): void {
  const ph = (i / 4) * Math.PI * 2;
  for (let j = 0; j < 5; j++) {
    const x = Math.round(7.5 + Math.sin(j * 1.1 - ph) * (1 + j * 0.4));
    const col = j < 2 ? PAL.lavaOrange : j < 4 ? PAL.lavaRed : '#9c1c0c';
    px(ctx, x, 18 + j, col);
    if (j < 3) px(ctx, x + 1, 18 + j, col);
  }
  drawFlame(ctx, { cx: 7.5, base: 18, w: 13, h: 17, frame: i, seed: 3, sway: 1.6 });
  outline(ctx.canvas, '#3a0806');
  // eyes stay put while the flame wobbles, so the face reads
  paintGrid(ctx, ['kw..kw', 'kk..kk', 'kk..kk'], { k: '#2a0806', w: PAL.lavaHot }, 5, 11);
  paintGrid(ctx, ['k..k', '.kk.'], { k: '#2a0806' }, 6, 15);
}

export function buildSpirit(): HTMLCanvasElement {
  return buildFrames(4, 16, 24, spiritFrame);
}
