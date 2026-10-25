/**
 * HAPPY BOX arena: a Palermo back alley at sunset. Far: peach sky, rooftops with a dome. Mid: a brick wall
 * with the big MAKE IT HAPPY graffiti and a CICCIO'S tag, paint drips, a gutter (the drips fall from it),
 * a door with a lamp, a fire escape, paint cans. Near: laundry across the alley, a hydrant. Floor: the
 * pavement edge at ARENA.floorY. Soft brown outlines and washes: calmer than the boss.
 */
import type Phaser from 'phaser';
import { ARENA } from '../../api';
import { image, worldSprite } from '../../draw/canvas';
import { CLOUD, drawCloud, loop } from '../tuma/arena';
import { type Ctx, WHITE, ell, letters, seeded, specks, wash } from '../tuma/kit/toon';

const SOFT = '#5a3a2a';
const ROOF = 64;
const GUTTER = 42;
const WALK = 298;
const FY = ARENA.floorY;

function soft(ctx: Ctx, fill: string | CanvasGradient, w = 1.3): void {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = SOFT;
  ctx.lineWidth = w;
  ctx.stroke();
}

function sky(ctx: Ctx, r: () => number): void {
  const g = ctx.createLinearGradient(0, 0, 0, ROOF + 20);
  g.addColorStop(0, '#b7a6d6');
  g.addColorStop(0.6, '#f3b994');
  g.addColorStop(1, '#ffd9a0');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ARENA.w, ROOF + 20);
  ctx.fillStyle = '#9d86b8';
  ctx.beginPath();
  ctx.moveTo(0, ROOF + 20);
  for (const [x, y] of [[0, 44], [60, 44], [60, 30], [130, 30], [130, 50], [210, 50], [214, 36], [290, 36], [300, 50], [400, 50], [400, 26], [470, 26], [470, 46], [640, 46], [640, 84]] as const) ctx.lineTo(x, y);
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
  wash(ctx, r, 0, 0, ARENA.w, 40, '#fff0d8', 14, 0.18);
}

function wall(ctx: Ctx, r: () => number): void {
  const g = ctx.createLinearGradient(0, GUTTER, 0, WALK);
  g.addColorStop(0, '#b98472');
  g.addColorStop(1, '#9c6a5a');
  ctx.fillStyle = g;
  ctx.fillRect(0, GUTTER, ARENA.w, WALK - GUTTER);
  ctx.strokeStyle = 'rgba(80,35,25,0.35)';
  ctx.lineWidth = 1;
  for (let y = GUTTER + 10, row = 0; y < WALK; y += 11, row++) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(ARENA.w, y);
    for (let x = (row % 2) * 13; x < ARENA.w; x += 26) {
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - 11);
    }
    ctx.stroke();
  }
  wash(ctx, r, 0, GUTTER, ARENA.w, WALK - GUTTER, '#d4a088', 40, 0.18);
  wash(ctx, r, 0, GUTTER, ARENA.w, WALK - GUTTER, '#7a3c30', 24, 0.12);
  ctx.beginPath();
  ctx.rect(-4, GUTTER - 6, ARENA.w + 8, 9);
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

function graffiti(ctx: Ctx, r: () => number): void {
  ctx.save();
  ctx.globalAlpha = 0.88;
  ctx.beginPath();
  ctx.rect(150, 86, 74, 18);
  soft(ctx, WHITE, 1.4);
  letters(ctx, "CICCIO'S", 187, 95, 12, WHITE, 0, '#2a1d16');
  letters(ctx, 'MAKE IT', 214, 130, 40, WHITE, -0.05, '#2a1d16');
  drips(ctx, 140, 148, 150, WHITE, r);
  ctx.save();
  ctx.font = 'italic 900 52px "Arial Black", "Helvetica Neue", Impact, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.translate(250, 182);
  ctx.rotate(-0.08);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = WHITE;
  ctx.lineWidth = 12;
  ctx.strokeText('HAPPY', 0, 0);
  ctx.strokeStyle = '#2a1d16';
  ctx.lineWidth = 5;
  ctx.strokeText('HAPPY', 0, 0);
  ctx.fillStyle = '#e8288c';
  ctx.fillText('HAPPY', 0, 0);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(196, 214);
  ctx.bezierCurveTo(250, 226, 320, 214, 352, 194);
  ctx.strokeStyle = '#e8288c';
  ctx.lineWidth = 4;
  ctx.stroke();
  drips(ctx, 180, 204, 160, '#e8288c', r);
  ell(ctx, 80, 132, 20, 20);
  soft(ctx, '#f6d23c', 1.6);
  for (const x of [73, 87]) {
    ell(ctx, x, 127, 2.4, 3.4);
    ctx.fillStyle = SOFT;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(80, 134, 10, 0.3, Math.PI - 0.3);
  ctx.strokeStyle = SOFT;
  ctx.lineWidth = 2;
  ctx.stroke();
  drips(ctx, 66, 150, 28, '#f6d23c', r);
  ctx.beginPath();
  ctx.moveTo(392, 120);
  for (const [x, y] of [[402, 98], [412, 114], [424, 92], [434, 114], [446, 98], [454, 120]] as const) ctx.lineTo(x, y);
  ctx.closePath();
  soft(ctx, '#4fd1a8', 1.6);
  letters(ctx, 'AMUNÌ', 424, 140, 13, '#4fd1a8', 0.06, '#2a1d16');
  letters(ctx, '★', 110, 240, 22, '#ff9a3c', 0.2, '#2a1d16');
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
    ctx.lineTo(640, y);
    ctx.stroke();
  }
  for (let x = 506; x < 640; x += 14) {
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
  ctx.fillRect(0, WALK, ARENA.w, FY - WALK);
  ctx.strokeStyle = 'rgba(70,60,50,0.35)';
  ctx.lineWidth = 1;
  for (let x = 0; x < ARENA.w; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x + 6, WALK);
    ctx.lineTo(x, FY);
    ctx.stroke();
  }
  wash(ctx, r, 0, WALK, ARENA.w, FY - WALK, '#a89c8e', 20, 0.25);
  ctx.fillStyle = '#e9e2d6';
  ctx.fillRect(0, FY - 3, ARENA.w, 3);
  ctx.fillStyle = '#3a2c24';
  ctx.fillRect(0, FY, ARENA.w, 2);
  const g = ctx.createLinearGradient(0, FY, 0, ARENA.h);
  g.addColorStop(0, '#6e655e');
  g.addColorStop(1, '#4a423c');
  ctx.fillStyle = g;
  ctx.fillRect(0, FY + 2, ARENA.w, ARENA.h - FY);
  ctx.fillStyle = 'rgba(246,210,60,0.55)';
  for (let x = 10; x < ARENA.w; x += 60) ctx.fillRect(x, 344, 30, 4);
}

