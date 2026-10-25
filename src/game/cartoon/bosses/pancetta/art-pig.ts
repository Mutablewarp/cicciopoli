/**
 * PANCETTA, the pig of the shirt re-drawn in 1930s rubber-hose style: pink pig with pointy ears and a big
 * snout, pie-cut eyes, a laughing open mouth, a red polka-dot bandana, a white tee under blue dungarees,
 * a curly tail, white gloves and red skate shoes. Parts in world units, facing LEFT.
 */
import { LINE } from '../../draw/canvas';
import { ellipse, glove, hose, ink, pieEye, shade, shine, smooth, spiralEye, type GlovePose, type Pt } from '../brie/kit/toon';

export const HEAD = { w: 84, h: 80, nx: 42, ny: 74 } as const;
export const TORSO = { w: 86, h: 74, hx: 42, hy: 68 } as const;
export const LEGS = { w: 92, h: 56, fx: 46, fy: 52 } as const;
export const ARM = { w: 110, h: 124, sx: 70, sy: 64 } as const;
/** arm poses are written with the shoulder at (70, 50); the frame adds this headroom above the hand */
const ARM_TOP = ARM.sy - 50;
export const FLAT = { w: 170, h: 112, fx: 85, fy: 106 } as const;

export const PINK = '#f5a9b4';
const PINK_HI = '#fdd3da';
const PINK_LO = '#d7808f';
const SNOUT = '#f9bfc8';
const DENIM = '#3f6fb8';
const DENIM_LO = '#2b5091';
const TEE = '#fbf6ea';
const RED = '#d8322f';
const MOUTH = '#6b1f2a';
const TONGUE = '#f07a8c';

type Mouth = 'laugh' | 'grin' | 'shout' | 'strain' | 'smirk';
interface Face {
  lid: [number, number];
  angry: number;
  mouth: Mouth;
  dizzy?: boolean;
  squeeze?: boolean;
}

/** Head frames: 0 laugh, 1 blink, 2 wind-up, 3 shout, 4 hurt, 5 dizzy, 6 cocky, 7 cocky blink. */
export const FACES: readonly Face[] = [
  { lid: [0, 0], angry: 0, mouth: 'laugh' },
  { lid: [1, 1], angry: 0, mouth: 'laugh' },
  { lid: [0.3, 0.3], angry: 0.7, mouth: 'grin' },
  { lid: [0, 0], angry: 0, mouth: 'shout' },
  { lid: [0, 0], angry: 0, mouth: 'strain', squeeze: true },
  { lid: [0, 0], angry: 0, mouth: 'laugh', dizzy: true },
  { lid: [0, 0.55], angry: 0.3, mouth: 'smirk' },
  { lid: [1, 1], angry: 0.3, mouth: 'smirk' },
];

function ear(ctx: CanvasRenderingContext2D, pts: readonly Pt[], inner: readonly Pt[]): void {
  smooth(ctx, pts);
  ctx.fillStyle = PINK;
  ctx.fill();
  ink(ctx);
  smooth(ctx, inner);
  ctx.fillStyle = PINK_LO;
  ctx.fill();
}

function mouth(ctx: CanvasRenderingContext2D, m: Mouth): void {
  if (m === 'laugh' || m === 'shout') {
    const pts: Pt[] = m === 'laugh' ? [[12, 56], [28, 61], [46, 56], [40, 70], [24, 72]] : [[20, 56], [32, 57], [40, 62], [34, 74], [22, 72]];
    smooth(ctx, pts);
    ctx.fillStyle = MOUTH;
    ctx.fill();
    ctx.save();
    ctx.clip();
    ellipse(ctx, 30, 74, 11, 7);
    ctx.fillStyle = TONGUE;
    ctx.fill();
    ctx.restore();
    smooth(ctx, pts);
    ink(ctx);
  } else if (m === 'grin' || m === 'smirk') {
    const pts: Pt[] = m === 'grin' ? [[12, 56], [30, 60], [46, 55], [30, 68]] : [[18, 60], [32, 60], [44, 54], [32, 66]];
    smooth(ctx, pts);
    ctx.fillStyle = '#fffaf0';
    ctx.fill();
    ink(ctx);
    ctx.beginPath();
    ctx.moveTo(16, 60);
    ctx.lineTo(43, 58);
    for (const x of [22, 29, 36]) {
      ctx.moveTo(x, 57);
      ctx.lineTo(x, 65);
    }
    ink(ctx, LINE * 0.5);
  } else {
    ctx.beginPath();
    ctx.moveTo(16, 60);
    for (let i = 1; i <= 6; i++) ctx.lineTo(16 + i * 4.4, 60 + (i % 2 ? -2.5 : 2.5));
    ink(ctx, LINE * 0.9);
  }
}

