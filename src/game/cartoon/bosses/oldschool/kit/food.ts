/**
 * Burger ingredients in the rubber-hose style for the BOSS-C bosses (canvas 2D in world units, no Phaser):
 * lumpy beef patty (the frisbee), wavy bacon (the flicked strips), sauce drops.
 */
import { INK, LINE } from '../../../draw/canvas';
import { C, cel, ell, gloss, hose, smooth, type Pt } from './style';

type Ctx = CanvasRenderingContext2D;

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
