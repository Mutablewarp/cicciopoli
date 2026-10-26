/**
 * Pancetta's vector projectiles (his board and the bacon strip are cut from the shirt, see look.ts): skate
 * wheels with a grumpy face (frame 1 = the PINK parryable one) and the concrete shockwave of his landings.
 */
import { LINE } from '../../draw/canvas';
import { ellipse, ink, pieEye, shine } from '../brie/kit/toon';
import { PINK as PARRY } from '../brie/art-props';

export const WHEEL = { w: 30, h: 30, r: 12 } as const;
export const SHOCK = { w: 32, h: 26 } as const;

const CREAM = '#f3ead2';
const METAL = '#a9a7a2';

function wheelAt(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, turn: number, fill = CREAM): void {
  ellipse(ctx, x, y, r, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ink(ctx, LINE * 0.8);
  ellipse(ctx, x, y, r * 0.38, r * 0.38);
  ctx.fillStyle = METAL;
  ctx.fill();
  ink(ctx, LINE * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + Math.cos(turn) * r * 0.45, y + Math.sin(turn) * r * 0.45);
  ctx.lineTo(x + Math.cos(turn) * r * 0.85, y + Math.sin(turn) * r * 0.85);
  ink(ctx, LINE * 0.6);
}

export function drawWheel(ctx: CanvasRenderingContext2D, frame: number): void {
  const c = WHEEL.w / 2;
  const fill = frame ? PARRY : CREAM;
  wheelAt(ctx, c, c, WHEEL.r, 0.6, fill);
  pieEye(ctx, c - 4, c - 2, 2.6, 3.4, { x: -0.8, y: 0 }, 0.35, fill, -0.6);
  pieEye(ctx, c + 3, c - 2, 2.6, 3.4, { x: -0.8, y: 0 }, 0.35, fill, 0.6);
  shine(ctx, c - 5, c - 6, 2.5, 1.2, -0.5, 0.7);
}

export function drawShock(ctx: CanvasRenderingContext2D, frame: number): void {
  const lean = frame ? 2 : -2;
  for (const [x, y, r] of [[8, 19, 7], [16, 14 + lean * 0.5, 9], [25, 19, 6]] as const) {
    ellipse(ctx, x, y, r, r * 0.8);
    ctx.fillStyle = '#ece6da';
    ctx.fill();
    ink(ctx, LINE * 0.8);
  }
  for (const [x, y] of [[4, 8], [28, 6 + lean]] as const) {
    ellipse(ctx, x, y, 2, 2);
    ctx.fillStyle = '#b9b2a4';
    ctx.fill();
    ink(ctx, LINE * 0.5);
  }
}
