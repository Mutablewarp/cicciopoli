/**
 * THE OLD SCHOOL art (canvas 2D in world units, no Phaser): the smiling burger of the shirt (round shades
 * low on the nose, pie-cut eyes peeking over them, double cheddar dripping, double bacon, caramelised
 * onion), its little waving rubber-hose arm, the two living sauce bottles and the projectiles.
 */
import { INK, LINE } from '../../draw/canvas';
import { bacon, bunBottom, bunTop, cheese, patty, sauceDrop } from './kit/food';
import { C, capsule, ell, gloss, glove, hose, pieEye, shades } from './kit/style';

type Ctx = CanvasRenderingContext2D;

export const BURGER = { w: 112, h: 100, footY: 97 } as const;
/** burger faces: sheet frames */
export const FACE = { smile: 0, shout: 1, hurt: 2, angry: 3, ko: 4 } as const;
export const ARM = { w: 56, h: 56, sx: 46, sy: 28 } as const;
export const ARM_POSE = { waveA: 0, waveB: 1, windUp: 2, throw: 3, limp: 4 } as const;
export const BOTTLE = { w: 30, h: 56 } as const;
export const BACON = { w: 50, h: 20 } as const;
export const DROP = { w: 26, h: 34 } as const;
/** sauce drop frames */
export const SAUCE = { bbq: 0, white: 1, pink: 2 } as const;

const BBQ = '#7b3218';
const WHITE_SAUCE = '#f3eedf';
/** sauce colours by SAUCE frame (also the splash tint) */
export const SAUCE_COLOR: readonly string[] = [BBQ, WHITE_SAUCE, C.pink];
const ONION = '#a2621f';
const BLUSH = 'rgba(232, 88, 106, 0.38)';

function brows(ctx: Ctx, tilt: number, lift: number): void {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(56 + s * 17, 13 - lift + tilt * 3);
    ctx.quadraticCurveTo(56 + s * 11, 9 - lift, 56 + s * 4, 12 - lift - tilt * 4);
    ctx.stroke();
  }
}

function mouthPath(ctx: Ctx, f: number): void {
  ctx.beginPath();
  if (f === FACE.shout) {
    ctx.ellipse(56, 51, 11, 8.5, 0, 0, Math.PI * 2);
  } else if (f === FACE.angry) {
    ctx.moveTo(40, 46);
    ctx.quadraticCurveTo(56, 42, 72, 46);
    ctx.quadraticCurveTo(73, 54, 66, 55);
    ctx.lineTo(46, 55);
    ctx.quadraticCurveTo(39, 54, 40, 46);
  } else if (f === FACE.ko) {
    ctx.moveTo(44, 47);
    ctx.quadraticCurveTo(56, 44, 68, 48);
    ctx.quadraticCurveTo(62, 58, 50, 56);
    ctx.quadraticCurveTo(43, 54, 44, 47);
  } else {
    ctx.moveTo(37, 45);
    ctx.quadraticCurveTo(56, 49, 75, 44);
    ctx.quadraticCurveTo(70, 63, 56, 63);
    ctx.quadraticCurveTo(41, 63, 37, 45);
  }
  ctx.closePath();
}

function mouth(ctx: Ctx, f: number): void {
  if (f === FACE.hurt) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = LINE;
    ctx.beginPath();
    ctx.moveTo(44, 52);
    for (let i = 1; i <= 6; i++) ctx.lineTo(44 + i * 4, 52 + (i % 2 ? -2.5 : 0));
    ctx.stroke();
    return;
  }
  mouthPath(ctx, f);
  ctx.fillStyle = C.mouth;
  ctx.fill();
  ctx.save();
  mouthPath(ctx, f);
  ctx.clip();
  if (f === FACE.angry) {
    ctx.fillStyle = C.white;
    ctx.fillRect(38, 44, 36, 12);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.2;
    for (let x = 44; x < 72; x += 5) {
      ctx.beginPath();
      ctx.moveTo(x, 44);
      ctx.lineTo(x, 56);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(38, 50);
    ctx.lineTo(74, 50);
    ctx.stroke();
  } else {
    ctx.fillStyle = C.white;
    ctx.fillRect(36, 40, 40, f === FACE.shout ? 4 : 7.5);
    ell(ctx, 58, f === FACE.shout ? 58 : 61, 9, 6);
    ctx.fillStyle = C.tongue;
    ctx.fill();
  }
  ctx.restore();
  mouthPath(ctx, f);
  ctx.strokeStyle = INK;
  ctx.lineWidth = LINE;
  ctx.stroke();
  if (f === FACE.ko) {
    capsule(ctx, 58, 54, 61, 63, 4, C.tongue, 1.6);
  }
}

