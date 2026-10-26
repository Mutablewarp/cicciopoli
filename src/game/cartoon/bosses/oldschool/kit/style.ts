/**
 * 1930s rubber-hose drawing primitives for the BOSS-C bosses (canvas 2D in world units, no Phaser):
 * palette, cel fills, rubber hoses, pie-cut eyes (the props: bottles, projectiles, FX).
 */
import { INK, LINE } from '../../../draw/canvas';

type Ctx = CanvasRenderingContext2D;
export type Pt = readonly [number, number];
/** draws (does not fill) a path */
type PathFn = (ctx: Ctx) => void;

export const C = {
  bun: '#e9973b',
  patty: '#6d3c22',
  pattyDark: '#45230f',
  pattyLight: '#94592f',
  cheddar: '#f7b322',
  cheddarLight: '#ffd85e',
  bacon: '#c5453a',
  baconFat: '#f3b9a8',
  baconDark: '#8f2b23',
  pink: '#ff5fa8',
  pinkLight: '#ffb6d8',
  white: '#fffaf0',
} as const;

export function ell(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, Math.PI * 2);
}

/** Fill with a cel-shade crescent toward the bottom-right (offset dx, dy), then ink the outline. */
export function cel(ctx: Ctx, path: PathFn, base: string, shade: string, dx: number, dy: number, lw = LINE): void {
  path(ctx);
  ctx.fillStyle = shade;
  ctx.fill();
  ctx.save();
  path(ctx);
  ctx.clip();
  ctx.translate(-dx, -dy);
  path(ctx);
  ctx.fillStyle = base;
  ctx.fill();
  ctx.restore();
  if (lw <= 0) return;
  path(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.stroke();
}

/** Soft white shine. */
export function gloss(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0, a = 0.6): void {
  ell(ctx, x, y, rx, ry, rot);
  ctx.fillStyle = `rgba(255, 252, 240, ${a})`;
  ctx.fill();
}

/** Smooth open path through pts (quadratic midpoints). */
export function smooth(ctx: Ctx, pts: readonly Pt[]): void {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  if (pts.length === 2) {
    ctx.lineTo(pts[1][0], pts[1][1]);
    return;
  }
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    const [nx, ny] = pts[i + 1];
    const end = i === pts.length - 2;
    ctx.quadraticCurveTo(x, y, end ? nx : (x + nx) / 2, end ? ny : (y + ny) / 2);
  }
}

/** Rubber-hose limb: an ink-outlined tube through pts with round ends. */
export function hose(ctx: Ctx, pts: readonly Pt[], width: number, color: string, lw = LINE): void {
  smooth(ctx, pts);
  ctx.strokeStyle = INK;
  ctx.lineWidth = width + 2 * lw;
  ctx.stroke();
  smooth(ctx, pts);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

/**
 * Pie-cut eye: white oval, black pupil with the classic wedge cut out. lx / ly (-1..1) move the pupil;
 * lid (0..1) closes a lid of lidColor from the top (cool half-lidded look).
 */
export function pieEye(ctx: Ctx, x: number, y: number, rx: number, ry: number, lx = 0, ly = 0, lw = LINE, lid = 0, lidColor: string = C.bun): void {
  ell(ctx, x, y, rx, ry);
  ctx.fillStyle = C.white;
  ctx.fill();
  ctx.save();
  ell(ctx, x, y, rx, ry);
  ctx.clip();
  const px = x + lx * rx * 0.38;
  const py = y + ly * ry * 0.3 + ry * 0.14;
  const prx = rx * 0.6;
  const pry = ry * 0.64;
  ell(ctx, px, py, prx, pry);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(px + prx * 0.12, py - pry * 0.08);
  ctx.ellipse(px, py, prx * 1.12, pry * 1.12, 0, -1.4, -0.72);
  ctx.closePath();
  ctx.fillStyle = C.white;
  ctx.fill();
  if (lid > 0) {
    const ly2 = y - ry + 2 * ry * lid;
    ctx.beginPath();
    ctx.moveTo(x - rx - 1, y - ry - 1);
    ctx.lineTo(x + rx + 1, y - ry - 1);
    ctx.lineTo(x + rx + 1, ly2 - ry * 0.1);
    ctx.quadraticCurveTo(x, ly2 + ry * 0.25, x - rx - 1, ly2 - ry * 0.1);
    ctx.closePath();
    ctx.fillStyle = lidColor;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
  ctx.restore();
  ell(ctx, x, y, rx, ry);
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
  ctx.stroke();
}

