/**
 * DOUBLE TRIPLE arena: a Palermo street at dusk painted in watercolour (canvas 2D in world units).
 * FAR: dusk sky, low sun, pink clouds, lavender skyline with a cathedral dome and palms, the sidewalk.
 * MID: an ochre palazzo with balconies, the street lamp, the brick Ciccio's storefront (marquee sign with
 * bulbs, striped awning, warm window, door). NEAR: the curb and a fire hydrant in the bottom-left corner.
 */
import { ARENA } from '../../api';
import { cloud, grain, painted, rgba, rrect, seeded, vgrad, wash } from '../oldschool/kit/paint';

type Ctx = CanvasRenderingContext2D;

export const MID = { h: 306 } as const;
export const NEAR = { y: 310, h: 50 } as const;
/** the walls stand at the back of the sidewalk */
const BASE = 300;
const F = ARENA.floorY;
const LINE_BG = '#3b2836';

function skyline(ctx: Ctx, rng: () => number, color: string, top: number, lit: number): void {
  ctx.fillStyle = color;
  let x = -10;
  while (x < ARENA.w) {
    const w = 26 + rng() * 40;
    const h = top + rng() * 60;
    ctx.fillRect(x, BASE - h, w, h);
    if (rng() < 0.3) ctx.fillRect(x + w * 0.3, BASE - h - 12, w * 0.3, 12);
    ctx.fillStyle = rgba('#ffd98a', lit);
    for (let wy = BASE - h + 8; wy < BASE - 10; wy += 11) {
      for (let wx = x + 5; wx < x + w - 6; wx += 9) if (rng() < 0.35) ctx.fillRect(wx, wy, 3.5, 5);
    }
    ctx.fillStyle = color;
    x += w + 2;
  }
}

function dome(ctx: Ctx, x: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x - 34, BASE - 96, 68, 96);
  ctx.beginPath();
  ctx.ellipse(x, BASE - 96, 26, 34, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(x - 3, BASE - 142, 6, 14);
  ctx.beginPath();
  ctx.arc(x, BASE - 144, 4, 0, Math.PI * 2);
  ctx.fill();
}

function palm(ctx: Ctx, x: number, h: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, BASE);
  ctx.quadraticCurveTo(x + 8, BASE - h / 2, x + 4, BASE - h);
  ctx.stroke();
  ctx.lineWidth = 3;
  for (const a of [-2.7, -2.2, -1.6, -1.0, -0.5]) {
    ctx.beginPath();
    ctx.moveTo(x + 4, BASE - h);
    ctx.quadraticCurveTo(x + 4 + Math.cos(a) * 18, BASE - h + Math.sin(a) * 18 - 4, x + 4 + Math.cos(a) * 30, BASE - h + Math.sin(a) * 22 + 10);
    ctx.stroke();
  }
}

function sidewalk(ctx: Ctx, rng: () => number): void {
  vgrad(ctx, 0, BASE, ARENA.w, ARENA.h - BASE, [[0, '#9d8a8c'], [0.3, '#c4ad9f'], [1, '#b39c90']]);
  ctx.strokeStyle = rgba(LINE_BG, 0.35);
  ctx.lineWidth = 1;
  for (const y of [308, 326, 346]) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(ARENA.w, y);
    ctx.stroke();
  }
  for (let i = -8; i <= 8; i++) {
    ctx.beginPath();
    ctx.moveTo(320 + i * 46, BASE);
    ctx.lineTo(320 + i * 62, ARENA.h);
    ctx.stroke();
  }
  wash(ctx, rng, 0, BASE, ARENA.w, 60, '#7d6872', 12, 10, 30, 0.2);
  vgrad(ctx, 0, F - 6, ARENA.w, 10, [[0, 'rgba(255, 210, 150, 0)'], [0.5, 'rgba(255, 210, 150, 0.18)'], [1, 'rgba(255, 210, 150, 0)']]);
}

/** Dusk sky, sun, clouds, skyline and the sidewalk (640 x 360). */
export function drawFar(ctx: Ctx): void {
  const rng = seeded(1961);
  vgrad(ctx, 0, 0, ARENA.w, BASE, [[0, '#46407a'], [0.42, '#9c5f88'], [0.74, '#e58c6c'], [1, '#f7c47c']]);
  wash(ctx, rng, 0, 0, ARENA.w, 220, '#6c4f8f', 14, 30, 80, 0.25);
  const sun = ctx.createRadialGradient(262, 214, 10, 262, 214, 130);
  sun.addColorStop(0, 'rgba(255, 228, 150, 0.9)');
  sun.addColorStop(0.3, 'rgba(255, 200, 120, 0.4)');
  sun.addColorStop(1, 'rgba(255, 200, 120, 0)');
  ctx.fillStyle = sun;
  ctx.fillRect(120, 80, 290, 240);
  ctx.fillStyle = '#ffe4a0';
  ctx.beginPath();
  ctx.arc(262, 218, 28, 0, Math.PI * 2);
  ctx.fill();
  for (const [x, y, w] of [[40, 70, 130], [300, 46, 150], [470, 92, 120], [150, 140, 90]] as const) cloud(ctx, x, y, w, '#f2a7a3', '#a8607e');
  skyline(ctx, rng, '#9a7fa6', 70, 0.25);
  dome(ctx, 92, '#8a6f99');
  skyline(ctx, rng, '#76608a', 40, 0.55);
  palm(ctx, 232, 92, '#5a4670');
  palm(ctx, 284, 74, '#5a4670');
  sidewalk(ctx, rng);
  grain(ctx, rng, 0, 0, ARENA.w, ARENA.h, 2400, '#3a2436', 0.16);
}

