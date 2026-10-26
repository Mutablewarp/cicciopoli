/**
 * Monsieur Brie's arena, after the shirt's own landscape: the olive-green hill with the winding white road
 * climbing to the red-roof houses and the round bushes, inked like the print, in front of softer rolling
 * hills and a summer sky; the verge, the fence and the dirt road he rides on (the floor, ARENA.floorY).
 * Every layer is full bleed (kit/scenery.ts): the camera never finds an edge.
 */
import type Phaser from 'phaser';
import { ARENA } from '../../api';
import { image, worldSprite } from '../../draw/canvas';
import { rng } from './kit/paths';
import { BOTTOM, TOP, X0, X1, SPAN, fillPts, layer, placeLayer, ridge } from './kit/scenery';
import { cloud, ellipse, ink, shade, smooth, type Pt } from './kit/toon';
import { SHIRT } from './art';

const W = ARENA.w;
const H = ARENA.h;
const SKY = { y0: TOP, y1: 250 } as const;
const HILLS = { y0: 110, y1: 312 } as const;
const ROAD = { y0: 282, y1: BOTTOM } as const;
/** the shirt's colours for the landscape: its olive hill, the bushes, the roofs */
const OLIVE = '#9ba64f';
const BUSH = '#7f9a3f';
const ROOF = '#d6453a';
const SOFT = '#6b5636';

function drawSky(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, TOP, 0, 230);
  g.addColorStop(0, '#86c0d9');
  g.addColorStop(0.6, '#cfe5da');
  g.addColorStop(1, '#f5e8c6');
  ctx.fillStyle = g;
  ctx.fillRect(X0, TOP, SPAN, SKY.y1 - TOP);
  const sun = ctx.createRadialGradient(120, 40, 4, 120, 40, 170);
  sun.addColorStop(0, 'rgba(255,249,224,0.85)');
  sun.addColorStop(1, 'rgba(255,249,224,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(X0, TOP, SPAN, SKY.y1 - TOP);
  fillPts(ctx, ridge(196, 26, 3, SKY.y1 + 10), '#b9cdbb', 31, 160);
  fillPts(ctx, ridge(214, 18, 7, SKY.y1 + 10, 55), '#a3c09f', 32, 180);
}

/** A farmhouse as printed: white walls, red roof, dark door and window, all inked. */
function house(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.rect(-13, -13, 26, 14);
  ctx.fillStyle = SHIRT.white;
  ctx.fill();
  ink(ctx, 1.6);
  ctx.beginPath();
  ctx.moveTo(-17, -12);
  ctx.lineTo(-9, -23);
  ctx.lineTo(11, -23);
  ctx.lineTo(17, -12);
  ctx.closePath();
  ctx.fillStyle = ROOF;
  ctx.fill();
  ink(ctx, 1.6);
  ctx.fillStyle = SHIRT.ink;
  ctx.fillRect(-8, -8, 5, 5);
  ctx.fillRect(3, -9, 4, 10);
  ctx.restore();
}

/** Round scalloped bush (the shirt's clumps). */
function bush(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color = BUSH): void {
  const pts: Pt[] = [];
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI + (i / 10) * Math.PI;
    const rr = r * (i % 2 ? 1 : 0.86);
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.9]);
  }
  pts.push([x + r, y + r * 0.2], [x - r, y + r * 0.2]);
  smooth(ctx, pts);
  ctx.fillStyle = color;
  ctx.fill();
  ink(ctx, 1.5);
}

/** Catmull-Rom samples through `pts` (n per span). */
function spline(pts: readonly Pt[], n: number): Pt[] {
  const out: Pt[] = [];
  const at = (i: number): Pt => pts[Math.max(0, Math.min(pts.length - 1, i))] ?? [0, 0];
  for (let i = 0; i < pts.length - 1; i++)
    for (let j = 0; j < n; j++) {
      const t = j / n;
      const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
      const f = (k: 0 | 1): number =>
        0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t * t * t);
      out.push([f(0), f(1)]);
    }
  out.push(at(pts.length - 1));
  return out;
}

