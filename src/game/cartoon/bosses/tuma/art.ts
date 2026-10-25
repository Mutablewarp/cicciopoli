/**
 * DON TUMA body sheet (ref/level8_shirt_tuma_siciliana.png): a round tuma cheese caramelised with honey,
 * coppola, round sunglasses, big Sicilian moustache, rubber-hose arms with white gloves, glossy shoes.
 * Faces LEFT. Frame BODY.w x BODY.h world units, feet on BODY.footY. Frames = TUMA_POSES (index = frame).
 */
import { INK, LINE, inked } from '../../draw/canvas';
import { type Ctx, type GlovePose, WHITE, ell, glove, hose, pieEye, shoe, shutEye, spiralEye, star } from './kit/toon';
import { BALL } from './config';
import { citrus, honeyBottle, steam } from './props';


type Pt = readonly [number, number];
interface Arm {
  elbow: Pt;
  hand: Pt;
  rot: number;
  g: GlovePose;
  hold?: 'lemon' | 'bottle';
}
type Face = 'smug' | 'blink' | 'shout' | 'glint' | 'angry' | 'angryBlink' | 'yell' | 'dizzy';
type Mode = 'seat' | 'stand' | 'crouch' | 'ball' | 'melt';
interface Pose {
  mode: Mode;
  face: Face;
  front?: Arm;
  back?: Arm;
  bob?: number;
  tilt?: number;
  stomp?: boolean;
  steam?: boolean;
  stars?: number;
}

const REST: Arm = { elbow: [150, 150], hand: [158, 138], rot: -0.4, g: 'grip' };
const FIST_UP: Arm = { elbow: [164, 104], hand: [160, 72], rot: -1.7, g: 'fist' };
const FIST_LOW: Arm = { elbow: [66, 140], hand: [52, 118], rot: -2.4, g: 'fist' };
const FIST_HIGH: Arm = { elbow: [58, 118], hand: [50, 86], rot: -1.9, g: 'fist' };
const FIST_BACK: Arm = { elbow: [160, 132], hand: [168, 112], rot: -1.2, g: 'fist' };

/** Frame index -> pose. Names in TF (frame lookup for the runtime). */
export const TUMA_POSES: readonly Pose[] = [
  { mode: 'seat', face: 'smug', front: { elbow: [70, 116], hand: [56, 84], rot: -1.95, g: 'open' }, back: REST },
  { mode: 'seat', face: 'smug', bob: 1, front: { elbow: [74, 112], hand: [66, 80], rot: -1.45, g: 'open' }, back: REST },
  { mode: 'seat', face: 'smug', bob: 2, front: { elbow: [70, 116], hand: [56, 84], rot: -1.95, g: 'open' }, back: REST },
  { mode: 'seat', face: 'blink', bob: 1, front: { elbow: [74, 112], hand: [66, 80], rot: -1.45, g: 'open' }, back: REST },
  { mode: 'seat', face: 'shout', front: { elbow: [70, 70], hand: [86, 22], rot: -1.4, g: 'grip', hold: 'lemon' }, back: REST },
  { mode: 'seat', face: 'smug', front: { elbow: [60, 112], hand: [26, 102], rot: 3.0, g: 'open' }, back: REST },
  { mode: 'seat', face: 'glint', front: { elbow: [76, 116], hand: [62, 96], rot: -1.3, g: 'point' }, back: REST },
  { mode: 'seat', face: 'shout', front: { elbow: [76, 80], hand: [84, 48], rot: -1.6, g: 'grip', hold: 'bottle' }, back: { elbow: [150, 70], hand: [118, 44], rot: -2.6, g: 'grip' } },
  { mode: 'seat', face: 'yell', bob: -4, steam: true, front: FIST_HIGH, back: FIST_UP },
  { mode: 'stand', face: 'angry', front: FIST_LOW, back: FIST_UP, steam: true },
  { mode: 'stand', face: 'angry', bob: 2, front: FIST_HIGH, back: FIST_BACK },
  { mode: 'stand', face: 'angry', stomp: true, front: FIST_LOW, back: FIST_UP, steam: true },
  { mode: 'stand', face: 'angryBlink', bob: 2, front: FIST_HIGH, back: FIST_BACK },
  { mode: 'crouch', face: 'angry', front: { elbow: [70, 160], hand: [60, 176], rot: 2.6, g: 'fist' }, back: { elbow: [150, 160], hand: [156, 176], rot: 0.6, g: 'fist' } },
  { mode: 'ball', face: 'angry' },
  { mode: 'stand', face: 'yell', front: { elbow: [56, 104], hand: [24, 92], rot: 3.05, g: 'open' }, back: FIST_BACK },
  { mode: 'stand', face: 'angry', front: FIST_LOW, back: { elbow: [158, 70], hand: [150, 30], rot: -1.6, g: 'grip', hold: 'lemon' } },
  { mode: 'stand', face: 'dizzy', tilt: -0.14, stars: 0, front: { elbow: [62, 150], hand: [48, 160], rot: 2.4, g: 'open' }, back: { elbow: [152, 150], hand: [164, 160], rot: 0.7, g: 'open' } },
  { mode: 'stand', face: 'dizzy', tilt: 0.12, stars: 1, front: { elbow: [62, 140], hand: [44, 146], rot: 2.6, g: 'open' }, back: { elbow: [154, 140], hand: [170, 148], rot: 0.5, g: 'open' } },
  { mode: 'melt', face: 'dizzy' },
];

