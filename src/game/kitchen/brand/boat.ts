/**
 * Ciccio's RED cardboard boat (vaschetta) for the fries and the menù starters, like the real ones
 * (ref/photo_provola_fries_nuggets.jpg) and the level 1 fries box (src/art/items/food.ts): matte
 * Ciccio's red board, the white core of the board showing on the cut rims, the black-and-white
 * checkered paper inside, the owner's ORIGINAL face logo (white face) on the front wall, never redrawn.
 * Seen from the front and above, 30x22 art px, same as KITCHEN.cone / KITCHEN.starterBox: the inside
 * walls, the checkered paper, the pixel-art food (a fryItem frame, hard pixels), the front wall over it.
 */
import { FRY_ITEM } from '../../../art/kitchen/keys';
import { contactShadow, drawPixels, polyPath, type PixelFrame, type Pt } from './kit';
import { FACE_H, FACE_W, paintFace } from './logo';

export const BOAT_W = 30;
export const BOAT_H = 22;

/** Ciccio's red board (the level 1 fries box tones), lit from the top-left; `cut` = the white core on the rims. */
export const BOARD = {
  lit: '#c8463f',
  base: '#a8333a',
  shade: '#7e2429',
  deep: '#5a161c',
  edge: 'rgba(48,8,12,0.85)',
  cut: '#fff4ec',
} as const;

/** The checkered paper inside (square size in art px). */
const CHECK = { size: 0.95, dark: '#201c1c', light: '#f7f3ea' } as const;

/** Mouth of the boat: back rim (left, right) at y 1.6, front rim at y 10.2 (a low front wall: the food shows). */
const BACK_L: Pt = [3.6, 1.6];
const BACK_R: Pt = [26.4, 1.6];
const FRONT_L: Pt = [0.8, 10.2];
const FRONT_R: Pt = [29.2, 10.2];
/** Bottom corners of the front wall. */
const FOOT_L: Pt = [4, 21];
const FOOT_R: Pt = [26, 21];
/** Where the back wall meets the floor (hidden by the food when full). */
const FLOOR_L: Pt = [5.4, 6];
const FLOOR_R: Pt = [24.6, 6];
/** The checkered paper: lines the back wall and the floor, its top edge standing a little over the back rim. */
const SHEET: readonly Pt[] = [[5, 0.9], [10, 0.5], [15, 0.8], [20, 0.4], [25, 0.9], [25.8, 10.2], [4.2, 10.2]];
/** The food (a FRY_ITEM frame) shrunk to FOOD.w art px wide, its top-left at (x, y): the heap fills the mouth. */
const FOOD = { x: 0.5, y: 0, w: 29 } as const;
/** The food stays between the boat's side walls (extended straight up over the back rim). */
const FOOD_CLIP: readonly Pt[] = [[BACK_L[0], -4], [BACK_R[0], -4], BACK_R, FRONT_R, FRONT_L, BACK_L];
/** The face logo on the front wall: height and top-centre (art px). */
const MARK = { h: 8.6, cx: 15, y: 11.5 } as const;

function shaded(ctx: CanvasRenderingContext2D, pts: readonly Pt[], top: string, bottom: string, y0: number, y1: number): void {
  ctx.save();
  ctx.beginPath();
  polyPath(ctx, pts);
  ctx.clip();
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, BOAT_W, BOAT_H);
  ctx.restore();
}

