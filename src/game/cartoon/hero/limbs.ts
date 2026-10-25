/**
 * Rubber-hose pieces of Ciccio (canvas 2D, world units): bendy hose limbs with no elbows, the white
 * four-finger gloves with the three back lines, the big glossy black shoes.
 */
import type { Vec } from '../api';
import { INK } from '../draw/canvas';
import { HERO_COL } from './config';
import type { Glove } from './anatomy';
import { OUT, blobs, type Blob } from './shapes';

export const ARM_W = 4.4;
export const LEG_W = 6;

/** Point on the quadratic a → c → b. */
export function quad(a: Vec, c: Vec, b: Vec, t: number): Vec {
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
}

/** Control point of a hose from a to b bowing sideways by bend x length. */
function bow(a: Vec, b: Vec, bend: number): Vec {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return { x: (a.x + b.x) / 2 - dy * bend, y: (a.y + b.y) / 2 + dx * bend };
}

/** A bendy outlined tube with one soft shade stroke. Returns its control point. */
export function hose(ctx: CanvasRenderingContext2D, a: Vec, b: Vec, bend: number, w: number, fill: string, shade: string): Vec {
  const c = bow(a, b, bend);
  const path = (): void => {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(c.x, c.y, b.x, b.y);
  };
  path();
  ctx.strokeStyle = INK;
  ctx.lineWidth = w + OUT * 2;
  ctx.stroke();
  ctx.strokeStyle = fill;
  ctx.lineWidth = w;
  ctx.stroke();
  ctx.save();
  ctx.translate(0.55, 0.75);
  path();
  ctx.strokeStyle = shade;
  ctx.lineWidth = w * 0.42;
  ctx.stroke();
  ctx.restore();
  return c;
}

function line(ctx: CanvasRenderingContext2D, pts: readonly number[], w: number): void {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.strokeStyle = INK;
  ctx.lineWidth = w;
  ctx.stroke();
}

const GLOVES: Readonly<Record<Glove, readonly Blob[]>> = {
  fist: [{ e: [5.2, 0, 4.5, 4.1] }, { e: [4.4, -3.6, 2.1, 1.5] }, { e: [8.6, 1.6, 1.6, 1.8] }],
  gun: [
    { e: [4.8, 0.7, 3.9, 3.6] },
    { c: [6, -1.7, 11.3, -1.7, 2.7] },
    { c: [4.6, -2.6, 5.7, -6.6, 2.5] },
    { e: [8.1, 1.5, 1.6, 1.5] },
    { e: [7.5, 3.3, 1.5, 1.2] },
  ],
  point: [{ e: [4.8, 0.7, 3.9, 3.6] }, { c: [6, -1.7, 11.3, -1.7, 2.7] }, { e: [6, -2.3, 1.7, 1.1] }, { e: [8.1, 1.5, 1.6, 1.5] }, { e: [7.5, 3.3, 1.5, 1.2] }],
  open: [
    { e: [4.8, 0, 3.7, 4] },
    ...[-0.66, -0.22, 0.22, 0.64].map((a): Blob => ({ c: [5 + 1.6 * Math.cos(a), 1.6 * Math.sin(a), 5 + 6.6 * Math.cos(a), 6.6 * Math.sin(a), 2.5] })),
    { c: [4, -2.6, 4.4, -7.2, 2.4] },
  ],
};

/** White four-finger glove at the wrist, pointing along `angle` (thumb stays on the upper side). */
export function glove(ctx: CanvasRenderingContext2D, at: Vec, angle: number, shape: Glove): void {
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(angle);
  if (Math.cos(angle) < -0.01) ctx.scale(1, -1);
  // rolled cuff
  ctx.beginPath();
  ctx.ellipse(1.1, 0, 1.8, 3.4, 0, 0, Math.PI * 2);
  ctx.fillStyle = HERO_COL.glove;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  blobs(ctx, GLOVES[shape], HERO_COL.glove);
  // the three lines on the back of the glove
  const bx = shape === 'fist' ? 3.6 : 3.2;
  for (const y of [-1.1, 0.5, 2.1]) line(ctx, [bx, y, bx + 2.1, y], 0.75);
  if (shape === 'fist') line(ctx, [8.2, -1.6, 9.4, -0.3], 0.7);
  ctx.restore();
}

/** Big glossy black shoe, ankle at `at`, toe along `angle` (0 = right, + = toe down, ~PI = pointing left). */
export function shoe(ctx: CanvasRenderingContext2D, at: Vec, angle: number): void {
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.rotate(angle);
  if (Math.cos(angle) < 0) ctx.scale(1, -1);
  // sole peeking out under the upper
  ctx.beginPath();
  ctx.roundRect(-5.2, 2.2, 16, 2.4, 1.2);
  ctx.fillStyle = HERO_COL.sole;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-4.8, 3);
  ctx.lineTo(-5, -0.2);
  ctx.quadraticCurveTo(-4.6, -2.6, -1.6, -2.7);
  ctx.lineTo(1, -2.4);
  ctx.bezierCurveTo(3.4, -5.4, 10.4, -5, 10.9, 0);
  ctx.quadraticCurveTo(11.2, 3, 8.4, 3);
  ctx.closePath();
  ctx.fillStyle = HERO_COL.shoe;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // gloss
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.ellipse(6.8, -2.3, 2.1, 1.05, -0.28, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(9.3, -1, 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.beginPath();
  ctx.ellipse(-2.6, -1.3, 1.3, 0.7, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
