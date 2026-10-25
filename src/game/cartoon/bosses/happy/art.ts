/**
 * HAPPY BOX body sheet (ref/level8_shirt_make_it_happy.png): the blue "HAPPY CICCIO'S" box with a yellow
 * handle lid, a big toothy grin, pie-cut eyes, a side flap, rubber-hose arms with white gloves, big blue
 * feet and a spray can. Faces LEFT. The box itself never moves inside the frame (the phase-2 paint
 * overlay lines up with it); poses change the limbs and the face. Frames = HAPPY_POSES.
 */
import { INK, LINE, inked } from '../../draw/canvas';
import { type Ctx, type GlovePose, WHITE, ell, glove, hose, letters, pieEye, shutEye, spiralEye, star } from '../tuma/kit/toon';
import { BODY } from './config';

/** The art below is drawn in a 200 x 200 box shifted down by TOP (head room). */
const TOP = BODY.h - 200;
export const BLUE = { base: '#38a2e6', side: '#2376bd', light: '#86ccf4', dark: '#1a5a94' } as const;
const YELLOW = '#f6c443';
/** The rocket can is teal: on screen, pink always means parryable. */
export const ROCKET_TONE = ['#7fe0c4', '#26b08a', '#13705a'] as const;

type Pt = readonly [number, number];
interface Arm {
  elbow: Pt;
  hand: Pt;
  rot: number;
  g: GlovePose;
  /** spray can in this hand: its angle (0 = nozzle up) */
  can?: number;
  /** the teal rocket can instead of the magenta one */
  rocket?: boolean;
}
type Face = 'grin' | 'blink' | 'oh' | 'laugh' | 'wink' | 'puff' | 'dizzy';
interface Pose {
  face: Face;
  front?: Arm;
  back?: Arm;
  look?: Pt;
  lid?: number;
  feet?: number;
  stars?: number;
  flat?: boolean;
}

const CAN_UP: Arm = { elbow: [164, 84], hand: [152, 54], rot: -1.7, g: 'grip', can: 0 };
const REST: Arm = { elbow: [44, 128], hand: [34, 146], rot: 2.2, g: 'open' };

export const HAPPY_POSES: readonly Pose[] = [
  { face: 'grin', back: CAN_UP, front: REST },
  { face: 'grin', back: { ...CAN_UP, hand: [154, 60], elbow: [166, 90] }, front: { ...REST, hand: [32, 150] }, feet: 2 },
  { face: 'grin', back: { ...CAN_UP, hand: [156, 46], can: 0.3 }, front: REST, look: [0.2, -0.6] },
  { face: 'blink', back: CAN_UP, front: { ...REST, hand: [32, 150] }, feet: 2 },
  { face: 'oh', back: { elbow: [170, 70], hand: [160, 36], rot: -1.5, g: 'grip', can: -0.4 }, front: { elbow: [40, 116], hand: [30, 98], rot: -2.2, g: 'open' } },
  { face: 'grin', back: { elbow: [104, 6], hand: [36, 52], rot: 2.9, g: 'grip', can: -1.57 }, front: REST, look: [-0.9, 0.1] },
  { face: 'laugh', back: { elbow: [168, 60], hand: [150, 18], rot: -1.6, g: 'grip', can: 0 }, front: { elbow: [40, 100], hand: [34, 70], rot: -1.8, g: 'open' } },
  { face: 'oh', lid: 18, back: { elbow: [170, 74], hand: [172, 44], rot: -1.3, g: 'open' }, front: { elbow: [38, 96], hand: [30, 66], rot: -1.9, g: 'open' }, look: [0, -0.9] },
  { face: 'wink', back: { elbow: [140, 124], hand: [84, 118], rot: 3.0, g: 'grip', can: -1.57, rocket: true }, front: { elbow: [52, 136], hand: [52, 116], rot: -1.2, g: 'grip' }, look: [-0.9, 0.2] },
  { face: 'oh', back: { elbow: [150, 120], hand: [40, 106], rot: 3.1, g: 'open' }, front: { elbow: [36, 120], hand: [20, 110], rot: 3.0, g: 'open' }, look: [-0.9, 0] },
  { face: 'puff', back: { elbow: [176, 80], hand: [176, 46], rot: -1.4, g: 'fist', can: 0.5 }, front: { elbow: [26, 96], hand: [26, 62], rot: -1.7, g: 'fist' }, feet: 4 },
  { face: 'dizzy', stars: 0, back: { elbow: [166, 130], hand: [174, 150], rot: 0.9, g: 'open' }, front: { elbow: [40, 130], hand: [28, 152], rot: 2.4, g: 'open' } },
  { face: 'dizzy', stars: 1, back: { elbow: [168, 124], hand: [178, 142], rot: 0.6, g: 'open' }, front: { elbow: [42, 124], hand: [24, 140], rot: 2.6, g: 'open' } },
  { face: 'dizzy', flat: true },
];

