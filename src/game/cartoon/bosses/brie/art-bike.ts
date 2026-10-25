/**
 * Monsieur Brie's blue bicycle (the shirt's ride): spoked wheels, fenders, a bell, a white wicker basket
 * with baguettes and a jar of fig jam, and his white hose legs pedalling in blue sneakers. 8 frames =
 * one crank turn. Drawn in world units around the feet (root) point, facing LEFT.
 */
import { INK, LINE } from '../../draw/canvas';
import { ellipse, hose, ink, rrect, shade, shine, smooth, TAU, type Pt } from './kit/toon';
import { CRUST, LIMB, SNEAKER, loaf } from './art-body';

export const BIKE = { w: 184, h: 122, footX: 92, footY: 114, frames: 8 } as const;

const BLUE = '#2f6fd6';
const BLUE_LO = '#1f4f9e';
const WHEEL_R = 27;
const REAR: Pt = [52, -27];
const FRONT: Pt = [-52, -27];
const CRANK: Pt = [2, -30];
const SEAT: Pt = [32, -66];
const HEAD_TOP: Pt = [-36, -70];
const HEAD_BOT: Pt = [-40, -56];

function tube(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, w = 5, color = BLUE): void {
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.strokeStyle = INK;
  ctx.lineWidth = w + LINE * 1.6;
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
}

function wheel(ctx: CanvasRenderingContext2D, c: Pt, turn: number): void {
  const [x, y] = c;
  ctx.beginPath();
  for (let i = 0; i < 12; i++) {
    const a = turn + (i / 12) * TAU;
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * (WHEEL_R - 4), y + Math.sin(a) * (WHEEL_R - 4));
  }
  ctx.strokeStyle = '#8c8a86';
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ellipse(ctx, x, y, WHEEL_R - 3.5, WHEEL_R - 3.5);
  ctx.strokeStyle = '#c9c6bf';
  ctx.lineWidth = 2;
  ctx.stroke();
  ellipse(ctx, x, y, WHEEL_R, WHEEL_R);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.stroke();
  ellipse(ctx, x, y, 3.4, 3.4);
  ctx.fillStyle = '#d6d2c8';
  ctx.fill();
  ink(ctx, LINE * 0.7);
  ctx.beginPath();
  ctx.arc(x, y, WHEEL_R + 3.5, -2.75, -0.45);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5.2;
  ctx.stroke();
  ctx.strokeStyle = BLUE;
  ctx.lineWidth = 2.6;
  ctx.stroke();
}

function sneakerOn(ctx: CanvasRenderingContext2D, p: Pt, dark: boolean): void {
  smooth(ctx, [[p[0] - 11, p[1] + 1], [p[0] - 8, p[1] - 6], [p[0] + 1, p[1] - 7], [p[0] + 6, p[1] - 4], [p[0] + 6, p[1] + 2], [p[0] - 8, p[1] + 3]]);
  ctx.fillStyle = dark ? BLUE_LO : SNEAKER;
  ctx.fill();
  ink(ctx, LINE * 0.9);
  ctx.beginPath();
  ctx.moveTo(p[0] - 10, p[1] + 1.5);
  ctx.lineTo(p[0] + 5, p[1] + 1.5);
  ctx.strokeStyle = '#fbf6ea';
  ctx.lineWidth = 1.6;
  ctx.stroke();
}

function leg(ctx: CanvasRenderingContext2D, hip: Pt, a: number, dark: boolean): void {
  const pedal: Pt = [CRANK[0] + Math.cos(a) * 11, CRANK[1] + Math.sin(a) * 11];
  const mid: Pt = [(hip[0] + pedal[0]) / 2 - 16, (hip[1] + pedal[1]) / 2 - 6];
  hose(ctx, hip, mid, [pedal[0] + 2, pedal[1] - 3], 7, dark ? shade(LIMB, -0.14) : LIMB);
  tube(ctx, [pedal[0] - 4, pedal[1]], [pedal[0] + 4, pedal[1]], 2.5, '#3a3530');
  sneakerOn(ctx, pedal, dark);
}

