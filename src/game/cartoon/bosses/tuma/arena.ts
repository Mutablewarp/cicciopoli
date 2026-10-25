/**
 * DON TUMA arena: a Sicilian terrace over the sea at noon. Far: sky, sun, hazy coast, sea with a sail.
 * Mid: balustrade with a Trinacria majolica plate, lemon and orange trees in terracotta pots (sway).
 * Near: majolica step under the floor line, prickly pear and an orange basket, the checkered awning.
 * Soft brown outlines and watercolour washes: calmer than the boss so the action reads.
 */
import type Phaser from 'phaser';
import { ARENA } from '../../api';
import { image, worldSprite } from '../../draw/canvas';
import { type Ctx, ell, letters, seeded, specks, wash } from './kit/toon';
import { checkerBand, citrus } from './props';

const SOFT = '#7a5a40';
const HORIZON = 196;
const RAIL = 232;
const TERRACE = 290;
const FY = ARENA.floorY;

function soft(ctx: Ctx, fill: string | CanvasGradient, w = 1.3): void {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = SOFT;
  ctx.lineWidth = w;
  ctx.stroke();
}

function sky(ctx: Ctx, r: () => number): void {
  const g = ctx.createLinearGradient(0, 0, 0, HORIZON);
  g.addColorStop(0, '#8cc8d4');
  g.addColorStop(0.65, '#cfe6dc');
  g.addColorStop(1, '#f6e4bc');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ARENA.w, HORIZON);
  ctx.save();
  ctx.fillStyle = '#fffaf0';
  for (let i = 0; i < 26; i++) {
    ctx.globalAlpha = 0.08 + r() * 0.1;
    ell(ctx, r() * ARENA.w, 20 + r() * 150, 20 + r() * 50, 3 + r() * 6);
    ctx.fill();
  }
  ctx.restore();
  const h = ctx.createRadialGradient(540, 70, 10, 540, 70, 130);
  h.addColorStop(0, 'rgba(255,248,214,0.9)');
  h.addColorStop(1, 'rgba(255,240,190,0)');
  ctx.fillStyle = h;
  ctx.fillRect(400, 0, 240, 200);
  ell(ctx, 540, 70, 30, 30);
  soft(ctx, '#fff2b8', 1.2);
}

function coast(ctx: Ctx, r: () => number): void {
  ctx.beginPath();
  ctx.moveTo(-10, HORIZON);
  ctx.lineTo(-10, 150);
  ctx.bezierCurveTo(30, 140, 50, 108, 90, 104);
  ctx.bezierCurveTo(140, 98, 190, 102, 214, 120);
  ctx.bezierCurveTo(236, 140, 250, 170, 290, HORIZON);
  ctx.closePath();
  soft(ctx, '#b9a9c6', 1);
  wash(ctx, r, 0, 104, 280, 90, '#a493b8', 26, 0.22);
  ctx.beginPath();
  ctx.moveTo(380, HORIZON);
  ctx.bezierCurveTo(440, 168, 520, 160, 650, 172);
  ctx.lineTo(650, HORIZON);
  ctx.closePath();
  soft(ctx, '#c8bccc', 1);
  for (let i = 0; i < 14; i++) {
    const x = 120 + r() * 150;
    ctx.fillStyle = r() < 0.7 ? '#f6eee0' : '#e6b48c';
    ctx.fillRect(x, HORIZON - 6 - r() * 8, 4 + r() * 4, 4);
  }
}

function sea(ctx: Ctx, r: () => number): void {
  const g = ctx.createLinearGradient(0, HORIZON, 0, RAIL);
  g.addColorStop(0, '#8fd0d0');
  g.addColorStop(1, '#3d93b0');
  ctx.fillStyle = g;
  ctx.fillRect(0, HORIZON, ARENA.w, RAIL - HORIZON + 4);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1.1;
  for (let i = 0; i < 40; i++) {
    const x = r() * ARENA.w;
    const y = HORIZON + 4 + r() * (RAIL - HORIZON - 6);
    const w = 4 + ((y - HORIZON) / (RAIL - HORIZON)) * 10;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + w / 2, y - 2, x + w, y);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,250,220,0.7)';
  for (let i = 0; i < 18; i++) {
    ctx.fillRect(470 + r() * 120, HORIZON + 2 + r() * 20, 3 + r() * 5, 1.2);
  }
}

function baluster(ctx: Ctx, x: number): void {
  ctx.beginPath();
  ctx.moveTo(x - 4, 242);
  ctx.bezierCurveTo(x - 9, 252, x - 2, 258, x - 6, 270);
  ctx.bezierCurveTo(x - 9, 278, x - 5, 282, x - 5, 284);
  ctx.lineTo(x + 5, 284);
  ctx.bezierCurveTo(x + 5, 282, x + 9, 278, x + 6, 270);
  ctx.bezierCurveTo(x + 2, 258, x + 9, 252, x + 4, 242);
  ctx.closePath();
  soft(ctx, '#f1e2c2', 1);
}

