/**
 * The Burger Gang boss sheets after the shirt mascot (ref/level8_shirt_burger_gang.png), re-drawn in the
 * 1930s rubber-hose style and mirrored to face the hero: a burger stack with a face on the top bun, heart
 * sunglasses, white gloves (peace sign + red soda cup), tan hose limbs, blue sneakers.
 * Body sheet = bun stack + face + arms (16 poses); legs sheet = strut cycle + stand / lift / ko.
 */
import type Phaser from 'phaser';
import type { Vec } from '../../../api';
import { INK, LINE, anim, inked, sheet } from '../../../draw/canvas';
import { BG, BODY, COL, LEGS, PRE } from '../config';
import { type GlovePose, TAU, can, closedEye, cup, ellipse, glove, limb, pieEye, shades, smooth, sneaker, spiralEye } from './parts';

export const BODY_KEY = `${PRE}body`;
export const LEGS_KEY = `${PRE}legs`;
export const BODY_FRAMES = { idle: [0, 1, 2, 3], shake: [4, 5], spray: 6, windup: 7, throw: 8, twirl: 9, fling: 10, whistle: 11, roar: 12, gulp: 13, ko: [14, 15] } as const;
export const LEG_FRAMES = { strut: [0, 1, 2, 3, 4, 5], stand: 6, lift: 7, ko: 8 } as const;
export const BOSS_ANIMS = { idle: `${PRE}idle-a`, shake: `${PRE}shake-a`, ko: `${PRE}ko-a`, strut: `${PRE}strut-a` } as const;

type Eyes = 'wink' | 'open' | 'angry' | 'closed' | 'dizzy';
type Mouth = 'smirk' | 'grin' | 'o' | 'roar' | 'tongue';
type Item = 'cup' | 'foam' | 'can' | 'shades';
interface Arm {
  hand: Vec;
  pose: GlovePose;
  angle: number;
  bend: number;
  item?: Item;
  itemAngle?: number;
  /** drawn behind the bun (default: the front arm in front, the back arm behind) */
  behind?: boolean;
}
interface Pose {
  sx: number;
  sy: number;
  lean: number;
  eyes: Eyes;
  mouth: Mouth;
  glasses: 'on' | 'off';
  front: Arm;
  back: Arm;
  spin?: number;
}

const cupLow = (dy: number): Arm => ({ hand: { x: -51, y: -26 + dy }, pose: 'hold', angle: -0.2, bend: 6, item: 'cup', itemAngle: -0.1 });
const hip: Arm = { hand: { x: 52, y: -28 }, pose: 'fist', angle: 2.6, bend: 9 };
const BOB = [0, 2, 0, -2];

