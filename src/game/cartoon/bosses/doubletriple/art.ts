/**
 * DOUBLE TRIPLE body art (canvas 2D in world units, no Phaser): the shirt's walking double burger, i.e.
 * bun, SALSA CICCIO'S, beef patty x2, cheddar x3, bacon x2, with a cocky face behind tinted round shades.
 */
import { INK, LINE } from '../../draw/canvas';
import { bacon, bunBottom, bunTop, cheese, patty, sauceDrop } from '../oldschool/kit/food';
import { C, capsule, ell, pieEye, shades } from '../oldschool/kit/style';

type Ctx = CanvasRenderingContext2D;

/** body frame; its bottom-centre (the hips) is at (60, footY) */
export const BODY = { w: 120, h: 134, footY: 130 } as const;
export const DT_FACE = { cool: 0, shout: 1, hurt: 2, ko: 3 } as const;
/** shoulders in the body frame (left = toward the player) */
export const SHOULDER = { lx: 9, rx: 111, y: 88 } as const;
/** the pinkish-orange SALSA CICCIO'S */
export const SALSA = '#e8774c';
const BLUSH = 'rgba(232, 88, 106, 0.4)';

function grin(ctx: Ctx, cx: number, y: number, w: number, open: number): void {
  const path = (c: Ctx): void => {
    c.beginPath();
    c.moveTo(cx - w / 2, y);
    c.quadraticCurveTo(cx, y + 4, cx + w / 2, y - 1);
    c.quadraticCurveTo(cx + w / 2 - 4, y + open, cx, y + open);
    c.quadraticCurveTo(cx - w / 2 + 3, y + open, cx - w / 2, y);
    c.closePath();
  };
  path(ctx);
  ctx.fillStyle = C.mouth;
  ctx.fill();
  ctx.save();
  path(ctx);
  ctx.clip();
  ctx.fillStyle = C.white;
  ctx.fillRect(cx - w / 2, y - 4, w, 8.5);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.9;
  for (let x = cx - w / 2 + 6; x < cx + w / 2 - 3; x += 6) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + 4.5);
    ctx.stroke();
  }
  ell(ctx, cx + 5, y + open, 10, 6);
  ctx.fillStyle = C.tongue;
  ctx.fill();
  ctx.restore();
  path(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = LINE;
  ctx.stroke();
}

function spiral(ctx: Ctx, x: number, y: number, dir: number): void {
  ell(ctx, x, y, 8, 9.5);
  ctx.fillStyle = C.white;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.beginPath();
  for (let a = 0; a < Math.PI * 5; a += 0.3) ctx.lineTo(x + Math.cos(a * dir) * a * 0.46, y + Math.sin(a * dir) * a * 0.52);
  ctx.stroke();
}

/** Face on the top bun (eyes ~y 32), drawn for every DT_FACE frame; also used by the minis at a scale. */
export function face(ctx: Ctx, f: number, cx: number, top: number, shaded: boolean): void {
  const ey = top + 26;
  ell(ctx, cx - 26, ey + 15, 7, 4.5);
  ctx.fillStyle = BLUSH;
  ctx.fill();
  ell(ctx, cx + 26, ey + 15, 7, 4.5);
  ctx.fill();
  if (f === DT_FACE.ko) {
    spiral(ctx, cx - 13, ey, 1);
    spiral(ctx, cx + 13, ey, -1);
  } else if (f === DT_FACE.hurt) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.6;
    for (const s of [-1, 1]) {
      const x = cx + s * 13;
      ctx.beginPath();
      ctx.moveTo(x - 5 * s, ey - 5);
      ctx.lineTo(x + 4 * s, ey);
      ctx.lineTo(x - 5 * s, ey + 5);
      ctx.stroke();
    }
  } else {
    const lid = f === DT_FACE.cool ? 0.42 : 0;
    pieEye(ctx, cx - 13, ey, 8, 10, -0.6, 0.1, LINE, lid);
    pieEye(ctx, cx + 13, ey, 8, 10, -0.6, 0.1, LINE, lid);
  }
  if (shaded) {
    if (f === DT_FACE.ko) shades(ctx, cx + 2, ey + 9, 9, 27, 0.5, LINE, 0.42);
    else shades(ctx, cx, ey + 3, 9.5, 28, 0.42);
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  const lift = f === DT_FACE.shout ? 5 : 0;
  ctx.beginPath();
  ctx.moveTo(cx - 22, ey - 13 - lift);
  ctx.quadraticCurveTo(cx - 14, ey - 18 - lift, cx - 6, ey - 14 - lift);
  ctx.moveTo(cx + 6, ey - 15 - lift - (f === DT_FACE.cool ? 3 : 0));
  ctx.quadraticCurveTo(cx + 14, ey - 20 - lift - (f === DT_FACE.cool ? 3 : 0), cx + 22, ey - 14 - lift);
  ctx.stroke();
  const my = ey + 19;
  if (f === DT_FACE.shout) {
    ell(ctx, cx, my + 4, 11, 9);
    ctx.fillStyle = C.mouth;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = LINE;
    ctx.stroke();
    ell(ctx, cx + 2, my + 8, 6, 3.5);
    ctx.fillStyle = C.tongue;
    ctx.fill();
  } else if (f === DT_FACE.hurt) {
    ctx.beginPath();
    ctx.moveTo(cx - 10, my + 3);
    for (let i = 1; i <= 5; i++) ctx.lineTo(cx - 10 + i * 4, my + 3 + (i % 2 ? -2.5 : 0));
    ctx.strokeStyle = INK;
    ctx.lineWidth = LINE;
    ctx.stroke();
  } else {
    grin(ctx, cx, my, 44, f === DT_FACE.ko ? 10 : 15);
    if (f === DT_FACE.ko) capsule(ctx, cx + 6, my + 8, cx + 9, my + 18, 4, C.tongue, 1.6);
  }
}

/** The double burger, hips (bottom-centre) at (60, 130). Frames = DT_FACE. */
export function drawBody(ctx: Ctx, f: number): void {
  bunBottom(ctx, 60, 114, 94, 15);
  bacon(ctx, 5, 115, 112, 2, 6, 2.5, '#e07a74', '#ffd0c4');
  patty(ctx, 60, 103, 104, 16);
  cheese(ctx, 60, 94, 100, [[-34, 10], [10, 16], [36, 8]]);
  patty(ctx, 60, 85, 106, 16);
  cheese(ctx, 60, 76, 102, [[-20, 12], [28, 9]], LINE, C.cheddarLight);
  cheese(ctx, 58, 72, 98, [[-38, 7], [6, 10]]);
  bacon(ctx, 2, 118, 70, 2.2, 6.5, 3);
  cheese(ctx, 60, 66, 96, [[-14, 6], [22, 8]], LINE, SALSA);
  bunTop(ctx, 60, 67, 114, 60);
  face(ctx, f, 60, 7, true);
  if (f === DT_FACE.hurt) sauceDrop(ctx, 96, 26, 3, '#bfe6f2', 1.2);
}
