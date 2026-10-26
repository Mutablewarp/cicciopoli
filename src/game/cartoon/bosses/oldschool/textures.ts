/** THE OLD SCHOOL texture keys (prefix 'ct-oldschool-' so unloadPrefix frees them) and their registration. */
import type Phaser from 'phaser';
import { ARENA } from '../../api';
import { image, sheet } from '../../draw/canvas';
import { BACON, BOTTLE, DROP, drawBaconShot, drawBottle, drawSauce } from './art';
import { drawFar, drawMid, drawNear, MID, NEAR } from './arena';
import { fxKeys, registerFx } from './kit/fxart';
import { loadParts, PART_TEX, PRE } from './look';

export { PRE };

export const TEX = {
  ...PART_TEX,
  bottle: `${PRE}bottle`,
  bacon: `${PRE}bacon`,
  sauce: `${PRE}sauce`,
  far: `${PRE}far`,
  mid: `${PRE}mid`,
  near: `${PRE}near`,
  fx: fxKeys(PRE),
} as const;

export function loadTextures(scene: Phaser.Scene, k: number): void {
  loadParts(scene, k);
  sheet(scene, TEX.bottle, BOTTLE.w, BOTTLE.h, 4, k, drawBottle);
  sheet(scene, TEX.bacon, BACON.w, BACON.h, 2, k, drawBaconShot);
  sheet(scene, TEX.sauce, DROP.w, DROP.h, 3, k, drawSauce);
  image(scene, TEX.far, ARENA.w, ARENA.h, k, drawFar);
  image(scene, TEX.mid, ARENA.w, MID.h, k, drawMid);
  image(scene, TEX.near, ARENA.w, NEAR.h, k, drawNear);
  registerFx(scene, TEX.fx, k, '#efe2c4', '#ffffff', '#f3e7cc');
}