const POSES: Pose[] = [
  ...[1, 0.965, 1, 1.03].map((sy, i): Pose => ({
    sx: 2 - sy,
    sy,
    lean: 0,
    eyes: 'wink',
    mouth: 'smirk',
    glasses: 'on',
    front: cupLow(BOB[i] ?? 0),
    back: { hand: { x: 47, y: -88 + (BOB[i] ?? 0) }, pose: 'peace', angle: 0.15 + [0, 0.14, 0, -0.1][i]!, bend: -8 },
  })),
  { sx: 0.98, sy: 1.03, lean: 0, eyes: 'open', mouth: 'grin', glasses: 'on', front: { hand: { x: -58, y: -96 }, pose: 'hold', angle: -0.3, bend: -12, item: 'foam', itemAngle: -0.45, behind: true }, back: hip },
  { sx: 1.02, sy: 0.98, lean: 0, eyes: 'open', mouth: 'grin', glasses: 'on', front: { hand: { x: -52, y: -102 }, pose: 'hold', angle: 0.2, bend: -12, item: 'foam', itemAngle: 0.35, behind: true }, back: hip },
  { sx: 1.02, sy: 1, lean: 0.06, eyes: 'angry', mouth: 'grin', glasses: 'on', front: { hand: { x: -38, y: -60 }, pose: 'hold', angle: -1.1, bend: -6, item: 'foam', itemAngle: -1.35 }, back: hip },
  { sx: 0.98, sy: 1.02, lean: -0.12, eyes: 'angry', mouth: 'grin', glasses: 'on', front: cupLow(2), back: { hand: { x: 44, y: -114 }, pose: 'hold', angle: 0.3, bend: 12, item: 'can', itemAngle: 0.4 } },
  { sx: 1.03, sy: 0.97, lean: 0.14, eyes: 'angry', mouth: 'roar', glasses: 'on', front: { hand: { x: -45, y: -18 }, pose: 'hold', angle: -0.4, bend: 6, item: 'cup', itemAngle: -0.3 }, back: { hand: { x: -60, y: -64 }, pose: 'open', angle: -1.45, bend: -16 } },
  { sx: 1, sy: 1.02, lean: -0.05, eyes: 'angry', mouth: 'smirk', glasses: 'off', front: cupLow(0), back: { hand: { x: 16, y: -102 }, pose: 'open', angle: -0.2, bend: 12, item: 'shades', itemAngle: 0.7 }, spin: 1 },
  { sx: 1.02, sy: 0.99, lean: 0.1, eyes: 'open', mouth: 'grin', glasses: 'off', front: cupLow(0), back: { hand: { x: -62, y: -66 }, pose: 'open', angle: -1.5, bend: -14 } },
  { sx: 0.97, sy: 1.04, lean: 0, eyes: 'closed', mouth: 'o', glasses: 'on', front: cupLow(0), back: { hand: { x: 2, y: -50 }, pose: 'peace', angle: -0.55, bend: 18, behind: false } },
  { sx: 0.97, sy: 1.05, lean: -0.04, eyes: 'angry', mouth: 'roar', glasses: 'on', front: { hand: { x: -58, y: -100 }, pose: 'hold', angle: -0.2, bend: -12, item: 'cup', itemAngle: -0.3, behind: true }, back: { hand: { x: 46, y: -108 }, pose: 'fist', angle: 0.2, bend: -8 } },
  { sx: 0.98, sy: 1.03, lean: -0.06, eyes: 'closed', mouth: 'o', glasses: 'on', front: { hand: { x: -34, y: -66 }, pose: 'hold', angle: 1.6, bend: 10, item: 'cup', itemAngle: 2.05 }, back: { hand: { x: 40, y: -22 }, pose: 'open', angle: 1.9, bend: 6 } },
  { sx: 1.03, sy: 0.95, lean: -0.05, eyes: 'dizzy', mouth: 'tongue', glasses: 'off', front: { hand: { x: -54, y: -6 }, pose: 'open', angle: 3, bend: 10 }, back: { hand: { x: 56, y: -6 }, pose: 'open', angle: -3, bend: -10 }, spin: 0 },
  { sx: 1.06, sy: 0.91, lean: 0.05, eyes: 'dizzy', mouth: 'tongue', glasses: 'off', front: { hand: { x: -56, y: -4 }, pose: 'open', angle: 2.8, bend: 14 }, back: { hand: { x: 58, y: -4 }, pose: 'open', angle: -2.8, bend: -14 }, spin: 1.7 },
];

/** Wavy lettuce band between y0 (top) and y1 across ±hw. */
function lettuce(ctx: CanvasRenderingContext2D, y0: number, y1: number, hw: number): void {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 10; i++) pts.push([-hw + (i / 10) * hw * 2, y0 + (i % 2) * 2.4]);
  for (let i = 10; i >= 0; i--) pts.push([-hw + (i / 10) * hw * 2 + 1.5, y1 + (i % 2 ? 3.6 : 0)]);
  smooth(ctx, pts);
  const g = ctx.createLinearGradient(0, y0, 0, y1 + 3);
  g.addColorStop(0, '#8fe061');
  g.addColorStop(1, COL.lettuceDark);
  inked(ctx, g, LINE * 0.9);
}

function patty(ctx: CanvasRenderingContext2D, y: number, hw: number): void {
  ctx.beginPath();
  ctx.roundRect(-hw, y, hw * 2, 14, 6.5);
  const g = ctx.createLinearGradient(0, y, 0, y + 14);
  g.addColorStop(0, '#9a5a33');
  g.addColorStop(1, COL.pattyDark);
  inked(ctx, g, LINE);
  ctx.fillStyle = 'rgba(40,18,8,0.45)';
  for (let i = 0; i < 9; i++) {
    ellipse(ctx, -hw + 8 + i * ((hw * 2 - 16) / 8), y + 4 + (i % 3) * 3, 1.1, 0.8);
    ctx.fill();
  }
}

function cheese(ctx: CanvasRenderingContext2D, y: number, hw: number, seed: number): void {
  ctx.beginPath();
  ctx.moveTo(-hw, y);
  ctx.lineTo(hw, y);
  ctx.lineTo(hw - 2, y + 4);
  const drips = [-30, -12, 8, 26];
  for (let i = drips.length - 1; i >= 0; i--) {
    const x = (drips[i] ?? 0) + (seed % 2) * 4;
    ctx.lineTo(x + 7, y + 4);
    ctx.lineTo(x, y + 10 + ((i + seed) % 2) * 3);
    ctx.lineTo(x - 7, y + 4);
  }
  ctx.lineTo(-hw + 2, y + 4);
  ctx.closePath();
  inked(ctx, COL.cheese, LINE * 0.9);
}

