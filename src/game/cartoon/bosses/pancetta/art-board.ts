/**
 * Pancetta's skateboard (red deck, cream wheels) and his projectiles: the kickflipping board, skate
 * wheels with a grumpy face, bacon ribbons and the concrete shockwave. PINK = parryable version.
 */
import { LINE } from '../../draw/canvas';
import { ellipse, ink, pieEye, rrect, shine, smooth, TAU } from '../brie/kit/toon';
import { PINK as PARRY } from '../brie/art-props';
import { baconStrip } from './art-pig';

export const BOARD = { w: 116, h: 28, fx: 58, fy: 26, frames: 4 } as const;
export const FLIP = { w: 72, h: 34, frames: 4 } as const;
export const WHEEL = { w: 30, h: 30, r: 12 } as const;
export const BACON = { w: 50, h: 26 } as const;
export const SHOCK = { w: 32, h: 26 } as const;

const DECK = '#d8322f';
const WOOD = '#d9a35f';
const CREAM = '#f3ead2';
const METAL = '#a9a7a2';

function wheelAt(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, turn: number, fill = CREAM): void {
  ellipse(ctx, x, y, r, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ink(ctx, LINE * 0.8);
  ellipse(ctx, x, y, r * 0.38, r * 0.38);
  ctx.fillStyle = METAL;
  ctx.fill();
  ink(ctx, LINE * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + Math.cos(turn) * r * 0.45, y + Math.sin(turn) * r * 0.45);
  ctx.lineTo(x + Math.cos(turn) * r * 0.85, y + Math.sin(turn) * r * 0.85);
  ink(ctx, LINE * 0.6);
}

/** Side view of the board (deck, trucks, wheels), length len, centred on x, deck top at y. */
function sideBoard(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, turn: number, upside: boolean): void {
  const h = len / 2;
  const dy = upside ? -1 : 1;
  for (const wx of [x - h * 0.52, x + h * 0.52]) {
    ctx.beginPath();
    ctx.moveTo(wx - 6, y + 5 * dy);
    ctx.lineTo(wx + 6, y + 5 * dy);
    ctx.lineTo(wx + 2, y + 10 * dy);
    ctx.lineTo(wx - 2, y + 10 * dy);
    ctx.closePath();
    ctx.fillStyle = METAL;
    ctx.fill();
    ink(ctx, LINE * 0.6);
    wheelAt(ctx, wx, y + 11 * dy, 6.5, turn);
  }
  smooth(ctx, [[x - h, y - 4 * dy], [x - h + 7, y], [x + h - 7, y], [x + h, y - 4 * dy], [x + h + 1, y], [x + h - 6, y + 6 * dy], [x - h + 6, y + 6 * dy], [x - h - 1, y]]);
  ctx.fillStyle = DECK;
  ctx.fill();
  ink(ctx, LINE);
  ctx.beginPath();
  ctx.moveTo(x - h + 8, y + 3.5 * dy);
  ctx.lineTo(x + h - 8, y + 3.5 * dy);
  ctx.strokeStyle = '#fbf6ea';
  ctx.lineWidth = 1.4;
  ctx.stroke();
}

/** The board under his feet; frames turn the wheels. */
export function drawBoard(ctx: CanvasRenderingContext2D, frame: number): void {
  sideBoard(ctx, BOARD.fx, BOARD.fy - 16, 100, -(frame / BOARD.frames) * TAU, false);
}

/** Kickflip hazard frames: 0 side, 1 deck face, 2 upside down, 3 underside. */
export function drawFlip(ctx: CanvasRenderingContext2D, frame: number): void {
  const cx = FLIP.w / 2;
  const cy = FLIP.h / 2;
  if (frame === 0 || frame === 2) {
    sideBoard(ctx, cx, cy + (frame === 0 ? -4 : 4), 62, 0, frame === 2);
    return;
  }
  rrect(ctx, cx - 31, cy - 7, 62, 14, 7);
  ctx.fillStyle = frame === 1 ? '#2b2522' : WOOD;
  ctx.fill();
  ink(ctx, LINE);
  if (frame === 1) {
    shine(ctx, cx - 10, cy - 3, 12, 1.6, 0, 0.25);
    return;
  }
  for (const wx of [cx - 18, cx + 18]) {
    ctx.fillStyle = METAL;
    ctx.fillRect(wx - 2, cy - 8, 4, 16);
    for (const wy of [cy - 9, cy + 9]) wheelAt(ctx, wx, wy, 3.6, 0);
  }
}

export function drawWheel(ctx: CanvasRenderingContext2D, frame: number): void {
  const c = WHEEL.w / 2;
  const fill = frame ? PARRY : CREAM;
  wheelAt(ctx, c, c, WHEEL.r, 0.6, fill);
  pieEye(ctx, c - 4, c - 2, 2.6, 3.4, { x: -0.8, y: 0 }, 0.35, fill, -0.6);
  pieEye(ctx, c + 3, c - 2, 2.6, 3.4, { x: -0.8, y: 0 }, 0.35, fill, 0.6);
  shine(ctx, c - 5, c - 6, 2.5, 1.2, -0.5, 0.7);
}

/** Bacon ribbon frames: 0 / 1 wiggling, 2 / 3 the pink parryable one. */
export function drawBacon(ctx: CanvasRenderingContext2D, frame: number): void {
  const pink = frame >= 2;
  baconStrip(ctx, BACON.w / 2, BACON.h / 2, 44, 0, (frame % 2) * Math.PI, pink ? PARRY : '#d9586a', pink ? '#ffe3f0' : '#fbe2d6');
}

export function drawShock(ctx: CanvasRenderingContext2D, frame: number): void {
  const lean = frame ? 2 : -2;
  for (const [x, y, r] of [[8, 19, 7], [16, 14 + lean * 0.5, 9], [25, 19, 6]] as const) {
    ellipse(ctx, x, y, r, r * 0.8);
    ctx.fillStyle = '#ece6da';
    ctx.fill();
    ink(ctx, LINE * 0.8);
  }
  for (const [x, y] of [[4, 8], [28, 6 + lean]] as const) {
    ellipse(ctx, x, y, 2, 2);
    ctx.fillStyle = '#b9b2a4';
    ctx.fill();
    ink(ctx, LINE * 0.5);
  }
}
