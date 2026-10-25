/**
 * Monsieur Brie's arena: a sunny country road through green hills with red-roof farmhouses (the shirt's
 * landscape), painted as soft watercolour. Layers: sky + far ridges, drifting clouds, the mid hills with
 * the winding road, poplars and haystacks, the near verge + fence + the dirt road (the floor, at
 * ARENA.floorY), and two low dark foreground corners. Calmer than the boss so the action reads.
 */
import type Phaser from 'phaser';
import { ARENA } from '../../api';
import { image, worldSprite } from '../../draw/canvas';
import { rng } from './kit/paths';
import { cloud, ellipse, ink, paperGrain, shade, smooth, wash, type Pt } from './kit/toon';

const W = ARENA.w;
const H = ARENA.h;
const HILLS = { y: 120, h: 240 } as const;
const ROAD = { y: 282, h: 78 } as const;
const SOFT = '#6b5636';

function ridge(baseY: number, amp: number, seed: number, step = 40): Pt[] {
  const r = rng(seed);
  const pts: Pt[] = [[-20, H]];
  for (let x = -20; x <= W + 20; x += step) pts.push([x, baseY - amp * (0.5 + 0.5 * Math.sin(x / 90 + seed)) - r() * amp * 0.4]);
  pts.push([W + 20, H]);
  return pts;
}

export function fillPts(ctx: CanvasRenderingContext2D, pts: readonly Pt[], color: string, seed: number, top: number): void {
  wash(ctx, () => smooth(ctx, pts), color, { x: 0, y: top, w: W, h: H - top }, seed, 0.35);
}

function drawSky(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, 0, 0, 230);
  g.addColorStop(0, '#9fcfe0');
  g.addColorStop(0.55, '#cfe5da');
  g.addColorStop(1, '#f5e8c6');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const sun = ctx.createRadialGradient(110, 70, 4, 110, 70, 150);
  sun.addColorStop(0, 'rgba(255,249,224,0.85)');
  sun.addColorStop(1, 'rgba(255,249,224,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, W, H);
  fillPts(ctx, ridge(196, 26, 3), '#b9cdbb', 31, 160);
  fillPts(ctx, ridge(212, 18, 7, 55), '#a3c09f', 32, 180);
  paperGrain(ctx, W, H, 5);
}

function farmhouse(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.rect(-14, -12, 28, 14);
  ctx.fillStyle = '#f6efdf';
  ctx.fill();
  ink(ctx, 1);
  ctx.strokeStyle = SOFT;
  ctx.beginPath();
  ctx.moveTo(-18, -11);
  ctx.lineTo(-10, -24);
  ctx.lineTo(10, -24);
  ctx.lineTo(18, -11);
  ctx.closePath();
  ctx.fillStyle = '#d5533d';
  ctx.fill();
  ink(ctx, 1);
  ctx.fillStyle = '#5b4632';
  ctx.fillRect(-9, -8, 5, 5);
  ctx.fillRect(4, -8, 5, 5);
  ctx.fillRect(-2, -7, 4, 9);
  ctx.fillStyle = '#8b5a3c';
  ctx.fillRect(6, -29, 4, 7);
  ctx.restore();
}

function tree(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, poplar: boolean): void {
  ctx.fillStyle = '#7a5634';
  ctx.fillRect(x - 1.5, y - r * 0.4, 3, r * 0.6);
  const shape = (): void => (poplar ? ellipse(ctx, x, y - r * 1.4, r * 0.5, r * 1.3) : ellipse(ctx, x, y - r, r, r * 0.9));
  wash(ctx, shape, poplar ? '#5f9146' : '#6fa04b', { x: x - r, y: y - r * 2.7, w: r * 2, h: r * 2.7 }, Math.round(x * 7 + y), 0.6);
  ellipse(ctx, x - r * 0.3, y - r * (poplar ? 1.9 : 1.3), r * 0.3, r * 0.25);
  ctx.fillStyle = 'rgba(255,255,230,0.25)';
  ctx.fill();
}

