/**
 * HAPPY BOX arena painting: a Palermo back alley at sunset — peach sky, rooftops with a dome, a brick wall
 * (the shirt's MAKE IT HAPPY lettering is sprayed on it as a sprite, arena.ts), a gutter (the paint drips
 * fall from it), a door with a lamp, a fire escape, the pavement and the road. Painted BLEED units past
 * every arena edge: the camera never shows a cut. Soft brown outlines and washes: calmer than the boss.
 */
import { ARENA } from '../../api';
import { type Ctx, ell, letters, seeded, specks, wash } from '../tuma/kit/toon';

const SOFT = '#5a3a2a';
const ROOF = 64;
const GUTTER = 42;
export const WALK = 298;
const FY = ARENA.floorY;
/** Paint past the arena edges (world units). */
export const BLEED = { x: 96, y: 64 } as const;
const L = -BLEED.x;
const R = ARENA.w + BLEED.x;
const T = -BLEED.y;
const B = ARENA.h + BLEED.y;

function soft(ctx: Ctx, fill: string | CanvasGradient, w = 1.3): void {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = SOFT;
  ctx.lineWidth = w;
  ctx.stroke();
}

function sky(ctx: Ctx, r: () => number): void {
  const g = ctx.createLinearGradient(0, T, 0, ROOF + 20);
  g.addColorStop(0, '#b7a6d6');
  g.addColorStop(0.6, '#f3b994');
  g.addColorStop(1, '#ffd9a0');
  ctx.fillStyle = g;
  ctx.fillRect(L, T, R - L, ROOF + 20 - T);
  ctx.fillStyle = '#9d86b8';
  ctx.beginPath();
  ctx.moveTo(L, ROOF + 20);
  for (const [x, y] of [[L, 40], [-30, 40], [-30, 22], [0, 22], [0, 44], [60, 44], [60, 30], [130, 30], [130, 50], [210, 50], [214, 36], [290, 36], [300, 50], [400, 50], [400, 26], [470, 26], [470, 46], [640, 46], [650, 30], [700, 30], [700, 46], [R, 46], [R, 84]] as const) ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
  ell(ctx, 342, 40, 30, 22);
  ctx.fill();
  ctx.fillRect(339, 10, 6, 10);
  ctx.strokeStyle = '#9d86b8';
  ctx.lineWidth = 1.4;
  for (const x of [90, 240, 520]) {
    ctx.beginPath();
    ctx.moveTo(x, 30);
    ctx.lineTo(x, 12);
    ctx.moveTo(x - 8, 16);
    ctx.lineTo(x + 8, 16);
    ctx.stroke();
  }
  wash(ctx, r, L, T, R - L, 40 - T, '#fff0d8', 20, 0.18);
}

function wall(ctx: Ctx, r: () => number): void {
  const g = ctx.createLinearGradient(0, GUTTER, 0, WALK);
  g.addColorStop(0, '#b98472');
  g.addColorStop(1, '#9c6a5a');
  ctx.fillStyle = g;
  ctx.fillRect(L, GUTTER, R - L, WALK - GUTTER);
  ctx.strokeStyle = 'rgba(80,35,25,0.35)';
  ctx.lineWidth = 1;
  for (let y = GUTTER + 10, row = 0; y < WALK; y += 11, row++) {
    ctx.beginPath();
    ctx.moveTo(L, y);
    ctx.lineTo(R, y);
    for (let x = L + (row % 2) * 13; x < R; x += 26) {
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - 11);
    }
    ctx.stroke();
  }
  wash(ctx, r, L, GUTTER, R - L, WALK - GUTTER, '#d4a088', 56, 0.18);
  wash(ctx, r, L, GUTTER, R - L, WALK - GUTTER, '#7a3c30', 34, 0.12);
  ctx.beginPath();
  ctx.rect(L - 4, GUTTER - 6, R - L + 8, 9);
  soft(ctx, '#8b97a0');
  ctx.beginPath();
  ctx.rect(22, GUTTER, 8, WALK - GUTTER);
  soft(ctx, '#8b97a0');
}

function drips(ctx: Ctx, x: number, y: number, w: number, color: string, r: () => number): void {
  ctx.fillStyle = color;
  for (let i = 0; i < 4; i++) {
    const dx = x + r() * w;
    const len = 8 + r() * 26;
    ctx.fillRect(dx, y, 2.6, len);
    ell(ctx, dx + 1.3, y + len, 2, 2.4);
    ctx.fill();
  }
}

