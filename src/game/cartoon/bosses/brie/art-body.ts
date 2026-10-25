/**
 * MONSIEUR BRIE, the mascot of the "Brie with friends" shirt re-drawn in 1930s rubber-hose style: a tall
 * brie wedge (golden paste, white bloomy rind on one side) with big pie-cut googly eyes and a cheeky
 * tongue, a black beret, white hose arms and white gloves, blue sneakers. Drawing functions in world units,
 * facing LEFT; the rig (rig.ts) mirrors them.
 */
import { INK, LINE } from '../../draw/canvas';
import { contactShadow, ellipse, glove, hose, ink, pieEye, shade, shine, smooth, spiralEye, type GlovePose, type Pt } from './kit/toon';
import { rng } from './kit/paths';

export const WEDGE = { w: 100, h: 126, footX: 50, footY: 112 } as const;
export const ARM = { w: 120, h: 120, sx: 80, sy: 60 } as const;
export const LEGS = { w: 80, h: 54, footX: 40, footY: 50 } as const;
export const PUDDLE = { w: 160, h: 90, footX: 80, footY: 82 } as const;
export const BERET = { w: 48, h: 30 } as const;

export const PASTE = '#f6cf72';
const PASTE_HI = '#fde7a8';
const PASTE_LO = '#e0a44c';
const RIND = '#f7f2e4';
const RIND_LO = '#ddd4c0';
const TONGUE = '#f08aa0';
const MOUTH = '#5a1d1d';
export const LIMB = '#f8f3e8';
export const SNEAKER = '#2f6fd6';

const OUTER: Pt[] = [[56, 6], [68, 12], [80, 40], [92, 86], [92, 104], [82, 111], [50, 112], [18, 111], [8, 104], [9, 90], [24, 50], [42, 14]];
const INNER: Pt[] = [[52, 9], [60, 18], [68, 46], [77, 88], [78, 106], [70, 111], [50, 112], [18, 111], [8, 104], [9, 90], [24, 50], [42, 14]];

type Mouth = 'tongue' | 'grin' | 'shout' | 'strain' | 'frown' | 'dizzy';
interface Expr {
  lid: number;
  angry: number;
  mouth: Mouth;
  drips: boolean;
  dizzy?: boolean;
  squeeze?: boolean;
  sweat?: boolean;
}

/** Wedge frames: 0 idle, 1 blink, 2 wind-up, 3 shout, 4 hurt, 5 melting angry, 6 its blink, 7 dizzy, 8 melting shout. */
export const WEDGE_EXPR: readonly Expr[] = [
  { lid: 0, angry: 0, mouth: 'tongue', drips: false },
  { lid: 1, angry: 0, mouth: 'tongue', drips: false },
  { lid: 0.3, angry: 0.6, mouth: 'grin', drips: false },
  { lid: 0, angry: 0, mouth: 'shout', drips: false },
  { lid: 0, angry: 0, mouth: 'strain', drips: false, squeeze: true },
  { lid: 0.35, angry: 0.7, mouth: 'frown', drips: true, sweat: true },
  { lid: 1, angry: 0.7, mouth: 'frown', drips: true, sweat: true },
  { lid: 0, angry: 0, mouth: 'dizzy', drips: true, dizzy: true },
  { lid: 0.2, angry: 0.8, mouth: 'shout', drips: true, sweat: true },
];

