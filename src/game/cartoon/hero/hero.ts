/**
 * Ciccio drawn from a Pose (pose.ts) in frame world units: navy three-piece suit (jacket with lapels
 * and a button, waistcoat with buttons, white collar, navy polka-dot tie, white pocket square), hose
 * arms and legs, gloves, shoes, the head, plus the cartoon extras (stars, speed smear, pink sparkle,
 * action ticks).
 */
import type { Vec } from '../api';
import { INK, LINE } from '../draw/canvas';
import { HERO_COL } from './config';
import { drawHead } from './head';
import { ARM_W, LEG_W, glove, hose, quad, shoe } from './limbs';
import { OUT, star } from './shapes';
import { FEET, HEAD, HEAD_SCALE, HIP, HIP_B, HIP_F, NECK, SHOULDER_B, SHOULDER_F, SPIN, type Hand, type Limb, type Pose } from './anatomy';

type Ctx = CanvasRenderingContext2D;

function about(ctx: Ctx, at: Vec, fn: () => void): void {
  ctx.translate(at.x, at.y);
  fn();
  ctx.translate(-at.x, -at.y);
}

function shape(ctx: Ctx, pts: readonly number[], fill: string, w: number): void {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = w;
  ctx.stroke();
}

function dot(ctx: Ctx, x: number, y: number, r: number, fill: string, w = 0): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (!w) return;
  ctx.strokeStyle = INK;
  ctx.lineWidth = w;
  ctx.stroke();
}

function jacketPath(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(29.6, 36.1);
  ctx.bezierCurveTo(26, 36.5, 23.6, 38.6, 23, 41.6);
  ctx.bezierCurveTo(21, 45.2, 21.1, 50.4, 23.8, 53.2);
  ctx.bezierCurveTo(26.6, 55.8, 37.6, 56, 41.4, 53.3);
  ctx.bezierCurveTo(44.8, 50.6, 44.6, 44, 42.2, 40.8);
  ctx.bezierCurveTo(40.8, 38.4, 38.8, 36.6, 35.8, 36);
  ctx.closePath();
}

/** The suit is drawn on a 64-frame template, then fitted under the head (wider, shorter, higher). */
const TORSO_FIT = { at: { x: 34, y: 36 }, sx: 1.05, sy: 0.84, dy: -2.6 } as const;

function torso(ctx: Ctx): void {
  ctx.save();
  ctx.translate(0, TORSO_FIT.dy);
  about(ctx, TORSO_FIT.at, () => ctx.scale(TORSO_FIT.sx, TORSO_FIT.sy));
  suit(ctx);
  ctx.restore();
}

