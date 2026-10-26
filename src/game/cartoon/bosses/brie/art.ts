/**
 * Monsieur Brie's vector bits that are not cut from the shirt (world units): the shirt's flat print
 * palette, the baguette as printed in his basket (white loaf, black scores; also the projectile) and the
 * knockout puddle the wedge melts into.
 */
import { contactShadow, ink, smooth, spiralEye } from './kit/toon';

/** The print colours of the "Brie with friends" shirt (ink, paper white, cheese, bicycle blue). */
export const SHIRT = { ink: '#1b1817', white: '#f8f5ed', cheese: '#fad492', blue: '#2c71be', tongue: '#e9747c' } as const;
/** Loaf body (white as printed) and the cheese of the hazards. */
export const CRUST = '#f4ead2';
export const PASTE = SHIRT.cheese;
export const PUDDLE = { w: 160, h: 90, footX: 80, footY: 82 } as const;

/** A loaf (also the projectile): centred at (x, y), along angle a; ink outline and diagonal scores. */
export function loaf(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, a: number, fill: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  const h = len * 0.13;
  smooth(ctx, [[-len / 2, 0], [-len / 2 + 6, -h], [len / 2 - 6, -h], [len / 2, 0], [len / 2 - 6, h], [-len / 2 + 6, h]]);
  ctx.fillStyle = fill;
  ctx.fill();
  ink(ctx, 1.8);
  ctx.beginPath();
  for (let i = -2; i <= 2; i++) {
    ctx.moveTo(i * len * 0.16 - 3.5, -h * 0.6);
    ctx.quadraticCurveTo(i * len * 0.16, -h * 0.1, i * len * 0.16 + 3.5, h * 0.35);
  }
  ink(ctx, 1.3);
  ctx.restore();
}

/** KO frames: 0 slumping, 1 half melted, 2 / 3 a cheese puddle with its rind and spinning dizzy eyes. */
export function drawPuddle(ctx: CanvasRenderingContext2D, frame: number): void {
  const cx = PUDDLE.footX;
  const fy = PUDDLE.footY;
  contactShadow(ctx, cx, fy, 70, 0.25);
  const h = [70, 38, 16, 16][frame] ?? 16;
  const w = [46, 62, 74, 74][frame] ?? 74;
  const blob = (s: number): void =>
    smooth(ctx, [[cx - w * s, fy], [cx - w * 0.7 * s, fy - h * 0.5 * s], [cx - w * 0.3, fy - h * s], [cx + w * 0.25, fy - h * 0.95 * s], [cx + w * 0.75 * s, fy - h * 0.45 * s], [cx + w * s, fy], [cx, fy + 3]]);
  blob(1);
  ctx.fillStyle = SHIRT.white;
  ctx.fill();
  ink(ctx, 2.2);
  blob(0.8);
  ctx.fillStyle = SHIRT.cheese;
  ctx.fill();
  ink(ctx, 1.4);
  const ey = fy - h - (frame >= 2 ? 6 : -h * 0.45);
  for (const ex of [cx - 14, cx + 10]) spiralEye(ctx, ex, ey, 8, frame === 3 ? Math.PI : 0);
  smooth(ctx, [[cx - 3, ey + 13], [cx + 6, ey + 12], [cx + 5, ey + 22], [cx - 2, ey + 20]]);
  ctx.fillStyle = SHIRT.tongue;
  ctx.fill();
  ink(ctx, 1.4);
}