/** The checkered paper lining the inside, darker towards the floor (it is in the boat's shade). */
function checkerPaper(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.beginPath();
  polyPath(ctx, SHEET);
  ctx.clip();
  ctx.fillStyle = CHECK.light;
  ctx.fillRect(0, 0, BOAT_W, BOAT_H);
  ctx.fillStyle = CHECK.dark;
  const s = CHECK.size;
  for (let row = 0; row * s < FRONT_L[1]; row++) {
    for (let col = row % 2; col * s < BOAT_W; col += 2) ctx.fillRect(col * s, row * s, s, s);
  }
  const g = ctx.createLinearGradient(0, 1, 0, 8);
  g.addColorStop(0, 'rgba(60,10,14,0)');
  g.addColorStop(1, 'rgba(60,10,14,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, BOAT_W, BOAT_H);
  ctx.restore();
}

/** A white cut edge of the board along a rim. */
function cutEdge(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, width: number): void {
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.strokeStyle = BOARD.cut;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.stroke();
}

/** The owner's original face logo printed on the front wall (white face, its own black lines). */
function logoMark(ctx: CanvasRenderingContext2D, logo: CanvasImageSource, front: readonly Pt[]): void {
  const s = MARK.h / FACE_H;
  ctx.save();
  ctx.beginPath();
  polyPath(ctx, front);
  ctx.clip();
  ctx.translate(MARK.cx - (FACE_W * s) / 2, MARK.y);
  ctx.scale(s, s);
  paintFace(ctx, logo);
  ctx.restore();
}

/** Paints the boat with `food` (a fryItem frame) in it, or empty, at the context's origin, in art px; `logo` = the face mark. */
export function paintBoat(ctx: CanvasRenderingContext2D, food: PixelFrame | null, logo: CanvasImageSource | null): void {
  contactShadow(ctx, BOAT_W / 2 + 0.6, BOAT_H - 1, 15, 1.6, 0.6);
  // inside: back wall (lit), floor (deep), left wall in shadow, right wall catching the light
  shaded(ctx, [BACK_L, BACK_R, FLOOR_R, FLOOR_L], BOARD.lit, BOARD.shade, BACK_L[1], FLOOR_L[1]);
  shaded(ctx, [FLOOR_L, FLOOR_R, FRONT_R, FRONT_L], BOARD.shade, BOARD.deep, FLOOR_L[1], FRONT_L[1]);
  shaded(ctx, [BACK_L, FLOOR_L, FRONT_L], BOARD.deep, BOARD.shade, BACK_L[1], FRONT_L[1]);
  shaded(ctx, [BACK_R, FRONT_R, FLOOR_R], BOARD.base, BOARD.shade, BACK_R[1], FRONT_R[1]);
  cutEdge(ctx, BACK_L, BACK_R, 0.35);
  checkerPaper(ctx);
  if (food) {
    ctx.save();
    ctx.beginPath();
    polyPath(ctx, FOOD_CLIP);
    ctx.clip();
    drawPixels(ctx, food, FOOD.x, FOOD.y, FOOD.w / FRY_ITEM.w);
    ctx.restore();
  }
  // the side walls' cut rims (over the food that leans on them)
  cutEdge(ctx, BACK_L, FRONT_L, 0.4);
  cutEdge(ctx, BACK_R, FRONT_R, 0.4);
  // front wall: lit at the top-left, darker towards the right and the bottom
  const front: readonly Pt[] = [FRONT_L, FRONT_R, FOOT_R, FOOT_L];
  shaded(ctx, front, BOARD.lit, BOARD.base, FRONT_L[1], FOOT_L[1]);
  ctx.save();
  ctx.beginPath();
  polyPath(ctx, front);
  ctx.clip();
  const side = ctx.createLinearGradient(0, 0, BOAT_W, 0);
  side.addColorStop(0, 'rgba(255,220,210,0.08)');
  side.addColorStop(0.55, 'rgba(255,220,210,0)');
  side.addColorStop(1, 'rgba(50,6,10,0.32)');
  ctx.fillStyle = side;
  ctx.fillRect(0, 0, BOAT_W, BOAT_H);
  ctx.restore();
  if (logo) logoMark(ctx, logo, front);
  // outline of the boat, then the white cut edge of the front rim
  ctx.beginPath();
  polyPath(ctx, [BACK_L, BACK_R, FRONT_R, FOOT_R, FOOT_L, FRONT_L]);
  ctx.strokeStyle = BOARD.edge;
  ctx.lineWidth = 0.45;
  ctx.lineJoin = 'round';
  ctx.stroke();
  cutEdge(ctx, [FRONT_L[0] + 0.3, FRONT_L[1] + 0.2], [FRONT_R[0] - 0.3, FRONT_R[1] + 0.2], 0.6);
}