/** Named frames for the runtime. */
export const TF = { idle: [0, 1, 2, 3], reach: 4, throw: 5, glint: 6, honey: 7, rage: 8, angry: [9, 10, 11, 12], crouch: 13, ball: 14, sThrow: 15, sReach: 16, dizzy: [17, 18], melt: 19 } as const;

const CHEESE = { light: '#fff7df', base: '#f5e2ac', warm: '#ecc777', crust: '#d9973c', honey: '#e09a2e' };
const CAP = '#86704f';
const SKIN_RED = 'rgba(232,96,80,0.45)';

interface EggT {
  x: number;
  y: number;
  tilt: number;
  sx: number;
  sy: number;
}

function eggT(p: Pose): EggT {
  const bob = p.bob ?? 0;
  if (p.mode === 'seat') return { x: 126, y: 112 + bob, tilt: 0.4, sx: 1, sy: 1 };
  if (p.mode === 'crouch') return { x: 104, y: 132, tilt: -0.05, sx: 1.14, sy: 0.84 };
  return { x: 104, y: 104 + bob, tilt: p.tilt ?? -0.05, sx: 1, sy: 1 };
}

function toFrame(t: EggT, lx: number, ly: number): Pt {
  const [c, s, x, y] = [Math.cos(t.tilt), Math.sin(t.tilt), lx * t.sx, ly * t.sy];
  return [t.x + x * c - y * s, t.y + x * s + y * c];
}

function eggPath(ctx: Ctx, rx: number, ry: number): void {
  ctx.beginPath();
  ctx.moveTo(0, -ry);
  ctx.bezierCurveTo(rx * 0.8, -ry, rx, -ry * 0.25, rx, ry * 0.2);
  ctx.bezierCurveTo(rx, ry * 0.78, rx * 0.55, ry, 0, ry);
  ctx.bezierCurveTo(-rx * 0.55, ry, -rx, ry * 0.78, -rx, ry * 0.2);
  ctx.bezierCurveTo(-rx, -ry * 0.25, -rx * 0.8, -ry, 0, -ry);
  ctx.closePath();
}