/** Head (neck at HEAD.nx / ny). */
export function drawHead(ctx: CanvasRenderingContext2D, frame: number): void {
  const f = FACES[frame] ?? FACES[0];
  if (!f) return;
  ear(ctx, [[14, 30], [8, 4], [32, 16]], [[16, 24], [13, 10], [26, 18]]);
  ear(ctx, [[50, 12], [70, 0], [68, 26]], [[54, 14], [66, 6], [64, 20]]);
  const head: Pt[] = [[14, 40], [20, 22], [34, 12], [52, 10], [68, 18], [78, 34], [78, 52], [70, 66], [52, 74], [30, 72], [17, 60]];
  smooth(ctx, head);
  const g = ctx.createLinearGradient(14, 10, 78, 74);
  g.addColorStop(0, PINK_HI);
  g.addColorStop(0.5, PINK);
  g.addColorStop(1, PINK_LO);
  ctx.fillStyle = g;
  ctx.fill();
  ink(ctx, LINE * 1.2);
  shine(ctx, 40, 18, 9, 3.5, -0.2, 0.45);
  ctx.save();
  ctx.globalAlpha = 0.4;
  ellipse(ctx, 62, 52, 7, 4);
  ctx.fillStyle = '#ef6f80';
  ctx.fill();
  ctx.restore();
  for (const [ex, side, lid] of [[37, -1, f.lid[0]], [56, 1, f.lid[1]]] as const) {
    if (f.dizzy) spiralEye(ctx, ex, 30, 8, side);
    else if (f.squeeze) {
      ctx.beginPath();
      ctx.moveTo(ex - 7, 24);
      ctx.lineTo(ex + side * 2, 30);
      ctx.lineTo(ex - 7, 36);
      ctx.moveTo(ex + 7, 24);
      ctx.lineTo(ex + side * 2, 30);
      ctx.lineTo(ex + 7, 36);
      ink(ctx, LINE);
    } else pieEye(ctx, ex, 30, 7.5, 10, { x: -0.7, y: 0.1 }, lid, PINK, f.angry * side);
  }
  ctx.beginPath();
  const a = f.angry * 4;
  ctx.moveTo(29, 16 - a * 0.5);
  ctx.quadraticCurveTo(36, 12, 43, 16 + a);
  ctx.moveTo(50, 15 + a);
  ctx.quadraticCurveTo(57, 11, 64, 15 - a * 0.5);
  ink(ctx, LINE);
  ellipse(ctx, 18, 45, 14, 11, -0.1);
  ctx.fillStyle = SNOUT;
  ctx.fill();
  ink(ctx, LINE * 1.1);
  shine(ctx, 14, 39, 4, 2, -0.3, 0.6);
  for (const nx of [12, 23]) {
    ellipse(ctx, nx, 46, 2.4, 3.8, 0.1);
    ctx.fillStyle = '#7a3440';
    ctx.fill();
  }
  mouth(ctx, f.mouth);
}