/** The Trinacria hint: a round majolica plate with a sun face and three bent legs. */
function trinacria(ctx: Ctx, x: number, y: number): void {
  ell(ctx, x, y, 17, 17);
  soft(ctx, '#2f6aa8', 1.2);
  ell(ctx, x, y, 13, 13);
  soft(ctx, '#f4e8c8', 1);
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 3;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * 5, y + Math.sin(a) * 5);
    ctx.lineTo(x + Math.cos(a) * 11, y + Math.sin(a) * 11);
    ctx.lineTo(x + Math.cos(a + 0.7) * 12, y + Math.sin(a + 0.7) * 12);
    ctx.strokeStyle = '#c8502c';
    ctx.lineWidth = 2.2;
    ctx.stroke();
  }
  ell(ctx, x, y, 5.5, 5.5);
  soft(ctx, '#f2b83a', 0.9);
  ctx.fillStyle = SOFT;
  ctx.fillRect(x - 2.5, y - 1.5, 1.2, 1.2);
  ctx.fillRect(x + 1.3, y - 1.5, 1.2, 1.2);
}

function balustrade(ctx: Ctx): void {
  ctx.fillStyle = '#e7d4ae';
  ctx.fillRect(0, 240, ARENA.w, 50);
  for (let x = 14; x < ARENA.w; x += 20) if (Math.abs(x - 314) > 26 && x < 600) baluster(ctx, x);
  ctx.fillStyle = 'rgba(60,40,20,0.12)';
  ctx.fillRect(0, 240, ARENA.w, 44);
  ctx.beginPath();
  ctx.rect(292, 236, 44, 54);
  soft(ctx, '#f0dfba');
  trinacria(ctx, 314, 262);
  ctx.beginPath();
  ctx.rect(-4, RAIL, ARENA.w + 8, 9);
  soft(ctx, '#d9825a');
  ctx.beginPath();
  ctx.rect(-4, 283, ARENA.w + 8, 7);
  soft(ctx, '#cf7a52');
}

function terrace(ctx: Ctx, r: () => number): void {
  const g = ctx.createLinearGradient(0, TERRACE, 0, FY);
  g.addColorStop(0, '#d48a60');
  g.addColorStop(1, '#e9a878');
  ctx.fillStyle = g;
  ctx.fillRect(0, TERRACE, ARENA.w, FY - TERRACE);
  ctx.strokeStyle = 'rgba(120,60,30,0.35)';
  ctx.lineWidth = 1;
  for (const y of [297, 305, 314]) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(ARENA.w, y);
    ctx.stroke();
  }
  for (let x = -200; x < ARENA.w + 200; x += 34) {
    ctx.beginPath();
    ctx.moveTo(320 + (x - 320) * 0.75, TERRACE);
    ctx.lineTo(x, FY);
    ctx.stroke();
  }
  wash(ctx, r, 0, TERRACE, ARENA.w, FY - TERRACE, '#f2b88a', 30, 0.18);
  ctx.fillStyle = '#f6c69a';
  ctx.fillRect(0, FY - 3, ARENA.w, 3);
  ctx.fillStyle = '#5a321e';
  ctx.fillRect(0, FY, ARENA.w, 2);
}

function majolica(ctx: Ctx): void {
  const s = 21;
  for (let x = 0; x < ARENA.w; x += s) {
    for (let y = FY + 2; y < ARENA.h; y += s) {
      ctx.fillStyle = '#efe2c2';
      ctx.fillRect(x, y, s, s);
      ctx.strokeStyle = '#2f6aa8';
      ctx.lineWidth = 1.4;
      ell(ctx, x + s / 2, y + s / 2, 6, 6);
      ctx.stroke();
      ctx.fillStyle = '#e8b83a';
      for (const [dx, dy] of [[0, 0], [s, 0], [0, s], [s, s]] as const) {
        ell(ctx, x + dx, y + dy, 4, 4);
        ctx.fill();
      }
      ctx.fillStyle = '#3a8a5a';
      ell(ctx, x + s / 2, y + s / 2, 2, 2);
      ctx.fill();
    }
  }
  const g = ctx.createLinearGradient(0, FY, 0, ARENA.h);
  g.addColorStop(0, 'rgba(70,35,20,0.5)');
  g.addColorStop(1, 'rgba(70,35,20,0.25)');
  ctx.fillStyle = g;
  ctx.fillRect(0, FY + 2, ARENA.w, ARENA.h - FY);
}

