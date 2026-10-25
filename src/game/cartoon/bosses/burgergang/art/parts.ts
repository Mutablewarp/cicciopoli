/**
 * Rubber-hose drawing kit of the Burger Gang lane: smooth paths, hose limbs, pie-cut eyes, white
 * four-finger gloves, sneakers, heart sunglasses, the soda cup and can. World units on a context
 * already scaled by k (draw/canvas.ts); every part outlined in ink.
 */
import type { Vec } from '../../../api';
import { INK, LINE, inked } from '../../../draw/canvas';
import { COL } from '../config';

export const TAU = Math.PI * 2;
type Pt = readonly [number, number];
export type GlovePose = 'open' | 'fist' | 'peace' | 'hold';

/** Smooth path through points (Catmull-Rom as beziers), closed or open. */
export function smooth(ctx: CanvasRenderingContext2D, pts: readonly Pt[], closed = true): void {
  const n = pts.length;
  const at = (i: number): Pt => (closed ? (pts[(i + n) % n] as Pt) : (pts[Math.max(0, Math.min(n - 1, i))] as Pt));
  ctx.beginPath();
  ctx.moveTo(at(0)[0], at(0)[1]);
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  if (closed) ctx.closePath();
}

/** Rubber hose: an outlined tube along a smooth open curve. */
function hose(ctx: CanvasRenderingContext2D, pts: readonly Pt[], width: number, color: string): void {
  smooth(ctx, pts, false);
  ctx.strokeStyle = INK;
  ctx.lineWidth = width + LINE * 1.6;
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

/** Limb from a to b bowing sideways by `bend` at its middle (rubber hose: one smooth arc, no elbow). */
export function limb(ctx: CanvasRenderingContext2D, a: Vec, b: Vec, bend: number, width: number, color: string): void {
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const cx = (a.x + b.x) / 2 - ((b.y - a.y) / len) * bend * 2;
  const cy = (a.y + b.y) / 2 + ((b.x - a.x) / len) * bend * 2;
  for (const [style, w] of [[INK, width + LINE * 1.6], [color, width]] as const) {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(cx, cy, b.x, b.y);
    ctx.strokeStyle = style;
    ctx.lineWidth = w;
    ctx.stroke();
  }
}

export function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
}

/** Pie-cut eye: white oval, black pupil with a wedge cut out, looking along `look` (-1..1). */
export function pieEye(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, look: Vec): void {
  ellipse(ctx, x, y, rx, ry);
  inked(ctx, COL.white, LINE * 0.9);
  const px = x + look.x * rx * 0.38;
  const py = y + look.y * ry * 0.3;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.ellipse(px, py, rx * 0.5, ry * 0.62, 0, -Math.PI * 0.32, -Math.PI * 0.56 + TAU);
  ctx.closePath();
  ctx.fillStyle = INK;
  ctx.fill();
}

/** Closed eye: a happy arc (up = true) or a sleepy one. */
export function closedEye(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, up: boolean): void {
  ctx.beginPath();
  if (up) ctx.arc(x, y + w * 0.35, w * 0.5, Math.PI * 1.15, Math.PI * 1.85);
  else ctx.arc(x, y - w * 0.35, w * 0.5, Math.PI * 0.15, Math.PI * 0.85);
  ctx.strokeStyle = INK;
  ctx.lineWidth = LINE * 1.2;
  ctx.stroke();
}

/** Dizzy spiral eye (knockout). */
export function spiralEye(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, turn: number): void {
  ellipse(ctx, x, y, r, r * 1.15);
  inked(ctx, COL.white, LINE * 0.9);
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const a = turn + (i / 40) * TAU * 2.2;
    const d = (i / 40) * r * 0.85;
    ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d * 1.1);
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = LINE * 0.8;
  ctx.stroke();
}

function finger(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number): void {
  hose(ctx, [[x0, y0], [x1, y1]], 3.6, COL.glove);
}

/**
 * White four-finger glove, palm centre at (x, y), fingers along `angle` (0 = pointing up), mirrored
 * with flip = -1. The cuff sits opposite the fingers.
 */
