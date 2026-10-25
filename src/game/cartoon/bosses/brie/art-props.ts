/**
 * Monsieur Brie's projectiles and fight FX (world units): the baguette javelin, the rolling brie wheel
 * with a grumpy little face, the melted-cheese wave, the floor target mark, dust puffs, KO stars.
 * Frame 1 of the baguette / wheel = the PINK parryable version.
 */
import { contactShadow, ellipse, ink, pieEye, shade, shine, smooth, TAU } from './kit/toon';
import { CRUST, PASTE, loaf } from './art-body';

export const PINK = '#ff8fc0';
export const BAGUETTE = { w: 52, h: 16 } as const;
export const WHEEL = { w: 36, h: 36, r: 15 } as const;
export const WAVE = { w: 34, h: 24 } as const;
export const MARK = { w: 72, h: 16 } as const;
export const PUFF = { w: 40, h: 30, frames: 5 } as const;
export const STAR = { w: 16, h: 16 } as const;
export const ALERT = { w: 36, h: 36 } as const;
export const SHADOW = { w: 80, h: 12 } as const;

export function drawBaguette(ctx: CanvasRenderingContext2D, frame: number): void {
  loaf(ctx, BAGUETTE.w / 2, BAGUETTE.h / 2, 46, 0, frame ? PINK : CRUST);
}

export function drawWheel(ctx: CanvasRenderingContext2D, frame: number): void {
  const c = WHEEL.w / 2;
  const r = WHEEL.r;
  const rind = frame ? PINK : '#f7f2e4';
  ellipse(ctx, c, c, r, r);
  ctx.fillStyle = rind;
  ctx.fill();
  ctx.save();
  ellipse(ctx, c, c, r, r);
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(c, c);
  ctx.arc(c, c, r + 2, 0.35, 1.05);
  ctx.closePath();
  ctx.fillStyle = PASTE;
  ctx.fill();
  ctx.globalAlpha = 0.25;
  ellipse(ctx, c + 4, c + 5, r, r * 0.8);
  ctx.fillStyle = shade(rind, -0.4);
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(c + Math.cos(0.35) * r, c + Math.sin(0.35) * r);
  ctx.lineTo(c, c);
  ctx.lineTo(c + Math.cos(1.05) * r, c + Math.sin(1.05) * r);
  ink(ctx, 1.4);
  pieEye(ctx, c - 5, c - 4, 3.2, 4.2, { x: -0.8, y: 0 }, 0.3, rind, -0.6);
  pieEye(ctx, c + 2, c - 4, 3.2, 4.2, { x: -0.8, y: 0 }, 0.3, rind, 0.6);
  ctx.beginPath();
  ctx.moveTo(c - 6, c + 4);
  ctx.quadraticCurveTo(c - 2, c + 2, c + 1, c + 4);
  ink(ctx, 1.4);
  ellipse(ctx, c, c, r, r);
  ink(ctx, 2);
  shine(ctx, c - 6, c - 8, 3, 1.6, -0.6, 0.6);
}

export function drawWave(ctx: CanvasRenderingContext2D, frame: number): void {
  const lean = frame ? 2 : -1;
  smooth(ctx, [[1, 23], [4, 12 + lean], [10, 4], [18, 2 + lean], [26, 8], [31, 16], [33, 23]]);
  ctx.fillStyle = PASTE;
  ctx.fill();
  ink(ctx, 1.8);
  shine(ctx, 13, 8, 4, 1.6, -0.4, 0.6);
  for (const [x, y] of [[7, 3], [27, 5]] as const) {
    ellipse(ctx, x, y - frame, 1.8, 2.3);
    ctx.fillStyle = PASTE;
    ctx.fill();
    ink(ctx, 1);
  }
}

export function drawMark(ctx: CanvasRenderingContext2D): void {
  const c = MARK.w / 2;
  const y = MARK.h / 2;
  ctx.save();
  ctx.globalAlpha = 0.3;
  ellipse(ctx, c, y, c - 4, y - 3);
  ctx.fillStyle = '#5a1d1d';
  ctx.fill();
  ctx.restore();
  ctx.setLineDash([5, 4]);
  ellipse(ctx, c, y, c - 4, y - 3);
  ctx.strokeStyle = '#b4282d';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.setLineDash([]);
}

export function drawPuff(ctx: CanvasRenderingContext2D, frame: number): void {
  const u = frame / (PUFF.frames - 1);
  ctx.save();
  ctx.globalAlpha = 1 - u * 0.8;
  for (const [dx, dy, r] of [[-9, 2, 7], [0, -3, 9], [9, 2, 7], [3, 5, 6]] as const) {
    ellipse(ctx, PUFF.w / 2 + dx * (1 + u), PUFF.h * 0.6 + dy - u * 6, r * (0.6 + u * 0.7), r * (0.55 + u * 0.6));
    ctx.fillStyle = '#efe2c4';
    ctx.fill();
    ink(ctx, 1.4);
  }
  ctx.restore();
}

export function drawStar(ctx: CanvasRenderingContext2D): void {
  const c = STAR.w / 2;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * TAU;
    const rr = i % 2 ? 3 : 7;
    ctx.lineTo(c + Math.cos(a) * rr, c + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffd84a';
  ctx.fill();
  ink(ctx, 1.4);
}

/** Floor shadow under the boss (stays on the road when he leaps). */
export function drawShadow(ctx: CanvasRenderingContext2D): void {
  contactShadow(ctx, SHADOW.w / 2, SHADOW.h / 2, SHADOW.w / 2 - 2, 0.32);
}