function eyes(ctx: Ctx, f: number): void {
  if (f === FACE.hurt) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.6;
    for (const s of [-1, 1]) {
      const x = 56 + s * 11;
      ctx.beginPath();
      ctx.moveTo(x - 5 * s, 19);
      ctx.lineTo(x + 4 * s, 24);
      ctx.lineTo(x - 5 * s, 29);
      ctx.stroke();
    }
    return;
  }
  if (f === FACE.ko) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
    for (const s of [-1, 1]) {
      const x = 56 + s * 11;
      ell(ctx, x, 24, 7.5, 8.5);
      ctx.fillStyle = C.white;
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 5; a += 0.3) ctx.lineTo(x + Math.cos(a * s) * a * 0.42, 24 + Math.sin(a * s) * a * 0.48);
      ctx.stroke();
    }
    return;
  }
  const look = f === FACE.angry ? -0.8 : -0.35;
  const ry = f === FACE.shout ? 10.5 : 9;
  pieEye(ctx, 45, 22, 7.5, ry, look, -0.5);
  pieEye(ctx, 67, 22, 7.5, ry, look, -0.5);
}

/** The burger, bottom-centre at (56, 97). Frames = FACE. */
export function drawBurger(ctx: Ctx, f: number): void {
  bunBottom(ctx, 56, 82, 86, 15);
  patty(ctx, 56, 76, 98, 15);
  cheese(ctx, 56, 67, 94, [[-31, 12], [5, 20], [33, 9]]);
  cheese(ctx, 54, 63, 90, [[-12, 8], [24, 13]], LINE, C.cheddarLight);
  bacon(ctx, 1, 111, 61, 2.4, 7, 2.5);
  ctx.strokeStyle = ONION;
  ctx.lineWidth = 2.4;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(18 + i * 15, 59, 5, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  }
  bunTop(ctx, 56, 59, 104, 50);
  ell(ctx, 32, 44, 7, 4.5);
  ctx.fillStyle = BLUSH;
  ctx.fill();
  ell(ctx, 80, 44, 7, 4.5);
  ctx.fill();
  eyes(ctx, f);
  if (f === FACE.angry) brows(ctx, 1.4, 1);
  else if (f === FACE.shout) brows(ctx, -0.6, 4);
  else if (f !== FACE.hurt && f !== FACE.ko) brows(ctx, -0.2, 1);
  ell(ctx, 56, 39, 4.6, 3.6);
  ctx.fillStyle = C.bunLight;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  mouth(ctx, f);
  if (f === FACE.ko) shades(ctx, 58, 41, 8, 23, 1, LINE, 0.38);
  else shades(ctx, 56, 37.5, 7, 22);
  if (f === FACE.hurt) sauceDrop(ctx, 86, 22, 3, '#bfe6f2', 1.2);
}

/** Little rubber-hose arm, shoulder at (ARM.sx, ARM.sy). Frames = ARM_POSE. */
export function drawArm(ctx: Ctx, f: number): void {
  const s: [number, number] = [ARM.sx, ARM.sy];
  const poses: readonly (readonly [readonly [number, number], readonly [number, number], number, 'open' | 'fist'])[] = [
    [[33, 20], [19, 13], -2.3, 'open'],
    [[32, 24], [21, 17], -1.7, 'open'],
    [[48, 18], [42, 13], -1.3, 'fist'],
    [[30, 30], [14, 30], Math.PI + 0.1, 'open'],
    [[42, 36], [38, 38], 1.9, 'open'],
  ];
  const [mid, hand, ang, shape] = poses[f] ?? poses[0];
  hose(ctx, [s, mid, hand], 5, INK, 0.6);
  glove(ctx, hand[0], hand[1], 8.5, ang, shape, f === ARM_POSE.throw);
}

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
