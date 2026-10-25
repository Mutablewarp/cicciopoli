/** Monsieur Brie's texture keys (all prefixed 'ct-brie-' so unloadPrefix drops them) and their loading. */
import type Phaser from 'phaser';
import { anim, image, sheet } from '../../draw/canvas';
import { alertBurst } from './kit/toon';
import { ARM, BERET, LEGS, PUDDLE, WEDGE, WEDGE_EXPR, ARM_POSES, drawArm, drawBeret, drawLegs, drawPuddle, drawWedge } from './art-body';
import { BIKE, drawBike } from './art-bike';
import { ALERT, BAGUETTE, MARK, PUFF, SHADOW, STAR, WAVE, WHEEL, drawBaguette, drawMark, drawPuff, drawShadow, drawStar, drawWave, drawWheel } from './art-props';
import { loadArena } from './arena';

export const PREFIX = 'ct-brie-';

export const KEY = {
  bike: `${PREFIX}bike`,
  wedge: `${PREFIX}wedge`,
  arm: `${PREFIX}arm`,
  legs: `${PREFIX}legs`,
  puddle: `${PREFIX}puddle`,
  beret: `${PREFIX}beret`,
  baguette: `${PREFIX}baguette`,
  wheel: `${PREFIX}wheel`,
  wave: `${PREFIX}wave`,
  waveAnim: `${PREFIX}wave-anim`,
  mark: `${PREFIX}mark`,
  alert: `${PREFIX}alert`,
  puff: `${PREFIX}puff`,
  puffAnim: `${PREFIX}puff-anim`,
  star: `${PREFIX}star`,
  shadow: `${PREFIX}shadow`,
} as const;

export function loadBrie(scene: Phaser.Scene, k: number): void {
  sheet(scene, KEY.bike, BIKE.w, BIKE.h, BIKE.frames, k, drawBike);
  sheet(scene, KEY.wedge, WEDGE.w, WEDGE.h, WEDGE_EXPR.length, k, drawWedge);
  sheet(scene, KEY.arm, ARM.w, ARM.h, ARM_POSES.length, k, drawArm);
  sheet(scene, KEY.legs, LEGS.w, LEGS.h, 6, k, drawLegs);
  sheet(scene, KEY.puddle, PUDDLE.w, PUDDLE.h, 4, k, drawPuddle);
  image(scene, KEY.beret, BERET.w, BERET.h, k, drawBeret);
  sheet(scene, KEY.baguette, BAGUETTE.w, BAGUETTE.h, 2, k, drawBaguette);
  sheet(scene, KEY.wheel, WHEEL.w, WHEEL.h, 2, k, drawWheel);
  sheet(scene, KEY.wave, WAVE.w, WAVE.h, 2, k, drawWave);
  anim(scene, KEY.waveAnim, KEY.wave, 2, 8);
  image(scene, KEY.mark, MARK.w, MARK.h, k, drawMark);
  image(scene, KEY.alert, ALERT.w, ALERT.h, k, (ctx) => alertBurst(ctx, ALERT.w / 2, ALERT.h / 2, 1.15, '#ffd23a'));
  sheet(scene, KEY.puff, PUFF.w, PUFF.h, PUFF.frames, k, drawPuff);
  anim(scene, KEY.puffAnim, KEY.puff, PUFF.frames, 16, 0);
  image(scene, KEY.star, STAR.w, STAR.h, k, drawStar);
  image(scene, KEY.shadow, SHADOW.w, SHADOW.h, k, drawShadow);
  loadArena(scene, k);
}