function topBun(ctx: CanvasRenderingContext2D): void {
  const w = BODY.bunW;
  const h = BODY.bunH;
  ctx.beginPath();
  ctx.moveTo(-w, -54);
  ctx.bezierCurveTo(-w - 3, -86, -27, -h, 0, -h);
  ctx.bezierCurveTo(27, -h, w + 3, -86, w, -54);
  ctx.quadraticCurveTo(0, -48, -w, -54);
  ctx.closePath();
  const g = ctx.createRadialGradient(-16, -92, 4, 0, -74, 56);
  g.addColorStop(0, COL.bunLight);
  g.addColorStop(0.55, COL.bun);
  g.addColorStop(1, COL.bunShade);
  inked(ctx, g, LINE * 1.15);
  ctx.fillStyle = COL.seed;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.8;
  for (const [x, y, a] of [[-30, -84, 0.5], [-18, -95, -0.3], [2, -98, 0.2], [20, -94, -0.5], [33, -82, 0.8], [38, -68, 1.1]] as const) {
    ellipse(ctx, x, y, 2.4, 1.2, a);
    ctx.fill();
    ctx.stroke();
  }
}

function face(ctx: CanvasRenderingContext2D, p: Pose): void {
  const on = p.glasses === 'on';
  const ey = on ? -84 : -79;
  const look = { x: -0.9, y: 0.15 };
  if (p.eyes === 'wink') {
    closedEye(ctx, -20, ey + 2, 13, true);
    pieEye(ctx, 9, ey, 8.5, 11, look);
  } else if (p.eyes === 'closed') {
    closedEye(ctx, -20, ey + 2, 13, true);
    closedEye(ctx, 9, ey + 2, 13, true);
  } else if (p.eyes === 'dizzy') {
    spiralEye(ctx, -18, ey, 8, p.spin ?? 0);
    spiralEye(ctx, 10, ey, 8, (p.spin ?? 0) + 2);
  } else {
    pieEye(ctx, -18, ey, 8, 10.5, look);
    pieEye(ctx, 9, ey, 8.5, 11, look);
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = LINE * 1.3;
  const angry = p.eyes === 'angry';
  for (const [x, dir] of [[-18, 1], [9, -1]] as const) {
    ctx.beginPath();
    if (angry) {
      ctx.moveTo(x - 8 * dir, ey - 16);
      ctx.lineTo(x + 7 * dir, ey - 11);
    } else {
      ctx.arc(x, ey - 6, 9, Math.PI * 1.2, Math.PI * 1.8);
    }
    ctx.stroke();
  }
  const mx = -5;
  const my = -55;
  ctx.lineWidth = LINE;
  if (p.mouth === 'smirk') {
    ctx.beginPath();
    ctx.moveTo(mx - 9, my - 1);
    ctx.quadraticCurveTo(mx, my + 5, mx + 9, my - 3);
    ctx.stroke();
  } else if (p.mouth === 'o') {
    ellipse(ctx, mx, my, 4, 4.4);
    inked(ctx, COL.mouth, LINE);
  } else {
    const big = p.mouth === 'roar' ? 1.5 : p.mouth === 'grin' ? 1 : 0.8;
    ctx.beginPath();
    ctx.moveTo(mx - 10 * big, my - 3);
    ctx.quadraticCurveTo(mx, my - 1, mx + 10 * big, my - 4);
    ctx.quadraticCurveTo(mx + 2, my + 12 * big, mx - 10 * big, my - 3);
    inked(ctx, COL.mouth, LINE);
    ellipse(ctx, mx + 1, my + 4 * big + (p.mouth === 'tongue' ? 5 : 0), 5 * big, 3.4 * big);
    inked(ctx, COL.tongue, LINE * 0.7);
  }
  if (on) shades(ctx, -6, -68, 60, -0.07);
}

function holdItem(ctx: CanvasRenderingContext2D, a: Arm): void {
  const { x, y } = a.hand;
  const ang = a.itemAngle ?? 0;
  if (a.item === 'cup' || a.item === 'foam') cup(ctx, x + Math.sin(ang) * 6, y + Math.cos(ang) * 6, 26, ang, a.item === 'foam');
  if (a.item === 'can') can(ctx, x, y - 8, 20, ang, false);
}

function arm(ctx: CanvasRenderingContext2D, from: Vec, a: Arm, spin: number): void {
  limb(ctx, from, a.hand, a.bend, 4.8, COL.skin);
  if (a.item === 'shades') {
    shades(ctx, a.hand.x + 6, a.hand.y - 16, 44, a.itemAngle ?? 0);
    ctx.strokeStyle = INK;
    ctx.lineWidth = LINE * 0.7;
    for (const r of [17, 21]) {
      ctx.beginPath();
      ctx.arc(a.hand.x + 6, a.hand.y - 16, r, 0.3 + spin, 1.3 + spin);
      ctx.stroke();
    }
  } else holdItem(ctx, a);
  glove(ctx, a.hand.x, a.hand.y, 1.2, a.angle, a.pose, a.hand.x < 0 ? 1 : -1);
}

function body(ctx: CanvasRenderingContext2D, p: Pose): void {
  ctx.translate(BODY.w / 2, BODY.base);
  const map = (x: number, y: number): Vec => ({ x: p.sx * (x + p.lean * y), y: p.sy * y });
  const arms: [Vec, Arm, boolean][] = [
    [map(40, -36), p.back, p.back.behind ?? true],
    [map(-42, -38), p.front, p.front.behind ?? false],
  ];
  for (const [at, a, behind] of arms) if (behind) arm(ctx, at, a, p.spin ?? 0);
  ctx.save();
  ctx.transform(p.sx, 0, p.lean * p.sx, p.sy, 0, 0);
  ctx.beginPath();
  ctx.roundRect(-43, -14, 86, 14, [4, 4, 10, 10]);
  inked(ctx, COL.bun, LINE * 1.1);
  lettuce(ctx, -20, -13, 46);
  patty(ctx, -31, 45);
  cheese(ctx, -33, 47, 1);
  patty(ctx, -46, 44);
  cheese(ctx, -48, 46, 2);
  ctx.beginPath();
  ctx.roundRect(-42, -53, 84, 8, 3.5);
  inked(ctx, COL.tomato, LINE * 0.9);
  lettuce(ctx, -60, -52, 48);
  topBun(ctx);
  face(ctx, p);
  ctx.restore();
  for (const [at, a, behind] of arms) if (!behind) arm(ctx, at, a, p.spin ?? 0);
}

/** One leg: hose from the hip to the ankle, sneaker on the floor (or lifted). */
function leg(ctx: CanvasRenderingContext2D, hipX: number, foot: Vec, bend: number, dir: 1 | -1, tilt: number): void {
  limb(ctx, { x: hipX, y: 8 }, { x: foot.x + 1, y: foot.y - 13 }, bend, 4.6, COL.skin);
  sneaker(ctx, foot.x, foot.y, 0.95, dir, tilt);
}

function legs(ctx: CanvasRenderingContext2D, f: number): void {
  const floor = LEGS.h - 1;
  if (f < 6) {
    const ph = (f / 6) * TAU;
    const liftA = Math.max(0, Math.sin(ph)) * 6;
    const liftB = Math.max(0, -Math.sin(ph)) * 6;
    leg(ctx, 48, { x: 42 + 12 * Math.cos(ph), y: floor - liftB }, -4 - liftB, -1, -liftB * 0.03);
    leg(ctx, 36, { x: 42 - 12 * Math.cos(ph), y: floor - liftA }, 4 + liftA, -1, -liftA * 0.03);
  } else if (f === 6) {
    leg(ctx, 48, { x: 58, y: floor }, -3, -1, 0);
    leg(ctx, 36, { x: 26, y: floor }, 3, -1, 0);
  } else if (f === 7) {
    leg(ctx, 48, { x: 54, y: floor }, -4, -1, 0);
    leg(ctx, 36, { x: 16, y: 26 }, 3.5, -1, -0.35);
  } else {
    leg(ctx, 48, { x: 68, y: floor }, 8, 1, 0.1);
    leg(ctx, 36, { x: 16, y: floor }, -8, -1, -0.1);
  }
}

/** Draw the body + legs sheets at texture scale kb. */
export function loadBossSheets(scene: Phaser.Scene, kb: number): void {
  sheet(scene, BODY_KEY, BODY.w, BODY.h, POSES.length, kb, (ctx, f) => {
    const p = POSES[f];
    if (p) body(ctx, p);
  });
  sheet(scene, LEGS_KEY, LEGS.w, LEGS.h, 9, kb, (ctx, f) => legs(ctx, f));
  anim(scene, BOSS_ANIMS.idle, BODY_KEY, BODY_FRAMES.idle, BG.idleFps);
  anim(scene, BOSS_ANIMS.shake, BODY_KEY, BODY_FRAMES.shake, 14);
  anim(scene, BOSS_ANIMS.ko, BODY_KEY, BODY_FRAMES.ko, 4);
  anim(scene, BOSS_ANIMS.strut, LEGS_KEY, LEG_FRAMES.strut, BG.strutFps);
}
