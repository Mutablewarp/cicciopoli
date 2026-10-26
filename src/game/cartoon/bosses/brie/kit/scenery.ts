/**
 * BOSS-A arena plumbing: full-bleed layers. The camera may show up to BLEED world units past the arena on
 * every side (portrait push-in, wide phones), so each painted layer spans x from -BLEED.x to ARENA.w +
 * BLEED.x and its own world-y band; draw functions paint in world coordinates.
 */
import type Phaser from 'phaser';
import { ARENA } from '../../../api';
import { image, worldSprite } from '../../../draw/canvas';
import { paperGrain, smooth, wash, type Pt } from './toon';

export const BLEED = { x: 96, top: 90, bottom: 70 } as const;
/** Leftmost / rightmost world x a layer covers, and its width. */
export const X0 = -BLEED.x;
export const X1 = ARENA.w + BLEED.x;
export const SPAN = X1 - X0;
export const TOP = -BLEED.top;
export const BOTTOM = ARENA.h + BLEED.bottom;

export type Paint = (ctx: CanvasRenderingContext2D) => void;

/** Registers the layer covering world y0..y1 (full bleed width) drawn by `paint` in world coordinates. */
export function layer(scene: Phaser.Scene, key: string, y0: number, y1: number, k: number, paint: Paint): void {
  image(scene, key, SPAN, y1 - y0, k, (ctx) => {
    ctx.translate(-X0, -y0);
    paint(ctx);
    ctx.save();
    ctx.translate(X0, y0);
    paperGrain(ctx, SPAN, y1 - y0, Math.round(y0 + y1));
    ctx.restore();
  });
}

/** Shows a layer made by `layer` in place. */
export function placeLayer(scene: Phaser.Scene, key: string, y0: number, y1: number, k: number, depth: number): Phaser.GameObjects.Sprite {
  return worldSprite(scene, (X0 + X1) / 2, (y0 + y1) / 2, key, k).setDepth(depth);
}

/** A watercolour-washed shape through `pts`, its blooms bounded from y = top down to the bottom of the bleed. */
export function fillPts(ctx: CanvasRenderingContext2D, pts: readonly Pt[], color: string, seed: number, top: number): void {
  wash(ctx, () => smooth(ctx, pts), color, { x: X0, y: top, w: SPAN, h: BOTTOM - top }, seed, 0.35);
}

/** Ridge line from X0 to X1 closed down to `bottom`. */
export function ridge(baseY: number, amp: number, seed: number, bottom: number, step = 40): Pt[] {
  const pts: Pt[] = [[X0 - 20, bottom]];
  let s = seed;
  for (let x = X0 - 20; x <= X1 + 20; x += step) {
    s = (s * 9301 + 49297) % 233280;
    pts.push([x, baseY - amp * (0.5 + 0.5 * Math.sin(x / 90 + seed)) - (s / 233280) * amp * 0.4]);
  }
  pts.push([X1 + 20, bottom]);
  return pts;
}
