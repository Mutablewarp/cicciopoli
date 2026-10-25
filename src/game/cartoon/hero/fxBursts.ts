/**
 * One-shot cartoon FX of level 8 (frame world units, centred): the puffy explosion ring with star
 * bits, the finger-gun muzzle spark, the shot impact spark, the pink parry star, the dust puff, and
 * the super meter playing card (frame 0 empty, 1 full).
 */
import { INK } from '../draw/canvas';
import { FX_COL, HERO_COL } from './config';
import { blobs, ink, star, type Blob } from './shapes';

type Ctx = CanvasRenderingContext2D;

function ring(cx: number, cy: number, n: number, rad: number, r: number, phase = 0): Blob[] {
  return Array.from({ length: n }, (_, i): Blob => {
    const a = phase + (i * Math.PI * 2) / n;
    const rr = r * (i % 2 ? 0.85 : 1);
    return { e: [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, rr, rr] };
  });
}

function bits(ctx: Ctx, cx: number, cy: number, n: number, rad: number, r: number, fill: string, phase = 0): void {
  for (let i = 0; i < n; i++) {
    const a = phase + (i * Math.PI * 2) / n;
    star(ctx, cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, r, fill, a, 4, 0.4);
  }
}

/** Cartoon explosion, 8 frames: flash, fireball, puffy cloud ring growing and thinning, star bits. */
export function drawBlast(ctx: Ctx, f: number): void {
  const c = 30;
  if (f === 0) {
    star(ctx, c, c, 13, FX_COL.spark, 0.2, 8, 0.5);
    star(ctx, c, c, 6, '#ffffff', 0.6, 8, 0.5);
    return;
  }
  if (f === 1) {
    star(ctx, c, c, 21, FX_COL.fire, 0, 9, 0.62);
    star(ctx, c, c, 11, FX_COL.fireHi, 0.3, 9, 0.6);
    return;
  }
  const k = (f - 2) / 5;
  const rad = 13 + 10 * k;
  const r = 8.5 - 6 * k * k;
  blobs(ctx, ring(c, c, 9, rad, r, 0.3 * f), FX_COL.smoke, 1.3 - 0.5 * k);
  if (k < 0.5) {
    ctx.beginPath();
    ctx.arc(c, c, 8 * (1 - 2 * k), 0, Math.PI * 2);
    ink(ctx, FX_COL.fire, 1.2);
  }
  if (k < 0.85) bits(ctx, c, c, 6, rad + r + 3, 3 - 2 * k, FX_COL.fireHi, 0.5);
}

/** Finger-gun spark, 4 frames. */
export function drawMuzzle(ctx: Ctx, f: number): void {
  const c = 10;
  if (f === 0) star(ctx, c, c, 5, FX_COL.spark, 0, 4, 0.35);
  if (f === 1) {
    star(ctx, c, c, 8.5, FX_COL.spark, 0.4, 8, 0.45);
    star(ctx, c, c, 3.5, FX_COL.fireHi, 0, 4, 0.5);
  }
  if (f >= 2) {
    ctx.strokeStyle = INK;
    ctx.lineCap = 'round';
    ctx.lineWidth = f === 2 ? 1.3 : 0.9;
    const r0 = f === 2 ? 5 : 7;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = 0.3 + (i * Math.PI) / 3;
      ctx.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0);
      ctx.lineTo(c + Math.cos(a) * (r0 + 2.5), c + Math.sin(a) * (r0 + 2.5));
    }
    ctx.stroke();
  }
}

/** Shot impact spark, 5 frames. */
export function drawHit(ctx: Ctx, f: number): void {
  const c = 13;
  if (f <= 1) {
    star(ctx, c, c, 8 + 3 * f, FX_COL.spark, f * 0.3, 10, 0.5);
    star(ctx, c, c, 3.5 + f, '#ffffff', 0.2, 5, 0.5);
    return;
  }
  const r = 4.5 + f;
  for (let i = 0; i < 6; i++) {
    const a = 0.2 + (i * Math.PI) / 3;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a - 0.25) * r, c + Math.sin(a - 0.25) * r);
    ctx.lineTo(c + Math.cos(a) * (r + 3.6 - f * 0.5), c + Math.sin(a) * (r + 3.6 - f * 0.5));
    ctx.lineTo(c + Math.cos(a + 0.25) * r, c + Math.sin(a + 0.25) * r);
    ctx.closePath();
    ink(ctx, FX_COL.spark, 0.9);
  }
}