function palazzo(ctx: Ctx, rng: () => number): void {
  const top = 118;
  const right = 214;
  painted(ctx, (c) => c.rect(-4, top, right + 4, BASE - top + 2), '#c99a73', '#8a5e44', 1.4, LINE_BG);
  wash(ctx, rng, 0, top, right, BASE - top, '#e8bf8e', 10, 20, 50, 0.35);
  wash(ctx, rng, 0, top, right, BASE - top, '#7a5a6a', 6, 20, 50, 0.22);
  painted(ctx, (c) => c.rect(-4, top - 6, right + 10, 12), '#e2c49a', '#9a7a58', 1.4, LINE_BG);
  for (const x of [22, 94, 166]) {
    for (const y of [142, 218]) {
      painted(ctx, (c) => rrect(c, x - 3, y - 3, 34, 56, 16), '#4a3a52', '#2e2236', 1.4, LINE_BG);
      const g = ctx.createLinearGradient(0, y, 0, y + 50);
      g.addColorStop(0, '#ffe39a');
      g.addColorStop(1, '#f2954a');
      ctx.fillStyle = g;
      rrect(ctx, x + 1, y + 1, 26, 48, 12);
      ctx.fill();
      ctx.fillStyle = rgba('#b0503a', 0.55);
      ctx.fillRect(x + 1, y + 6, 7, 43);
      ctx.fillRect(x + 20, y + 6, 7, 43);
      painted(ctx, (c) => c.rect(x - 7, y + 46, 42, 4), '#3a2a36', '#1e141c', 1, LINE_BG);
      ctx.strokeStyle = '#3a2a36';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(x - 6, y + 36);
      ctx.lineTo(x + 34, y + 36);
      for (let bx = x - 5; bx < x + 36; bx += 5) {
        ctx.moveTo(bx, y + 46);
        ctx.lineTo(bx, y + 36);
      }
      ctx.stroke();
    }
  }
  for (const x of [30, 174]) {
    painted(ctx, (c) => rrect(c, x, 182, 12, 7, 2), '#b5533c', '#6e2a1c', 1, LINE_BG);
    painted(ctx, (c) => {
      c.beginPath();
      c.arc(x + 6, 180, 7, 0, Math.PI * 2);
    }, '#6f9a4a', '#3d5e2a', 1, LINE_BG);
  }
}

