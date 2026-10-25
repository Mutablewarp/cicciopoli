/**
 * DOUBLE TRIPLE phase-2 minis and projectiles (canvas 2D in world units, no Phaser): the two small burgers
 * it splits into, the spinning patty frisbee, the rolling cheddar wave (pink = parryable), the bacon whip
 * with its wind-up stub and lane warning, the SALSA CICCIO'S drops.
 */
import { INK, LINE } from '../../draw/canvas';
import { bacon, bunBottom, bunTop, cheese, patty, sauceDrop } from '../oldschool/kit/food';
import { C, gloss } from '../oldschool/kit/style';
import { face, SALSA } from './art';
import { DT } from './tuning';

type Ctx = CanvasRenderingContext2D;

/** mini frame, bottom-centre (44, 82); frames 0-3 = mini A (shades) faces, 4-7 = mini B */
export const MINI = { w: 88, h: 84, footY: 82, b: 4 } as const;
export const FRISBEE = { w: 48, h: 22 } as const;
export const CWAVE = { w: 50, h: 34, pink: 3 } as const;
export const WHIP = { w: 300, h: 26 } as const;
export const STUB = { w: 72, h: 26 } as const;
export const DROP = { w: 26, h: 34 } as const;

/** Mini burger: A = top bun with the shades, bacon, patty, cheddar; B = cheddar, patty, cheddar, bare-eyed. */
export function drawMini(ctx: Ctx, f: number): void {
  const b = f >= MINI.b;
  bunBottom(ctx, 44, 70, 72, 12);
  if (b) cheese(ctx, 44, 66, 74, [[-20, 6]]);
  patty(ctx, 44, 61, 80, 14);
  cheese(ctx, 44, 53, 78, b ? [[-22, 9], [18, 13]] : [[14, 12]]);
  if (!b) bacon(ctx, 4, 84, 50, 2, 5.5, 2.5);
  bunTop(ctx, 44, 51, 82, 45);
  ctx.save();
  ctx.translate(44, 7);
  ctx.scale(0.78, 0.78);
  face(ctx, f % MINI.b, 0, 0, !b);
  ctx.restore();
}

/** Patty frisbee seen edge-on; 4 spin frames (the shine travels round). */
export function drawFrisbee(ctx: Ctx, f: number): void {
  patty(ctx, 24, 11, 42, 13);
  const a = (f / 4) * Math.PI * 2;
  gloss(ctx, 24 + Math.cos(a) * 12, 8 + Math.sin(a) * 1.5, 5, 1.6, 0, 0.45);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  for (const y of [7, 11, 15]) {
    ctx.beginPath();
    ctx.moveTo(46 - (y % 2) * 2, y);
    ctx.lineTo(48, y);
    ctx.stroke();
  }
}

/** Rolling cheddar wave moving left (flipped for rightward): frames 0-2 cheddar, 3-5 pink. */
export function drawCheddarWave(ctx: Ctx, f: number): void {
  const pink = f >= CWAVE.pink;
  const ph = f % 3;
  const { w, h } = CWAVE;
  const body = pink ? C.pink : C.cheddar;
  const light = pink ? C.pinkLight : C.cheddarLight;
  const lean = [0, 3, -2][ph] ?? 0;
  ctx.beginPath();
  ctx.moveTo(3, h - 1);
  ctx.quadraticCurveTo(4 + lean, h - 26, 20 + lean, 5 + ph);
  ctx.quadraticCurveTo(32 + lean, -1, 38, 9);
  ctx.quadraticCurveTo(29, 12, 31, 19);
  ctx.quadraticCurveTo(44, 19, w - 2, h - 1);
  ctx.closePath();
  ctx.fillStyle = body;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = LINE;
  ctx.stroke();
  ctx.fillStyle = light;
  for (const [x, y, r] of [[36, 25, 2.2], [42, 28, 1.5]] as const) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = light;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(10, h - 6);
  ctx.quadraticCurveTo(12 + lean, h - 20, 21 + lean, 10 + ph);
  ctx.stroke();
}

/** The bacon whip: a long wavy strip, held at the right end, crack flash at the tip. f 1 = warm flash. */
export function drawWhip(ctx: Ctx, f: number): void {
  const pts = WHIP.w - 6;
  bacon(ctx, 10, pts, 13, 3.5, 9, 7, f ? '#e2634f' : C.bacon);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  for (const [dx, dy] of [[-8, -8], [-10, 0], [-8, 8]] as const) {
    ctx.beginPath();
    ctx.moveTo(8, 13);
    ctx.lineTo(8 + dx * 0.7, 13 + dy);
    ctx.stroke();
  }
}

/** Short wiggling bacon tip shown at the whip's height during the wind-up. */
export function drawStub(ctx: Ctx): void {
  bacon(ctx, 6, STUB.w - 4, 13, 3.5, 9, 1.5);
}

/** Whip lane warning, right end = the boss's hand. LANE.h leaves room for the ink edges around the hit band. */
export const LANE = { w: DT.whip.len, h: 30 } as const;

/** Exactly the whip's hit box: bacon hazard stripes between dashed ink edges, cream chevrons pointing at the
 * player and an end bar where the crack lands, so "low = jump, high = stay down" reads on a phone. */
export function drawLane(ctx: Ctx): void {
  const { w, h } = LANE;
  const cy = h / 2;
  const t = cy - DT.whip.h / 2;
  const b = cy + DT.whip.h / 2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, t, w, b - t);
  ctx.clip();
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, 'rgba(255,214,120,0.6)');
  g.addColorStop(1, 'rgba(255,170,110,0.3)');
  ctx.fillStyle = g;
  ctx.fillRect(0, t, w, b - t);
  ctx.strokeStyle = 'rgba(197,69,58,0.6)';
  ctx.lineWidth = 5;
  for (let x = -20; x < w + 20; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, b);
    ctx.lineTo(x + 14, t);
    ctx.stroke();
  }
  ctx.restore();
  for (const [y, dy] of [[t, 2.2], [b, -2.2]] as const) {
    ctx.lineWidth = 2.8;
    ctx.strokeStyle = INK;
    ctx.setLineDash([10, 6]);
    ctx.beginPath();
    ctx.moveTo(2, y);
    ctx.lineTo(w, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = C.baconFat;
    ctx.beginPath();
    ctx.moveTo(2, y + dy);
    ctx.lineTo(w, y + dy);
    ctx.stroke();
  }
  for (let x = 22; x < w - 30; x += 46) {
    ctx.beginPath();
    ctx.moveTo(x + 7, cy - 6);
    ctx.lineTo(x, cy);
    ctx.lineTo(x + 7, cy + 6);
    ctx.lineTo(x + 12, cy + 6);
    ctx.lineTo(x + 5, cy);
    ctx.lineTo(x + 12, cy - 6);
    ctx.closePath();
    ctx.fillStyle = '#fff0d8';
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = INK;
    ctx.stroke();
  }
  ctx.lineCap = 'round';
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(2, t - 4);
  ctx.lineTo(2, b + 4);
  ctx.stroke();
  ctx.lineCap = 'butt';
}

/** SALSA CICCIO'S drop: 0 salsa, 1 pink (parryable). */
export function drawSalsa(ctx: Ctx, f: number): void {
  sauceDrop(ctx, 13, 21, 9.5, f ? C.pink : SALSA);
}
