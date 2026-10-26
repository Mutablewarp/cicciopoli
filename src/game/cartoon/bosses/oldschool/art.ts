/**
 * THE OLD SCHOOL props (canvas 2D in world units, no Phaser): the two living sauce bottles on the counter and
 * the projectiles. The burger and the giant hand are the shirt's own art (look.ts).
 */
import { INK, LINE } from '../../draw/canvas';
import { bacon, sauceDrop } from './kit/food';
import { C, gloss, pieEye } from './kit/style';

type Ctx = CanvasRenderingContext2D;

export const BOTTLE = { w: 30, h: 56 } as const;
export const BACON = { w: 50, h: 20 } as const;
export const DROP = { w: 26, h: 34 } as const;
/** sauce drop frames */
export const SAUCE = { bbq: 0, white: 1, pink: 2 } as const;

const BBQ = '#7b3218';
const WHITE_SAUCE = '#f3eedf';
/** sauce colours by SAUCE frame (also the splash tint) */
export const SAUCE_COLOR: readonly string[] = [BBQ, WHITE_SAUCE, C.pink];

/** Living squeeze bottle: 0 BBQ, 1 BBQ squeezed, 2 WHITE, 3 WHITE squeezed. Feet at y 55. */
export function drawBottle(ctx: Ctx, f: number): void {
  const white = f >= 2;
  const squeezed = f % 2 === 1;
  const body = white ? WHITE_SAUCE : BBQ;
  const shade = white ? '#cfc6ae' : '#4f1d0d';
  const sx = squeezed ? 1.18 : 1;
  const top = squeezed ? 26 : 20;
  const l = 15 - 10 * sx;
  const r = 15 + 10 * sx;
  ctx.beginPath();
  ctx.moveTo(15, 1);
  ctx.lineTo(17, top - 9);
  ctx.lineTo(13, top - 9);
  ctx.closePath();
  ctx.fillStyle = '#d9412f';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(8, top);
  ctx.quadraticCurveTo(9, top - 9, 15, top - 9);
  ctx.quadraticCurveTo(21, top - 9, 22, top);
  ctx.closePath();
  ctx.fillStyle = '#d9412f';
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(l + 2, top);
  ctx.lineTo(r - 2, top);
  ctx.quadraticCurveTo(r + 1, 40, r - 1, 54);
  ctx.lineTo(l + 1, 54);
  ctx.quadraticCurveTo(l - 1, 40, l + 2, top);
  ctx.closePath();
  ctx.fillStyle = body;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = shade;
  ctx.fillRect(r - 5, top, 6, 40);
  ctx.fillStyle = '#f6e7b8';
  ctx.fillRect(l, 38, r - l, 11);
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = LINE;
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = `bold ${white ? 4.6 : 6}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.fillText(white ? 'WHITE' : 'BBQ', 15, 46);
  const eyeY = top + 7;
  pieEye(ctx, 11.5, eyeY, 2.8, 3.6, squeezed ? 0 : -0.6, 0, 1, squeezed ? 0.45 : 0, body);
  pieEye(ctx, 18.5, eyeY, 2.8, 3.6, squeezed ? 0 : -0.6, 0, 1, squeezed ? 0.45 : 0, body);
  ctx.beginPath();
  if (squeezed) ctx.ellipse(15, top + 13, 2.6, 1.8, 0, 0, Math.PI * 2);
  else ctx.arc(15, top + 11.5, 3, 0.2, Math.PI - 0.2);
  ctx.strokeStyle = white ? INK : C.white;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  gloss(ctx, l + 4, top + 6, 1.4, 4, 0, 0.6);
}

/** Bacon projectile: 0 normal, 1 pink (parryable). */
export function drawBaconShot(ctx: Ctx, f: number): void {
  if (f === 1) bacon(ctx, 5, 45, 10, 3.2, 8, 1.5, C.pink, C.pinkLight);
  else bacon(ctx, 5, 45, 10, 3.2, 8, 1.5);
}

/** Sauce drop projectile: SAUCE frames. */
export function drawSauce(ctx: Ctx, f: number): void {
  sauceDrop(ctx, 13, 21, 9.5, SAUCE_COLOR[f] ?? BBQ);
}
