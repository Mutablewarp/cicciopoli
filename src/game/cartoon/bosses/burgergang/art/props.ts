/**
 * Burger Gang projectiles, minions and floor marks: soda bubbles (pink = parryable), the flying heart
 * shades, soda cans, fizz geysers, drops, the stomp shockwave, chimney bricks, the gang (mini burgers,
 * fries boxes), puddles / shadows and the knockout stars. Drawn at k, shown at 1 / k.
 */
import type Phaser from 'phaser';
import { INK, LINE, anim, image, inked, sheet } from '../../../draw/canvas';
import { COL, PRE } from '../config';
import { TAU, can, ellipse, glove, pieEye, shades, smooth, sneaker } from './parts';

export const TEX = {
  bubble: `${PRE}bubble`,
  shades: `${PRE}shades`,
  can: `${PRE}can`,
  geyser: `${PRE}geyser`,
  burst: `${PRE}burst`,
  drop: `${PRE}drop`,
  wave: `${PRE}wave`,
  brick: `${PRE}brick`,
  burger: `${PRE}burger`,
  fries: `${PRE}fries`,
  mark: `${PRE}mark`,
  shadow: `${PRE}shadow`,
  star: `${PRE}star`,
} as const;
export const ANIM = {
  bubble: `${PRE}bubble-a`,
  bubblePink: `${PRE}bubble-pink-a`,
  geyser: `${PRE}geyser-a`,
  burst: `${PRE}burst-a`,
  wave: `${PRE}wave-a`,
  burger: `${PRE}burger-a`,
  fries: `${PRE}fries-a`,
  puddle: `${PRE}puddle-a`,
} as const;

/** Pink things get a soft pink halo so they read as parryable at a glance. */
function halo(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  const g = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 1.35);
  g.addColorStop(0, 'rgba(255,105,173,0.55)');
  g.addColorStop(1, 'rgba(255,105,173,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r * 1.4, y - r * 1.4, r * 2.8, r * 2.8);
}