/** The winding road of the shirt: a white ribbon with inked edges, narrowing as it climbs to the houses. */
function windingRoad(ctx: CanvasRenderingContext2D): void {
  const c = spline([[262, 318], [200, 288], [128, 256], [104, 226], [126, 198], [162, 180], [178, 168]], 8);
  const left: Pt[] = [];
  const right: Pt[] = [];
  c.forEach((p, i) => {
    const q = c[Math.min(c.length - 1, i + 1)] ?? p;
    const o = c[Math.max(0, i - 1)] ?? p;
    const dx = q[0] - o[0];
    const dy = q[1] - o[1];
    const d = Math.hypot(dx, dy) || 1;
    const w = 13 - (i / (c.length - 1)) * 10;
    left.push([p[0] - (dy / d) * w, p[1] + (dx / d) * w]);
    right.push([p[0] + (dy / d) * w, p[1] - (dx / d) * w]);
  });
  const line = (pts: readonly Pt[]): void => {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  };
  line([...left, ...right.reverse()]);
  ctx.closePath();
  ctx.fillStyle = SHIRT.white;
  ctx.fill();
  for (const edge of [left, right]) {
    line(edge);
    ink(ctx, 1.8);
  }
}

function drawHills(ctx: CanvasRenderingContext2D): void {
  // the far rolling hills on the right, trees and hedgerows
  fillPts(ctx, [[250, 330], [330, 214], [460, 188], [600, 182], [X1 + 20, 198], [X1 + 20, 330]], '#97c466', 42, 170);
  const r = rng(9);
  for (const [x, y, rr] of [[452, 192, 10], [520, 184, 12], [600, 194, 8], [690, 200, 10]] as const) {
    ctx.fillStyle = '#7a5634';
    ctx.fillRect(x - 1.5, y - rr * 0.4, 3, rr * 0.6);
    bush(ctx, x, y - rr * 0.6, rr, '#6fa04b');
  }
  for (const [x, y] of [[372, 234], [404, 240], [560, 226]] as const) {
    smooth(ctx, [[x - 12, y], [x - 9, y - 12], [x, y - 17], [x + 9, y - 12], [x + 12, y]]);
    ctx.fillStyle = '#e4bd5c';
    ctx.fill();
    ctx.strokeStyle = SOFT;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // the shirt's hill: olive, inked, the road climbing to the two red-roof houses between round bushes
  smooth(ctx, [[X0 - 20, 330], [X0 - 20, 176], [20, 160], [110, 148], [196, 154], [276, 178], [346, 228], [372, 330]]);
  ctx.fillStyle = OLIVE;
  ctx.fill();
  ink(ctx, 2.2);
  windingRoad(ctx);
  for (const [x, y, s] of [[96, 150, 1], [170, 152, 0.95], [-40, 166, 0.9]] as const) house(ctx, x, y, s);
  for (const [x, y, rr] of [[66, 152, 11], [124, 150, 9], [200, 156, 12], [-70, 170, 10], [10, 160, 8]] as const) bush(ctx, x, y, rr);
  for (const [x, y, rr] of [[300, 236, 16], [326, 254, 13], [-60, 250, 14]] as const) bush(ctx, x, y, rr);
  // hedgerows along the bottom of the hills
  for (let i = 0; i < 34; i++) {
    const x = X0 + i * 26 + r() * 10;
    const y = 262 + Math.sin(i * 0.7) * 6 + r() * 5;
    ellipse(ctx, x, y, 11 + r() * 6, 5 + r() * 2);
    ctx.fillStyle = r() < 0.5 ? '#5f8f42' : '#6b9a48';
    ctx.fill();
  }
  fillPts(ctx, [[X0 - 20, 330], [X0 - 20, 272], [160, 266], [360, 274], [520, 268], [X1 + 20, 272], [X1 + 20, 330]], '#89b95a', 43, 262);
}

/** Verge, fence and the dirt road the fight happens on, down past the bottom of the arena. */
function drawRoad(ctx: CanvasRenderingContext2D): void {
  const top = ROAD.y0 + 22;
  ctx.fillStyle = '#7fae4f';
  ctx.fillRect(X0, ROAD.y0, SPAN, top - ROAD.y0 + 4);
  for (let x = X0 + 12; x < X1; x += 74) {
    ctx.beginPath();
    ctx.rect(x, ROAD.y0, 5, 22);
    ctx.fillStyle = '#9a7048';
    ctx.fill();
    ctx.strokeStyle = SOFT;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.fillStyle = '#a57b52';
  ctx.fillRect(X0, ROAD.y0 + 5, SPAN, 3);
  ctx.fillRect(X0, ROAD.y0 + 13, SPAN, 3);
  const r = rng(52);
  ctx.strokeStyle = '#5f8f3a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < 120; i++) {
    const x = X0 + r() * SPAN;
    ctx.moveTo(x, top + 2);
    ctx.lineTo(x + (r() - 0.5) * 5, top - 4 - r() * 6);
  }
  ctx.stroke();
  const g = ctx.createLinearGradient(0, top, 0, BOTTOM);
  g.addColorStop(0, '#e4c690');
  g.addColorStop(1, '#c49656');
  smooth(ctx, [[X0 - 10, top + 2], [160, top - 1], [330, top + 2], [500, top], [X1 + 10, top + 1], [X1 + 10, BOTTOM + 4], [X0 - 10, BOTTOM + 4]]);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#8b6a3e';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = '#a77d45';
  ctx.lineWidth = 2;
  for (const y of [ROAD.y0 + 48, ROAD.y0 + 64, ROAD.y0 + 100]) {
    ctx.beginPath();
    ctx.moveTo(X0, y);
    for (let x = X0; x <= X1; x += 40) ctx.lineTo(x, y + Math.sin(x / 70 + y) * 2);
    ctx.stroke();
  }
  ctx.restore();
  for (let i = 0; i < 110; i++) {
    ellipse(ctx, X0 + r() * SPAN, top + 10 + r() * (BOTTOM - top - 10), 0.8 + r() * 1.6, 0.6 + r());
    ctx.fillStyle = r() < 0.5 ? '#b38a52' : '#f1dcae';
    ctx.fill();
  }
}

const FG = { w: 200, h: 70 } as const;
const CLOUD = { w: 140, h: 80 } as const;

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

/** A low corner of bushes with poppies and daisies (mirrored for the right corner). */
function drawFg(ctx: CanvasRenderingContext2D): void {
  smooth(ctx, [[0, FG.h + 2], [0, 28], [30, 14], [62, 22], [96, 10], [132, 24], [164, 36], [200, 60], [200, FG.h + 2]]);
  ctx.fillStyle = '#3d6b33';
  ctx.fill();
  ink(ctx, 2);
  for (const [x, y, rx] of [[30, 28, 14], [90, 22, 16], [140, 36, 12]] as const) {
    ellipse(ctx, x, y, rx, rx * 0.5);
    ctx.fillStyle = shade('#3d6b33', 0.18);
    ctx.fill();
  }
  for (const [x, y] of [[24, 20], [76, 16], [116, 28], [160, 42]] as const) flower(ctx, x, y, '#d8402f', '#2a1a12');
  for (const [x, y] of [[50, 26], [100, 32], [140, 32]] as const) flower(ctx, x, y, '#fbf6ea', '#f0c030');
}

const KEYS = {
  sky: 'ct-brie-sky',
  hills: 'ct-brie-hills',
  road: 'ct-brie-road',
  fg: 'ct-brie-fg',
  cloud: 'ct-brie-cloud',
} as const;

/** The soft sky is drawn at half the texture scale (memory on phones). */
const skyK = (k: number): number => Math.max(1, k / 2);

export function loadArena(scene: Phaser.Scene, k: number): void {
  layer(scene, KEYS.sky, SKY.y0, SKY.y1, skyK(k), drawSky);
  layer(scene, KEYS.hills, HILLS.y0, HILLS.y1, k, drawHills);
  layer(scene, KEYS.road, ROAD.y0, ROAD.y1, k, drawRoad);
  image(scene, KEYS.fg, FG.w, FG.h, k, drawFg);
  for (let i = 0; i < 4; i++) image(scene, `${KEYS.cloud}${i}`, CLOUD.w, CLOUD.h, k, (ctx) => cloud(ctx, 8, 30, CLOUD.w - 16, 40, 70 + i));
}

/** Depths: sky -50, clouds -46, hills -40, road -30 (behind the action), foreground corners 20 (under the balloons). */
export function buildArena(scene: Phaser.Scene, k: number): Phaser.GameObjects.GameObject[] {
  const out: Phaser.GameObjects.GameObject[] = [placeLayer(scene, KEYS.sky, SKY.y0, SKY.y1, skyK(k), -50)];
  const r = rng(3);
  for (let i = 0; i < 4; i++) {
    const c = worldSprite(scene, X0 + 60 + i * 230 + r() * 40, 10 + r() * 60, `${KEYS.cloud}${i}`, k).setDepth(-46);
    scene.tweens.add({ targets: c, x: c.x + 30 + r() * 30, duration: 9000 + r() * 5000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    out.push(c);
  }
  out.push(placeLayer(scene, KEYS.hills, HILLS.y0, HILLS.y1, k, -40));
  out.push(placeLayer(scene, KEYS.road, ROAD.y0, ROAD.y1, k, -30));
  out.push(worldSprite(scene, X0 + FG.w / 2 + 30, H - FG.h / 2 + 40, KEYS.fg, k).setDepth(20));
  out.push(worldSprite(scene, W - X0 - FG.w / 2 - 30, H - FG.h / 2 + 44, KEYS.fg, k).setDepth(20).setFlipX(true));
  return out;
}