function mouth(ctx: CanvasRenderingContext2D, m: Mouth): void {
  const x = 39;
  const y = 86;
  if (m === 'tongue' || m === 'dizzy') {
    smooth(ctx, [[x - 12, y - 3], [x, y], [x + 11, y - 4], [x + 6, y + 7], [x - 5, y + 7]]);
    ctx.fillStyle = MOUTH;
    ctx.fill();
    ink(ctx);
    const tx = m === 'dizzy' ? x + 9 : x + 3;
    smooth(ctx, [[tx - 6, y + 3], [tx + 6, y + 2], [tx + 7, y + 11], [tx, y + 16], [tx - 6, y + 11]]);
    ctx.fillStyle = TONGUE;
    ctx.fill();
    ink(ctx, LINE * 0.8);
    ctx.beginPath();
    ctx.moveTo(tx, y + 5);
    ctx.lineTo(tx + 0.5, y + 11);
    ink(ctx, LINE * 0.5);
  } else if (m === 'grin' || m === 'frown') {
    const sad = m === 'frown' ? -1 : 1;
    smooth(ctx, [[x - 14, y - 2 * sad], [x, y + (sad > 0 ? 0 : -4)], [x + 13, y - 3 * sad], [x, y + (sad > 0 ? 11 : 6)]]);
    ctx.fillStyle = '#fffaf0';
    ctx.fill();
    ink(ctx);
    ctx.beginPath();
    ctx.moveTo(x - 11, y + 2 + (sad < 0 ? 2 : 0));
    ctx.lineTo(x + 11, y + 1 + (sad < 0 ? 2 : 0));
    for (const tx of [-5, 1, 7]) {
      ctx.moveTo(x + tx, y - 2);
      ctx.lineTo(x + tx, y + 7);
    }
    ink(ctx, LINE * 0.5);
  } else if (m === 'shout') {
    ellipse(ctx, x, y + 3, 9, 11);
    ctx.fillStyle = MOUTH;
    ctx.fill();
    ink(ctx);
    ctx.save();
    ellipse(ctx, x, y + 3, 9, 11);
    ctx.clip();
    ellipse(ctx, x + 2, y + 13, 7, 5);
    ctx.fillStyle = TONGUE;
    ctx.fill();
    ctx.restore();
  } else {
    ctx.beginPath();
    ctx.moveTo(x - 10, y + 2);
    for (let i = 1; i <= 6; i++) ctx.lineTo(x - 10 + i * 3.6, y + 2 + (i % 2 ? -2.5 : 2.5));
    ink(ctx, LINE * 0.9);
  }
}

function eyes(ctx: CanvasRenderingContext2D, e: Expr): void {
  const look = { x: -0.7, y: 0.1 };
  for (const [ex, side] of [[30, -1], [53, 1]] as const) {
    if (e.dizzy) spiralEye(ctx, ex, 60, 10, side);
    else if (e.squeeze) {
      ctx.beginPath();
      ctx.moveTo(ex - 9, 54);
      ctx.lineTo(ex + side * 2, 60);
      ctx.lineTo(ex - 9, 66);
      ctx.moveTo(ex + 9, 54);
      ctx.lineTo(ex + side * 2, 60);
      ctx.lineTo(ex + 9, 66);
      ink(ctx, LINE * 1.1);
    } else pieEye(ctx, ex, 60, 10, 13.5, look, e.lid, PASTE_HI, e.angry * side);
  }
  ctx.beginPath();
  const lift = e.angry > 0 ? 4 : 0;
  ctx.moveTo(21, 41 - lift);
  ctx.quadraticCurveTo(29, 36 + lift * 0.5, 37, 41 + lift);
  ctx.moveTo(46, 41 + lift);
  ctx.quadraticCurveTo(54, 36 + lift * 0.5, 62, 41 - lift);
  ink(ctx, LINE * 1.1);
}

function drips(ctx: CanvasRenderingContext2D): void {
  for (const [x, len] of [[20, 9], [37, 13], [58, 7], [70, 11]] as const) {
    smooth(ctx, [[x - 5, 106], [x + 5, 106], [x + 3, 112 + len - 4], [x, 112 + len], [x - 3, 112 + len - 4]]);
    ctx.fillStyle = PASTE;
    ctx.fill();
    ink(ctx, LINE * 0.8);
  }
}