/** Pink parry star, 6 frames: grows, spins, bursts into sparkles. */
export function drawParryFlash(ctx: Ctx, f: number): void {
  const c = 20;
  const r = [6, 14, 17.5, 15.5, 10, 5][f];
  ctx.globalAlpha = f >= 4 ? 0.75 : 1;
  star(ctx, c, c, r, HERO_COL.pink, f * 0.35, 5, 0.48);
  star(ctx, c, c, r * 0.45, HERO_COL.pinkHi, f * 0.35, 5, 0.48);
  ctx.globalAlpha = 1;
  if (f >= 2) bits(ctx, c, c, 4, 13 + f * 1.6, 3.2 - f * 0.35, HERO_COL.pinkHi, Math.PI / 4);
}

/** Landing / dash dust puff, 6 frames. */
export function drawDust(ctx: Ctx, f: number): void {
  const k = f / 5;
  const r = [3, 4.4, 5, 4.6, 3.6, 2.2][f];
  const spread = 3 + f * 1.5;
  blobs(ctx, [
    { e: [15 - spread, 13 - f * 0.7, r, r * 0.85] },
    { e: [15 + spread, 13 - f * 0.7, r, r * 0.85] },
    { e: [15 - spread * 0.35, 11 - f * 0.9, r * 0.9, r * 0.8] },
    { e: [15 + spread * 0.4, 11.5 - f * 0.9, r * 0.8, r * 0.75] },
  ], FX_COL.smoke, 1 - 0.5 * k);
}

/** Ciccio's round glasses as a tiny emblem. */
function glassesIcon(ctx: Ctx, x: number, y: number, s: number, col: string): void {
  ctx.fillStyle = col;
  ctx.strokeStyle = col;
  ctx.lineWidth = 0.8 * s;
  for (const dx of [-2.3, 2.3]) {
    ctx.beginPath();
    ctx.arc(x + dx * s, y, 1.8 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(x - 0.6 * s, y - 0.4 * s);
  ctx.quadraticCurveTo(x, y - 1.2 * s, x + 0.6 * s, y - 0.4 * s);
  ctx.stroke();
}

/** Super meter playing card: frame 0 empty (paper, dashed), 1 full (bordeaux back, glasses emblem). */
export function drawCard(ctx: Ctx, f: number): void {
  ctx.beginPath();
  ctx.roundRect(1.2, 1.2, 13.6, 19.6, 2.2);
  ink(ctx, f ? FX_COL.card : FX_COL.paperShade, 1.3);
  if (!f) {
    ctx.setLineDash([1.4, 1.2]);
    ctx.beginPath();
    ctx.roundRect(3.2, 3.2, 9.6, 15.6, 1.4);
    ctx.strokeStyle = 'rgba(28, 21, 17, 0.45)';
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.setLineDash([]);
    glassesIcon(ctx, 8, 11, 0.8, 'rgba(28, 21, 17, 0.3)');
    return;
  }
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(3, 3, 10, 16, 1.4);
  ctx.fillStyle = FX_COL.bordeaux;
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = 'rgba(247, 238, 219, 0.35)';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  for (let i = -16; i < 16; i += 2.2) {
    ctx.moveTo(3 + i, 3);
    ctx.lineTo(3 + i + 16, 19);
    ctx.moveTo(3 + i + 16, 3);
    ctx.lineTo(3 + i, 19);
  }
  ctx.stroke();
  ctx.restore();
  ctx.beginPath();
  ctx.roundRect(3, 3, 10, 16, 1.4);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(8, 11, 4, 4.8, 0, 0, Math.PI * 2);
  ink(ctx, FX_COL.card, 0.8);
  glassesIcon(ctx, 8, 11, 0.85, INK);
  star(ctx, 2.6, 2.6, 1.4, HERO_COL.star, 0, 4, 0.4);
  star(ctx, 13.4, 19.4, 1.4, HERO_COL.star, 0, 4, 0.4);
}