/** Torso: tee, dungarees, bandana, the back arm and the curly tail (hips at TORSO.hx / hy). */
export function drawTorso(ctx: CanvasRenderingContext2D): void {
  hose(ctx, [58, 22], [74, 36], [66, 54], 7, shade(PINK, -0.12));
  glove(ctx, 66, 56, 1, -1.9, 'fist');
  ctx.beginPath();
  ctx.moveTo(70, 56);
  ctx.bezierCurveTo(84, 54, 86, 44, 79, 43);
  ctx.bezierCurveTo(73, 42, 74, 50, 80, 49);
  ctx.strokeStyle = '#1c1511';
  ctx.lineWidth = 5.6;
  ctx.stroke();
  ctx.strokeStyle = PINK;
  ctx.lineWidth = 3;
  ctx.stroke();
  const body: Pt[] = [[20, 18], [40, 12], [62, 16], [72, 36], [70, 60], [42, 70], [14, 60], [12, 36]];
  smooth(ctx, body);
  ctx.fillStyle = TEE;
  ctx.fill();
  ink(ctx, LINE * 1.2);
  // dungarees: bib, straps, pants
  smooth(ctx, [[25, 30], [58, 28], [62, 46], [70, 50], [70, 60], [42, 70], [14, 60], [14, 50], [22, 46]]);
  const g = ctx.createLinearGradient(14, 28, 70, 70);
  g.addColorStop(0, '#5a86cc');
  g.addColorStop(1, DENIM_LO);
  ctx.fillStyle = g;
  ctx.fill();
  ink(ctx, LINE);
  ctx.save();
  ctx.setLineDash([2, 2]);
  ctx.strokeStyle = '#a9c3ea';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.rect(33, 36, 16, 10);
  ctx.moveTo(18, 52);
  ctx.quadraticCurveTo(42, 60, 68, 52);
  ctx.stroke();
  ctx.restore();
  for (const [x0, x1] of [[27, 20], [56, 60]] as const) hose(ctx, [x0, 31], [(x0 + x1) / 2, 22], [x1, 14], 4, DENIM);
  for (const x of [28, 56]) {
    ellipse(ctx, x, 32, 2.6, 2.6);
    ctx.fillStyle = '#f1c34a';
    ctx.fill();
    ink(ctx, LINE * 0.6);
  }
  // bandana
  smooth(ctx, [[22, 12], [42, 10], [62, 12], [44, 30]]);
  ctx.fillStyle = RED;
  ctx.fill();
  ink(ctx);
  ctx.fillStyle = TEE;
  for (const [x, y] of [[32, 14], [44, 15], [54, 13], [42, 22]] as const) {
    ellipse(ctx, x, y, 1.6, 1.6);
    ctx.fill();
  }
  smooth(ctx, [[60, 10], [74, 4], [72, 14]]);
  ctx.fillStyle = RED;
  ctx.fill();
  ink(ctx, LINE * 0.8);
}

function shoe(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  smooth(ctx, [[x - 12, y - 1], [x - 9, y - 8], [x + 1, y - 9], [x + 7, y - 6], [x + 7, y + 1], [x - 10, y + 2]]);
  ctx.fillStyle = RED;
  ctx.fill();
  ink(ctx, LINE * 0.9);
  ellipse(ctx, x - 9, y - 3, 3.5, 3);
  ctx.fillStyle = TEE;
  ctx.fill();
  ink(ctx, LINE * 0.6);
  ctx.beginPath();
  ctx.moveTo(x - 12, y + 0.5);
  ctx.lineTo(x + 7, y + 0.5);
  ctx.strokeStyle = TEE;
  ctx.lineWidth = 2;
  ctx.stroke();
}

/** Leg frames: 0 skate stance, 1 crouch, 2 push, 3 tuck, 4 stand, 5 splat. Hip drop per pose (from the stance). */
const LEG_POSES: readonly { hip: number; a: Pt; b: Pt; ca: Pt; cb: Pt }[] = [
  { hip: 8, a: [22, 49], b: [70, 49], ca: [12, 26], cb: [80, 26] },
  { hip: 18, a: [20, 49], b: [72, 49], ca: [6, 34], cb: [86, 34] },
  { hip: 10, a: [24, 49], b: [82, 42], ca: [12, 28], cb: [74, 30] },
  { hip: 10, a: [30, 32], b: [60, 34], ca: [18, 18], cb: [74, 20] },
  { hip: 8, a: [34, 49], b: [58, 49], ca: [28, 28], cb: [64, 28] },
  { hip: 20, a: [8, 49], b: [84, 49], ca: [14, 28], cb: [78, 28] },
];
export const LEG_DROP: readonly number[] = LEG_POSES.map((p) => p.hip - 8);

export function drawLegs(ctx: CanvasRenderingContext2D, frame: number): void {
  const p = LEG_POSES[frame] ?? LEG_POSES[0];
  if (!p) return;
  for (const [hx, foot, c] of [[54, p.b, p.cb], [38, p.a, p.ca]] as const) {
    hose(ctx, [hx, p.hip], c, [foot[0], foot[1] - 6], 10, DENIM);
    shoe(ctx, foot[0], foot[1]);
  }
}

interface ArmPose {
  hand: Pt;
  ctrl: Pt;
  glove: GlovePose;
  bacon?: boolean;
}