export const HF = { idle: [0, 1, 2, 3], shake: 4, spray: 5, drips: 6, minis: 7, aim: 8, launch: 9, puff: 10, dizzy: [11, 12], flat: 13 } as const;
/** Where the can's nozzle is in these poses (frame units, TOP included): the paint leaves from here. */
export const NOZZLE = { spray: [-4, 72], drips: [150, 6], aim: [26, 130] } as const;

/** The spray can (magenta unless `tone`), nozzle up when rot = 0 (x, y = its middle). */
export function sprayCan(ctx: Ctx, x: number, y: number, rot: number, s = 1, tone: readonly [string, string, string] = ['#f45aa8', '#e8288c', '#a8125e']): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.roundRect(-8, -14, 16, 30, 3);
  const g = ctx.createLinearGradient(-8, 0, 8, 0);
  g.addColorStop(0, tone[0]);
  g.addColorStop(0.4, tone[1]);
  g.addColorStop(1, tone[2]);
  inked(ctx, g, LINE * 0.8);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(-5, -11, 2.4, 24);
  ctx.beginPath();
  ctx.moveTo(-7, -14);
  ctx.quadraticCurveTo(0, -24, 7, -14);
  ctx.closePath();
  inked(ctx, '#aab2bc', LINE * 0.8);
  ctx.beginPath();
  ctx.rect(-2.5, -24, 5, 5);
  inked(ctx, '#e8eef2', LINE * 0.6);
  ctx.beginPath();
  ctx.rect(-8, 12, 16, 4);
  inked(ctx, '#9aa3ad', LINE * 0.6);
  ctx.restore();
}

function arm(ctx: Ctx, from: Pt, a: Arm): void {
  hose(ctx, [from, a.elbow, a.hand], 8, BLUE.base);
  if (a.can !== undefined) sprayCan(ctx, a.hand[0] + Math.cos(a.rot) * 15, a.hand[1] + Math.sin(a.rot) * 15, a.can, 1.25, a.rocket ? ROCKET_TONE : undefined);
  glove(ctx, a.hand[0], a.hand[1], 9, a.rot, a.g, a.rot > 1.6 || a.rot < -1.6);
}

function feet(ctx: Ctx, lift: number): void {
  for (const [hip, fx, dir] of [[[84, 146], 70, -1], [[110, 144], 118, 1]] as const) {
    hose(ctx, [hip, [hip[0] + dir * 2, 170], [fx - dir * 4, 186 - (dir < 0 ? lift : 0)]], 13, BLUE.base);
    ell(ctx, fx + dir * 6, 188 - (dir < 0 ? lift : 0), 17, 8.5);
    inked(ctx, BLUE.base, LINE * 1.1);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ell(ctx, fx + dir * 2, 184 - (dir < 0 ? lift : 0), 6, 2.4);
    ctx.fill();
  }
}