/** Small tags around the shirt mural (the MAKE IT HAPPY lettering is the shirt's own, a sprite). */
function graffiti(ctx: Ctx, r: () => number): void {
  ctx.save();
  ctx.globalAlpha = 0.88;
  ell(ctx, -30, 150, 20, 20);
  soft(ctx, '#f6d23c', 1.6);
  for (const x of [-37, -23]) {
    ell(ctx, x, 145, 2.4, 3.4);
    ctx.fillStyle = SOFT;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(-30, 152, 10, 0.3, Math.PI - 0.3);
  ctx.strokeStyle = SOFT;
  ctx.lineWidth = 2;
  ctx.stroke();
  drips(ctx, -44, 168, 28, '#f6d23c', r);
  ctx.beginPath();
  ctx.moveTo(392, 120);
  for (const [x, y] of [[402, 98], [412, 114], [424, 92], [434, 114], [446, 98], [454, 120]] as const) ctx.lineTo(x, y);
  ctx.closePath();
  soft(ctx, '#4fd1a8', 1.6);
  letters(ctx, 'AMUNÌ', 424, 140, 13, '#4fd1a8', 0.06, '#2a1d16');
  letters(ctx, '★', 96, 252, 22, '#ff9a3c', 0.2, '#2a1d16');
  letters(ctx, '★', 690, 210, 18, '#4fd1a8', -0.3, '#2a1d16');
  ctx.restore();
}

function door(ctx: Ctx): void {
  ctx.beginPath();
  ctx.rect(548, 160, 62, WALK - 160);
  soft(ctx, '#3f7a5c', 1.6);
  ctx.strokeStyle = 'rgba(20,40,30,0.5)';
  for (const y of [190, 230, 270]) {
    ctx.strokeRect(556, y - 22, 46, 30);
  }
  ell(ctx, 600, 232, 3, 3);
  soft(ctx, '#e8c050');
  ctx.beginPath();
  ctx.moveTo(564, 140);
  ctx.lineTo(594, 140);
  ctx.lineTo(588, 150);
  ctx.lineTo(570, 150);
  ctx.closePath();
  soft(ctx, '#2a2a2a');
  ell(ctx, 579, 153, 6, 4);
  soft(ctx, '#fff1b0');
  ctx.strokeStyle = '#5a5a5a';
  ctx.lineWidth = 3;
  for (const y of [70, 120]) {
    ctx.beginPath();
    ctx.moveTo(500, y);
    ctx.lineTo(R, y);
    ctx.stroke();
  }
  for (let x = 506; x < R; x += 14) {
    ctx.beginPath();
    ctx.moveTo(x, 62);
    ctx.lineTo(x, 70);
    ctx.moveTo(x, 112);
    ctx.lineTo(x, 120);
    ctx.stroke();
  }
}

function pavement(ctx: Ctx, r: () => number): void {
  ctx.fillStyle = '#c9c0b4';
  ctx.fillRect(L, WALK, R - L, FY - WALK);
  ctx.strokeStyle = 'rgba(70,60,50,0.35)';
  ctx.lineWidth = 1;
  for (let x = L; x < R; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x + 6, WALK);
    ctx.lineTo(x, FY);
    ctx.stroke();
  }
  wash(ctx, r, L, WALK, R - L, FY - WALK, '#a89c8e', 30, 0.25);
  ctx.fillStyle = '#e9e2d6';
  ctx.fillRect(L, FY - 3, R - L, 3);
  ctx.fillStyle = '#3a2c24';
  ctx.fillRect(L, FY, R - L, 2);
  const g = ctx.createLinearGradient(0, FY, 0, B);
  g.addColorStop(0, '#6e655e');
  g.addColorStop(1, '#3e3732');
  ctx.fillStyle = g;
  ctx.fillRect(L, FY + 2, R - L, B - FY);
  ctx.fillStyle = 'rgba(246,210,60,0.55)';
  for (let x = L + 10; x < R; x += 60) ctx.fillRect(x, 344, 30, 4);
}

/** Far + mid static layer, painted BLEED past every arena edge (the context is shifted by the bleed). */
export function drawHappyBg(ctx: Ctx): void {
  const r = seeded(77);
  sky(ctx, r);
  wall(ctx, r);
  graffiti(ctx, r);
  door(ctx);
  pavement(ctx, r);
  ctx.save();
  ctx.translate(L, T);
  specks(ctx, r, R - L, B - T, 1300);
  ctx.restore();
}

