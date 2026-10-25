/**
 * Ciccio's white paper boat (vaschetta) for the fries and the menù starters, like the real one
 * (ref/level7_wrap_tray.jpg): a cream-white trapezoid tray seen from the front and above, printed
 * with a faint light-grey line pattern of golf balls, tees and flags. 30x22 art px, same as
 * KITCHEN.cone / KITCHEN.starterBox: the inner back wall, then the pixel-art food (a fryItem frame,
 * hard pixels), then the front wall over it.
 */
import { contactShadow, drawPixels, polyPath, type PixelFrame, type Pt } from './kit';

export const BOAT_W = 30;
export const BOAT_H = 22;

const PAPER = {
  white: '#f7f3ec',
  cream: '#ece5d8',
  inner: '#ddd4c4',
  deep: '#c9bfad',
  edge: 'rgba(120,108,90,0.6)',
  line: 'rgba(150,144,134,0.55)',
  rim: '#fffdf8',
} as const;

/** Mouth of the boat: back rim (left, right) at y 1.6, front rim at y 9. */
const BACK_L: Pt = [3.6, 1.6];
const BACK_R: Pt = [26.4, 1.6];
const FRONT_L: Pt = [0.8, 9];
const FRONT_R: Pt = [29.2, 9];
/** Bottom corners of the front wall. */
const FOOT_L: Pt = [4, 21];
const FOOT_R: Pt = [26, 21];
/** Where the back wall meets the floor (hidden by the food when full). */
const FLOOR_L: Pt = [5.4, 6];
const FLOOR_R: Pt = [24.6, 6];
/** The food frame's top-left (fryItem 28x18): the heap fills the mouth and peeks over the front rim. */
const FOOD_AT = { x: 1, y: 0.5 } as const;
/** The food stays between the boat's side walls (extended straight up over the back rim). */
const FOOD_CLIP: readonly Pt[] = [[BACK_L[0], -4], [BACK_R[0], -4], BACK_R, FRONT_R, FRONT_L, BACK_L];

/** Golf motifs of one pattern tile (TILE art px), line art. */
const TILE = { w: 9, h: 7.5 } as const;

function ball(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.moveTo(x + 1.5, y);
  ctx.arc(x, y, 1.5, 0, Math.PI * 2);
  for (const [dx, dy] of [[-0.5, -0.4], [0.4, -0.5], [0, 0.4], [-0.6, 0.6], [0.7, 0.4]] as const) {
    ctx.moveTo(x + dx + 0.12, y + dy);
    ctx.arc(x + dx, y + dy, 0.12, 0, Math.PI * 2);
  }
}

function tee(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.moveTo(x - 0.6, y);
  ctx.quadraticCurveTo(x, y + 0.35, x + 0.6, y);
  ctx.moveTo(x, y + 0.2);
  ctx.lineTo(x, y + 1.7);
}

function flag(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.moveTo(x, y + 2.6);
  ctx.lineTo(x, y);
  ctx.lineTo(x + 1.5, y + 0.5);
  ctx.lineTo(x, y + 1);
  ctx.moveTo(x - 0.8, y + 2.7);
  ctx.quadraticCurveTo(x, y + 2.35, x + 0.8, y + 2.7);
}

function club(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.moveTo(x, y);
  ctx.lineTo(x + 1.6, y + 2.4);
  ctx.lineTo(x + 2.3, y + 2.3);
}

/** The golf line pattern over the rectangle (x, y, w, h); the caller clips. */
function golf(ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number): void {
  ctx.beginPath();
  for (let ty = 0, row = 0; ty < h + TILE.h; ty += TILE.h, row++) {
    for (let tx = row % 2 === 0 ? 0 : -TILE.w / 2; tx < w + TILE.w; tx += TILE.w) {
      const x = x0 + tx;
      const y = y0 + ty;
      ball(ctx, x + 2, y + 2);
      tee(ctx, x + 6.4, y + 1.2);
      flag(ctx, x + 5.2, y + 4.2);
      club(ctx, x + 0.8, y + 4.6);
    }
  }
  ctx.strokeStyle = PAPER.line;
  ctx.lineWidth = 0.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function shaded(ctx: CanvasRenderingContext2D, pts: readonly Pt[], top: string, bottom: string, y0: number, y1: number, pattern: boolean): void {
  ctx.save();
  ctx.beginPath();
  polyPath(ctx, pts);
  ctx.clip();
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, BOAT_W, BOAT_H);
  if (pattern) golf(ctx, 0, y0 - 1, BOAT_W, y1 - y0 + 2);
  ctx.restore();
}

/** Paints the boat with `food` (a fryItem frame) in it, or empty, at the context's origin, in art px. */
export function paintBoat(ctx: CanvasRenderingContext2D, food: PixelFrame | null): void {
  contactShadow(ctx, BOAT_W / 2, BOAT_H - 1, 14, 1.5, 0.45);
  // inside: back wall (pattern), floor, side walls (the left one in shadow)
  shaded(ctx, [BACK_L, BACK_R, FLOOR_R, FLOOR_L], PAPER.white, PAPER.inner, BACK_L[1], FLOOR_L[1], true);
  shaded(ctx, [FLOOR_L, FLOOR_R, FRONT_R, FRONT_L], PAPER.inner, PAPER.deep, FLOOR_L[1], FRONT_L[1], false);
  shaded(ctx, [BACK_L, FLOOR_L, FRONT_L], PAPER.deep, PAPER.inner, BACK_L[1], FRONT_L[1], false);
  shaded(ctx, [BACK_R, FRONT_R, FLOOR_R], PAPER.cream, PAPER.inner, BACK_R[1], FRONT_R[1], false);
  if (food) {
    ctx.save();
    ctx.beginPath();
    polyPath(ctx, FOOD_CLIP);
    ctx.clip();
    drawPixels(ctx, food, FOOD_AT.x, FOOD_AT.y);
    ctx.restore();
  }
  // front wall: lit, patterned, a little darker towards the right and the bottom
  const front: readonly Pt[] = [FRONT_L, FRONT_R, FOOT_R, FOOT_L];
  shaded(ctx, front, PAPER.white, PAPER.cream, FRONT_L[1], FOOT_L[1], true);
  ctx.save();
  ctx.beginPath();
  polyPath(ctx, front);
  ctx.clip();
  const side = ctx.createLinearGradient(0, 0, BOAT_W, 0);
  side.addColorStop(0, 'rgba(255,255,255,0.25)');
  side.addColorStop(0.6, 'rgba(255,255,255,0)');
  side.addColorStop(1, 'rgba(120,104,80,0.18)');
  ctx.fillStyle = side;
  ctx.fillRect(0, 0, BOAT_W, BOAT_H);
  ctx.restore();
  // outline of the boat and the bright paper rim
  ctx.beginPath();
  polyPath(ctx, [BACK_L, BACK_R, FRONT_R, FOOT_R, FOOT_L, FRONT_L]);
  ctx.strokeStyle = PAPER.edge;
  ctx.lineWidth = 0.4;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(FRONT_L[0] + 0.2, FRONT_L[1] + 0.25);
  ctx.lineTo(FRONT_R[0] - 0.2, FRONT_R[1] + 0.25);
  ctx.strokeStyle = PAPER.rim;
  ctx.lineWidth = 0.5;
  ctx.stroke();
}