function boxShape(ctx: Ctx, bulge: number): void {
  ctx.beginPath();
  ctx.moveTo(132, 54);
  ctx.lineTo(152, 46);
  ctx.lineTo(147 + bulge, 138);
  ctx.lineTo(126 + bulge, 148);
  ctx.closePath();
  inked(ctx, BLUE.side, LINE * 1.2);
  ctx.beginPath();
  ctx.moveTo(56, 58);
  ctx.lineTo(132, 54);
  ctx.quadraticCurveTo(130 + bulge * 2, 100, 126 + bulge, 148);
  ctx.lineTo(64 - bulge, 150);
  ctx.quadraticCurveTo(58 - bulge * 2, 104, 56, 58);
  ctx.closePath();
  const g = ctx.createLinearGradient(56, 54, 130, 150);
  g.addColorStop(0, BLUE.light);
  g.addColorStop(0.35, BLUE.base);
  g.addColorStop(1, BLUE.side);
  inked(ctx, g, LINE * 1.2);
  ctx.strokeStyle = BLUE.dark;
  ctx.lineWidth = LINE * 0.8;
  ctx.beginPath();
  ctx.moveTo(60, 110);
  ctx.lineTo(129, 107);
  ctx.lineTo(149, 99);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(60, 106);
  ctx.lineTo(30, 92);
  ctx.lineTo(24, 112);
  ctx.lineTo(61, 126);
  ctx.closePath();
  inked(ctx, BLUE.base, LINE);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillRect(62, 62, 4, 40);
  letters(ctx, 'HAPPY', 94, 122, 11, WHITE, -0.03, BLUE.dark);
  letters(ctx, "CICCIO'S", 94, 136, 10, WHITE, -0.03, BLUE.dark);
}

function lid(ctx: Ctx, up: number): void {
  if (up > 0) {
    ctx.beginPath();
    ctx.moveTo(56, 58);
    ctx.lineTo(132, 54);
    ctx.lineTo(152, 46);
    ctx.lineTo(76, 48);
    ctx.closePath();
    inked(ctx, '#0e2a44', LINE);
  }
  ctx.beginPath();
  ctx.moveTo(52, 60 - up);
  ctx.lineTo(132, 56 - up);
  ctx.lineTo(156, 46 - up);
  ctx.lineTo(150, 40 - up);
  ctx.lineTo(70, 42 - up);
  ctx.closePath();
  inked(ctx, YELLOW, LINE * 1.1);
  ctx.beginPath();
  ctx.moveTo(84, 48 - up);
  ctx.bezierCurveTo(86, 22 - up, 122, 20 - up, 124, 44 - up);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9 + LINE * 1.6;
  ctx.stroke();
  ctx.strokeStyle = YELLOW;
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(92, 36 - up);
  ctx.quadraticCurveTo(100, 26 - up, 112, 28 - up);
  ctx.stroke();
}

