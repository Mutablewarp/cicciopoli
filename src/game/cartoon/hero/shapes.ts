/**
 * Shared ink shapes of the hero lane (canvas 2D, world units): blob unions (outline everything, then
 * fill everything, so gloves / clouds / puffs read as one silhouette), stars, lumpy food outlines.
 */
import { INK } from '../draw/canvas';

/** Visible outline of hose limbs and blob unions (world units). */
export const OUT = 1.25;

export type Blob = { e: [number, number, number, number] } | { c: [number, number, number, number, number] };

function blobPath(ctx: CanvasRenderingContext2D, b: Blob, grow: number): void {
  ctx.beginPath();
  if ('e' in b) {
    const [x, y, rx, ry] = b.e;
    ctx.ellipse(x, y, rx + grow, ry + grow, 0, 0, Math.PI * 2);
    return;
  }
  const [x1, y1, x2, y2] = b.c;
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
}

/** Ink pass of every blob, then fill pass: overlapping shapes merge into one outlined silhouette. */
export function blobs(ctx: CanvasRenderingContext2D, list: readonly Blob[], fill: string, out = OUT): void {
  for (const [col, grow] of [[INK, out], [fill, 0]] as const) {
    ctx.fillStyle = col;
    ctx.strokeStyle = col;
    for (const b of list) {
      blobPath(ctx, b, grow);
      if ('e' in b) ctx.fill();
      else {
        ctx.lineWidth = b.c[4] + grow * 2;
        ctx.stroke();
      }
    }
  }
}

/** Five-point cartoon star (outlined). */
export function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, spin = 0, points = 5, inner = 0.45): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = spin - Math.PI / 2 + (i * Math.PI) / points;
    const rr = i % 2 ? r * inner : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.min(1.2, 0.35 + r * 0.12);
  ctx.stroke();
}

/**
 * Closed bumpy outline around a rounded box / ellipse (pow 2 = ellipse, 4+ = boxier) — fried batter,
 * meatballs, nuggets. Leaves the path open for the caller to fill / stroke.
 */
export function lumpy(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, pow: number, bumps: number, amp: number, phase = 0): void {
  const n = 56;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const k = 1 + (amp / Math.max(rx, ry)) * Math.sin(bumps * t + phase);
    ctx.lineTo(cx + rx * k * Math.sign(c) * Math.abs(c) ** (2 / pow), cy + ry * k * Math.sign(s) * Math.abs(s) ** (2 / pow));
  }
  ctx.closePath();
}

/** Fill the current path and ink it. */
export function ink(ctx: CanvasRenderingContext2D, fill: string | CanvasGradient, w: number): void {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = w;
  ctx.stroke();
}
