/**
 * One hero frame: the rig (rig.ts) plus its ink effects — dash ghosts and speed lines, the pink parry star,
 * dizzy stars, the motion ticks of the owner's drawing, the glint on the glasses. Frame units, facing right.
 */
import { INK } from '../draw/canvas';
import { HERO_COL } from './config';
import { PARTS } from './parts';
import { CENTRE, apply, bones, drawRig, type Pose } from './rig';
import { star } from './shapes';

/** the four motion ticks around his head in the drawing (frame units, start = the thin end) */
const TICKS: readonly (readonly [number, number, number, number])[] = [
  [17.4, 26.2, 14.3, 23.4],
  [16.6, 27.9, 13.5, 27.0],
  [41.2, 18.4, 42.9, 14.3],
  [42.9, 20.4, 45.9, 17.3],
];
/** right lens of the glasses, in the head's rest frame */
const LENS = { x: 35.4, y: 19.4 };

function tick(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, w: number): void {
  const a = Math.atan2(y1 - y0, x1 - x0) + Math.PI / 2;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1 + Math.cos(a) * w, y1 + Math.sin(a) * w);
  ctx.lineTo(x1 - Math.cos(a) * w, y1 - Math.sin(a) * w);
  ctx.closePath();
  ctx.fillStyle = INK;
  ctx.fill();
}

function ticks(ctx: CanvasRenderingContext2D, p: Pose): void {
  const m = bones(p).head;
  const out = 0.6 + 0.4 * Math.sin(p.ticks * Math.PI);
  for (const [x0, y0, x1, y1] of TICKS) {
    const a = apply(m, { x: x0, y: y0 });
    const b = apply(m, { x: x0 + (x1 - x0) * (0.5 + 0.5 * out), y: y0 + (y1 - y0) * (0.5 + 0.5 * out) });
    tick(ctx, a.x, a.y, b.x, b.y, 0.55);
  }
}

function glint(ctx: CanvasRenderingContext2D, p: Pose): void {
  const c = apply(bones(p).head, LENS);
  const r = 2.6 * Math.sin(Math.min(1, p.glint) * Math.PI) + 0.4;
  ctx.fillStyle = HERO_COL.glint;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + p.glint;
    const rr = i % 2 ? r * 0.22 : r;
    ctx.lineTo(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

function dizzy(ctx: CanvasRenderingContext2D, p: Pose): void {
  const h = PARTS.head;
  const c = apply(bones(p).head, { x: h.x + h.w / 2, y: h.y + h.h / 2 });
  for (let i = 0; i < 3; i++) {
    const a = p.stars * Math.PI * 2 + (i * Math.PI * 2) / 3;
    star(ctx, Math.max(3, c.x + Math.cos(a) * 9), Math.max(3, c.y - 11 + Math.sin(a) * 2.6), 2.5, HERO_COL.star, a);
  }
}

function pinkFlash(ctx: CanvasRenderingContext2D, p: Pose): void {
  const c = apply(bones(p).torso, CENTRE);
  ctx.save();
  ctx.globalAlpha = 1 - p.pink * 0.7;
  star(ctx, c.x, c.y, 13 + 15 * p.pink, HERO_COL.pink, p.pink * 2, 8, 0.55);
  star(ctx, c.x, c.y, 6 + 6 * p.pink, HERO_COL.pinkHi, -p.pink * 2, 8, 0.5);
  ctx.restore();
}

function speedLines(ctx: CanvasRenderingContext2D, p: Pose): void {
  ctx.strokeStyle = HERO_COL.speed;
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.1;
  for (const [y, len] of [[24, 14], [33, 18], [42, 15], [51, 11]] as const) {
    ctx.beginPath();
    ctx.moveTo(14 - len * p.smear, y);
    ctx.lineTo(14, y);
    ctx.stroke();
  }
}

/** Draws one complete hero frame for pose `p` from the parts atlas `art`. */
export function drawHeroFrame(ctx: CanvasRenderingContext2D, art: CanvasImageSource, p: Pose): void {
  if (p.pink >= 0) pinkFlash(ctx, p);
  if (p.smear > 0) {
    speedLines(ctx, p);
    for (const [dx, alpha] of [[-11, 0.18], [-5.5, 0.35]] as const) {
      ctx.save();
      ctx.globalAlpha = alpha * p.smear;
      drawRig(ctx, art, { ...p, dx: p.dx + dx * p.smear });
      ctx.restore();
    }
  }
  drawRig(ctx, art, p);
  if (p.ticks >= 0) ticks(ctx, p);
  if (p.glint >= 0) glint(ctx, p);
  if (p.stars >= 0) dizzy(ctx, p);
}