/** Soda bubble: see-through body, bright rim, white crescent glint, a tiny inner bubble. */
function bubble(ctx: CanvasRenderingContext2D, f: number): void {
  const pink = f >= 2;
  const sq = f % 2 ? 1.08 : 0.94;
  if (pink) halo(ctx, 14, 14, 12);
  ellipse(ctx, 14, 14, 11 * sq, 11 / sq);
  const g = ctx.createRadialGradient(13, 13, 2, 14, 14, 11.5);
  g.addColorStop(0, pink ? 'rgba(255,200,226,0.8)' : 'rgba(255,246,222,0.75)');
  g.addColorStop(0.7, pink ? 'rgba(255,130,188,0.95)' : 'rgba(255,226,170,0.92)');
  g.addColorStop(1, pink ? COL.pink : '#f2b866');
  inked(ctx, g, LINE * 0.9);
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(14, 14, 7.5 * sq, 7.5 / sq, 0, Math.PI * 1.05, Math.PI * 1.55);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ellipse(ctx, 18.5, 18.5, 1.6, 1.6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(28,21,17,0.5)';
  ctx.lineWidth = 0.7;
  ellipse(ctx, 10, 18, 1.8, 1.8);
  ctx.stroke();
}

/** Cola jet: caramel core, white foam crown and base splash, rising bubbles. */
function geyser(ctx: CanvasRenderingContext2D, w: number, h: number, f: number): void {
  const cx = w / 2;
  const wob = (f - 1) * 1.5;
  smooth(ctx, [[cx - w * 0.2, h], [cx - w * 0.17 + wob, h * 0.55], [cx - w * 0.22, 16], [cx + w * 0.22, 16], [cx + w * 0.17 - wob, h * 0.55], [cx + w * 0.2, h]]);
  const g = ctx.createLinearGradient(cx - w * 0.2, 0, cx + w * 0.2, 0);
  g.addColorStop(0, '#e0a060');
  g.addColorStop(0.45, '#b9692d');
  g.addColorStop(1, '#6e3714');
  inked(ctx, g, LINE);
  ctx.fillStyle = 'rgba(255,240,210,0.55)';
  ctx.fillRect(cx - w * 0.1, 22, 2.2, h - 30);
  const foam = (y: number, r: number): void => {
    const puffs = [[-0.62, 0.2, 0.55], [0.62, 0.25, 0.55], [-0.3, -0.25, 0.7], [0.32, -0.2, 0.68], [0, 0.1, 0.8]] as const;
    for (const [dx, dy, rr] of puffs) {
      ellipse(ctx, cx + dx * r, y + dy * r + ((f + dx * 3) % 2) * 0.6, rr * r, rr * r * 0.85);
      inked(ctx, '#fffaf0', LINE * 0.9);
    }
  };
  foam(16, w * 0.3);
  foam(h - 8, w * 0.32);
  ctx.strokeStyle = INK;
  ctx.lineWidth = LINE * 0.5;
  for (let i = 0; i < 6; i++) {
    const y = 26 + ((i * 29 + f * 13) % (h - 44));
    ellipse(ctx, cx + Math.sin(i * 2.1 + f) * w * 0.08, y, 1.8, 1.8);
    ctx.fillStyle = '#fff3d6';
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = '#b9692d';
  for (const [dx, dy] of [[-0.42, 6], [0.4, 3], [-0.3, -2], [0.3, 9]] as const) {
    ellipse(ctx, cx + dx * w, 4 + dy + f, 1.6, 2.2);
    ctx.fill();
    ctx.stroke();
  }
}

/** Stomp shockwave rolling left: a cola wave with a curling white foam crest and spray. */
function wave(ctx: CanvasRenderingContext2D, f: number): void {
  const lift = f ? 2 : 0;
  ctx.strokeStyle = 'rgba(255,250,240,0.85)';
  ctx.lineWidth = 1.4;
  for (const y of [16, 24, 31]) {
    ctx.beginPath();
    ctx.moveTo(40, y);
    ctx.lineTo(47, y);
    ctx.stroke();
  }
  smooth(ctx, [[2, 35], [5, 24], [12, 15 - lift], [24, 12 - lift], [34, 18], [40, 35]]);
  const g = ctx.createLinearGradient(0, 12, 0, 35);
  g.addColorStop(0, '#d98b45');
  g.addColorStop(1, '#6e3714');
  inked(ctx, g, LINE);
  // foam crest curling forward (to the left)
  smooth(ctx, [[3, 20], [6, 9 - lift], [16, 4 - lift], [28, 6], [36, 14], [26, 15], [16, 12], [9, 16], [9, 21]]);
  inked(ctx, '#fffaf0', LINE);
  ctx.fillStyle = '#fffaf0';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.8;
  for (const [x, y, r] of [[4, 3 + f * 2, 1.8], [12, 0.5 + lift, 1.4], [30, 2 - f, 1.5]] as const) {
    ellipse(ctx, x, y + 1.5, r, r);
    ctx.fill();
    ctx.stroke();
  }
}

function brick(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  ctx.roundRect(2, 2, 18, 11, 2);
  const g = ctx.createLinearGradient(0, 2, 0, 13);
  g.addColorStop(0, '#e48a5e');
  g.addColorStop(1, '#963f24');
  inked(ctx, g, LINE * 0.9);
  ctx.fillStyle = 'rgba(60,20,8,0.35)';
  for (const [x, y] of [[6, 6], [13, 9], [16, 5]] as const) {
    ellipse(ctx, x, y, 1, 0.8);
    ctx.fill();
  }
}

/** Mini burger of the gang: hops on tiny sneakers, angry pie eyes, facing left. */
function burger(ctx: CanvasRenderingContext2D, f: number): void {
  const sy = [0.86, 1.08, 1.02, 0.94][f] ?? 1;
  const air = f === 1 || f === 2;
  ctx.save();
  ctx.translate(17, 30);
  for (const x of [-6, 6]) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    ctx.moveTo(x, -6);
    ctx.lineTo(x + (air ? 2 : 0), -1);
    ctx.stroke();
    ctx.strokeStyle = COL.skin;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    sneaker(ctx, x - 1, air ? 0 : 2, 0.42, -1, air ? -0.3 : 0);
  }
  ctx.scale(2 - sy, sy);
  ctx.beginPath();
  ctx.roundRect(-12, -10, 24, 6, [1, 1, 4, 4]);
  inked(ctx, COL.bun, LINE * 0.8);
  ctx.beginPath();
  ctx.roundRect(-13, -15, 26, 6, 3);
  inked(ctx, COL.patty, LINE * 0.8);
  ctx.beginPath();
  ctx.moveTo(-13, -16);
  ctx.lineTo(13, -16);
  ctx.lineTo(4, -11);
  ctx.lineTo(0, -14);
  ctx.lineTo(-6, -11);
  ctx.closePath();
  inked(ctx, COL.cheese, LINE * 0.6);
  ctx.beginPath();
  ctx.moveTo(-14, -16);
  ctx.bezierCurveTo(-14, -30, 14, -30, 14, -16);
  ctx.closePath();
  inked(ctx, COL.bun, LINE * 0.9);
  pieEye(ctx, -6, -21, 3.2, 4, { x: -0.9, y: 0.2 });
  pieEye(ctx, 2, -21, 3.2, 4, { x: -0.9, y: 0.2 });
  ctx.strokeStyle = INK;
  ctx.lineWidth = LINE * 0.8;
  ctx.beginPath();
  ctx.moveTo(-10, -27);
  ctx.lineTo(-3, -25);
  ctx.moveTo(6, -27);
  ctx.lineTo(0, -25);
  ctx.stroke();
  ctx.restore();
}

/** Fries box of the gang: red box, fries for hair, running legs, facing left. */
function fries(ctx: CanvasRenderingContext2D, f: number): void {
  const ph = (f / 4) * TAU;
  ctx.save();
  ctx.translate(14, 34);
  for (const s of [1, -1]) {
    const fx = Math.cos(ph) * 5 * s;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.4;
    ctx.beginPath();
    ctx.moveTo(s * 3, -10);
    ctx.lineTo(fx, -3);
    ctx.stroke();
    ctx.strokeStyle = COL.skin;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    sneaker(ctx, fx, 0, 0.36, -1, 0);
  }
  for (let i = 0; i < 6; i++) {
    const x = -7 + i * 2.8;
    ctx.beginPath();
    ctx.roundRect(x, -32 - (i % 3) * 2 - (f % 2), 3.2, 14, 1);
    inked(ctx, COL.fry, LINE * 0.6);
  }
  ctx.beginPath();
  ctx.moveTo(-10, -24);
  ctx.lineTo(10, -24);
  ctx.lineTo(8, -9);
  ctx.lineTo(-8, -9);
  ctx.closePath();
  inked(ctx, COL.box, LINE * 0.9);
  pieEye(ctx, -4.5, -19, 2.6, 3.2, { x: -0.9, y: 0 });
  pieEye(ctx, 1.5, -19, 2.6, 3.2, { x: -0.9, y: 0 });
  ctx.beginPath();
  ctx.moveTo(-6, -13);
  ctx.quadraticCurveTo(-2, -10, 2, -13);
  ctx.strokeStyle = INK;
  ctx.lineWidth = LINE * 0.7;
  ctx.stroke();
  glove(ctx, -11, -15, 0.45, -1.2 + Math.sin(ph) * 0.4, 'fist');
  ctx.restore();
}

/** Floor marks: a fizzing cola puddle (2 frames) or a plain shadow (frame 2). */
function mark(ctx: CanvasRenderingContext2D, f: number): void {
  ellipse(ctx, 22, 8, 19, 5);
  if (f === 2) {
    ctx.fillStyle = 'rgba(28,21,17,0.45)';
    ctx.fill();
    return;
  }
  ctx.fillStyle = '#9a5626';
  ctx.fill();
  ctx.strokeStyle = '#fff6df';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.fillStyle = '#fffaf0';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.7;
  for (const [x, y, r] of [[12, 6, 2.2], [22, 3 - f, 2.8], [31, 6, 2], [17, 9, 1.4], [27, 9 - f, 1.6]] as const) {
    ellipse(ctx, x + f, y, r, r);
    ctx.fill();
    ctx.stroke();
  }
}

function star(ctx: CanvasRenderingContext2D): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i / 10) * TAU;
    const r = i % 2 ? 2.4 : 6;
    ctx.lineTo(7 + Math.cos(a) * r, 7 + Math.sin(a) * r);
  }
  ctx.closePath();
  inked(ctx, COL.frame, LINE * 0.7);
}

