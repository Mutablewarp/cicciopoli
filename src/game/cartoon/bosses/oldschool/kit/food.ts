/**
 * Burger ingredients in the rubber-hose style for the BOSS-C bosses (canvas 2D in world units, no Phaser):
 * domed sesame bun, bottom bun, lumpy beef patty, dripping cheddar, wavy bacon, sauce drops.
 */
import { INK, LINE } from '../../../draw/canvas';
import { C, cel, ell, gloss, hose, smooth, type Pt } from './style';

type Ctx = CanvasRenderingContext2D;

/** Domed top bun: flat bottom at y = bottom, centre cx. */
export function bunTop(ctx: Ctx, cx: number, bottom: number, w: number, h: number, seeds = true, lw = LINE): void {
  const l = cx - w / 2;
  const r = cx + w / 2;
  cel(ctx, (c) => {
    c.beginPath();
    c.moveTo(l, bottom);
    c.bezierCurveTo(l - w * 0.03, bottom - h * 1.33, r + w * 0.03, bottom - h * 1.33, r, bottom);
    c.quadraticCurveTo(cx, bottom + h * 0.16, l, bottom);
    c.closePath();
  }, C.bun, C.bunShade, w * 0.07, h * 0.15, lw);
  gloss(ctx, cx - w * 0.2, bottom - h * 0.74, w * 0.17, h * 0.11, -0.45, 0.5);
  if (!seeds) return;
  const at: readonly (readonly [number, number, number])[] = [
    [-0.3, 0.5, 0.5], [-0.1, 0.78, -0.3], [0.12, 0.66, 0.4], [0.3, 0.45, -0.6], [-0.02, 0.4, 0.1], [0.2, 0.86, 0.2], [-0.38, 0.24, 0.9],
  ];
  for (const [fx, fy, rot] of at) {
    ell(ctx, cx + fx * w, bottom - fy * h, w * 0.028, w * 0.015, rot);
    ctx.fillStyle = C.seed;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw * 0.45;
    ctx.stroke();
  }
}

/** Bottom bun: flat top at y = top. */
export function bunBottom(ctx: Ctx, cx: number, top: number, w: number, h: number, lw = LINE): void {
  const l = cx - w / 2;
  const r = cx + w / 2;
  cel(ctx, (c) => {
    c.beginPath();
    c.moveTo(l, top);
    c.lineTo(r, top);
    c.bezierCurveTo(r + w * 0.03, top + h * 0.9, r - w * 0.05, top + h, r - w * 0.13, top + h);
    c.lineTo(l + w * 0.13, top + h);
    c.bezierCurveTo(l + w * 0.05, top + h, l - w * 0.03, top + h * 0.9, l, top);
    c.closePath();
  }, C.bun, C.bunShade, w * 0.05, h * 0.3, lw);
}

/** Lumpy grilled beef patty centred on (cx, cy). */
export function patty(ctx: Ctx, cx: number, cy: number, w: number, h: number, lw = LINE): void {
  const pts: Pt[] = [];
  const n = 30;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = 1 + 0.06 * Math.sin(5 * a + 1) + 0.035 * Math.sin(13 * a);
    pts.push([cx + Math.cos(a) * (w / 2) * rr, cy + Math.sin(a) * (h / 2) * rr]);
  }
  cel(ctx, (c) => {
    smooth(c, pts);
    c.closePath();
  }, C.patty, C.pattyDark, w * 0.03, h * 0.22, lw);
  ctx.strokeStyle = C.pattyDark;
  ctx.lineWidth = lw * 0.7;
  for (let i = 0; i < 5; i++) {
    const x = cx - w * 0.36 + i * w * 0.18;
    ctx.beginPath();
    ctx.moveTo(x, cy - h * 0.12);
    ctx.quadraticCurveTo(x + w * 0.04, cy - h * 0.2, x + w * 0.08, cy - h * 0.1);
    ctx.stroke();
  }
  ctx.fillStyle = C.pattyLight;
  for (let i = 0; i < 6; i++) {
    ell(ctx, cx - w * 0.32 + i * w * 0.13, cy - h * (i % 2 ? 0.25 : 0.05), w * 0.016, h * 0.07);
    ctx.fill();
  }
}

/** Cheddar slice whose top edge sits at y, corners drooping, drips = [x offset, length] hanging down. */
export function cheese(ctx: Ctx, cx: number, y: number, w: number, drips: readonly (readonly [number, number])[], lw = LINE, color: string = C.cheddar): void {
  const l = cx - w / 2;
  const r = cx + w / 2;
  const sorted = [...drips].sort((a, b) => b[0] - a[0]);
  cel(ctx, (c) => {
    c.beginPath();
    c.moveTo(l - 5, y + 6);
    c.lineTo(l + 3, y - 1);
    c.lineTo(r - 3, y - 1);
    c.lineTo(r + 5, y + 7);
    c.lineTo(r - 4, y + 4);
    for (const [dx, len] of sorted) {
      const x = cx + dx;
      c.lineTo(x + 4, y + 4);
      c.quadraticCurveTo(x + 4, y + len, x, y + len + 2);
      c.quadraticCurveTo(x - 4, y + len, x - 4, y + 4);
    }
    c.lineTo(l + 4, y + 4);
    c.closePath();
  }, color, C.cheddarShade, 1.2, 1.6, lw);
  ctx.strokeStyle = C.cheddarLight;
  ctx.lineWidth = lw * 0.8;
  ctx.beginPath();
  ctx.moveTo(l + 6, y + 1.2);
  ctx.lineTo(cx, y + 1.2);
  ctx.stroke();
}

/** Wavy bacon strip from x0 to x1 around y (amp = wave height, th = thickness). */
export function bacon(ctx: Ctx, x0: number, x1: number, y: number, amp: number, th: number, waves = 2, color: string = C.bacon, fat: string = C.baconFat, lw = LINE): void {
  const pts: Pt[] = [];
  const n = 18;
  for (let i = 0; i <= n; i++) pts.push([x0 + ((x1 - x0) * i) / n, y + Math.sin((i / n) * waves * Math.PI * 2) * amp]);
  hose(ctx, pts, th, color, lw);
  smooth(ctx, pts.map(([x, yy]): Pt => [x, yy - th * 0.12]));
  ctx.strokeStyle = fat;
  ctx.lineWidth = th * 0.26;
  ctx.stroke();
  smooth(ctx, pts.map(([x, yy]): Pt => [x, yy + th * 0.3]));
  ctx.strokeStyle = C.baconDark;
  ctx.lineWidth = th * 0.12;
  ctx.stroke();
}

/** A sauce drop (tear shape pointing up), for squirts and puddles. */
export function sauceDrop(ctx: Ctx, x: number, y: number, r: number, color: string, lw = LINE): void {
  ctx.beginPath();
  ctx.moveTo(x, y - r * 1.7);
  ctx.bezierCurveTo(x + r * 0.5, y - r * 0.9, x + r * 1.05, y - r * 0.4, x + r, y + r * 0.1);
  ctx.arc(x, y + r * 0.1, r, 0, Math.PI);
  ctx.bezierCurveTo(x - r * 1.05, y - r * 0.4, x - r * 0.5, y - r * 0.9, x, y - r * 1.7);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.stroke();
  gloss(ctx, x - r * 0.35, y - r * 0.15, r * 0.25, r * 0.42, 0.3, 0.75);
}
