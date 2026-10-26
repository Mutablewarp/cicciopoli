/**
 * Pancetta's arena, painted: a skatepark on the Palermo seafront in the golden afternoon. Far: Monte
 * Pellegrino over the sea, sailing boats. Mid: the stone balustrade of the promenade, palm trees, an
 * iron street lamp and the big half-pipe (phase 2 is ridden on it). Near: the concrete
 * floor. Low foreground corners: an agave in a terracotta pot, palm fronds.
 */
import { ARENA } from '../../api';
import { rng } from '../brie/kit/paths';
import { ellipse, ink, paperGrain, shade, smooth, wash, type Pt } from '../brie/kit/toon';
import { fillPts } from '../brie/kit/scenery';
import { PANCETTA as C } from './config';
import { PIPE_TOP, pipeAt } from './pipe';

const W = ARENA.w;
const H = ARENA.h;
const SOFT = '#5f4a36';
/** from above the palm crowns down to the floor line (no cut fronds) */
export const MID = { y: 16, h: 284 } as const;
export const FLOOR = { y: 290, h: 70 } as const;
export const FG_L = { w: 90, h: 70 } as const;
export const FG_R = { w: 120, h: 60 } as const;

export function drawSky(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, 0, 0, 210);
  g.addColorStop(0, '#8ccbe0');
  g.addColorStop(0.6, '#f3dcb8');
  g.addColorStop(1, '#ffd29c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const sun = ctx.createRadialGradient(520, 150, 6, 520, 150, 170);
  sun.addColorStop(0, 'rgba(255,246,214,0.95)');
  sun.addColorStop(1, 'rgba(255,246,214,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, W, H);
  // Monte Pellegrino: the headland over the gulf
  const mount: Pt[] = [[-20, 210], [-10, 150], [30, 128], [70, 112], [110, 104], [150, 100], [196, 108], [228, 126], [262, 150], [300, 176], [340, 200], [370, 210]];
  fillPts(ctx, [...mount, [370, 260], [-20, 260]], '#b8978c', 21, 100);
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#e2c6b4';
  ctx.lineWidth = 1.4;
  for (const [x0, y0, x1, y1] of [[40, 140, 90, 190], [120, 112, 150, 170], [200, 120, 230, 176], [262, 160, 290, 196]] as const) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + x1) / 2 + 6, (y0 + y1) / 2, x1, y1);
    ctx.stroke();
  }
  ctx.restore();
  // the sea
  const sea = ctx.createLinearGradient(0, 204, 0, 250);
  sea.addColorStop(0, '#79c9d6');
  sea.addColorStop(1, '#3f98b4');
  ctx.fillStyle = sea;
  ctx.fillRect(0, 204, W, 60);
  const r = rng(23);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 60; i++) {
    const x = r() * W;
    const y = 208 + r() * 40;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 3 + r() * 6, y);
    ctx.stroke();
  }
  for (const [x, y, s] of [[430, 214, 1], [560, 220, 0.8]] as const) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 7 * s, y - 14 * s);
    ctx.lineTo(x + 9 * s, y);
    ctx.closePath();
    ctx.fillStyle = '#fbf6ea';
    ctx.fill();
    ctx.fillStyle = '#7a5a46';
    ctx.fillRect(x - 3 * s, y, 14 * s, 2.4 * s);
  }
  paperGrain(ctx, W, H, 24);
}

function palm(ctx: CanvasRenderingContext2D, x: number, base: number, top: number, lean: number, seed: number): void {
  const r = rng(seed);
  const tx = x + lean;
  ctx.beginPath();
  ctx.moveTo(x - 6, base);
  ctx.quadraticCurveTo(x + lean * 0.2 - 4, (base + top) / 2, tx - 3, top);
  ctx.lineTo(tx + 3, top);
  ctx.quadraticCurveTo(x + lean * 0.2 + 4, (base + top) / 2, x + 6, base);
  ctx.closePath();
  ctx.fillStyle = '#9a7350';
  ctx.fill();
  ctx.strokeStyle = SOFT;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.strokeStyle = '#7a5a3c';
  for (let y = top + 8; y < base - 4; y += 7) {
    const u = (y - top) / (base - top);
    const cx = tx + (x - tx) * u;
    ctx.beginPath();
    ctx.moveTo(cx - 4, y);
    ctx.lineTo(cx + 4, y + 2);
    ctx.stroke();
  }
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI + (i / 8) * Math.PI + (r() - 0.5) * 0.2;
    const len = 34 + r() * 14;
    const ex = tx + Math.cos(a) * len;
    const ey = top + Math.sin(a) * len * 0.55 + len * 0.35;
    const mx = tx + Math.cos(a) * len * 0.5;
    const my = top + Math.sin(a) * len * 0.5 - 6;
    smooth(ctx, [[tx, top], [mx, my - 3], [ex, ey], [mx, my + 4]]);
    ctx.fillStyle = i % 2 ? '#4f8f3a' : '#5c9c44';
    ctx.fill();
    ctx.strokeStyle = shade('#4f8f3a', -0.35);
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ellipse(ctx, tx, top + 4, 5, 4);
  ctx.fillStyle = '#c47a2a';
  ctx.fill();
}

