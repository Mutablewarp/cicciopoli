/**
 * HAPPY BOX props and projectiles (vector): spray-paint clouds (the PINK smiley one is parryable), paint
 * drops, the spray-can rocket, its lane warning, paint splats and the phase-2 wall splashes.
 */
import { INK, LINE, inked } from '../../draw/canvas';
import { type Ctx, WHITE, ell, pieEye, seeded, shutEye, sparkle, splatDrawer } from '../tuma/kit/toon';
import { PAINT, ROCKET } from './config';

/** The rocket can is teal: on screen, pink always means parryable. */
const ROCKET_TONE = ['#7fe0c4', '#26b08a', '#13705a'] as const;

/** A spray can (centre x, y; rot 0 = nozzle up), body tones light / mid / dark. */
function sprayCan(ctx: Ctx, x: number, y: number, rot: number, s: number, tone: readonly [string, string, string]): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.roundRect(-8, -14, 16, 30, 3);
  const g = ctx.createLinearGradient(-8, 0, 8, 0);
  g.addColorStop(0, tone[0]);
  g.addColorStop(0.4, tone[1]);
  g.addColorStop(1, tone[2]);
  inked(ctx, g, LINE * 0.8);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(-5, -11, 2.4, 24);
  ctx.beginPath();
  ctx.moveTo(-7, -14);
  ctx.quadraticCurveTo(0, -24, 7, -14);
  ctx.closePath();
  inked(ctx, '#aab2bc', LINE * 0.8);
  ctx.beginPath();
  ctx.rect(-2.5, -24, 5, 5);
  inked(ctx, '#e8eef2', LINE * 0.6);
  ctx.beginPath();
  ctx.rect(-8, 12, 16, 4);
  inked(ctx, '#9aa3ad', LINE * 0.6);
  ctx.restore();
}

/** Spray clouds (PUFF): one frame per PAINT colour; the last one (pink) wears a smile. */
export function drawPuff(ctx: Ctx, f: number): void {
  const c = PAINT[f];
  const r = seeded(40 + f);
  ctx.fillStyle = c;
  for (let i = 0; i < 26; i++) {
    ctx.globalAlpha = 0.25 + r() * 0.3;
    const a = r() * Math.PI * 2;
    const d = 15 + r() * 6;
    ell(ctx, 24 + Math.cos(a) * d, 22 + Math.sin(a) * d * 0.85, 1 + r() * 1.6, 1 + r() * 1.6);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.beginPath();
  for (const [x, y, rr] of [[16, 25, 9], [24, 17, 11], [33, 24, 9], [24, 29, 9]] as const) {
    ctx.moveTo(x + rr, y);
    ctx.arc(x, y, rr, 0, Math.PI * 2);
  }
  inked(ctx, c, LINE * 0.9);
  ctx.beginPath();
  for (const [x, y, rr] of [[16, 25, 9], [24, 17, 11], [33, 24, 9], [24, 29, 9]] as const) {
    ctx.moveTo(x + rr - 0.5, y);
    ctx.arc(x, y, rr - 0.5, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ell(ctx, 19, 13, 4, 2.4, -0.4);
  ctx.fill();
  if (f !== PAINT.length - 1) return;
  shutEye(ctx, 19, 22, 3.2, true);
  shutEye(ctx, 29, 22, 3.2, true);
  ctx.beginPath();
  ctx.arc(24, 26, 5, 0.2, Math.PI - 0.2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = LINE * 0.8;
  ctx.stroke();
  sparkle(ctx, 38, 9, 5, WHITE);
}

/** Paint drops (DROP): one frame per PAINT colour except pink. */
export function drawDrop(ctx: Ctx, f: number): void {
  ctx.beginPath();
  ctx.moveTo(8, 2);
  ctx.bezierCurveTo(10, 8, 15, 11, 15, 15);
  ctx.arc(8, 15, 7, 0, Math.PI);
  ctx.bezierCurveTo(1, 11, 6, 8, 8, 2);
  ctx.closePath();
  inked(ctx, PAINT[f], LINE * 0.8);
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ell(ctx, 5.5, 14, 1.5, 3, 0.3);
  ctx.fill();
}

/** The spray-can rocket flying left (ROCKET): teal, so it never reads as a pink parryable. 2 jet frames. */
export function drawRocket(ctx: Ctx, f: number): void {
  const r = seeded(9 + f);
  ctx.scale(ROCKET.w / 56, ROCKET.h / 26);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 4; i++) {
    const y = 6 + i * 5;
    ctx.beginPath();
    ctx.moveTo(44 + r() * 4, y);
    ctx.lineTo(56, y);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(40, 9);
  ctx.quadraticCurveTo(54 + f * 4, 13, 40, 17);
  ctx.closePath();
  inked(ctx, f ? '#ffd45a' : '#ff9a3c', LINE * 0.6);
  sprayCan(ctx, 28, 13, -Math.PI / 2, 0.9, ROCKET_TONE);
  pieEye(ctx, 18, 9, 3, 3.8, -0.9, 0.2, 0.3, '#26b08a');
  pieEye(ctx, 25, 9, 3, 3.8, -0.9, 0.2, 0.3, '#26b08a');
}

/** Lane warning (LANE): a dashed graffiti arrow pointing left, at the rocket's height. */
export function drawLane(ctx: Ctx): void {
  ctx.setLineDash([12, 8]);
  ctx.beginPath();
  ctx.moveTo(18, 8);
  ctx.lineTo(392, 8);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.strokeStyle = '#ffcf3a';
  ctx.lineWidth = 3.4;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(4, 8);
  ctx.lineTo(20, 1);
  ctx.lineTo(20, 15);
  ctx.closePath();
  inked(ctx, '#ffcf3a', LINE * 0.8);
}

/** Paint splats on the floor (SPLAT sheet): yellow, teal, orange, pink. */
export const drawSplat = splatDrawer(PAINT);

/** Big paint splashes for the walls (DECAL, 4 frames) when he goes wild in phase 2. */
export function drawDecal(ctx: Ctx, f: number): void {
  const r = seeded(70 + f);
  const c = ['#f6d23c', '#4fd1a8', '#ff9a3c', WHITE][f];
  ctx.fillStyle = c;
  ctx.beginPath();
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const rr = 15 + r() * 12;
    ctx.lineTo(35 + Math.cos(a) * rr, 26 + Math.sin(a) * rr * 0.75);
  }
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 7; i++) {
    const a = r() * Math.PI * 2;
    ell(ctx, 35 + Math.cos(a) * (26 + r() * 6), 26 + Math.sin(a) * 20, 1.5 + r() * 2.5, 1.5 + r() * 2.5);
    ctx.fill();
  }
  for (let i = 0; i < 3; i++) {
    const x = 26 + i * 9 + r() * 4;
    ctx.fillRect(x, 30, 3, 14 + r() * 10);
  }
}