/** Far + mid static layer (one texture: the camera never moves). */
export function drawTumaBg(ctx: Ctx): void {
  const r = seeded(31);
  sky(ctx, r);
  coast(ctx, r);
  sea(ctx, r);
  balustrade(ctx);
  terrace(ctx, r);
  majolica(ctx);
  specks(ctx, r, ARENA.w, ARENA.h, 900);
}

/** Citrus tree in a terracotta pot (TREE.w x TREE.h, pot base on the bottom). frame 0 lemon, 1 orange. */
export const TREE = { w: 130, h: 190 } as const;
export function drawTree(ctx: Ctx, f: number): void {
  const r = seeded(7 + f);
  ctx.beginPath();
  ctx.moveTo(62, 140);
  ctx.bezierCurveTo(58, 110, 70, 96, 62, 70);
  ctx.lineTo(70, 70);
  ctx.bezierCurveTo(78, 96, 68, 112, 70, 140);
  ctx.closePath();
  soft(ctx, '#8a6040');
  ctx.beginPath();
  const n = 11;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 1) / n) * Math.PI * 2;
    const am = (a0 + a1) / 2;
    ctx.quadraticCurveTo(65 + Math.cos(am) * 62, 62 + Math.sin(am) * 50, 65 + Math.cos(a1) * 48, 62 + Math.sin(a1) * 38);
  }
  ctx.closePath();
  soft(ctx, '#5f9a4a', 1.4);
  wash(ctx, r, 24, 24, 80, 50, '#8cc068', 16, 0.45);
  wash(ctx, r, 30, 66, 70, 30, '#3e7a3a', 8, 0.3);
  for (let i = 0; i < 10; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r());
    citrus(ctx, 65 + Math.cos(a) * d * 44, 62 + Math.sin(a) * d * 32, 5.5, f ? 'orange' : 'lemon');
  }
  ctx.beginPath();
  ctx.moveTo(34, 140);
  ctx.lineTo(96, 140);
  ctx.lineTo(88, 188);
  ctx.lineTo(42, 188);
  ctx.closePath();
  soft(ctx, '#c86a40');
  ctx.beginPath();
  ctx.rect(30, 134, 70, 10);
  soft(ctx, '#d9824e');
  ctx.fillStyle = '#2f6aa8';
  ctx.fillRect(40, 158, 50, 4);
}

/** Drifting cloud (CLOUD.w x CLOUD.h). */
export const CLOUD = { w: 130, h: 54 } as const;
export function drawCloud(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(10, 46);
  ctx.bezierCurveTo(0, 30, 20, 20, 34, 26);
  ctx.bezierCurveTo(38, 6, 70, 2, 80, 20);
  ctx.bezierCurveTo(96, 8, 124, 20, 116, 38);
  ctx.bezierCurveTo(128, 44, 120, 50, 110, 48);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 4, 0, 50);
  g.addColorStop(0, '#fffaf0');
  g.addColorStop(1, '#f0dcc0');
  soft(ctx, g, 1.2);
}

/** Sailboat on the sea (BOAT.w x BOAT.h). */
export const BOAT = { w: 30, h: 30 } as const;
export function drawBoat(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(15, 3);
  ctx.lineTo(15, 22);
  ctx.lineTo(26, 22);
  ctx.closePath();
  soft(ctx, '#fff8ea', 1);
  ctx.beginPath();
  ctx.moveTo(4, 23);
  ctx.lineTo(27, 23);
  ctx.lineTo(23, 28);
  ctx.lineTo(8, 28);
  ctx.closePath();
  soft(ctx, '#c8502c', 1);
}

