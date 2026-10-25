/** DOUBLE TRIPLE texture keys (prefix 'ct-doubletriple-' so unloadPrefix frees them) and their registration. */
import type Phaser from 'phaser';
import { ARENA } from '../../api';
import { anim, image, sheet } from '../../draw/canvas';
import { BODY, drawBody } from './art';
import { drawFar, drawMid, drawNear, MID, NEAR } from './arena';
import { CWAVE, DROP, drawCheddarWave, drawFrisbee, drawLane, drawMini, drawSalsa, drawStub, drawWhip, FRISBEE, LANE, MINI, STUB, WHIP } from './bits';
import { ARMF, drawArm, drawLegs, HANDS, LEGS } from './limbs';
import { fxKeys, registerFx } from '../oldschool/kit/fxart';

export const PRE = 'ct-doubletriple-';

export const TEX = {
  body: `${PRE}body`,
  arm: `${PRE}arm`,
  legs: `${PRE}legs`,
  mini: `${PRE}mini`,
  frisbee: `${PRE}frisbee`,
  frisbeeAnim: `${PRE}frisbee-a`,
  wave: `${PRE}wave`,
  waveAnim: `${PRE}wave-a`,
  wavePinkAnim: `${PRE}wave-pink-a`,
  whip: `${PRE}whip`,
  stub: `${PRE}stub`,
  lane: `${PRE}lane`,
  salsa: `${PRE}salsa`,
  far: `${PRE}far`,
  mid: `${PRE}mid`,
  near: `${PRE}near`,
  fx: fxKeys(PRE),
} as const;

export function loadTextures(scene: Phaser.Scene, k: number): void {
  sheet(scene, TEX.body, BODY.w, BODY.h, 4, k, drawBody);
  sheet(scene, TEX.arm, ARMF.w, ARMF.h, HANDS.length, k, drawArm);
  sheet(scene, TEX.legs, LEGS.w, LEGS.h, 9, k, drawLegs);
  sheet(scene, TEX.mini, MINI.w, MINI.h, 8, k, drawMini);
  sheet(scene, TEX.frisbee, FRISBEE.w, FRISBEE.h, 4, k, drawFrisbee);
  anim(scene, TEX.frisbeeAnim, TEX.frisbee, 4, 16);
  sheet(scene, TEX.wave, CWAVE.w, CWAVE.h, 6, k, drawCheddarWave);
  anim(scene, TEX.waveAnim, TEX.wave, [0, 1, 2], 10);
  anim(scene, TEX.wavePinkAnim, TEX.wave, [3, 4, 5], 10);
  sheet(scene, TEX.whip, WHIP.w, WHIP.h, 2, k, drawWhip);
  image(scene, TEX.stub, STUB.w, STUB.h, k, drawStub);
  image(scene, TEX.lane, LANE.w, LANE.h, k, drawLane);
  sheet(scene, TEX.salsa, DROP.w, DROP.h, 2, k, drawSalsa);
  image(scene, TEX.far, ARENA.w, ARENA.h, k, drawFar);
  image(scene, TEX.mid, ARENA.w, MID.h, k, drawMid);
  image(scene, TEX.near, ARENA.w, NEAR.h, k, drawNear);
  registerFx(scene, TEX.fx, k, '#d9b089', '#fff0d8', '#efe2d4');
}