function lamp(ctx: CanvasRenderingContext2D, x: number, base: number): void {
  ctx.fillStyle = '#2f2a26';
  ctx.fillRect(x - 2, base - 92, 4, 92);
  ctx.fillRect(x - 6, base - 6, 12, 6);
  ellipse(ctx, x, base - 100, 7, 9);
  ctx.fillStyle = '#fff2c6';
  ctx.fill();
  ink(ctx, 1.4);
  ctx.beginPath();
  ctx.moveTo(x - 6, base - 108);
  ctx.lineTo(x, base - 114);
  ctx.lineTo(x + 6, base - 108);
  ink(ctx, 1.6);
}

function balustrade(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#e9dcbd';
  ctx.fillRect(0, 238, W, 7);
  ctx.fillRect(0, 266, W, 6);
  ctx.strokeStyle = SOFT;
  ctx.lineWidth = 1;
  ctx.strokeRect(-1, 238, W + 2, 7);
  for (let x = 6; x < W; x += 13) {
    smooth(ctx, [[x - 2, 245], [x + 2, 245], [x + 4, 254], [x + 2, 266], [x - 2, 266], [x - 4, 254]]);
    ctx.fillStyle = '#f1e6cc';
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = '#cdbfa8';
  ctx.fillRect(0, 272, W, 22);
}

/** The half-pipe from the same geometry the boss rides (pipe.ts). */
function halfPipe(ctx: CanvasRenderingContext2D): void {
  const P = C.pipe;
  const surf: Pt[] = [];
  for (let i = 0; i <= 40; i++) {
    const p = pipeAt(i / 40);
    surf.push([p.x, p.y]);
  }
  const side = (): void => {
    ctx.beginPath();
    ctx.moveTo(P.l - 26, PIPE_TOP);
    for (const [x, y] of surf) ctx.lineTo(x, y);
    ctx.lineTo(P.r + 26, PIPE_TOP);
    ctx.lineTo(P.r + 26, 296);
    ctx.lineTo(P.l - 26, 296);
    ctx.closePath();
  };
  wash(ctx, side, '#d9a35f', { x: P.l - 26, y: PIPE_TOP, w: P.r - P.l + 52, h: 296 - PIPE_TOP }, 31, 0);
  side();
  ink(ctx, 1.6);
  ctx.strokeStyle = 'rgba(95,74,54,0.5)';
  ctx.lineWidth = 1;
  for (let x = P.l - 20; x < P.r + 26; x += 22) {
    ctx.beginPath();
    ctx.moveTo(x, PIPE_TOP + 12);
    ctx.lineTo(x, 296);
    ctx.stroke();
  }
  ctx.beginPath();
  surf.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.strokeStyle = '#1c1511';
  ctx.lineWidth = 7.5;
  ctx.stroke();
  ctx.strokeStyle = '#c9d0d8';
  ctx.lineWidth = 4.5;
  ctx.stroke();
  for (const [x, dir] of [[P.l, -1], [P.r, 1]] as const) {
    ctx.fillStyle = '#b98a52';
    ctx.fillRect(dir < 0 ? x - 26 : x, PIPE_TOP - 6, 26, 8);
    ctx.strokeStyle = SOFT;
    ctx.strokeRect(dir < 0 ? x - 26 : x, PIPE_TOP - 6, 26, 8);
    ellipse(ctx, x, PIPE_TOP - 1, 3.2, 3.2);
    ctx.fillStyle = '#d6d6d6';
    ctx.fill();
    ink(ctx, 1.2);
    ctx.fillStyle = '#2f2a26';
    ctx.fillRect(x + dir * 22 - 1, PIPE_TOP - 28, 2.4, 22);
    ctx.fillRect(Math.min(x, x + dir * 22), PIPE_TOP - 28, 22, 2.4);
  }
  // red and white stripes on the side panel
  ctx.fillStyle = '#d8322f';
  ctx.fillRect(P.l - 26, 282, P.r - P.l + 52, 5);
  ctx.fillStyle = '#fbf6ea';
  ctx.fillRect(P.l - 26, 287, P.r - P.l + 52, 3);
}

/** Mid layer (frame y = world y - MID.y). */
export function drawMid(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.translate(0, -MID.y);
  for (const [x, top, lean, seed] of [[40, 92, -10, 1], [176, 70, 12, 2], [350, 96, -8, 3], [646, 80, -14, 4]] as const) palm(ctx, x, 272, top, lean, seed);
  balustrade(ctx);
  lamp(ctx, 290, 272);
  halfPipe(ctx);
  ctx.globalCompositeOperation = 'source-atop';
  paperGrain(ctx, W, MID.h + MID.y, 25, 0.8);
  ctx.restore();
}

/** The concrete floor of the skatepark (frame y = world y - FLOOR.y). */
export function drawFloor(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, 0, 0, FLOOR.h);
  g.addColorStop(0, '#d3cbbb');
  g.addColorStop(1, '#bfb6a5');
  ctx.fillStyle = g;
  ctx.fillRect(0, 4, W, FLOOR.h);
  ctx.fillStyle = '#9d9483';
  ctx.fillRect(0, 2, W, 4);
  ctx.fillStyle = '#e8c64a';
  ctx.fillRect(0, 7, W, 3);
  ctx.strokeStyle = 'rgba(80,70,60,0.35)';
  ctx.lineWidth = 1;
  for (let x = -40; x < W + 80; x += 90) {
    ctx.beginPath();
    ctx.moveTo(x + 20, 10);
    ctx.lineTo(x - 10, FLOOR.h);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(0, 46);
  ctx.lineTo(W, 46);
  ctx.stroke();
  const r = rng(26);
  ctx.strokeStyle = 'rgba(40,30,25,0.25)';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 9; i++) {
    const x = r() * W;
    const y = 20 + r() * 40;
    ctx.beginPath();
    ctx.arc(x, y + 30, 30 + r() * 30, -1.9 - r() * 0.3, -1.2 + r() * 0.3);
    ctx.stroke();
  }
  paperGrain(ctx, W, FLOOR.h, 27);
}

