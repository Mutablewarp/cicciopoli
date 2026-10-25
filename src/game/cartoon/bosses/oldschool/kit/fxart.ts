/**
 * Small shared boss FX textures for the BOSS-C bosses, registered under each boss's own prefix so that
 * unloadPrefix() frees them: landing shadow, wind-up glint, dizzy star, dust puff, floor shockwave.
 */
import type Phaser from 'phaser';
import { anim, image, INK, LINE, sheet } from '../../../draw/canvas';
import { C, ell } from './style';

type Ctx = CanvasRenderingContext2D;

export interface FxKeys {
  shadow: string;
  glint: string;
  star: string;
  dust: string;
  dustAnim: string;
  shock: string;
  shockAnim: string;
}

export const SHOCK = { w: 58, h: 38 } as const;

function starPath(ctx: Ctx, x: number, y: number, ro: number, ri: number, n: number): void {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / n;
    const r = i % 2 ? ri : ro;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}

function puff(ctx: Ctx, f: number, color: string): void {
  const grow = 1 + f * 0.35;
  ctx.globalAlpha = 1 - f * 0.22;
  for (const [x, y, r] of [[12, 18, 7], [21, 14, 9], [30, 18, 7], [20, 20, 6]] as const) {
    ell(ctx, 20 + (x - 20) * grow, 26 - (26 - y) * grow, r * (1 - f * 0.12), r * (1 - f * 0.12));
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = LINE * 0.7;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** Shockwave crest rolling left (the sprite is flipped for rightward waves): curl, foam and speed lines. */
function shock(ctx: Ctx, f: number, color: string, light: string): void {
  const { w, h } = SHOCK;
  const lean = [0, 4, -3][f] ?? 0;
  ctx.beginPath();
  ctx.moveTo(2, h - 1);
  ctx.quadraticCurveTo(6 + lean, h - 30, 22 + lean, 6 + f);
  ctx.quadraticCurveTo(34 + lean, 0, 40, 11);
  ctx.quadraticCurveTo(31, 13, 34, 21);
  ctx.quadraticCurveTo(47, 21, w - 2, h - 1);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = LINE * 1.2;
  ctx.stroke();
  ctx.strokeStyle = light;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(10, h - 7);
  ctx.quadraticCurveTo(14 + lean, h - 24, 24 + lean, 11 + f);
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(42 + i * 3, 16 + i * 6 + f);
    ctx.lineTo(w - 1, 16 + i * 6 + f);
    ctx.stroke();
  }
}

/** The shared FX keys under a boss prefix. */
export function fxKeys(pre: string): FxKeys {
  return {
    shadow: `${pre}shadow`,
    glint: `${pre}glint`,
    star: `${pre}star`,
    dust: `${pre}dust`,
    dustAnim: `${pre}dust-a`,
    shock: `${pre}shock`,
    shockAnim: `${pre}shock-a`,
  };
}

/** Draw and register the shared FX (shock / dust colours per arena). */
export function registerFx(scene: Phaser.Scene, keys: FxKeys, k: number, shockColor: string, shockLight: string, dustColor: string): void {
  // landing marker: a dark shadow with a warm cream rim so it reads on dark and light floors alike
  image(scene, keys.shadow, 50, 14, k, (ctx) => {
    ell(ctx, 25, 7, 23, 5.5);
    ctx.fillStyle = 'rgba(28, 21, 17, 0.6)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 228, 160, 0.85)';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ell(ctx, 25, 7, 12, 2.8);
    ctx.fillStyle = 'rgba(28, 21, 17, 0.5)';
    ctx.fill();
  });
  image(scene, keys.glint, 26, 26, k, (ctx) => {
    starPath(ctx, 13, 13, 12, 3, 4);
    ctx.fillStyle = C.white;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    starPath(ctx, 13, 13, 5, 1.6, 4);
    ctx.fillStyle = C.cheddarLight;
    ctx.fill();
  });
  image(scene, keys.star, 14, 14, k, (ctx) => {
    starPath(ctx, 7, 7, 6.2, 2.8, 5);
    ctx.fillStyle = C.cheddarLight;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  });
  sheet(scene, keys.dust, 40, 28, 4, k, (ctx, f) => puff(ctx, f, dustColor));
  anim(scene, keys.dustAnim, keys.dust, 4, 14, 0);
  sheet(scene, keys.shock, SHOCK.w, SHOCK.h, 3, k, (ctx, f) => shock(ctx, f, shockColor, shockLight));
  anim(scene, keys.shockAnim, keys.shock, 3, 12, -1);
}