export function glove(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number, pose: GlovePose, flip: 1 | -1 = 1): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(size * flip, size);
  if (pose === 'open') {
    finger(ctx, -3.4, -2, -6.6, -9);
    finger(ctx, -1, -3, -1.6, -11);
    finger(ctx, 1.6, -3, 2.8, -10.5);
    finger(ctx, 4, -1, 7.6, -6);
  } else if (pose === 'peace') {
    finger(ctx, -1.8, -3, -4.6, -12);
    finger(ctx, 1.2, -3, 3.8, -12);
  }
  // thumb
  finger(ctx, -4.6, 1.5, -8, -2.5);
  ellipse(ctx, 0, 0, 6, 5.6);
  inked(ctx, COL.glove, LINE);
  if (pose === 'fist' || pose === 'hold' || pose === 'peace') {
    ctx.strokeStyle = INK;
    ctx.lineWidth = LINE * 0.7;
    for (const fx of [-2.2, 0.6, 3.2]) {
      ctx.beginPath();
      ctx.moveTo(fx, -4.6);
      ctx.lineTo(fx + 0.4, pose === 'peace' ? -1.6 : -0.8);
      ctx.stroke();
    }
  } else {
    ctx.strokeStyle = INK;
    ctx.lineWidth = LINE * 0.6;
    for (const fx of [-1.6, 0.6, 2.8]) {
      ctx.beginPath();
      ctx.moveTo(fx, -1.5);
      ctx.lineTo(fx, 1.2);
      ctx.stroke();
    }
  }
  // flared cuff
  ctx.beginPath();
  ctx.moveTo(-4.4, 4.2);
  ctx.quadraticCurveTo(0, 6.4, 4.4, 4.2);
  ctx.lineTo(5.6, 8.4);
  ctx.quadraticCurveTo(0, 11, -5.6, 8.4);
  ctx.closePath();
  inked(ctx, COL.glove, LINE);
  ctx.restore();
}

/** Blue sneaker, sole bottom at (x, y), toe towards dir (-1 = left). */
export function sneaker(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, dir: 1 | -1, tilt = 0): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.scale(size * dir, size);
  // sock cuff
  ctx.beginPath();
  ctx.roundRect(-5.5, -15, 8, 6, 2);
  inked(ctx, COL.sock, LINE * 0.9);
  // upper
  smooth(ctx, [[-7, -11], [1, -12], [9, -8], [14, -4.5], [13, -1.5], [-8, -1.5], [-9.5, -6]]);
  const g = ctx.createLinearGradient(0, -12, 0, -1);
  g.addColorStop(0, COL.shoeLight);
  g.addColorStop(1, COL.shoe);
  inked(ctx, g, LINE);
  // toe cap + sole
  ctx.beginPath();
  ctx.moveTo(6.5, -6);
  ctx.quadraticCurveTo(14.5, -6, 14.5, -2);
  ctx.lineTo(6.5, -2);
  ctx.closePath();
  inked(ctx, COL.sole, LINE * 0.8);
  ctx.beginPath();
  ctx.roundRect(-10, -3, 26, 3.6, 1.8);
  inked(ctx, COL.sole, LINE);
  // laces
  ctx.strokeStyle = COL.white;
  ctx.lineWidth = 1.3;
  for (const lx of [0.5, 3.5]) {
    ctx.beginPath();
    ctx.moveTo(lx, -10.5);
    ctx.lineTo(lx + 2.5, -7.5);
    ctx.stroke();
  }
  ctx.restore();
}

export function heartPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number): void {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.62);
  ctx.bezierCurveTo(cx - s * 1.15, cy - s * 0.02, cx - s * 0.6, cy - s * 0.95, cx, cy - s * 0.32);
  ctx.bezierCurveTo(cx + s * 0.6, cy - s * 0.95, cx + s * 1.15, cy - s * 0.02, cx, cy + s * 0.62);
  ctx.closePath();
}

