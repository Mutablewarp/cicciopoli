/**
 * DON TUMA arena painting: a Sicilian beach at noon after the shirt — the big coral sun-oval behind him,
 * Monte Pellegrino in the haze, the sea, the sand, a wooden boardwalk the hero walks on and the shirt's
 * red-white checker strip. Everything is painted BLEED units past every arena edge (the camera never
 * shows a cut); coordinates are arena world units, the context is already shifted by the bleed.
 */
import { ARENA } from '../../api';
import { type Ctx, ell, seeded, specks, wash } from './kit/toon';
import { checkerBand } from './props';

/** Paint past the arena edges (world units). */
export const BLEED = { x: 96, y: 64 } as const;
const L = -BLEED.x;
const R = ARENA.w + BLEED.x;
const T = -BLEED.y;
const B = ARENA.h + BLEED.y;
export const HORIZON = 196;
const SHORE = 252;
const FY = ARENA.floorY;
const SOFT = '#7a5a40';

function soft(ctx: Ctx, fill: string | CanvasGradient, w = 1.3): void {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = SOFT;
  ctx.lineWidth = w;
  ctx.stroke();
}

function sky(ctx: Ctx, r: () => number): void {
  const g = ctx.createLinearGradient(0, T, 0, HORIZON);
  g.addColorStop(0, '#7fc3d6');
  g.addColorStop(0.6, '#c9e6df');
  g.addColorStop(1, '#f8e6bd');
  ctx.fillStyle = g;
  ctx.fillRect(L, T, R - L, HORIZON - T);
  wash(ctx, r, L, T, R - L, 140, '#fffaf0', 30, 0.12);
  // the shirt's coral oval: a big warm sun behind Don Tuma
  const halo = ctx.createRadialGradient(480, 150, 40, 480, 150, 280);
  halo.addColorStop(0, 'rgba(255,236,190,0.75)');
  halo.addColorStop(1, 'rgba(255,236,190,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(180, T, R - 180, 360);
  ell(ctx, 480, 146, 214, 94);
  ctx.fillStyle = '#e8665a';
  ctx.fill();
  ell(ctx, 480, 146, 214, 94);
  ctx.strokeStyle = '#c94a40';
  ctx.lineWidth = 2;
  ctx.stroke();
  wash(ctx, r, 300, 70, 360, 150, '#f08a70', 22, 0.25);
  ell(ctx, 480, 146, 200, 84);
  ctx.strokeStyle = 'rgba(255,230,200,0.45)';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function coast(ctx: Ctx, r: () => number): void {
  // Monte Pellegrino: the headland over Palermo, far left in the haze
  ctx.beginPath();
  ctx.moveTo(L, HORIZON);
  ctx.lineTo(L, 136);
  ctx.bezierCurveTo(-40, 112, 0, 86, 46, 84);
  ctx.bezierCurveTo(90, 80, 128, 74, 168, 96);
  ctx.bezierCurveTo(200, 114, 226, 150, 268, HORIZON);
  ctx.closePath();
  soft(ctx, '#b4a6c4', 1);
  wash(ctx, r, L, 84, 360, 100, '#9d8db4', 24, 0.22);
  ctx.beginPath();
  ctx.moveTo(560, HORIZON);
  ctx.bezierCurveTo(610, 176, 680, 170, R, 178);
  ctx.lineTo(R, HORIZON);
  ctx.closePath();
  soft(ctx, '#c9bdd0', 1);
  for (let i = 0; i < 16; i++) {
    const x = 40 + r() * 190;
    ctx.fillStyle = r() < 0.7 ? '#f6eee0' : '#e6b48c';
    ctx.fillRect(x, HORIZON - 6 - r() * 8, 4 + r() * 4, 4);
  }
}

function sea(ctx: Ctx, r: () => number): void {
  const g = ctx.createLinearGradient(0, HORIZON, 0, SHORE);
  g.addColorStop(0, '#8fd4d2');
  g.addColorStop(1, '#3f9cb6');
  ctx.fillStyle = g;
  ctx.fillRect(L, HORIZON, R - L, SHORE - HORIZON + 6);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1.1;
  for (let i = 0; i < 60; i++) {
    const x = L + r() * (R - L);
    const y = HORIZON + 4 + r() * (SHORE - HORIZON - 8);
    const w = 4 + ((y - HORIZON) / (SHORE - HORIZON)) * 12;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + w / 2, y - 2, x + w, y);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,250,220,0.75)';
  for (let i = 0; i < 26; i++) ctx.fillRect(390 + r() * 180, HORIZON + 2 + r() * 26, 3 + r() * 5, 1.2);
}

function sand(ctx: Ctx, r: () => number): void {
  const g = ctx.createLinearGradient(0, SHORE, 0, B);
  g.addColorStop(0, '#f0d7a4');
  g.addColorStop(1, '#e3bd83');
  ctx.fillStyle = g;
  ctx.fillRect(L, SHORE, R - L, B - SHORE);
  // wet sand and foam along the shore
  ctx.beginPath();
  ctx.moveTo(L, SHORE + 2);
  for (let x = L; x <= R; x += 24) ctx.quadraticCurveTo(x + 12, SHORE + 7 + Math.sin(x / 37) * 2, x + 24, SHORE + 3);
  ctx.lineTo(R, SHORE - 2);
  ctx.lineTo(L, SHORE - 2);
  ctx.closePath();
  ctx.fillStyle = '#fbf6ea';
  ctx.fill();
  ctx.fillStyle = 'rgba(160,120,70,0.18)';
  ctx.fillRect(L, SHORE + 6, R - L, 7);
  wash(ctx, r, L, SHORE + 10, R - L, B - SHORE, '#f7e2b6', 50, 0.3);
  ctx.strokeStyle = 'rgba(150,110,60,0.28)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 70; i++) {
    const x = L + r() * (R - L);
    const y = SHORE + 14 + r() * (B - SHORE - 14);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 6, y - 1.5, x + 12, y);
    ctx.stroke();
  }
}