function face(ctx: Ctx, p: Pose): void {
  const [lx, ly] = p.look ?? [0.55, -0.55];
  const eyes: readonly Pt[] = [[80, 80], [106, 78]];
  for (const [x, y] of eyes) {
    if (p.face === 'blink' || p.face === 'laugh' || p.face === 'puff') shutEye(ctx, x, y + 2, 8, p.face !== 'blink');
    else if (p.face === 'dizzy') spiralEye(ctx, x, y, 10, x);
    else if (p.face === 'wink' && x < 90) shutEye(ctx, x, y + 2, 8, true);
    else pieEye(ctx, x, y, 10.5, 14, lx, ly, p.face === 'oh' ? 0 : 0.12, BLUE.base);
  }
  if (p.face === 'oh') {
    ell(ctx, 94, 102, 8, 9);
    inked(ctx, '#2a0e18', LINE);
    return;
  }
  if (p.face === 'puff') {
    for (const x of [68, 120]) {
      ell(ctx, x, 100, 13, 11);
      inked(ctx, BLUE.light, LINE * 0.8);
      ctx.fillStyle = 'rgba(255,110,90,0.5)';
      ell(ctx, x, 102, 7, 4);
      ctx.fill();
    }
    ell(ctx, 94, 104, 5, 4);
    inked(ctx, '#2a0e18', LINE);
    for (const [x, c] of [[70, '#f6d23c'], [104, '#4fd1a8'], [124, '#ff9a3c']] as const) {
      ctx.beginPath();
      ctx.moveTo(x - 3, 110);
      ctx.lineTo(x + 3, 110);
      ctx.lineTo(x + 3, 126);
      ctx.arc(x, 126, 3, 0, Math.PI);
      ctx.closePath();
      inked(ctx, c, LINE * 0.6);
    }
    return;
  }
  ctx.beginPath();
  ctx.moveTo(66, 94);
  ctx.quadraticCurveTo(94, 98, 122, 92);
  ctx.quadraticCurveTo(118, 118, 94, 118);
  ctx.quadraticCurveTo(70, 118, 66, 94);
  ctx.closePath();
  inked(ctx, '#2a0e18', LINE);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = WHITE;
  ctx.fillRect(60, 90, 70, p.face === 'dizzy' ? 9 : 14);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.1;
  for (let x = 72; x < 120; x += 8) {
    ctx.beginPath();
    ctx.moveTo(x, 92);
    ctx.lineTo(x + 0.5, p.face === 'dizzy' ? 101 : 106);
    ctx.stroke();
  }
  ctx.fillStyle = '#e8707a';
  ell(ctx, p.face === 'dizzy' ? 82 : 96, 117, 10, 5);
  ctx.fill();
  ctx.restore();
}

function flat(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(24, 192);
  ctx.lineTo(44, 170);
  ctx.lineTo(150, 168);
  ctx.lineTo(176, 190);
  ctx.closePath();
  inked(ctx, BLUE.base, LINE * 1.2);
  ctx.beginPath();
  ctx.moveTo(150, 168);
  ctx.lineTo(166, 162);
  ctx.lineTo(188, 186);
  ctx.lineTo(176, 190);
  ctx.closePath();
  inked(ctx, BLUE.side, LINE);
  spiralEye(ctx, 82, 176, 7, 0);
  spiralEye(ctx, 104, 175, 7, 2);
  ctx.beginPath();
  ctx.moveTo(110, 186);
  ctx.quadraticCurveTo(122, 196, 134, 184);
  ctx.strokeStyle = INK;
  ctx.lineWidth = LINE;
  ctx.stroke();
  letters(ctx, 'HAPPY?', 60, 186, 7, WHITE, 0, BLUE.dark);
  ctx.beginPath();
  ctx.moveTo(70, 168);
  ctx.bezierCurveTo(72, 150, 112, 148, 116, 166);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7 + LINE * 1.6;
  ctx.stroke();
  ctx.strokeStyle = YELLOW;
  ctx.lineWidth = 7;
  ctx.stroke();
  for (const [x, dir] of [[18, -1], [184, 1]] as const) {
    ell(ctx, x, 190, 13, 6.5, dir * 0.4);
    inked(ctx, BLUE.base, LINE);
  }
}

/** Draw one frame of the body sheet. */
export function drawHappy(ctx: Ctx, frame: number): void {
  const p = HAPPY_POSES[frame];
  ctx.translate(0, TOP);
  if (p.flat) return flat(ctx);
  const across = p.back !== undefined && p.back.hand[0] < 100;
  if (p.back && !across) arm(ctx, [146, 92], p.back);
  feet(ctx, p.feet ?? 0);
  boxShape(ctx, p.face === 'puff' ? 7 : 0);
  lid(ctx, p.lid ?? 0);
  face(ctx, p);
  if (p.front) arm(ctx, [60, 116], p.front);
  if (p.back && across) arm(ctx, [146, 92], p.back);
  if (p.stars !== undefined) {
    for (let i = 0; i < 4; i++) {
      const a = p.stars * 0.8 + (i * Math.PI) / 2;
      star(ctx, 100 + Math.cos(a) * 44, 26 + Math.sin(a) * 9, 6, '#ffd84a', a);
    }
  }
}
