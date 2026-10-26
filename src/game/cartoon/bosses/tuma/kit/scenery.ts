/** Scenery bits shared by the BOSS-B arenas: a drifting watercolour cloud and a looping sway tween. */
import type Phaser from 'phaser';
import type { Ctx } from './toon';

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
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#7a5a40';
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

/** A looping yoyo tween that dies with its target (the core destroys the arena between rounds). */
export function loop<T extends Phaser.GameObjects.GameObject>(scene: Phaser.Scene, target: T, props: Omit<Phaser.Types.Tweens.TweenBuilderConfig, 'targets'>): T {
  const tw = scene.tweens.add({ ...props, targets: target, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  target.once('destroy', () => tw.remove());
  return target;
}
