/**
 * Ciccio's head after the owner's drawing (ref/level8_ciccio_hero.png) and the logo: big round chubby
 * face, slick black wavy hair with a side part, thick expressive eyebrows, round black sunglasses with
 * a glint (they pop up on a hit and show pie-cut eyes), button nose, cheeky smile, ear. Local origin =
 * pose.ts HEAD, facing right in three-quarter view.
 */
import { INK, LINE } from '../draw/canvas';
import { HERO_COL } from './config';
import type { Pose } from './anatomy';

/** The features sit nearly frontal, like the drawing (shifted left of the face's 3/4 centre). */
const FEATURES_DX = -3.4;
const EAR_X = -10.6;

const LENS = [
  { x: 1.6, y: -0.8, r: 3.2 },
  { x: 8.4, y: -1, r: 2.9 },
] as const;

function stroke(ctx: CanvasRenderingContext2D, w: number, col: string = INK): void {
  ctx.strokeStyle = col;
  ctx.lineWidth = w;
  ctx.stroke();
}

function fillInk(ctx: CanvasRenderingContext2D, fill: string, w: number): void {
  ctx.fillStyle = fill;
  ctx.fill();
  stroke(ctx, w);
}

function ear(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.ellipse(EAR_X, 1.4, 2.8, 3.4, -0.15, 0, Math.PI * 2);
  fillInk(ctx, HERO_COL.skin, 1.6);
  ctx.beginPath();
  ctx.arc(EAR_X - 0.3, 1.6, 1.4, -2.4, 1.4);
  stroke(ctx, 0.8);
}

function facePath(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.moveTo(0.5, -10);
  ctx.bezierCurveTo(7, -10, 11.4, -5.6, 11.4, -0.4);
  ctx.bezierCurveTo(11.6, 5.2, 8.2, 9.8, 2.2, 10.1);
  ctx.bezierCurveTo(-4.2, 10.4, -9.4, 7, -10.2, 1.6);
  ctx.bezierCurveTo(-11, -4.6, -6.6, -10, 0.5, -10);
  ctx.closePath();
}