export function drawFgLeft(ctx: CanvasRenderingContext2D): void {
  const b = FG_L;
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i - 4) * 0.3;
    const len = 30 + (i % 3) * 6;
    smooth(ctx, [[42, 40], [42 + Math.cos(a - 0.08) * len * 0.5, 40 + Math.sin(a - 0.08) * len * 0.5], [42 + Math.cos(a) * len, 40 + Math.sin(a) * len], [42 + Math.cos(a + 0.08) * len * 0.5, 40 + Math.sin(a + 0.08) * len * 0.5]]);
    ctx.fillStyle = i % 2 ? '#5f8f6a' : '#6fa27a';
    ctx.fill();
    ink(ctx, 1.4);
  }
  smooth(ctx, [[20, 38], [64, 38], [60, b.h], [24, b.h]]);
  ctx.fillStyle = '#c4643a';
  ctx.fill();
  ink(ctx, 2);
  ctx.fillStyle = '#e0884f';
  ctx.fillRect(18, 36, 48, 6);
  ctx.strokeRect(18, 36, 48, 6);
}

export function drawFgRight(ctx: CanvasRenderingContext2D): void {
  const r = rng(29);
  for (let i = 0; i < 7; i++) {
    const x = 20 + r() * 100;
    const len = 30 + r() * 26;
    const a = -Math.PI / 2 - 0.6 + r() * 1.2;
    smooth(ctx, [[x - 4, FG_R.h + 2], [x + Math.cos(a) * len * 0.6 - 5, FG_R.h + Math.sin(a) * len * 0.6], [x + Math.cos(a) * len, FG_R.h + Math.sin(a) * len], [x + Math.cos(a) * len * 0.6 + 5, FG_R.h + Math.sin(a) * len * 0.6], [x + 4, FG_R.h + 2]]);
    ctx.fillStyle = i % 2 ? '#2f5a2c' : '#3c6d36';
    ctx.fill();
    ink(ctx, 1.4);
  }
}
