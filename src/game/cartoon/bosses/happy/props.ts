/**
 * HAPPY BOX props and projectiles (vector): spray-paint clouds (the PINK smiley one is parryable), paint
 * drops, the mini Happy boxes, the spray-can rocket, its lane warning, paint splats and the phase-2 mess.
 */
import { INK, LINE, inked } from '../../draw/canvas';
import { type Ctx, WHITE, ell, pieEye, seeded, shutEye, sparkle, splatDrawer } from '../tuma/kit/toon';
import { BLUE, ROCKET_TONE, sprayCan } from './art';
import { BODY, MINI, PAINT, ROCKET } from './config';

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

/** Mini Happy box (MINI): 0 standing, 1 jumping (feet tucked), 2 landing squash. Body centred. */
export function drawMini(ctx: Ctx, f: number): void {
  const sq = f === 2 ? 1.18 : 1;
  ctx.save();
  ctx.translate(MINI.w / 2, MINI.h * 0.56);
  ctx.scale((sq * MINI.w) / 34, MINI.h / 36 / sq);
  const feetY = f === 1 ? 9 : 13;
  for (const x of [-6, 6]) {
    ell(ctx, x * 1.2, feetY, 5.5, 3);
    inked(ctx, BLUE.base, LINE * 0.7);
  }
  ctx.beginPath();
  ctx.moveTo(-11, -9);
  ctx.lineTo(11, -10);
  ctx.lineTo(9, 10);
  ctx.lineTo(-9, 10);
  ctx.closePath();
  inked(ctx, BLUE.base, LINE * 0.9);
  ctx.beginPath();
  ctx.moveTo(-6, -10);
  ctx.bezierCurveTo(-5, -19, 5, -19, 6, -10);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3 + LINE * 1.4;
  ctx.stroke();
  ctx.strokeStyle = '#f6c443';
  ctx.lineWidth = 3;
  ctx.stroke();
  pieEye(ctx, -4, -3, 3.2, 4.3, -0.7, 0, 0, BLUE.base);
  pieEye(ctx, 4, -3.5, 3.2, 4.3, -0.7, 0, 0, BLUE.base);
  ctx.beginPath();
  ctx.moveTo(-6, 3);
  ctx.quadraticCurveTo(0, 9, 6, 3);
  ctx.closePath();
  inked(ctx, WHITE, LINE * 0.6);
  ctx.restore();
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

/** Phase-2 paint mess over the box (same frame as the body sheet: the box never moves in it). */
export function drawMess(ctx: Ctx): void {
  const top = BODY.h - 200;
  const r = seeded(5);
  for (const [x, y, rr, c] of [[74, 66, 7, '#f6d23c'], [120, 70, 6, '#4fd1a8'], [70, 140, 8, '#ff9a3c'], [138, 112, 6, '#f6d23c'], [112, 146, 5, WHITE]] as const) {
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const q = rr * (0.7 + r() * 0.5);
      ctx.lineTo(x + Math.cos(a) * q, top + y + Math.sin(a) * q);
    }
    ctx.closePath();
    ctx.fillStyle = c;
    ctx.fill();
    ctx.fillRect(x - 1.2, top + y, 2.4, rr * 1.6 + r() * 6);
  }
  for (const [x, c] of [[64, '#4fd1a8'], [96, '#f6d23c'], [126, '#ff9a3c']] as const) {
    ctx.beginPath();
    ctx.moveTo(x - 6, top + 50);
    ctx.quadraticCurveTo(x, top + 44, x + 6, top + 50);
    ctx.lineTo(x + 2, top + 62);
    ctx.arc(x, top + 62, 2, 0, Math.PI);
    ctx.closePath();
    inked(ctx, c, LINE * 0.6);
  }
}