/** Mid layer, drawn in its own frame (y = world y - HILLS.y). */
function drawHills(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.translate(0, -HILLS.y);
  fillPts(ctx, [[-20, 300], [-20, 190], [80, 168], [200, 172], [330, 196], [400, 300]], '#a9d073', 41, 160);
  fillPts(ctx, [[220, 300], [300, 206], [420, 182], [540, 176], [660, 196], [660, 300]], '#97c466', 42, 170);
  // the winding country road climbing to the farms
  smooth(ctx, [[150, 300], [118, 262], [92, 226], [112, 196], [140, 178], [150, 176], [126, 196], [108, 226], [140, 262], [196, 300]]);
  ctx.fillStyle = '#efe0b8';
  ctx.fill();
  ctx.strokeStyle = shade('#efe0b8', -0.25);
  ctx.lineWidth = 1;
  ctx.stroke();
  for (const [x, y, s] of [[96, 178, 1], [212, 176, 0.85], [472, 182, 0.95]] as const) farmhouse(ctx, x, y, s);
  for (const [x, y, r, p] of [[52, 182, 9, true], [64, 184, 7, true], [250, 186, 11, false], [300, 200, 8, true], [452, 188, 10, false], [520, 180, 12, false], [600, 192, 8, true]] as const) tree(ctx, x, y, r, p);
  // hedgerows along the contours
  const r = rng(9);
  for (let i = 0; i < 26; i++) {
    const x = 20 + i * 24 + r() * 10;
    const y = 232 + Math.sin(i * 0.7) * 8 + r() * 6;
    ellipse(ctx, x, y, 10 + r() * 6, 5 + r() * 2);
    ctx.fillStyle = r() < 0.5 ? '#5f8f42' : '#6b9a48';
    ctx.fill();
  }
  // haystacks
  for (const [x, y] of [[372, 230], [404, 236]] as const) {
    smooth(ctx, [[x - 12, y], [x - 9, y - 12], [x, y - 17], [x + 9, y - 12], [x + 12, y]]);
    ctx.fillStyle = '#e4bd5c';
    ctx.fill();
    ctx.strokeStyle = SOFT;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  fillPts(ctx, [[-20, 400], [-20, 248], [160, 240], [360, 250], [520, 242], [660, 248], [660, 400]], '#89b95a', 43, 236);
  ctx.restore();
  paperGrain(ctx, W, HILLS.h, 6);
}

/** Near layer: verge, fence and the dirt road the fight happens on (frame y = world y - ROAD.y). */
function drawRoad(ctx: CanvasRenderingContext2D): void {
  const top = 22;
  wash(ctx, () => ctx.rect(0, 0, W, top + 4), '#7fae4f', { x: 0, y: 0, w: W, h: top }, 51, 0);
  for (let x = 18; x < W; x += 74) {
    ctx.beginPath();
    ctx.rect(x, 0, 5, top);
    ctx.fillStyle = '#9a7048';
    ctx.fill();
    ctx.strokeStyle = SOFT;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.fillStyle = '#a57b52';
  ctx.fillRect(0, 5, W, 3);
  ctx.fillRect(0, 13, W, 3);
  const r = rng(52);
  ctx.strokeStyle = '#5f8f3a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < 90; i++) {
    const x = r() * W;
    ctx.moveTo(x, top + 2);
    ctx.lineTo(x + (r() - 0.5) * 5, top - 4 - r() * 6);
  }
  ctx.stroke();
  const g = ctx.createLinearGradient(0, top, 0, ROAD.h);
  g.addColorStop(0, '#e4c690');
  g.addColorStop(1, '#cfa465');
  smooth(ctx, [[-10, top + 2], [160, top - 1], [330, top + 2], [500, top], [W + 10, top + 1], [W + 10, ROAD.h + 4], [-10, ROAD.h + 4]]);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#8b6a3e';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#a77d45';
  ctx.lineWidth = 2;
  for (const y of [48, 64]) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= W; x += 40) ctx.lineTo(x, y + Math.sin(x / 70 + y) * 2);
    ctx.stroke();
  }
  ctx.restore();
  for (let i = 0; i < 60; i++) {
    ellipse(ctx, r() * W, top + 10 + r() * (ROAD.h - top - 10), 0.8 + r() * 1.6, 0.6 + r());
    ctx.fillStyle = r() < 0.5 ? '#b38a52' : '#f1dcae';
    ctx.fill();
  }
  paperGrain(ctx, W, ROAD.h, 7);
}

const FG_L = { w: 170, h: 64 } as const;
const CLOUD = { w: 140, h: 80 } as const;
const FG_R = { w: 140, h: 84 } as const;

function flower(ctx: CanvasRenderingContext2D, x: number, y: number, petal: string, heart: string): void {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    ellipse(ctx, x + Math.cos(a) * 3.2, y + Math.sin(a) * 3.2, 2.6, 2.6);
    ctx.fillStyle = petal;
    ctx.fill();
    ink(ctx, 0.9);
  }
  ellipse(ctx, x, y, 1.8, 1.8);
  ctx.fillStyle = heart;
  ctx.fill();
}