/** The wedge (frame WEDGE, bottom centre at footX/footY). */
export function drawWedge(ctx: CanvasRenderingContext2D, frame: number): void {
  const e = WEDGE_EXPR[frame] ?? WEDGE_EXPR[0];
  if (!e) return;
  const r = rng(11);
  if (e.drips) drips(ctx);
  smooth(ctx, OUTER);
  ctx.fillStyle = RIND;
  ctx.fill();
  ctx.save();
  smooth(ctx, OUTER);
  ctx.clip();
  for (let i = 0; i < 26; i++) {
    ellipse(ctx, 60 + r() * 36, 10 + r() * 100, 1 + r() * 2.2, 0.8 + r() * 1.6);
    ctx.fillStyle = RIND_LO;
    ctx.fill();
  }
  smooth(ctx, INNER);
  const g = ctx.createLinearGradient(10, 10, 86, 112);
  g.addColorStop(0, PASTE_HI);
  g.addColorStop(0.55, PASTE);
  g.addColorStop(1, PASTE_LO);
  ctx.fillStyle = g;
  ctx.fill();
  ink(ctx, LINE * 0.7);
  ctx.globalAlpha = 0.16;
  for (let i = 0; i < 14; i++) {
    ellipse(ctx, 14 + r() * 56, 24 + r() * 80, 1.5 + r() * 2.5, 1 + r() * 2);
    ctx.fillStyle = shade(PASTE_LO, -0.2);
    ctx.fill();
  }
  ctx.globalAlpha = 0.2;
  ellipse(ctx, 70, 112, 46, 22);
  ctx.fillStyle = '#8a4a14';
  ctx.fill();
  ctx.restore();
  shine(ctx, 33, 28, 4, 11, 0.45, 0.55);
  ctx.save();
  ctx.globalAlpha = 0.35;
  for (const cx of [17, 64]) {
    ellipse(ctx, cx, 78, 6, 3.5);
    ctx.fillStyle = '#ef7d7d';
    ctx.fill();
  }
  ctx.restore();
  eyes(ctx, e);
  smooth(ctx, [[34, 72], [40, 70], [44, 75], [38, 78]]);
  ctx.fillStyle = PASTE_HI;
  ctx.fill();
  ink(ctx, LINE * 0.8);
  mouth(ctx, e.mouth);
  if (e.sweat) {
    for (const [x, y] of [[80, 36], [86, 52]] as const) {
      smooth(ctx, [[x, y - 5], [x + 3, y + 2], [x, y + 4], [x - 3, y + 2]]);
      ctx.fillStyle = '#d8f0ff';
      ctx.fill();
      ink(ctx, LINE * 0.6);
    }
  }
  smooth(ctx, OUTER);
  ink(ctx, LINE * 1.25);
}

/** The black beret (BERET frame, centred), stalk on top. */
export function drawBeret(ctx: CanvasRenderingContext2D): void {
  const cx = BERET.w / 2;
  ctx.beginPath();
  ctx.moveTo(cx + 1, 9);
  ctx.quadraticCurveTo(cx + 3, 2, cx + 7, 3);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  ctx.stroke();
  smooth(ctx, [[3, 20], [8, 11], [cx, 7], [BERET.w - 6, 11], [BERET.w - 2, 19], [cx + 4, 24], [cx - 6, 24]]);
  ctx.fillStyle = '#2b2522';
  ctx.fill();
  ink(ctx, LINE);
  shine(ctx, cx - 7, 13, 7, 2.4, -0.15, 0.35);
  ctx.beginPath();
  ctx.moveTo(7, 21);
  ctx.quadraticCurveTo(cx, 26, BERET.w - 5, 20);
  ctx.strokeStyle = '#5b514b';
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

interface ArmPose {
  hand: Pt;
  ctrl: Pt;
  glove: GlovePose;
  prop?: 'baguette' | 'bundle';
}

/** Arm frames: 0 grip, 1 raise baguette, 2 throw, 3 twirl, 4 basket, 5 javelin bundle, 6 fist, 7 limp. */
export const ARM_POSES: readonly ArmPose[] = [
  { hand: [70, 66], ctrl: [68, 86], glove: 'fist' },
  { hand: [66, 8], ctrl: [56, 40], glove: 'fist', prop: 'baguette' },
  { hand: [24, 50], ctrl: [52, 66], glove: 'open' },
  { hand: [60, 4], ctrl: [50, 36], glove: 'point' },
  { hand: [34, 84], ctrl: [58, 88], glove: 'open' },
  { hand: [74, 8], ctrl: [56, 34], glove: 'fist', prop: 'bundle' },
  { hand: [44, 18], ctrl: [52, 52], glove: 'fist' },
  { hand: [62, 104], ctrl: [78, 90], glove: 'open' },
];

/** A loaf (also the projectile): centred at (x, y), along angle a. */
export function loaf(ctx: CanvasRenderingContext2D, x: number, y: number, len: number, a: number, fill: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  const h = len * 0.12;
  smooth(ctx, [[-len / 2, 0], [-len / 2 + 6, -h], [len / 2 - 6, -h], [len / 2, 0], [len / 2 - 6, h], [-len / 2 + 6, h]]);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = shade(fill, -0.35);
  ctx.fillRect(-len / 2, h * 0.2, len, h);
  ctx.restore();
  ink(ctx, LINE * 0.8);
  ctx.beginPath();
  for (let i = -2; i <= 2; i++) {
    ctx.moveTo(i * len * 0.16 - 3, -h * 0.55);
    ctx.lineTo(i * len * 0.16 + 3, h * 0.15);
  }
  ctx.strokeStyle = shade(fill, 0.45);
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.restore();
}

export const CRUST = '#d9963f';

/** Arm frame (shoulder at ARM.sx / sy). */
export function drawArm(ctx: CanvasRenderingContext2D, frame: number): void {
  const p = ARM_POSES[frame] ?? ARM_POSES[0];
  if (!p) return;
  const [hx, hy] = p.hand;
  const rot = Math.atan2(hy - p.ctrl[1], hx - p.ctrl[0]) + Math.PI;
  if (p.prop === 'bundle') for (const a of [-2.35, -2.05, -1.75]) loaf(ctx, hx + Math.cos(a) * 14, hy + Math.sin(a) * 14, 44, a, CRUST);
  hose(ctx, [ARM.sx, ARM.sy], p.ctrl, p.hand, 7, LIMB);
  glove(ctx, hx, hy, 1.15, rot, p.glove);
  if (p.prop === 'baguette') loaf(ctx, hx - 2, hy - 2, 46, -0.18, CRUST);
}

function sneaker(ctx: CanvasRenderingContext2D, x: number, y: number, tilt = 0): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  smooth(ctx, [[-12, -1], [-9, -7], [0, -8], [6, -6], [7, 0], [0, 2], [-10, 2]]);
  ctx.fillStyle = SNEAKER;
  ctx.fill();
  ink(ctx, LINE * 0.9);
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.lineTo(7, 0);
  ctx.strokeStyle = '#fbf6ea';
  ctx.lineWidth = 2;
  ctx.stroke();
  shine(ctx, -5, -5, 3, 1.2, -0.2, 0.5);
  ctx.restore();
}