function face(ctx: CanvasRenderingContext2D): void {
  facePath(ctx);
  ctx.fillStyle = HERO_COL.skin;
  ctx.fill();
  ctx.save();
  facePath(ctx);
  ctx.clip();
  // one soft shade under the jaw, a touch of blush on the near cheek
  ctx.fillStyle = HERO_COL.skinShade;
  ctx.beginPath();
  ctx.ellipse(-1, 12.6, 9, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = HERO_COL.blush;
  ctx.beginPath();
  ctx.ellipse(7.4, 4.6, 2.4, 1.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  facePath(ctx);
  stroke(ctx, LINE);
}

function hair(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.moveTo(-8.2, 0.4);
  ctx.bezierCurveTo(-9.8, -0.4, -11.8, -2.6, -11.4, -6.6);
  ctx.bezierCurveTo(-11.6, -11.8, -6.4, -14.4, -2.6, -13.4);
  ctx.bezierCurveTo(-0.6, -15.4, 4.4, -15.2, 6, -12.8);
  ctx.bezierCurveTo(9.2, -13, 11, -10.4, 10, -8);
  ctx.bezierCurveTo(9.4, -6.8, 8.2, -7.2, 7.6, -8);
  ctx.bezierCurveTo(5.6, -7.6, 3, -8, 1.4, -9.8);
  ctx.bezierCurveTo(-1.2, -8.2, -5, -8.2, -7.4, -6);
  ctx.bezierCurveTo(-7.8, -3, -8, -1.4, -8.2, 0.4);
  ctx.closePath();
  fillInk(ctx, HERO_COL.hair, 1.8);
  ctx.lineCap = 'round';
  for (const [x1, y1, cx, cy, x2, y2] of [
    [-9.6, -5, -10, -10.4, -5.4, -12],
    [-2.4, -11.4, 1, -13.4, 4.8, -12.2],
    [5.4, -10.4, 7.8, -11.8, 8.8, -9.6],
  ]) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(cx, cy, x2, y2);
    stroke(ctx, 0.7, HERO_COL.hairHi);
  }
}

function brows(ctx: CanvasRenderingContext2D, brow: number): void {
  const up = Math.max(-1, Math.min(1.6, brow)) * 0.6;
  const knit = Math.max(0, -brow) * 0.5;
  for (const [x1, x2, inner] of [
    [-0.4, 4.4, 4.4],
    [6.4, 11, 6.4],
  ]) {
    const y = -5.5 - up;
    ctx.beginPath();
    ctx.moveTo(x1, y + (x1 === inner ? knit : 0));
    ctx.quadraticCurveTo((x1 + x2) / 2, y - 2, x2, y + (x2 === inner ? knit : 0));
    ctx.lineCap = 'round';
    stroke(ctx, 1.9);
  }
}

function eyes(ctx: CanvasRenderingContext2D): void {
  for (const l of LENS) {
    ctx.beginPath();
    ctx.ellipse(l.x, l.y - 0.6, 2.5, 3.3, 0, 0, Math.PI * 2);
    fillInk(ctx, HERO_COL.eye, 1.1);
    // pie-cut pupil: a black oval with a wedge missing
    ctx.beginPath();
    ctx.moveTo(l.x + 0.5, l.y - 0.2);
    ctx.ellipse(l.x + 0.5, l.y - 0.2, 1.5, 2.2, 0, -0.5, Math.PI * 2 - 1.3);
    ctx.closePath();
    ctx.fillStyle = INK;
    ctx.fill();
  }
}

function glasses(ctx: CanvasRenderingContext2D, p: Pose): void {
  ctx.save();
  if (p.pop > 0) {
    ctx.translate(-1 * p.pop, -7 * p.pop);
    ctx.rotate(-0.22 * p.pop);
  } else if (p.face === 'dizzy') {
    ctx.translate(5, 0.6);
    ctx.rotate(0.3);
    ctx.translate(-5, 0);
  }
  ctx.beginPath();
  ctx.moveTo(LENS[0].x - LENS[0].r + 0.4, -1.2);
  ctx.lineTo(EAR_X + 1 - FEATURES_DX, -0.4);
  stroke(ctx, 1.3);
  ctx.beginPath();
  ctx.moveTo(LENS[0].x + LENS[0].r - 0.2, -1.6);
  ctx.quadraticCurveTo(5.1, -3, LENS[1].x - LENS[1].r + 0.2, -1.6);
  stroke(ctx, 1.3);
  for (const l of LENS) {
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
    fillInk(ctx, HERO_COL.lens, 1.3);
  }
  ctx.save();
  ctx.beginPath();
  for (const l of LENS) {
    ctx.moveTo(l.x + l.r, l.y);
    ctx.arc(l.x, l.y, l.r - 0.5, 0, Math.PI * 2);
  }
  ctx.clip();
  ctx.strokeStyle = HERO_COL.glint;
  ctx.lineCap = 'round';
  if (p.glint >= 0) {
    const gx = -4 + p.glint * 16;
    ctx.beginPath();
    ctx.moveTo(gx - 2, 4);
    ctx.lineTo(gx + 2.4, -6);
    ctx.lineWidth = 1.8;
    ctx.stroke();
  }
  for (const l of LENS) {
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.r * 0.6, 3.5, 4.5);
    ctx.lineWidth = 0.95;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(l.x + l.r * 0.42, l.y - l.r * 0.52, 0.42, 0, Math.PI * 2);
    ctx.fillStyle = HERO_COL.glint;
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}

function nose(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.ellipse(6, 3.1, 2.4, 2.1, 0.1, 0, Math.PI * 2);
  fillInk(ctx, HERO_COL.skin, 1.3);
  ctx.beginPath();
  ctx.arc(5.1, 3.7, 0.8, 1.4, 3.6);
  stroke(ctx, 0.7);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.beginPath();
  ctx.arc(6.7, 2.3, 0.5, 0, Math.PI * 2);
  ctx.fill();
}

function openMouth(ctx: CanvasRenderingContext2D, shape: () => void): void {
  shape();
  ctx.fillStyle = HERO_COL.mouth;
  ctx.fill();
  ctx.save();
  shape();
  ctx.clip();
  ctx.fillStyle = HERO_COL.teeth;
  ctx.fillRect(0, 3, 12, 2.6);
  ctx.fillStyle = HERO_COL.tongue;
  ctx.beginPath();
  ctx.ellipse(6.2, 10.4, 3, 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  shape();
  stroke(ctx, 1.2);
}

function mouth(ctx: CanvasRenderingContext2D, face: Pose['face']): void {
  ctx.lineCap = 'round';
  if (face === 'smirk') {
    ctx.beginPath();
    ctx.moveTo(2.2, 5.8);
    ctx.quadraticCurveTo(5.6, 8.6, 9.6, 5.2);
    ctx.quadraticCurveTo(5.8, 7, 2.2, 5.8);
    ctx.fillStyle = HERO_COL.mouth;
    ctx.fill();
    stroke(ctx, 1.1);
    ctx.beginPath();
    ctx.moveTo(9.3, 5.6);
    ctx.quadraticCurveTo(10.3, 5, 10.2, 4.1);
    ctx.moveTo(4.4, 7.9);
    ctx.quadraticCurveTo(6, 9, 7.6, 7.7);
    ctx.moveTo(1.6, 5.1);
    ctx.quadraticCurveTo(1.3, 5.9, 1.9, 6.5);
    stroke(ctx, 0.9);
    return;
  }
  if (face === 'grin') {
    openMouth(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(1.8, 4.9);
      ctx.quadraticCurveTo(6, 6.2, 10.2, 4.2);
      ctx.quadraticCurveTo(9.4, 10.4, 5, 9.6);
      ctx.quadraticCurveTo(2, 8.6, 1.8, 4.9);
      ctx.closePath();
    });
    return;
  }
  if (face === 'shout') {
    openMouth(ctx, () => {
      ctx.beginPath();
      ctx.ellipse(6, 7.2, 3.4, 3.4, 0, 0, Math.PI * 2);
    });
    return;
  }
  if (face === 'ouch') {
    ctx.beginPath();
    ctx.roundRect(2.4, 5, 7, 3.4, 1.5);
    fillInk(ctx, HERO_COL.teeth, 1.1);
    ctx.beginPath();
    ctx.moveTo(2.6, 6.7);
    ctx.lineTo(9.2, 6.7);
    for (const x of [4.2, 5.9, 7.6]) {
      ctx.moveTo(x, 5.1);
      ctx.lineTo(x, 8.3);
    }
    stroke(ctx, 0.6);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(2.4, 6.4);
  for (let i = 1; i <= 6; i++) ctx.lineTo(2.4 + i * 1.2, 6.4 + (i % 2 ? -0.9 : 0.5));
  stroke(ctx, 1.1);
}

/** The whole head at the local origin (caller translates to HEAD and applies the tilt). */
export function drawHead(ctx: CanvasRenderingContext2D, p: Pose): void {
  ear(ctx);
  face(ctx);
  hair(ctx);
  ctx.save();
  ctx.translate(FEATURES_DX, 0);
  ctx.beginPath();
  ctx.moveTo(2.2, 9.2);
  ctx.quadraticCurveTo(3.8, 9.9, 5.4, 9.2);
  stroke(ctx, 0.8);
  if (p.pop > 0) eyes(ctx);
  brows(ctx, p.brow + 1.6 * p.pop);
  nose(ctx);
  mouth(ctx, p.face);
  glasses(ctx, p);
  ctx.restore();
}