/** Arm frames: 0 / 1 wave, 2 peace, 3 bacon whirl, 4 throw, 5 fist up, 6 limp, 7 point, 8 hold up. */
export const ARM_POSES: readonly ArmPose[] = [
  { hand: [28, 2], ctrl: [50, 30], glove: 'open' },
  { hand: [14, 14], ctrl: [42, 38], glove: 'open' },
  { hand: [44, 6], ctrl: [50, 32], glove: 'peace' },
  { hand: [58, 2], ctrl: [46, 28], glove: 'fist', bacon: true },
  { hand: [14, 44], ctrl: [40, 34], glove: 'open' },
  { hand: [52, 6], ctrl: [42, 30], glove: 'fist' },
  { hand: [58, 100], ctrl: [74, 80], glove: 'open' },
  { hand: [12, 50], ctrl: [40, 52], glove: 'point' },
  { hand: [66, 2], ctrl: [82, 26], glove: 'fist' },
];

/** A wavy bacon strip (also the projectile) centred at (x, y), length len, along angle a. */
export function baconStrip(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, a: number, wave: number, meat: string, fat: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  const top: Pt[] = [];
  const bot: Pt[] = [];
  for (let i = 0; i <= 8; i++) {
    const px = -len / 2 + (i / 8) * len;
    const py = Math.sin((i / 8) * Math.PI * 2 + wave) * len * 0.09;
    top.push([px, py - len * 0.11]);
    bot.unshift([px, py + len * 0.11]);
  }
  smooth(ctx, [...top, ...bot]);
  ctx.fillStyle = meat;
  ctx.fill();
  ink(ctx, LINE * 0.8);
  smooth(ctx, top.map(([px, py]) => [px, py + len * 0.08] as Pt), false);
  ctx.strokeStyle = fat;
  ctx.lineWidth = len * 0.05;
  ctx.stroke();
  smooth(ctx, bot.map(([px, py]) => [px, py - len * 0.07] as Pt), false);
  ctx.stroke();
  ctx.restore();
}

export function drawArm(ctx: CanvasRenderingContext2D, frame: number): void {
  const p = ARM_POSES[frame] ?? ARM_POSES[0];
  if (!p) return;
  const [hx, hy] = p.hand;
  ctx.save();
  ctx.translate(0, ARM_TOP);
  if (p.bacon) baconStrip(ctx, hx - 4, hy - 6, 48, -0.5, 0, '#d9586a', '#fbe2d6');
  hose(ctx, [ARM.sx, 50], p.ctrl, p.hand, 7, PINK);
  ellipse(ctx, ARM.sx, 50, 9, 8);
  ctx.fillStyle = TEE;
  ctx.fill();
  ink(ctx);
  glove(ctx, hx, hy, 1.1, Math.atan2(hy - p.ctrl[1], hx - p.ctrl[0]) + Math.PI, p.glove);
  ctx.restore();
}

/** Knockout: flat on his back, face up, legs kicking in the air (frames 0 / 1), dizzy, bacon tongue. */
export function drawFlat(ctx: CanvasRenderingContext2D, frame: number): void {
  const hx = FLAT.fx + 40;
  const hy = FLAT.fy - 26;
  const kick = frame ? 6 : 0;
  for (const [dx, fx, fy] of [[6, 18 + kick, -50], [-6, 32 - kick, -44]] as const) {
    hose(ctx, [hx + 2, hy + dx], [hx + 18, hy - 10], [hx + fx, hy + fy + 6], 9, DENIM);
    ctx.save();
    ctx.translate(hx + fx, hy + fy);
    ctx.rotate(Math.PI);
    shoe(ctx, 0, 0);
    ctx.restore();
  }
  ctx.save();
  ctx.translate(hx, hy);
  ctx.scale(0.86, 0.86);
  // upright (x, y) → lying (y, x): the head to the left, the face up, the back on the floor
  ctx.rotate(-Math.PI / 2);
  ctx.scale(-1, 1);
  ctx.save();
  ctx.translate(-TORSO.hx, -TORSO.hy);
  drawTorso(ctx);
  ctx.restore();
  ctx.save();
  ctx.translate(-4 - HEAD.nx, -51 - HEAD.ny);
  drawHead(ctx, 5);
  ctx.restore();
  ctx.restore();
  baconStrip(ctx, hx - 54, hy - 22 - frame * 2, 24, -1.3, frame * Math.PI, '#d9586a', '#fbe2d6');
}