/** Leg frames (on foot): 0 stand, 1 step left, 2 step right, 3 crouch, 4 tucked, 5 splat. */
const LEG_POSES: readonly [Pt, Pt, number][] = [
  [[26, 48], [54, 48], 0],
  [[24, 40], [54, 48], 0],
  [[26, 48], [56, 40], 0],
  [[18, 48], [62, 48], 12],
  [[28, 26], [52, 28], -6],
  [[12, 48], [68, 48], 14],
];

export function drawLegs(ctx: CanvasRenderingContext2D, frame: number): void {
  const p = LEG_POSES[frame] ?? LEG_POSES[0];
  if (!p) return;
  const [a, b, drop] = p;
  for (const [hip, foot, bend] of [[[33, 6 + drop] as Pt, a, -10], [[47, 6 + drop] as Pt, b, 10]] as const) {
    hose(ctx, hip, [(hip[0] + foot[0]) / 2 + bend, (hip[1] + foot[1]) / 2], [foot[0], foot[1] - 3], 7, LIMB);
    sneaker(ctx, foot[0], foot[1], 0);
  }
}

/** KO frames: 0 slumping, 1 half melted, 2 / 3 a puddle with spinning dizzy eyes. */
export function drawPuddle(ctx: CanvasRenderingContext2D, frame: number): void {
  const cx = PUDDLE.footX;
  const fy = PUDDLE.footY;
  contactShadow(ctx, cx, fy, 70, 0.25);
  const h = [70, 38, 16, 16][frame] ?? 16;
  const w = [46, 62, 74, 74][frame] ?? 74;
  smooth(ctx, [[cx - w, fy], [cx - w * 0.7, fy - h * 0.5], [cx - w * 0.3, fy - h], [cx + w * 0.25, fy - h * 0.95], [cx + w * 0.75, fy - h * 0.45], [cx + w, fy], [cx, fy + 3]]);
  const g = ctx.createLinearGradient(cx - w, fy - h, cx + w, fy);
  g.addColorStop(0, PASTE_HI);
  g.addColorStop(1, PASTE_LO);
  ctx.fillStyle = g;
  ctx.fill();
  ink(ctx, LINE * 1.2);
  shine(ctx, cx - w * 0.35, fy - h * 0.7, w * 0.12, 2.5, -0.1, 0.5);
  const ey = fy - h - (frame >= 2 ? 6 : -h * 0.45);
  for (const ex of [cx - 14, cx + 10]) spiralEye(ctx, ex, ey, 8, frame === 3 ? Math.PI : 0);
  smooth(ctx, [[cx - 3, ey + 13], [cx + 6, ey + 12], [cx + 5, ey + 22], [cx - 2, ey + 20]]);
  ctx.fillStyle = TONGUE;
  ctx.fill();
  ink(ctx, LINE * 0.7);
}