/** Bottom-left corner: dark bushes with poppies and daisies. */
function drawFgLeft(ctx: CanvasRenderingContext2D): void {
  const b = FG_L;
  smooth(ctx, [[0, b.h], [0, 26], [22, 12], [52, 20], [80, 10], [112, 26], [140, 34], [170, 56], [170, b.h]]);
  ctx.fillStyle = '#3d6b33';
  ctx.fill();
  ink(ctx, 2);
  for (const [x, y, rx] of [[26, 26, 14], [76, 22, 16], [118, 36, 12]] as const) {
    ellipse(ctx, x, y, rx, rx * 0.5);
    ctx.fillStyle = shade('#3d6b33', 0.18);
    ctx.fill();
  }
  for (const [x, y] of [[20, 18], [64, 14], [100, 26], [138, 40]] as const) flower(ctx, x, y, '#d8402f', '#2a1a12');
  for (const [x, y] of [[42, 24], [86, 30], [122, 30]] as const) flower(ctx, x, y, '#fbf6ea', '#f0c030');
}

/** Bottom-right corner: tall grass and a little red-capped milestone. */
function drawFgRight(ctx: CanvasRenderingContext2D): void {
  const b = FG_R;
  smooth(ctx, [[60, b.h], [62, 40], [72, 30], [90, 28], [100, 38], [102, b.h]]);
  ctx.fillStyle = '#f2ead6';
  ctx.fill();
  ink(ctx, 2);
  smooth(ctx, [[62, 42], [64, 30], [81, 22], [98, 30], [100, 42]]);
  ctx.fillStyle = '#c8402f';
  ctx.fill();
  ink(ctx, 2);
  const r = rng(61);
  for (let i = 0; i < 26; i++) {
    const x = r() * b.w;
    const h = 26 + r() * 30;
    ctx.beginPath();
    ctx.moveTo(x - 3, b.h + 2);
    ctx.quadraticCurveTo(x + (r() - 0.5) * 10, b.h - h * 0.6, x + (r() - 0.5) * 18, b.h - h);
    ctx.quadraticCurveTo(x + 2, b.h - h * 0.5, x + 3, b.h + 2);
    ctx.fillStyle = r() < 0.5 ? '#355f2c' : '#467a37';
    ctx.fill();
    ink(ctx, 1.2);
  }
}

const KEYS = {
  sky: 'ct-brie-sky',
  hills: 'ct-brie-hills',
  road: 'ct-brie-road',
  fgL: 'ct-brie-fg-l',
  fgR: 'ct-brie-fg-r',
  cloud: 'ct-brie-cloud',
} as const;

/** The soft sky is drawn at half the texture scale (memory on phones). */
const skyK = (k: number): number => Math.max(1, k / 2);

export function loadArena(scene: Phaser.Scene, k: number): void {
  image(scene, KEYS.sky, W, H, skyK(k), drawSky);
  image(scene, KEYS.hills, W, HILLS.h, k, drawHills);
  image(scene, KEYS.road, W, ROAD.h, k, drawRoad);
  image(scene, KEYS.fgL, FG_L.w, FG_L.h, k, drawFgLeft);
  image(scene, KEYS.fgR, FG_R.w, FG_R.h, k, drawFgRight);
  for (let i = 0; i < 3; i++) image(scene, `${KEYS.cloud}${i}`, CLOUD.w, CLOUD.h, k, (ctx) => cloud(ctx, 8, 30, CLOUD.w - 16, 40, 70 + i));
}

/** Depths: sky -50, clouds -46, hills -40, road -30 (behind the action), foreground corners 20 (under the balloons). */
export function buildArena(scene: Phaser.Scene, k: number): Phaser.GameObjects.GameObject[] {
  const out: Phaser.GameObjects.GameObject[] = [worldSprite(scene, W / 2, H / 2, KEYS.sky, skyK(k)).setDepth(-50)];
  const r = rng(3);
  for (let i = 0; i < 3; i++) {
    const c = worldSprite(scene, 80 + i * 210 + r() * 40, 40 + r() * 50, `${KEYS.cloud}${i}`, k).setDepth(-46);
    scene.tweens.add({ targets: c, x: c.x + 30 + r() * 30, duration: 9000 + r() * 5000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    out.push(c);
  }
  out.push(worldSprite(scene, W / 2, HILLS.y + HILLS.h / 2, KEYS.hills, k).setDepth(-40));
  out.push(worldSprite(scene, W / 2, ROAD.y + ROAD.h / 2, KEYS.road, k).setDepth(-30));
  out.push(worldSprite(scene, FG_L.w / 2 - 10, H - FG_L.h / 2 + 30, KEYS.fgL, k).setDepth(20));
  out.push(worldSprite(scene, W - FG_R.w / 2 + 14, H - FG_R.h / 2 + 34, KEYS.fgR, k).setDepth(20));
  return out;
}
