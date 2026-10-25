/**
 * Player shots of level 8, drawn as 1930s cartoon food (frame world units, flying right):
 * PROVOLA GOAT (golden battered cheese stick, melty cheese peeking out, motion smear) and its EX
 * brick, the MEATBALL bomb with a lit fuse and its giant EX, the smiling homing NUGGET and the nugget
 * swarm (the PIOGGIA DI PATATINE fries live in fxFries.ts).
 */
import { INK } from '../draw/canvas';
import { FX_COL, HERO_COL } from './config';
import { ink, lumpy, star } from './shapes';

type Ctx = CanvasRenderingContext2D;

function streaks(ctx: Ctx, x: number, ys: readonly number[], len: number, w: number, f: number): void {
  ctx.lineCap = 'round';
  ys.forEach((y, i) => {
    const l = len * (0.65 + 0.35 * (((f + i) % 3) / 2));
    ctx.strokeStyle = FX_COL.batterHi;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x - l, y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = INK;
    ctx.lineWidth = w * 0.35;
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
}

function crumbs(ctx: Ctx, pts: readonly (readonly [number, number])[], r: number, col: string): void {
  ctx.fillStyle = col;
  for (const [x, y] of pts) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Golden battered cheese brick centred at cx, cy (half sizes rx, ry), cheese oozing; `s` scales details. */
function batter(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, s: number, f: number): void {
  // melty cheese drip behind the batter (front-bottom), longer every frame
  const drip = (0.6 + f * 0.45) * s;
  ctx.beginPath();
  ctx.ellipse(cx + rx * 0.45, cy + ry * 0.7 + drip * 0.5, 1.5 * s, ry * 0.3 + drip * 0.5, 0, 0, Math.PI * 2);
  ink(ctx, FX_COL.cheese, 0.9 * s);
  lumpy(ctx, cx, cy, rx, ry, 5, 9, 0.45 * s, f);
  ink(ctx, FX_COL.batter, 1.25 * s);
  ctx.save();
  lumpy(ctx, cx, cy, rx, ry, 5, 9, 0.45 * s, f);
  ctx.clip();
  ctx.fillStyle = FX_COL.batterShade;
  ctx.beginPath();
  ctx.ellipse(cx + rx * 0.2, cy + ry * 1.25, rx * 1.3, ry * 0.75, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = FX_COL.batterHi;
  ctx.lineWidth = 1.3 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - rx * 0.7, cy - ry * 0.45);
  ctx.quadraticCurveTo(cx - rx * 0.1, cy - ry * 0.75, cx + rx * 0.6, cy - ry * 0.5);
  ctx.stroke();
  crumbs(ctx, [[cx - rx * 0.4, cy + ry * 0.2], [cx + rx * 0.1, cy - ry * 0.05], [cx + rx * 0.55, cy + ry * 0.3], [cx - rx * 0.05, cy + ry * 0.45]], 0.42 * s, FX_COL.crumb);
  ctx.restore();
  // a crack in the batter with the cheese peeking out
  ctx.beginPath();
  ctx.ellipse(cx - rx * 0.2, cy - ry * 0.62, rx * 0.26, ry * 0.26, -0.15, 0, Math.PI * 2);
  ink(ctx, FX_COL.cheese, 0.8 * s);
  ctx.fillStyle = FX_COL.cheeseShade;
  ctx.beginPath();
  ctx.ellipse(cx - rx * 0.17, cy - ry * 0.55, rx * 0.12, ry * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawProvola(ctx: Ctx, f: number): void {
  streaks(ctx, 11, [4, 6.2, 8.4], 9, 1.6, f);
  batter(ctx, 17.5, 6, 7, 3.8, 1, f);
}

function pieEye(ctx: Ctx, x: number, y: number, rx: number, ry: number): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ink(ctx, HERO_COL.eye, 0.9);
  ctx.beginPath();
  ctx.moveTo(x + rx * 0.25, y);
  ctx.ellipse(x + rx * 0.25, y, rx * 0.55, ry * 0.65, 0, -0.5, Math.PI * 2 - 1.3);
  ctx.closePath();
  ctx.fillStyle = INK;
  ctx.fill();
}

/** A cheeky little face (EX shots): pie-cut eyes, thick brows, open grin. */
function cheekyFace(ctx: Ctx, x: number, y: number, s: number): void {
  pieEye(ctx, x, y, 1.8 * s, 2.4 * s);
  pieEye(ctx, x + 4.6 * s, y - 0.2 * s, 1.7 * s, 2.3 * s);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2 * s;
  ctx.beginPath();
  ctx.moveTo(x - 1.8 * s, y - 3.6 * s);
  ctx.lineTo(x + 1.2 * s, y - 2.6 * s);
  ctx.moveTo(x + 3.4 * s, y - 2.8 * s);
  ctx.lineTo(x + 6.4 * s, y - 3.8 * s);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 0.4 * s, y + 3 * s);
  ctx.quadraticCurveTo(x + 2.4 * s, y + 4 * s, x + 5.6 * s, y + 2.6 * s);
  ctx.quadraticCurveTo(x + 4.4 * s, y + 6.6 * s, x + 2 * s, y + 6 * s);
  ctx.quadraticCurveTo(x, y + 5.4 * s, x - 0.4 * s, y + 3 * s);
  ink(ctx, HERO_COL.mouth, 0.9 * s);
  ctx.fillStyle = HERO_COL.tongue;
  ctx.beginPath();
  ctx.ellipse(x + 2.6 * s, y + 5.2 * s, 1.4 * s, 0.8 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawProvolaEx(ctx: Ctx, f: number): void {
  streaks(ctx, 20, [8, 13, 18, 23], 17, 3, f);
  batter(ctx, 36, 15, 19, 10.5, 2, f);
  // stretchy cheese strings at the back
  ctx.strokeStyle = FX_COL.cheese;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(18, 12);
  ctx.quadraticCurveTo(13, 14 + f, 10.5, 12 + f * 0.5);
  ctx.stroke();
  cheekyFace(ctx, 41, 14, 1);
}

function fuse(ctx: Ctx, x: number, y: number, s: number, f: number): void {
  const path = (): void => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 1.2 * s, y - 2.4 * s, x + 3.4 * s, y - 3 * s);
  };
  path();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2 * s;
  ctx.stroke();
  path();
  ctx.strokeStyle = FX_COL.fuse;
  ctx.lineWidth = 1.1 * s;
  ctx.stroke();
  const r = (2.1 + (f % 3) * 0.45) * s;
  star(ctx, x + 3.6 * s, y - 3.2 * s, r, FX_COL.flame, f * 0.7, 6, 0.5);
  star(ctx, x + 3.6 * s, y - 3.2 * s, r * 0.45, FX_COL.flameHi, f * 0.7 + 0.5, 6, 0.5);
}

/** Meatball in tomato sauce centred at cx, cy. */
function meatball(ctx: Ctx, cx: number, cy: number, r: number, s: number, f: number): void {
  lumpy(ctx, cx, cy, r, r * 0.94, 2, 8, 0.45 * s, 0.6);
  ink(ctx, FX_COL.meat, 1.3 * s);
  ctx.save();
  lumpy(ctx, cx, cy, r, r * 0.94, 2, 8, 0.45 * s, 0.6);
  ctx.clip();
  ctx.fillStyle = FX_COL.meatShade;
  ctx.beginPath();
  ctx.ellipse(cx + r * 0.45, cy + r * 0.6, r * 0.9, r * 0.6, -0.5, 0, Math.PI * 2);
  ctx.fill();
  crumbs(ctx, [[cx - r * 0.5, cy + r * 0.1], [cx + r * 0.1, cy + r * 0.35], [cx - r * 0.15, cy + r * 0.62], [cx + r * 0.5, cy - r * 0.05]], 0.55 * s, FX_COL.meatHi);
  // sauce cap
  lumpy(ctx, cx - r * 0.15, cy - r * 0.78, r * 0.62, r * 0.32, 2, 6, 0.4 * s, f);
  ctx.fillStyle = FX_COL.sauce;
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.38, cy - r * 0.8, r * 0.16, r * 0.08, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  lumpy(ctx, cx, cy, r, r * 0.94, 2, 8, 0.45 * s, 0.6);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.3 * s;
  ctx.stroke();
}

export function drawMeatball(ctx: Ctx, f: number): void {
  meatball(ctx, 8.6, 10.8, 5.8, 1, f);
  fuse(ctx, 10, 5.4, 1, f);
}

export function drawMeatballEx(ctx: Ctx, f: number): void {
  meatball(ctx, 20, 24, 15, 2, f);
  // basil leaf
  ctx.beginPath();
  ctx.ellipse(13, 12.6, 3.6, 1.8, -0.5, 0, Math.PI * 2);
  ink(ctx, FX_COL.basil, 1);
  fuse(ctx, 22, 10.2, 2, f);
  cheekyFace(ctx, 19, 23, 1.3);
}

/** Smiling nugget centred at cx, cy, scaled by s. */
function nugget(ctx: Ctx, cx: number, cy: number, s: number): void {
  lumpy(ctx, cx, cy, 6.2 * s, 5 * s, 2.6, 6, 0.6 * s, 0.4);
  ink(ctx, FX_COL.nugget, 1.15 * Math.max(0.8, s));
  crumbs(ctx, [[cx - 3.6 * s, cy + 1.6 * s], [cx - 2 * s, cy - 2.8 * s], [cx + 0.6 * s, cy + 3 * s], [cx - 4.4 * s, cy - 0.8 * s]], 0.45 * s, FX_COL.nuggetShade);
  ctx.fillStyle = INK;
  for (const [x, y] of [[cx + 1.4 * s, cy - 1.2 * s], [cx + 3.6 * s, cy - 1.4 * s]]) {
    ctx.beginPath();
    ctx.ellipse(x, y, 0.75 * s, 1.15 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = HERO_COL.eye;
  ctx.beginPath();
  ctx.arc(cx + 1.6 * s, cy - 1.7 * s, 0.3 * s, 0, Math.PI * 2);
  ctx.arc(cx + 3.8 * s, cy - 1.9 * s, 0.3 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.8 * s;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx + 0.8 * s, cy + 1 * s);
  ctx.quadraticCurveTo(cx + 2.6 * s, cy + 2.8 * s, cx + 4.6 * s, cy + 0.8 * s);
  ctx.stroke();
  ctx.fillStyle = HERO_COL.blush;
  ctx.beginPath();
  ctx.ellipse(cx + 5 * s, cy + 0.9 * s, 0.9 * s, 0.6 * s, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawNugget(ctx: Ctx, f: number): void {
  ctx.strokeStyle = HERO_COL.speed;
  ctx.lineWidth = 1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (const [y, l] of [[4.5, 6], [7, 8], [9.5, 5.5]]) {
    const j = f ? 1.2 : 0;
    ctx.moveTo(8.5 - l - j, y);
    ctx.lineTo(8.5 - j * 0.5, y);
  }
  ctx.stroke();
  nugget(ctx, 15, 7, 1);
}

export function drawNuggetEx(ctx: Ctx, f: number): void {
  const n = 5;
  const turn = ((f / 6) * Math.PI * 2) / n;
  ctx.beginPath();
  ctx.arc(24, 24, 5.5, 0, Math.PI * 2);
  ink(ctx, FX_COL.smoke, 1);
  for (let i = 0; i < n; i++) {
    const a = turn + (i * Math.PI * 2) / n;
    const x = 24 + Math.cos(a) * 14;
    const y = 24 + Math.sin(a) * 14;
    ctx.strokeStyle = HERO_COL.speed;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(24, 24, 14, a - 0.75, a - 0.3);
    ctx.stroke();
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a + Math.PI / 2);
    nugget(ctx, 0, 0, 0.75);
    ctx.restore();
  }
}
