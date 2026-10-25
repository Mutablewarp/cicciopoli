/**
 * 1930s rubber-hose drawing primitives for the BOSS-C bosses (canvas 2D in world units, no Phaser):
 * palette, cel fills, rubber hoses, pie-cut eyes, round shades and the white four-finger gloves.
 */
import { INK, LINE } from '../../../draw/canvas';

type Ctx = CanvasRenderingContext2D;
export type Pt = readonly [number, number];
/** draws (does not fill) a path */
type PathFn = (ctx: Ctx) => void;

export const C = {
  bun: '#e9973b',
  bunLight: '#f7c56c',
  bunShade: '#b9622b',
  seed: '#fcefcf',
  patty: '#6d3c22',
  pattyDark: '#45230f',
  pattyLight: '#94592f',
  cheddar: '#f7b322',
  cheddarLight: '#ffd85e',
  cheddarShade: '#d4850f',
  bacon: '#c5453a',
  baconFat: '#f3b9a8',
  baconDark: '#8f2b23',
  glove: '#fdf8ec',
  gloveShade: '#d6c9ad',
  pink: '#ff5fa8',
  pinkLight: '#ffb6d8',
  sneaker: '#2a8d9b',
  white: '#fffaf0',
  tongue: '#e8586a',
  mouth: '#5a1a14',
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

/** A finger / bump: straight capsule with an ink rim. */
export function capsule(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, r: number, color: string, lw = LINE): void {
  hose(ctx, [[x1, y1], [x2, y2]], r * 2, color, lw);
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

/** Round 1930s sunglasses: two lenses (tint 1 = solid black), bridge and a glint. */
export function shades(ctx: Ctx, x: number, y: number, r: number, gap: number, tint = 1, lw = LINE, tilt = 0): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  for (const s of [-1, 1]) {
    const cx = (s * gap) / 2;
    ell(ctx, cx, 0, r, r * 0.92);
    ctx.fillStyle = tint >= 1 ? INK : `rgba(28, 21, 17, ${tint})`;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw * 1.2;
    ctx.stroke();
    gloss(ctx, cx - r * 0.38, -r * 0.4, r * 0.28, r * 0.16, -0.6, 0.85);
  }
  ctx.beginPath();
  ctx.moveTo(-gap / 2 + r * 0.9, -r * 0.25);
  ctx.quadraticCurveTo(0, -r * 0.75, gap / 2 - r * 0.9, -r * 0.25);
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw * 1.3;
  ctx.stroke();
  ctx.restore();
}

export type GloveShape = 'open' | 'fist' | 'peace' | 'point';

/**
 * White four-finger cartoon glove, palm centre (x, y), palm radius `size`, wrist toward -x of `angle`.
 * flip mirrors it (left hand).
 */
export function glove(ctx: Ctx, x: number, y: number, size: number, angle: number, shape: GloveShape, flip = false): void {
  const s = size / 10;
  const lw = LINE / s;
  const g = C.glove;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(flip ? -s : s, s);
  // flared cuff with two ridges
  cel(ctx, (c) => {
    c.beginPath();
    c.moveTo(-8, -6.5);
    c.lineTo(-16, -9.5);
    c.quadraticCurveTo(-19.5, 0, -16, 9.5);
    c.lineTo(-8, 6.5);
    c.closePath();
  }, g, C.gloveShade, 1.5, 1.5, lw);
  ctx.beginPath();
  ctx.moveTo(-12.5, -7.6);
  ctx.quadraticCurveTo(-14.6, 0, -12.5, 7.6);
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw * 0.8;
  ctx.stroke();
  if (shape === 'open') {
    for (const [a, len] of [[-1.05, 11], [-0.4, 13], [0.22, 12.5], [0.8, 10]] as const) {
      capsule(ctx, 3 * Math.cos(a), 3 * Math.sin(a), (6 + len) * Math.cos(a), (6 + len) * Math.sin(a), 3.3, g, lw);
    }
  } else if (shape === 'peace') {
    capsule(ctx, 2, -5, 5, -21, 3.3, g, lw);
    capsule(ctx, 5, -4, 13, -19, 3.3, g, lw);
  } else if (shape === 'point') {
    capsule(ctx, 4, -3, 21, -4, 3.2, g, lw);
  }
  cel(ctx, (c) => ell(c, 0, 0, 10, 9), g, C.gloveShade, 2, 2, lw);
  if (shape === 'fist' || shape === 'peace' || shape === 'point') {
    const ys = shape === 'fist' ? [-6, -2, 2, 6] : shape === 'peace' ? [1.5, 5.5] : [1, 4.5, 7.5];
    for (const yy of ys) capsule(ctx, 7, yy, 9.5, yy, 2.6, g, lw);
    capsule(ctx, -1, 6.5, 6, 5, 3, g, lw);
  } else {
    capsule(ctx, -2, -6, -7, -13, 3.1, g, lw);
  }
  if (shape !== 'peace' && size >= 10) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw * 0.9;
    for (const yy of [-3.2, 0, 3.2]) {
      ctx.beginPath();
      ctx.moveTo(-3.5, yy * 1.1);
      ctx.lineTo(2.5, yy);
      ctx.stroke();
    }
  }
  ctx.restore();
}