/** Heart sunglasses (yellow frame, pink lenses, white bolt glints), centre (x, y), total width w. */
export function shades(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, angle: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const s = w * 0.2;
  const off = w * 0.25;
  ctx.beginPath();
  ctx.moveTo(-off + s * 0.6, -s * 0.15);
  ctx.quadraticCurveTo(0, -s * 0.7, off - s * 0.6, -s * 0.15);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.4;
  ctx.stroke();
  ctx.strokeStyle = COL.frame;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  for (const sx of [-1, 1]) {
    const cx = sx * off;
    heartPath(ctx, cx, 0, s);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4.6;
    ctx.stroke();
    ctx.strokeStyle = COL.frame;
    ctx.lineWidth = 2.4;
    ctx.stroke();
    const g = ctx.createLinearGradient(cx - s, -s, cx + s, s);
    g.addColorStop(0, COL.pinkLight);
    g.addColorStop(0.35, COL.lens);
    g.addColorStop(1, '#c2205f');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.1, -s * 0.55);
    ctx.lineTo(cx - s * 0.4, -s * 0.02);
    ctx.lineTo(cx - s * 0.12, -s * 0.06);
    ctx.lineTo(cx - s * 0.32, s * 0.36);
    ctx.lineTo(cx + s * 0.1, -s * 0.18);
    ctx.lineTo(cx - s * 0.16, -s * 0.14);
    ctx.closePath();
    ctx.fillStyle = COL.white;
    ctx.fill();
  }
  ctx.restore();
}

/** Red soda cup with a straw, bottom centre (x, y), height h, rotated by angle. */
export function cup(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, angle: number, foam = false): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const w = h * 0.36;
  const top = w * 1.25;
  hose(ctx, [[top * 0.15, -h], [top * 0.35, -h - h * 0.32], [top * 0.62, -h - h * 0.42]], 2.2, COL.white);
  ctx.beginPath();
  ctx.moveTo(-w, 0);
  ctx.lineTo(-top, -h);
  ctx.lineTo(top, -h);
  ctx.lineTo(w, 0);
  ctx.closePath();
  const g = ctx.createLinearGradient(-top, 0, top, 0);
  g.addColorStop(0, '#ff6a5a');
  g.addColorStop(0.45, COL.cup);
  g.addColorStop(1, COL.cupDark);
  inked(ctx, g, LINE);
  ctx.beginPath();
  ctx.moveTo(-w * 1.1, -h * 0.45);
  ctx.quadraticCurveTo(0, -h * 0.62, w * 1.12, -h * 0.4);
  ctx.strokeStyle = COL.white;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(-top - 1.2, -h - 3, top * 2 + 2.4, 4, 2);
  inked(ctx, COL.cupDark, LINE * 0.9);
  if (foam) {
    smooth(ctx, [[-top - 2, -h - 2], [-top * 0.6, -h - 9], [-top * 0.1, -h - 6], [top * 0.4, -h - 11], [top + 2, -h - 3], [0, -h + 1]]);
    inked(ctx, COL.soda, LINE * 0.9);
  }
  ctx.restore();
}

/** Soda can (red or pink), centre (x, y), height h. */
export function can(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, angle: number, pink: boolean): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const w = h * 0.34;
  const body = pink ? COL.pink : COL.cup;
  ctx.beginPath();
  ctx.roundRect(-w, -h / 2, w * 2, h, w * 0.45);
  const g = ctx.createLinearGradient(-w, 0, w, 0);
  g.addColorStop(0, pink ? COL.pinkLight : '#ff7a6a');
  g.addColorStop(0.5, body);
  g.addColorStop(1, pink ? '#c83a7c' : COL.cupDark);
  inked(ctx, g, LINE);
  ctx.beginPath();
  ctx.moveTo(-w, h * 0.05);
  ctx.bezierCurveTo(-w * 0.3, -h * 0.2, w * 0.3, h * 0.25, w, -h * 0.05);
  ctx.strokeStyle = COL.white;
  ctx.lineWidth = 2;
  ctx.stroke();
  ellipse(ctx, 0, -h / 2 + 1.5, w * 0.8, 2.2);
  inked(ctx, '#d9d4cc', LINE * 0.7);
  ctx.restore();
}
