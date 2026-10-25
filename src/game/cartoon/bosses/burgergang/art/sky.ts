/**
 * Far layer of the Burger Gang arena: watercolour night sky over Palermo, stars, the moon and its path on
 * the sea, Monte Pellegrino, the city skyline (Teatro Massimo, the Cathedral, red Norman domes, palms).
 */
import { ARENA } from '../../../api';
import { LINE, inked } from '../../../draw/canvas';
import { ellipse, smooth } from './parts';

const W = ARENA.w;
const H = ARENA.h;
export const MOON = { x: 470, y: 72, r: 34 } as const;

export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Soft watercolour blotches of one colour. */
function wash(ctx: CanvasRenderingContext2D, rnd: () => number, color: string, n: number, x0: number, y0: number, w: number, h: number, r: number): void {
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    ellipse(ctx, x0 + rnd() * w, y0 + rnd() * h, r * (0.5 + rnd()), r * (0.3 + rnd() * 0.5), rnd() * 0.6 - 0.3);
    ctx.fill();
  }
}

export function sky(ctx: CanvasRenderingContext2D): void {
  const rnd = seeded(808);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1f1d42');
  g.addColorStop(0.45, '#3d3466');
  g.addColorStop(0.72, '#7a5a7c');
  g.addColorStop(0.82, '#c98a6e');
  g.addColorStop(1, '#5a3d4a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  wash(ctx, rnd, 'rgba(120,100,170,0.10)', 40, 0, 0, W, 200, 40);
  wash(ctx, rnd, 'rgba(255,200,150,0.07)', 24, 0, 170, W, 80, 50);
  for (let i = 0; i < 36; i++) {
    const x = rnd() * W;
    const y = 30 + rnd() * 150;
    const s = 0.5 + rnd() * 0.9;
    ctx.fillStyle = `rgba(255,244,214,${0.3 + rnd() * 0.5})`;
    ctx.fillRect(x - s / 2, y - s * 1.6, s, s * 3.2);
    ctx.fillRect(x - s * 1.6, y - s / 2, s * 3.2, s);
  }
  const mg = ctx.createRadialGradient(MOON.x, MOON.y, MOON.r * 0.8, MOON.x, MOON.y, MOON.r * 2.6);
  mg.addColorStop(0, 'rgba(255,240,200,0.45)');
  mg.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = mg;
  ctx.fillRect(MOON.x - MOON.r * 3, MOON.y - MOON.r * 3, MOON.r * 6, MOON.r * 6);
  ellipse(ctx, MOON.x, MOON.y, MOON.r, MOON.r);
  inked(ctx, '#fbefc9', LINE * 0.8);
  ctx.fillStyle = 'rgba(200,170,120,0.35)';
  for (const [dx, dy, r] of [[-12, -8, 7], [10, 6, 9], [-4, 16, 5], [14, -14, 4]] as const) {
    ellipse(ctx, MOON.x + dx, MOON.y + dy, r, r * 0.85);
    ctx.fill();
  }
  // sea with the moon's path
  ctx.fillStyle = '#4b4778';
  ctx.fillRect(0, 252, W, 50);
  ctx.strokeStyle = 'rgba(255,236,190,0.55)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 9; i++) {
    const y = 256 + i * 4;
    const hw = 8 + i * 4;
    ctx.beginPath();
    ctx.moveTo(MOON.x - hw + (i % 2) * 6, y);
    ctx.lineTo(MOON.x + hw - (i % 3) * 5, y);
    ctx.stroke();
  }
  // Monte Pellegrino
  smooth(ctx, [[-20, 262], [10, 196], [52, 168], [96, 178], [150, 214], [214, 246], [260, 262]], false);
  ctx.lineTo(-20, 262);
  ctx.closePath();
  ctx.fillStyle = '#4a3f6c';
  ctx.fill();
  wash(ctx, rnd, 'rgba(90,80,130,0.35)', 14, 0, 180, 220, 70, 16);
  city(ctx, rnd);
}

/** Far Palermo skyline: domes, bell towers, red Norman domes, palms, warm windows. */
function city(ctx: CanvasRenderingContext2D, rnd: () => number): void {
  const base = 300;
  const far = '#5b4a76';
  ctx.fillStyle = far;
  for (let x = 120; x < W; x += 18 + rnd() * 16) {
    const h = 16 + rnd() * 26;
    ctx.fillRect(x, base - h - 30, 16 + rnd() * 12, h + 30);
  }
  const dome = (x: number, y: number, r: number, color: string): void => {
    ctx.beginPath();
    ctx.arc(x, y, r, Math.PI, 0);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };
  // Teatro Massimo: columned drum + big dome
  ctx.fillStyle = '#6a5582';
  ctx.fillRect(250, 226, 64, 46);
  ctx.fillRect(262, 212, 40, 16);
  dome(282, 212, 22, '#6a5582');
  ctx.fillRect(280, 182, 4, 10);
  // Cathedral: towers and small domes
  ctx.fillStyle = '#634f7e';
  ctx.fillRect(360, 222, 96, 50);
  for (const tx of [360, 452]) ctx.fillRect(tx - 4, 200, 12, 30);
  dome(408, 222, 14, '#634f7e');
  for (const tx of [360, 452]) dome(tx + 2, 200, 6, '#634f7e');
  // red Norman domes
  for (const [x, r] of [[180, 9], [196, 7], [208, 6]] as const) {
    ctx.fillStyle = '#6e5a7e';
    ctx.fillRect(x - r, 244, r * 2, 28);
    dome(x, 244, r, '#b4545a');
  }
  // palms
  for (const px of [140, 232, 520, 604]) {
    ctx.strokeStyle = '#3f3358';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, 286);
    ctx.quadraticCurveTo(px + 3, 262, px + 1, 244);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI + (i / 5) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(px + 1, 244);
      ctx.quadraticCurveTo(px + Math.cos(a) * 9, 238 + Math.sin(a) * 5, px + Math.cos(a) * 15, 246 + Math.abs(Math.cos(a)) * 4);
      ctx.stroke();
    }
  }
  ctx.fillStyle = '#4f4068';
  ctx.fillRect(0, 272, W, 30);
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = `rgba(255,214,130,${0.35 + rnd() * 0.5})`;
    ctx.fillRect(110 + rnd() * (W - 110), 232 + rnd() * 62, 1.6, 2.2);
  }
}