function lamp(ctx: Ctx, x: number): void {
  const g = ctx.createRadialGradient(x, 116, 4, x, 140, 90);
  g.addColorStop(0, 'rgba(255, 220, 140, 0.7)');
  g.addColorStop(1, 'rgba(255, 220, 140, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 100, 30, 200, 240);
  painted(ctx, (c) => rrect(c, x - 3, 118, 6, BASE - 118, 2), '#2e2632', '#120c14', 1.2, LINE_BG);
  painted(ctx, (c) => rrect(c, x - 7, BASE - 18, 14, 18, 3), '#2e2632', '#120c14', 1.2, LINE_BG);
  painted(ctx, (c) => {
    c.beginPath();
    c.moveTo(x - 12, 102);
    c.lineTo(x + 12, 102);
    c.lineTo(x + 7, 120);
    c.lineTo(x - 7, 120);
    c.closePath();
  }, '#ffe7a8', '#e8b060', 1.4, LINE_BG);
  painted(ctx, (c) => {
    c.beginPath();
    c.moveTo(x - 15, 102);
    c.quadraticCurveTo(x, 88, x + 15, 102);
    c.closePath();
  }, '#2e2632', '#120c14', 1.4, LINE_BG);
}

function storefront(ctx: Ctx, rng: () => number): void {
  const x0 = 318;
  painted(ctx, (c) => c.rect(x0, 26, ARENA.w - x0 + 6, BASE - 26 + 2), '#a54a3a', '#5e2218', 1.6, LINE_BG);
  ctx.strokeStyle = rgba('#5e2218', 0.45);
  ctx.lineWidth = 0.8;
  for (let y = 32, row = 0; y < BASE; y += 7, row++) {
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(ARENA.w, y);
    ctx.stroke();
    for (let bx = x0 + (row % 2) * 9; bx < ARENA.w; bx += 18) {
      ctx.beginPath();
      ctx.moveTo(bx, y);
      ctx.lineTo(bx, y + 7);
      ctx.stroke();
    }
  }
  wash(ctx, rng, x0, 26, ARENA.w - x0, 270, '#d9765a', 10, 20, 50, 0.25);
  painted(ctx, (c) => rrect(c, 344, 48, 270, 74, 8), '#231815', '#000000', 2, LINE_BG);
  painted(ctx, (c) => rrect(c, 352, 56, 254, 58, 5), '#2c1f1a', '#120c0a', 0);
  for (let i = 0; i < 24; i++) {
    const t = i / 24;
    const bx = t < 0.5 ? 350 + t * 2 * 258 : 608 - (t - 0.5) * 2 * 258;
    const by = t < 0.5 ? 52 : 118;
    const halo = ctx.createRadialGradient(bx, by, 0.5, bx, by, 6);
    halo.addColorStop(0, 'rgba(255, 236, 160, 0.95)');
    halo.addColorStop(1, 'rgba(255, 236, 160, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(bx - 6, by - 6, 12, 12);
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f6ead0';
  ctx.font = "900 38px 'Arial Black', Impact, sans-serif";
  ctx.fillText("CICCIO'S", 479, 97);
  ctx.font = "bold 9px 'Arial Black', Impact, sans-serif";
  ctx.fillStyle = '#f2b04a';
  ctx.fillText('BURGERS · PALERMO', 479, 111);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(334, 140);
  ctx.lineTo(630, 140);
  ctx.lineTo(640, 172);
  for (let x = 640; x > 330; x -= 20) ctx.quadraticCurveTo(x - 10, 184, x - 20, 172);
  ctx.closePath();
  ctx.clip();
  for (let x = 320, i = 0; x < 650; x += 20, i++) {
    ctx.fillStyle = i % 2 ? '#f3e6cc' : '#c8392d';
    ctx.fillRect(x, 136, 20, 50);
  }
  ctx.restore();
  ctx.strokeStyle = LINE_BG;
  ctx.lineWidth = 1.6;
  ctx.strokeRect(334, 138, 300, 2);
  const glow = ctx.createLinearGradient(0, 190, 0, 292);
  glow.addColorStop(0, '#ffd77e');
  glow.addColorStop(1, '#f39a4a');
  painted(ctx, (c) => rrect(c, 352, 192, 160, 100, 4), '#3a2a26', '#1a100c', 1.6, LINE_BG);
  ctx.fillStyle = glow;
  ctx.fillRect(358, 198, 148, 88);
  ctx.fillStyle = rgba('#9a4a2a', 0.55);
  for (const [cx, r] of [[392, 16], [450, 20], [490, 13]] as const) {
    ctx.beginPath();
    ctx.ellipse(cx, 286 - r, r * 1.2, r, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(cx - r * 1.2, 286 - r, r * 2.4, r * 0.5);
  }
  ctx.fillStyle = '#7a2a1c';
  ctx.font = "italic bold 15px Georgia, serif";
  ctx.fillText('Burgers & more', 432, 226);
  painted(ctx, (c) => rrect(c, 534, 186, 66, BASE - 186, 3), '#5a3424', '#2a160c', 1.6, LINE_BG);
  ctx.fillStyle = rgba('#ffd77e', 0.8);
  ctx.fillRect(544, 196, 46, 50);
  painted(ctx, (c) => rrect(c, 548, 212, 38, 14, 2), '#f6ead0', '#c8b080', 1, LINE_BG);
  ctx.fillStyle = '#2a7a3a';
  ctx.font = "bold 8px 'Arial Black', sans-serif";
  ctx.fillText('APERTO', 567, 222);
  ctx.fillStyle = rgba('#3a1a10', 0.6);
  ctx.fillRect(x0, BASE - 6, ARENA.w - x0, 6);
}

/** Palazzo, lamp and the Ciccio's storefront (canvas MID.h tall from y 0), dimmed a little by the dusk. */
export function drawMid(ctx: Ctx): void {
  const rng = seeded(1962);
  palazzo(ctx, rng);
  lamp(ctx, 300);
  storefront(ctx, rng);
  ctx.fillStyle = 'rgba(70, 40, 90, 0.14)';
  ctx.fillRect(0, 0, ARENA.w, MID.h);
  grain(ctx, rng, 0, 0, ARENA.w, MID.h, 1600, '#2a1a24', 0.18);
}

/** Curb and road edge along the bottom, fire hydrant in the bottom-left corner (canvas NEAR.h). */
export function drawNear(ctx: Ctx): void {
  ctx.translate(0, -NEAR.y);
  vgrad(ctx, 0, 348, ARENA.w, 12, [[0, '#7c6a70'], [0.25, '#4a3c46'], [1, '#2e242c']]);
  ctx.fillStyle = '#d9c7b8';
  ctx.fillRect(0, 346, ARENA.w, 2.5);
  const ink = '#2a1820';
  // the hydrant stays below the floor line so it never hides the hero or a hazard
  ctx.translate(0, 22);
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.moveTo(14, 362);
  ctx.lineTo(16, 330);
  ctx.quadraticCurveTo(28, 314, 40, 330);
  ctx.lineTo(42, 362);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(8, 334, 40, 6);
  ctx.fillRect(25, 310, 6, 8);
  ctx.fillStyle = rgba('#c8392d', 0.45);
  ctx.fillRect(18, 332, 3, 26);
}