/** The boardwalk the hero walks on: planks from just behind the floor line, its front edge on it. */
function boardwalk(ctx: Ctx, r: () => number): void {
  const top = FY - 16;
  ctx.fillStyle = 'rgba(70,40,20,0.22)';
  ctx.fillRect(L, FY + 2, R - L, 6);
  ctx.beginPath();
  ctx.rect(L, top, R - L, FY - top + 2);
  soft(ctx, '#c79a62', 1.4);
  ctx.strokeStyle = 'rgba(90,55,30,0.55)';
  ctx.lineWidth = 1;
  for (const y of [top + 5, top + 10]) {
    ctx.beginPath();
    ctx.moveTo(L, y);
    ctx.lineTo(R, y);
    ctx.stroke();
  }
  for (let x = L + 8; x < R; x += 46 + r() * 14) {
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x - 2, FY + 2);
    ctx.stroke();
  }
  wash(ctx, r, L, top, R - L, 16, '#e0b47a', 40, 0.3);
  ctx.fillStyle = '#5a321e';
  ctx.fillRect(L, FY, R - L, 2);
}

/** Far + mid static layer (one texture: the camera only pans inside the bleed). */
export function drawTumaBg(ctx: Ctx): void {
  const r = seeded(31);
  sky(ctx, r);
  coast(ctx, r);
  sea(ctx, r);
  sand(ctx, r);
  boardwalk(ctx, r);
  ctx.save();
  ctx.translate(L, T);
  specks(ctx, r, R - L, B - T, 1400);
  ctx.restore();
}

/** Foreground strip at the bottom: the shirt's checker band over the sand (FRONT.w x FRONT.h). */
export const FRONT = { w: ARENA.w + BLEED.x * 2, h: 30 } as const;
export function drawFront(ctx: Ctx): void {
  checkerBand(ctx, [[-4, 15], [FRONT.w / 3, 15], [(FRONT.w * 2) / 3, 15], [FRONT.w + 4, 15]], 14);
}