/** Far + mid static layer. */
export function drawHappyBg(ctx: Ctx): void {
  const r = seeded(77);
  sky(ctx, r);
  wall(ctx, r);
  graffiti(ctx, r);
  door(ctx);
  pavement(ctx, r);
  specks(ctx, r, ARENA.w, ARENA.h, 900);
}

/** Laundry line across the alley (LAUNDRY, foreground, sways). */
export const LAUNDRY = { w: 360, h: 60 } as const;
export function drawLaundry(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.quadraticCurveTo(180, 26, 360, 6);
  ctx.strokeStyle = '#3a2c24';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  for (const [x, w, h, c] of [[40, 30, 34, '#f3ead8'], [96, 22, 26, '#e2483c'], [150, 36, 30, '#7cc6f2'], [214, 24, 40, '#f6d23c'], [270, 30, 28, '#f3ead8']] as const) {
    const y = 6 + 20 * (1 - ((x + w / 2 - 180) / 180) ** 2) - 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w - 2, y + h);
    ctx.lineTo(x + 2, y + h);
    ctx.closePath();
    soft(ctx, c, 1.2);
    ctx.fillStyle = '#8a6a4a';
    ctx.fillRect(x + 3, y - 2, 3, 5);
    ctx.fillRect(x + w - 6, y - 2, 3, 5);
  }
}

/** Mid props: a stack of paint cans (frame 0) and a hydrant (frame 1, foreground). */
export const PROP = { w: 70, h: 60 } as const;
export function drawProp(ctx: Ctx, f: number): void {
  if (f === 0) {
    for (const [x, y, c] of [[16, 46, '#4fd1a8'], [40, 46, '#f6d23c'], [28, 24, '#ff9a3c']] as const) {
      ctx.beginPath();
      ctx.rect(x - 10, y - 10, 20, 22);
      soft(ctx, '#c9ccd2');
      ctx.fillStyle = c;
      ctx.fillRect(x - 10, y - 4, 20, 9);
      ctx.fillRect(x - 3, y - 10, 5, 8);
    }
    return;
  }
  ctx.beginPath();
  ctx.roundRect(24, 18, 22, 40, 4);
  soft(ctx, '#d0453a', 1.6);
  ell(ctx, 35, 18, 12, 6);
  soft(ctx, '#e0584a', 1.6);
  ctx.beginPath();
  ctx.rect(16, 30, 38, 8);
  soft(ctx, '#b83a30', 1.4);
}

/** Register the arena textures (prefix `pre`). */
export function loadHappyArena(scene: Phaser.Scene, pre: string, k: number): void {
  image(scene, `${pre}bg`, ARENA.w, ARENA.h, k, drawHappyBg);
  image(scene, `${pre}cloud`, CLOUD.w, CLOUD.h, k, drawCloud);
  image(scene, `${pre}laundry`, LAUNDRY.w, LAUNDRY.h, k, drawLaundry);
  for (const f of [0, 1]) image(scene, `${pre}prop${f}`, PROP.w, PROP.h, k, (c) => drawProp(c, f));
}

/** Foreground props: over the fight (core hazards 14, fx 16, rain 18), under balloons 30 / title 40. */
export const FG_DEPTH = 20;

export function buildHappyArena(scene: Phaser.Scene, pre: string, k: number): Phaser.GameObjects.GameObject[] {
  const bg = worldSprite(scene, ARENA.w / 2, ARENA.h / 2, `${pre}bg`, k).setDepth(-20);
  const clouds = [[120, 10, 0.5], [450, 4, 0.4]].map(([x, y, s], i) => {
    const c = worldSprite(scene, x, y, `${pre}cloud`, k).setDepth(-19).setScale(s / k).setAlpha(0.85);
    return loop(scene, c, { x: x + 50, duration: 24000 + i * 6000 });
  });
  const cans = worldSprite(scene, 600, WALK - 6, `${pre}prop0`, k).setOrigin(0.5, 1).setDepth(-15);
  const laundry = worldSprite(scene, 170, 6, `${pre}laundry`, k).setOrigin(0.5, 0).setDepth(FG_DEPTH);
  loop(scene, laundry, { angle: { from: -1.2, to: 1.2 }, duration: 2600 });
  const hydrant = worldSprite(scene, 22, ARENA.h - 28, `${pre}prop1`, k).setDepth(FG_DEPTH);
  return [bg, ...clouds, cans, laundry, hydrant];
}