/** The caramelised tuma: shaded cheese, honey glaze on top, basket marks, highlight. Local coords. */
export function cheese(ctx: Ctx, rx: number, ry: number, angry: boolean): void {
  eggPath(ctx, rx, ry);
  const g = ctx.createRadialGradient(-rx * 0.35, -ry * 0.4, 2, 0, 0, ry * 1.15);
  g.addColorStop(0, CHEESE.light);
  g.addColorStop(0.5, angry ? '#f8d8a0' : CHEESE.base);
  g.addColorStop(0.82, CHEESE.warm);
  g.addColorStop(1, CHEESE.crust);
  inked(ctx, g, LINE * 1.2);
  ctx.save();
  eggPath(ctx, rx - 1, ry - 1);
  ctx.clip();
  ctx.strokeStyle = 'rgba(150,95,40,0.16)';
  ctx.lineWidth = 0.9;
  for (let row = 0; row < 5; row++) {
    const y = ry * 0.3 + row * 7;
    for (let x = -rx + (row % 2) * 5; x < rx; x += 10) {
      ctx.beginPath();
      ctx.arc(x, y, 3.4, Math.PI * 0.1, Math.PI * 0.9);
      ctx.stroke();
    }
  }
  ctx.fillStyle = CHEESE.honey;
  ctx.beginPath();
  ctx.moveTo(-rx, -ry);
  ctx.lineTo(rx, -ry);
  ctx.lineTo(rx, -ry * 0.58);
  for (const [dx, len] of [[0.7, 10], [0.35, 4], [0.05, 16], [-0.3, 6], [-0.62, 12]] as const) {
    ctx.quadraticCurveTo(rx * (dx + 0.12), -ry * 0.56, rx * dx + 2.5, -ry * 0.55 + len);
    ctx.arc(rx * dx, -ry * 0.55 + len, 2.5, 0, Math.PI);
    ctx.quadraticCurveTo(rx * (dx - 0.08), -ry * 0.55, rx * (dx - 0.18), -ry * 0.58);
  }
  ctx.lineTo(-rx, -ry * 0.58);
  ctx.closePath();
  ctx.globalAlpha = 0.85;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(120,60,10,0.6)';
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ell(ctx, -rx * 0.42, -ry * 0.12, rx * 0.16, ry * 0.26, 0.4);
  ctx.fill();
  ctx.restore();
}