export function loadProps(scene: Phaser.Scene, k: number): void {
  sheet(scene, TEX.bubble, 28, 28, 4, k, bubble);
  anim(scene, ANIM.bubble, TEX.bubble, [0, 1], 6);
  anim(scene, ANIM.bubblePink, TEX.bubble, [2, 3], 6);
  image(scene, TEX.shades, 52, 30, k, (ctx) => {
    halo(ctx, 26, 15, 16);
    shades(ctx, 26, 15, 46, 0);
  });
  sheet(scene, TEX.can, 18, 26, 2, k, (ctx, f) => {
    if (f) halo(ctx, 9, 13, 10);
    can(ctx, 9, 13, 20, 0, f === 1);
  });
  sheet(scene, TEX.geyser, 40, 152, 3, k, (ctx, f) => geyser(ctx, 40, 152, f));
  anim(scene, ANIM.geyser, TEX.geyser, 3, 14);
  sheet(scene, TEX.burst, 32, 120, 3, k, (ctx, f) => geyser(ctx, 32, 120, f));
  anim(scene, ANIM.burst, TEX.burst, 3, 14);
  image(scene, TEX.drop, 14, 14, k, (ctx) => {
    ctx.beginPath();
    ctx.moveTo(7, 1.5);
    ctx.quadraticCurveTo(12.5, 8, 7, 12.5);
    ctx.quadraticCurveTo(1.5, 8, 7, 1.5);
    inked(ctx, COL.soda, LINE * 0.8);
  });
  sheet(scene, TEX.wave, 48, 36, 2, k, wave);
  anim(scene, ANIM.wave, TEX.wave, 2, 10);
  image(scene, TEX.brick, 22, 15, k, brick);
  sheet(scene, TEX.burger, 34, 34, 4, k, burger);
  anim(scene, ANIM.burger, TEX.burger, 4, 7);
  sheet(scene, TEX.fries, 28, 38, 4, k, fries);
  anim(scene, ANIM.fries, TEX.fries, 4, 14);
  sheet(scene, TEX.mark, 44, 14, 3, k, mark);
  anim(scene, ANIM.puddle, TEX.mark, [0, 1], 6);
  image(scene, TEX.shadow, 120, 18, k, (ctx) => {
    ellipse(ctx, 60, 9, 58, 7);
    ctx.fillStyle = 'rgba(20,10,30,0.4)';
    ctx.fill();
  });
  image(scene, TEX.star, 14, 14, k, star);
}
