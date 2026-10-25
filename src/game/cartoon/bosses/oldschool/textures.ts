/** THE OLD SCHOOL texture keys (prefix 'ct-oldschool-' so unloadPrefix frees them) and their registration. */
import type Phaser from 'phaser';
import { ARENA } from '../../api';
import { image, sheet } from '../../draw/canvas';
import { ARM, BACON, BOTTLE, BURGER, DROP, drawArm, drawBaconShot, drawBottle, drawBurger, drawSauce } from './art';
import { drawFar, drawMid, drawNear, MID, NEAR } from './arena';
import { drawFist, drawHandBack, drawHandFront, FIST, HAND } from './hand';
import { fxKeys, registerFx } from './kit/fxart';

export const PRE = 'ct-oldschool-';

export const TEX = {
  burger: `${PRE}burger`,
  arm: `${PRE}arm`,
  handBack: `${PRE}hand-back`,
  handFront: `${PRE}hand-front`,
  fist: `${PRE}fist`,
  bottle: `${PRE}bottle`,
  bacon: `${PRE}bacon`,
  sauce: `${PRE}sauce`,
  far: `${PRE}far`,
  mid: `${PRE}mid`,
  near: `${PRE}near`,
  fx: fxKeys(PRE),
} as const;

export function loadTextures(scene: Phaser.Scene, k: number): void {
  sheet(scene, TEX.burger, BURGER.w, BURGER.h, 5, k, drawBurger);
  sheet(scene, TEX.arm, ARM.w, ARM.h, 5, k, drawArm);
  image(scene, TEX.handBack, HAND.w, HAND.h, k, drawHandBack);
  image(scene, TEX.handFront, HAND.w, HAND.h, k, drawHandFront);
  sheet(scene, TEX.fist, FIST.w, FIST.h, 4, k, drawFist);
  sheet(scene, TEX.bottle, BOTTLE.w, BOTTLE.h, 4, k, drawBottle);
  sheet(scene, TEX.bacon, BACON.w, BACON.h, 2, k, drawBaconShot);
  sheet(scene, TEX.sauce, DROP.w, DROP.h, 3, k, drawSauce);
  image(scene, TEX.far, ARENA.w, ARENA.h, k, drawFar);
  image(scene, TEX.mid, ARENA.w, MID.h, k, drawMid);
  image(scene, TEX.near, ARENA.w, NEAR.h, k, drawNear);
  registerFx(scene, TEX.fx, k, '#efe2c4', '#ffffff', '#f3e7cc');
}