function moustache(ctx: Ctx, wig: number): void {
  for (const side of [-1, 1] as const) {
    const len = side < 0 ? 32 : 22;
    ctx.beginPath();
    ctx.moveTo(-8, 9);
    ctx.bezierCurveTo(-8 + side * 10, 3, -8 + side * len * 0.8, 10, -8 + side * len, 2 - wig);
    ctx.bezierCurveTo(-8 + side * (len + 5), -4 - wig, -8 + side * (len - 1), -10 - wig, -8 + side * (len - 5), -5 - wig);
    ctx.bezierCurveTo(-8 + side * (len - 2), 0, -8 + side * len * 0.6, 20, -8, 17);
    ctx.closePath();
    inked(ctx, '#2a1d16', LINE * 0.8);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(-20, 8);
  ctx.quadraticCurveTo(-30, 6, -36, 2);
  ctx.stroke();
}

function mouth(ctx: Ctx, f: Face): void {
  if (f === 'smug' || f === 'blink' || f === 'glint') {
    ctx.beginPath();
    ctx.moveTo(-22, 20);
    ctx.quadraticCurveTo(-10, 34, 4, 20);
    ctx.quadraticCurveTo(-10, 26, -22, 20);
    inked(ctx, '#6a1c14', LINE * 0.8);
    ell(ctx, -9, 26, 5, 2.4);
    ctx.fillStyle = '#e8707a';
    ctx.fill();
    return;
  }
  if (f === 'angry' || f === 'angryBlink') {
    ctx.beginPath();
    ctx.rect(-22, 18, 24, 9);
    inked(ctx, WHITE, LINE * 0.8);
    ctx.beginPath();
    for (const x of [-16, -10, -4]) {
      ctx.moveTo(x, 18);
      ctx.lineTo(x, 27);
    }
    ctx.moveTo(-22, 22.5);
    ctx.lineTo(2, 22.5);
    ctx.lineWidth = 0.8;
    ctx.stroke();
    return;
  }
  const open = f === 'yell' ? 1.25 : f === 'dizzy' ? 0.7 : 1;
  ell(ctx, -10, 26 * (f === 'dizzy' ? 0.95 : 1), 9 * open, 10 * open);
  inked(ctx, '#5a1610', LINE * 0.8);
  ell(ctx, f === 'dizzy' ? -4 : -10, 31, 6, 4);
  ctx.fillStyle = '#e8707a';
  ctx.fill();
}

function face(ctx: Ctx, f: Face, wig: number): void {
  const angry = f === 'angry' || f === 'angryBlink' || f === 'yell';
  ctx.fillStyle = SKIN_RED;
  ell(ctx, -34, 6, 8, 5);
  ctx.fill();
  ell(ctx, 12, 4, 7, 5);
  ctx.fill();
  const eyes: readonly (readonly [number, number, number, number])[] = [[-22, -12, 9, 12], [0, -14, 8, 11]];
  for (const [x, y, rx, ry] of eyes) {
    if (f === 'dizzy') spiralEye(ctx, x, y, rx * 0.9, x);
    else if (f === 'blink' || f === 'angryBlink') shutEye(ctx, x, y, rx * 0.8, false);
    else pieEye(ctx, x, y, rx, ry, -0.8, f === 'glint' ? -0.2 : 0.15, angry ? 0.32 : 0, CHEESE.base);
  }
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineWidth = LINE * 1.7;
  ctx.beginPath();
  const by = f === 'glint' ? -32 : -27;
  if (angry) {
    ctx.moveTo(-32, -30);
    ctx.lineTo(-13, -23);
    ctx.moveTo(-6, -24);
    ctx.lineTo(10, -30);
  } else {
    ctx.moveTo(-31, by + 2);
    ctx.quadraticCurveTo(-22, by - 4, -13, by + 1);
    ctx.moveTo(-6, by);
    ctx.quadraticCurveTo(1, by - 5, 9, by);
  }
  ctx.stroke();
  if (f === 'smug' || f === 'blink' || f === 'shout') glasses(ctx, 0, 0.84);
  if (f === 'glint') glasses(ctx, 11, 0.95);
  ell(ctx, -12, 3, 8.5, 7.5);
  inked(ctx, '#f0a08a', LINE * 0.8);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ell(ctx, -15, 0, 2.6, 1.8);
  ctx.fill();
  mouth(ctx, f);
  moustache(ctx, wig);
}

/** Round sunglasses, dy = slid down the nose. */
function glasses(ctx: Ctx, dy: number, alpha: number): void {
  ctx.strokeStyle = INK;
  ctx.lineWidth = LINE;
  ctx.beginPath();
  ctx.moveTo(-13, -13 + dy);
  ctx.quadraticCurveTo(-11, -17 + dy, -8, -14 + dy);
  ctx.moveTo(9, -15 + dy);
  ctx.lineTo(34, -20 + dy * 0.5);
  ctx.stroke();
  for (const [x, r] of [[-23, 11], [1, 10]] as const) {
    ell(ctx, x, -12 + dy, r, r);
    ctx.globalAlpha = alpha;
    inked(ctx, '#1e1410', LINE);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(x, -12 + dy, r * 0.62, Math.PI * 1.1, Math.PI * 1.5);
    ctx.stroke();
  }
}

function coppola(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(-38, -36);
  ctx.bezierCurveTo(-34, -62, 18, -72, 40, -48);
  ctx.bezierCurveTo(40, -38, 0, -36, -38, -36);
  ctx.closePath();
  inked(ctx, CAP, LINE * 1.1);
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(60,40,25,0.45)';
  ctx.lineWidth = 0.9;
  for (let x = -40; x < 44; x += 5) {
    ctx.beginPath();
    for (let y = -74; y < -34; y += 4) ctx.lineTo(x + ((y / 4) % 2 ? 1.6 : -1.6), y);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,240,210,0.25)';
  ell(ctx, -10, -58, 18, 5, -0.2);
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(-36, -38);
  ctx.bezierCurveTo(-50, -40, -62, -34, -58, -29);
  ctx.bezierCurveTo(-48, -27, -38, -30, -30, -34);
  ctx.closePath();
  inked(ctx, '#6c583e', LINE);
  ell(ctx, 4, -64, 3.2, 2);
  inked(ctx, '#6c583e', LINE * 0.7);
}

function arm(ctx: Ctx, t: EggT, sh: Pt, a: Arm): void {
  const s = toFrame(t, sh[0], sh[1]);
  hose(ctx, [s, a.elbow, a.hand], 8, CHEESE.warm);
  if (a.hold === 'lemon') citrus(ctx, a.hand[0] + Math.cos(a.rot) * 12, a.hand[1] + Math.sin(a.rot) * 12, 8, 'lemon');
  if (a.hold === 'bottle') honeyBottle(ctx, a.hand[0] + 10, a.hand[1] - 18);
  glove(ctx, a.hand[0], a.hand[1], 9.5, a.rot, a.g, a.rot > 1.6 || a.rot < -1.6);
}

function legs(ctx: Ctx, p: Pose, t: EggT): void {
  if (p.mode === 'seat') {
    hose(ctx, [toFrame(t, 2, 48), [78, 150], [52, 172]], 8, CHEESE.warm);
    shoe(ctx, 58, 178, 11, -1, '#2b1a12', -0.5);
    hose(ctx, [toFrame(t, -16, 44), [70, 142], [40, 162]], 8, CHEESE.warm);
    shoe(ctx, 46, 168, 12, -1, '#3a2418', -0.6);
    return;
  }
  const lift = p.stomp ? 12 : 0;
  const spread = p.mode === 'crouch' ? 10 : 0;
  hose(ctx, [toFrame(t, -14, 46), [88 - spread, 170 - lift], [84 - spread, 192 - lift]], 9, CHEESE.warm);
  hose(ctx, [toFrame(t, 14, 46), [120 + spread, 170], [118 + spread, 192]], 9, CHEESE.warm);
  shoe(ctx, 92 - spread, 195 - lift, 12, -1, '#3a2418');
  shoe(ctx, 126 + spread, 195, 12, -1, '#2b1a12');
}

function ball(ctx: Ctx): void {
  const cx = BALL.x;
  const cy = BALL.y;
  ell(ctx, cx, cy, BALL.r, BALL.r);
  const g = ctx.createRadialGradient(cx - 8, cy - 8, 2, cx, cy, BALL.r + 3);
  g.addColorStop(0, CHEESE.light);
  g.addColorStop(0.7, CHEESE.warm);
  g.addColorStop(1, CHEESE.crust);
  inked(ctx, g, LINE * 1.2);
  ell(ctx, cx, cy, BALL.r * 0.7, BALL.r * 0.7);
  ctx.strokeStyle = 'rgba(150,95,40,0.5)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.save();
  ctx.translate(cx + 3, cy + 8);
  ctx.scale(0.56, 0.56);
  coppola(ctx);
  moustache(ctx, 0);
  pieEye(ctx, -18, -14, 9, 11, -0.8, 0, 0.35, CHEESE.base);
  ctx.restore();
  glove(ctx, cx - 16, cy + 14, 6, 2.5, 'fist');
  glove(ctx, cx + 18, cy + 12, 6, 0.6, 'fist');
}

function melt(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(30, 194);
  ctx.bezierCurveTo(28, 176, 60, 172, 70, 178);
  ctx.bezierCurveTo(84, 160, 124, 162, 136, 176);
  ctx.bezierCurveTo(160, 170, 176, 182, 172, 194);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 160, 0, 196);
  g.addColorStop(0, CHEESE.light);
  g.addColorStop(1, CHEESE.warm);
  inked(ctx, g, LINE * 1.1);
  spiralEye(ctx, 88, 176, 6, 0);
  spiralEye(ctx, 108, 175, 6, 2);
  ctx.save();
  ctx.translate(100, 190);
  ctx.scale(0.6, 0.6);
  moustache(ctx, 4);
  ctx.restore();
  ctx.save();
  ctx.translate(104, 196);
  ctx.rotate(0.25);
  coppola(ctx);
  ctx.restore();
  ell(ctx, 148, 189, 6, 6);
  inked(ctx, '#1e1410', LINE * 0.8);
  ell(ctx, 160, 190, 5.5, 5.5);
  inked(ctx, '#1e1410', LINE * 0.8);
}

/** Draw one frame of the body sheet. */
export function drawTuma(ctx: Ctx, frame: number): void {
  const p = TUMA_POSES[frame];
  if (p.mode === 'ball') return ball(ctx);
  if (p.mode === 'melt') return melt(ctx);
  const t = eggT(p);
  if (p.back) arm(ctx, t, [34, 8], p.back);
  legs(ctx, p, t);
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.rotate(t.tilt);
  ctx.scale(t.sx, t.sy);
  const angry = p.face === 'angry' || p.face === 'angryBlink' || p.face === 'yell';
  cheese(ctx, 44, 52, angry);
  face(ctx, p.face, (p.bob ?? 0) * 1.5);
  coppola(ctx);
  if (p.steam) steam(ctx, 30, -70, 1);
  ctx.restore();
  if (p.front) arm(ctx, t, [-38, 12], p.front);
  if (p.stars !== undefined) {
    for (let i = 0; i < 4; i++) {
      const a = p.stars * 0.8 + (i * Math.PI) / 2;
      star(ctx, 104 + Math.cos(a) * 40, 28 + Math.sin(a) * 9, 6, '#ffd84a', a);
    }
  }
}