function basket(ctx: CanvasRenderingContext2D): void {
  loaf(ctx, -70, -100, 40, -1.95, CRUST);
  loaf(ctx, -58, -98, 38, -1.3, CRUST);
  // jar of fig jam with a red gingham lid
  rrect(ctx, -58, -96, 15, 20, 3);
  ctx.fillStyle = '#7b2e5c';
  ctx.fill();
  ink(ctx, LINE * 0.8);
  shine(ctx, -54, -88, 1.6, 5, 0, 0.6);
  rrect(ctx, -60, -101, 19, 6, 2);
  ctx.fillStyle = '#e04646';
  ctx.fill();
  ink(ctx, LINE * 0.7);
  ctx.fillStyle = '#fbf6ea';
  for (let i = 0; i < 4; i++) ctx.fillRect(-59 + i * 5, -100, 2.2, 2.2);
  smooth(ctx, [[-86, -88], [-40, -88], [-44, -62], [-82, -62]]);
  ctx.fillStyle = '#f6efdc';
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = '#c9b996';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  for (let y = -84; y < -62; y += 5) {
    ctx.moveTo(-88, y);
    ctx.lineTo(-38, y);
  }
  for (let x = -84; x < -40; x += 6) {
    ctx.moveTo(x, -90);
    ctx.lineTo(x + 2, -60);
  }
  ctx.stroke();
  ctx.restore();
  smooth(ctx, [[-86, -88], [-40, -88], [-44, -62], [-82, -62]]);
  ink(ctx, LINE);
  tube(ctx, [-88, -89], [-38, -89], 3.2, '#f6efdc');
}

/** One frame of the bicycle (crank angle = frame / 8 of a turn). */
export function drawBike(ctx: CanvasRenderingContext2D, frame: number): void {
  ctx.save();
  ctx.translate(BIKE.footX, BIKE.footY);
  const a = (frame / BIKE.frames) * TAU;
  const turn = -(frame / BIKE.frames) * (TAU / 12) * 2;
  leg(ctx, [32, -74], a + Math.PI, true);
  wheel(ctx, REAR, turn);
  wheel(ctx, FRONT, turn);
  tube(ctx, CRANK, REAR, 4, BLUE_LO);
  tube(ctx, [SEAT[0] - 2, SEAT[1] + 4], REAR, 4, BLUE_LO);
  tube(ctx, CRANK, SEAT);
  tube(ctx, SEAT, HEAD_TOP);
  tube(ctx, HEAD_BOT, CRANK);
  tube(ctx, HEAD_TOP, HEAD_BOT, 6.5);
  ctx.beginPath();
  ctx.moveTo(HEAD_BOT[0], HEAD_BOT[1]);
  ctx.quadraticCurveTo(-48, -40, FRONT[0], FRONT[1]);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7.6;
  ctx.stroke();
  ctx.strokeStyle = BLUE;
  ctx.lineWidth = 4.4;
  ctx.stroke();
  ellipse(ctx, CRANK[0], CRANK[1], 8, 8);
  ctx.fillStyle = '#b8b4ab';
  ctx.fill();
  ink(ctx, LINE * 0.8);
  // saddle
  smooth(ctx, [[22, -74], [34, -78], [46, -74], [40, -69], [26, -70]]);
  ctx.fillStyle = '#5b3a24';
  ctx.fill();
  ink(ctx, LINE * 0.9);
  // stem, handlebar, grip and bell
  tube(ctx, HEAD_TOP, [-34, -84], 4);
  ctx.beginPath();
  ctx.moveTo(-40, -86);
  ctx.quadraticCurveTo(-30, -92, -18, -86);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6.4;
  ctx.stroke();
  ctx.strokeStyle = '#d9d5cc';
  ctx.lineWidth = 3.4;
  ctx.stroke();
  ellipse(ctx, -16, -86, 4.5, 3.4);
  ctx.fillStyle = '#fbf6ea';
  ctx.fill();
  ink(ctx, LINE * 0.8);
  ellipse(ctx, -29, -93, 4, 3.4);
  ctx.fillStyle = '#e8b53a';
  ctx.fill();
  ink(ctx, LINE * 0.8);
  shine(ctx, -30, -94.5, 1.4, 0.9, 0, 0.8);
  basket(ctx);
  leg(ctx, [24, -74], a, false);
  ctx.restore();
}
