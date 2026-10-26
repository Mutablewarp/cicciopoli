/**
 * Monsieur Brie's textures (all prefixed 'ct-brie-' so unloadPrefix drops them): the bitmaps cut from the
 * shirt (BRIE_ASSETS, preloaded by the CORE; load() numbers their frames) and the vector props.
 */
import type Phaser from 'phaser';
import type { ImageAsset } from '../../api';
import { anim, image, sheet } from '../../draw/canvas';
import { alertBurst } from './kit/toon';
import { cutStrip, rescaledCopy, stripAssets, type Strip } from './kit/bits';
import { PUDDLE, drawPuddle } from './art';
import { ALERT, BAGUETTE, MARK, PUFF, SHADOW, STAR, WAVE, WHEEL, drawBaguette, drawMark, drawPuff, drawShadow, drawStar, drawWave, drawWheel } from './art-props';
import { loadArena } from './arena';
import { BRIE_ART as A } from './sheet';

export const PREFIX = 'ct-brie-';

/** The shirt cut-outs, by texture name. */
const STRIPS: Readonly<Record<'wedge' | 'beret' | 'glove' | 'foot' | 'bike' | 'basket' | 'wheelF' | 'wheelR', Strip>> = {
  wedge: A.wedge,
  beret: A.beret,
  glove: A.glove,
  foot: A.foot,
  bike: A.bike,
  basket: A.basket,
  wheelF: A.wheelF,
  wheelR: A.wheelR,
};

export const BRIE_ASSETS: readonly ImageAsset[] = stripAssets(PREFIX, STRIPS);

export const KEY = {
  wedge: `${PREFIX}wedge`,
  beret: `${PREFIX}beret`,
  glove: `${PREFIX}glove`,
  foot: `${PREFIX}foot`,
  bike: `${PREFIX}bike`,
  basket: `${PREFIX}basket`,
  wheelF: `${PREFIX}wheelF`,
  wheelR: `${PREFIX}wheelR`,
  /** the beret as a boomerang hazard (k-scaled copy) */
  beretToss: `${PREFIX}beret-toss`,
  puddle: `${PREFIX}puddle`,
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
  for (const [name, s] of Object.entries(STRIPS)) cutStrip(scene, `${PREFIX}${name}`, s);
  rescaledCopy(scene, KEY.beret, A.beret, KEY.beretToss, k / A.pxPerUnit);
  sheet(scene, KEY.puddle, PUDDLE.w, PUDDLE.h, 4, k, drawPuddle);
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