function suit(ctx: Ctx): void {
  jacketPath(ctx);
  ctx.fillStyle = HERO_COL.suit;
  ctx.fill();
  ctx.save();
  jacketPath(ctx);
  ctx.clip();
  ctx.fillStyle = HERO_COL.suitShade;
  ctx.beginPath();
  ctx.ellipse(23.5, 52, 7.5, 9, 0.3, 0, Math.PI * 2);
  ctx.ellipse(36, 58.5, 12, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // waistcoat, shirt, tie
  shape(ctx, [32.2, 37.4, 36.8, 46, 41, 37.6, 42.4, 49.6, 38.4, 53.4, 36.6, 51.4, 34.6, 53.4, 30.6, 49.6], HERO_COL.vest, 1);
  shape(ctx, [32.2, 36, 36.8, 45.6, 41, 36.4], HERO_COL.shirt, 1);
  shape(ctx, [35.1, 37.4, 38.5, 37.4, 37.9, 39.9, 35.7, 39.9], HERO_COL.tie, 0.9);
  shape(ctx, [35.7, 39.9, 37.9, 39.9, 39.1, 44.2, 36.8, 46.6, 34.7, 44.2], HERO_COL.tie, 0.9);
  for (const [x, y] of [[36.3, 41.2], [37.8, 42.1], [35.9, 43.4], [37.6, 44.2], [36.8, 38.6], [36.7, 45.3]]) dot(ctx, x, y, 0.5, HERO_COL.dot);
  shape(ctx, [32.4, 36.2, 35.4, 37, 34.2, 39.4], HERO_COL.shirt, 0.9);
  shape(ctx, [40.6, 36.4, 37.8, 37.1, 39.6, 39.6], HERO_COL.shirt, 0.9);
  for (const y of [47.6, 49.6, 51.6]) dot(ctx, 36.7, y, 0.6, HERO_COL.suitHi, 0.6);
  // lapels (open jacket over the waistcoat)
  shape(ctx, [31.4, 36.4, 29.8, 40.2, 31.4, 41.2, 30.6, 42, 34.2, 50.4, 32.8, 51, 28.6, 43.2, 28.4, 38.2], HERO_COL.suit, 1);
  shape(ctx, [41, 36.6, 43, 40.4, 41.4, 41.2, 42.4, 42.2, 39, 50.6, 40.6, 51, 44.6, 43, 43.4, 37.8], HERO_COL.suit, 1);
  // pocket square + breast pocket, jacket button, hip pocket
  shape(ctx, [40, 44.6, 40.5, 42.8, 41.2, 43.9, 41.9, 42.6, 42.6, 44.6], HERO_COL.shirt, 0.8);
  ctx.beginPath();
  ctx.moveTo(39.6, 44.7);
  ctx.lineTo(43, 44.4);
  ctx.moveTo(24.6, 50.6);
  ctx.quadraticCurveTo(27.4, 51.4, 30, 50.8);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.9;
  ctx.stroke();
  dot(ctx, 40.8, 51.6, 0.75, HERO_COL.suitHi, 0.7);
  // soft sheen on the shoulders
  ctx.strokeStyle = HERO_COL.suitHi;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(24.4, 41.4);
  ctx.quadraticCurveTo(25.6, 38.4, 28.4, 37.4);
  ctx.stroke();
  ctx.restore();
  jacketPath(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = LINE;
  ctx.stroke();
}

function leg(ctx: Ctx, hip: Vec, l: Limb): void {
  const foot = { x: l.x, y: l.y };
  const c = hose(ctx, hip, foot, l.bend, LEG_W, HERO_COL.suit, HERO_COL.suitShade);
  // turned-up trouser cuff
  const a = quad(hip, c, foot, 0.8);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(foot.x, foot.y);
  ctx.strokeStyle = INK;
  ctx.lineWidth = LEG_W + 1.4 + OUT * 2;
  ctx.stroke();
  ctx.strokeStyle = HERO_COL.suit;
  ctx.lineWidth = LEG_W + 1.4;
  ctx.stroke();
  shoe(ctx, foot, l.angle);
}

function arm(ctx: Ctx, shoulder: Vec, h: Hand, withGlove: boolean): void {
  hose(ctx, shoulder, h, h.bend, ARM_W, HERO_COL.suit, HERO_COL.suitShade);
  if (withGlove) glove(ctx, h, h.angle, h.glove);
}

function stars(ctx: Ctx, t: number): void {
  for (let i = 0; i < 3; i++) {
    const a = t * Math.PI * 2 + (i * Math.PI * 2) / 3;
    star(ctx, HEAD.x + 1 + Math.cos(a) * 10, HEAD.y - 13 + Math.sin(a) * 3, 2.6, HERO_COL.star, a);
  }
}

/** The body itself (no smear ghosts / screen-space extras). */
function figure(ctx: Ctx, p: Pose): void {
  ctx.save();
  ctx.translate(p.dx, p.dy);
  about(ctx, FEET, () => ctx.scale(p.sx, p.sy));
  about(ctx, SPIN, () => ctx.rotate(p.rot));
  leg(ctx, { x: HIP_B.x, y: HIP_B.y + p.bob }, p.backLeg);
  leg(ctx, { x: HIP_F.x, y: HIP_F.y + p.bob }, p.frontLeg);
  ctx.translate(0, p.bob);
  about(ctx, HIP, () => ctx.rotate(p.lean));
  arm(ctx, SHOULDER_B, p.back, !p.backOver);
  torso(ctx);
  if (p.backOver) glove(ctx, p.back, p.back.angle, p.back.glove);
  ctx.save();
  about(ctx, NECK, () => ctx.rotate(p.headTilt));
  ctx.translate(HEAD.x, HEAD.y);
  ctx.scale(HEAD_SCALE, HEAD_SCALE);
  drawHead(ctx, p);
  ctx.restore();
  if (p.stars >= 0) stars(ctx, p.stars);
  arm(ctx, SHOULDER_F, p.front, true);
  ctx.restore();
}

function ticks(ctx: Ctx): void {
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  for (const [x1, y1, x2, y2] of [[14, 22, 18, 25], [15, 29, 19.5, 29.5], [52, 12, 50.5, 16.5], [57, 16, 53.5, 19]]) {
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
  }
  ctx.stroke();
}

function speedLines(ctx: Ctx, k: number): void {
  ctx.strokeStyle = HERO_COL.speed;
  ctx.lineCap = 'round';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (const [x, y, len] of [[16, 22, 10], [12, 31, 12], [16, 40, 9], [10, 48, 12], [15, 56, 8]]) {
    ctx.moveTo(x - len * k, y);
    ctx.lineTo(x, y);
  }
  ctx.stroke();
}

function sparkle(ctx: Ctx, t: number): void {
  const s = Math.sin(Math.PI * Math.min(1, t * 1.2 + 0.15));
  ctx.save();
  ctx.strokeStyle = HERO_COL.pink;
  ctx.lineWidth = 2.2 * s;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.arc(SPIN.x, SPIN.y, 16 + 10 * t, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  star(ctx, 52, 14, 8 * s + 1, HERO_COL.pink, t * 2);
  star(ctx, 52, 14, 3.4 * s + 0.4, HERO_COL.pinkHi, t * 2);
  star(ctx, 12, 52, 4 * s, HERO_COL.pink, -t * 3);
  star(ctx, 55, 54, 2.6 * s, HERO_COL.pinkHi, t * 4);
}

/** One full hero frame (64x64 world units, feet at FEET). */
export function drawHero(ctx: Ctx, p: Pose): void {
  if (p.speed > 0.5) {
    for (const [off, alpha] of [[-9, 0.18]] as const) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(off, 0);
      figure(ctx, p);
      ctx.restore();
    }
  }
  if (p.speed > 0) speedLines(ctx, p.speed);
  if (p.sparkle >= 0) sparkle(ctx, p.sparkle);
  figure(ctx, p);
  if (p.ticks) ticks(ctx);
}