/** Foreground: the checkered awning along the top (AWNING.w x AWNING.h). */
export const AWNING = { w: ARENA.w, h: 34 } as const;
export function drawAwning(ctx: Ctx): void {
  ctx.fillStyle = '#7a4a2a';
  ctx.fillRect(0, 0, AWNING.w, 5);
  checkerBand(ctx, [[-10, 15], [200, 15], [440, 15], [AWNING.w + 10, 15]], 20);
  for (let x = 0; x < AWNING.w; x += 32) {
    ctx.beginPath();
    ctx.arc(x + 16, 24, 16, 0, Math.PI);
    ctx.fillStyle = (x / 32) % 2 ? '#e2483c' : '#fffaf0';
    ctx.fill();
    ctx.strokeStyle = '#3a2418';
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
}

/** Corner props: prickly pear (frame 0, foreground) and an orange basket (frame 1, on the terrace). */
export const CORNER = { w: 110, h: 80 } as const;
export function drawCorner(ctx: Ctx, f: number): void {
  if (f === 0) {
    for (const [x, y, rx, ry, a] of [[40, 62, 20, 24, -0.2], [64, 40, 16, 20, 0.4], [22, 34, 14, 18, -0.6], [50, 18, 11, 14, 0.2]] as const) {
      ell(ctx, x, y, rx, ry, a);
      soft(ctx, '#4f7f46', 1.6);
      ctx.fillStyle = '#e8584a';
      ell(ctx, x + rx * 0.5, y - ry * 0.8, 3.5, 4);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,240,200,0.6)';
      for (let i = 0; i < 4; i++) ctx.fillRect(x - rx * 0.5 + i * rx * 0.3, y - 2 + (i % 2) * 6, 1.2, 1.2);
    }
    return;
  }
  for (let i = 0; i < 6; i++) citrus(ctx, 26 + (i % 3) * 24 + (i > 2 ? 12 : 0), i > 2 ? 30 : 40, 9, i === 4 ? 'lemon' : 'orange');
  ctx.beginPath();
  ctx.moveTo(10, 42);
  ctx.lineTo(100, 42);
  ctx.lineTo(90, 78);
  ctx.lineTo(20, 78);
  ctx.closePath();
  soft(ctx, '#b88a50', 1.6);
  ctx.strokeStyle = 'rgba(90,60,30,0.6)';
  for (let y = 48; y < 78; y += 7) {
    ctx.beginPath();
    ctx.moveTo(14, y);
    ctx.lineTo(96, y);
    ctx.stroke();
  }
  letters(ctx, '100% TUMA', 55, 60, 9, '#fffaf0', -0.04, '#a32820');
}

/** A looping yoyo tween that dies with its target (the core destroys the arena between rounds). */
export function loop<T extends Phaser.GameObjects.GameObject>(scene: Phaser.Scene, target: T, props: Omit<Phaser.Types.Tweens.TweenBuilderConfig, 'targets'>): T {
  const tw = scene.tweens.add({ ...props, targets: target, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  target.once('destroy', () => tw.remove());
  return target;
}

/** Register the arena textures (prefix `pre`). */
export function loadTumaArena(scene: Phaser.Scene, pre: string, k: number): void {
  image(scene, `${pre}bg`, ARENA.w, ARENA.h, k, drawTumaBg);
  for (const f of [0, 1]) image(scene, `${pre}tree${f}`, TREE.w, TREE.h, k, (c) => drawTree(c, f));
  image(scene, `${pre}cloud`, CLOUD.w, CLOUD.h, k, drawCloud);
  image(scene, `${pre}boat`, BOAT.w, BOAT.h, k, drawBoat);
  image(scene, `${pre}awning`, AWNING.w, AWNING.h, k, drawAwning);
  for (const f of [0, 1]) image(scene, `${pre}corner${f}`, CORNER.w, CORNER.h, k, (c) => drawCorner(c, f));
}

/** Foreground props: over the fight (core hazards 14, fx 16, rain 18), under balloons 30 / title 40. */
export const FG_DEPTH = 20;

export function buildTumaArena(scene: Phaser.Scene, pre: string, k: number): Phaser.GameObjects.GameObject[] {
  const bg = worldSprite(scene, ARENA.w / 2, ARENA.h / 2, `${pre}bg`, k).setDepth(-20);
  const clouds = [[90, 46, 0.8], [330, 28, 0.6], [470, 92, 0.7]].map(([x, y, s], i) => {
    const c = worldSprite(scene, x, y, `${pre}cloud`, k).setDepth(-19).setScale(s / k).setAlpha(0.92);
    return loop(scene, c, { x: x + 60, duration: 26000 + i * 7000 });
  });
  const boat = loop(scene, worldSprite(scene, 430, 206, `${pre}boat`, k).setDepth(-19), { angle: { from: -4, to: 4 }, x: 470, duration: 3200 });
  const trees = [[66, 0, 1], [612, 1, -1]].map(([x, f, flip]) => {
    const t = worldSprite(scene, x, 302, `${pre}tree${f}`, k).setOrigin(0.5, 1).setDepth(-15).setScale(flip / k, 1 / k);
    return loop(scene, t, { angle: { from: -1.6, to: 1.6 }, duration: 2400 + f * 500 });
  });
  const basket = worldSprite(scene, 236, 266, `${pre}corner1`, k).setDepth(-15).setScale(0.8 / k);
  const awning = worldSprite(scene, ARENA.w / 2, AWNING.h / 2, `${pre}awning`, k).setDepth(FG_DEPTH);
  const cactus = worldSprite(scene, 26, ARENA.h - 30, `${pre}corner0`, k).setDepth(FG_DEPTH);
  return [bg, ...clouds, boat, ...trees, basket, awning, cactus];
}
