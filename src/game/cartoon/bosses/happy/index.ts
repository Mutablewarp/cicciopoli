/** HAPPY BOX (BOSS-B lane): boss 4 of the rush — "MAKE IT HAPPY", cut out of the owner's shirt. */
import type Phaser from 'phaser';
import type { BossDef } from '../../api';
import { image, sheet, unloadPrefix } from '../../draw/canvas';
import { loadFlat, loadRig } from '../tuma/kit/rig';
import { DUST, GLINT, SPLAT, drawDust, drawGlint } from '../tuma/kit/toon';
import { buildHappyArena, loadHappyArena } from './arena';
import { DECAL, DROP, HAPPY_ASSETS, HAPPY_CFG as C, HAPPY_RIG, HAPPY_RIG_LAYERS, HK, LANE, PAINT, PINK, PUFF, ROCKET, happyTex } from './config';
import { drawDecal, drawDrop, drawLane, drawPuff, drawRocket, drawSplat } from './props';
import { createHappy } from './runtime';

export const HAPPY: BossDef = {
  id: 'happy',
  name: 'HAPPY BOX',
  intro: 'Happy Box ti spruzza di felicità!',
  tagline: 'Make it happy... o te la fa pagare.',
  music: 'cartoonBoss',
  hp: C.hp,
  phases: C.phases,
  assets: HAPPY_ASSETS,
  load(scene: Phaser.Scene, k: number): void {
    loadRig(scene, HAPPY_RIG_LAYERS, HAPPY_RIG.w, HAPPY_RIG.h, happyTex(k));
    loadFlat(scene, HAPPY_RIG_LAYERS, HK.mini, HAPPY_RIG.w, HAPPY_RIG.h, Math.min(k * C.minis.scale, C.texMax));
    sheet(scene, HK.puff, PUFF.w, PUFF.h, PAINT.length, k, drawPuff);
    sheet(scene, HK.drop, DROP.w, DROP.h, PINK, k, drawDrop);
    sheet(scene, HK.rocket, ROCKET.w, ROCKET.h, 2, k, drawRocket);
    image(scene, HK.lane, LANE.w, LANE.h, k, drawLane);
    sheet(scene, HK.splat, SPLAT.w, SPLAT.h, PAINT.length * 3, k, drawSplat);
    sheet(scene, HK.decal, DECAL.w, DECAL.h, 4, k, drawDecal);
    sheet(scene, HK.glint, GLINT.w, GLINT.h, 2, k, drawGlint);
    sheet(scene, HK.dust, DUST.w, DUST.h, 3, k, drawDust);
    loadHappyArena(scene, HK.pre, k);
  },
  buildArena: (scene: Phaser.Scene, k: number) => buildHappyArena(scene, HK.pre, k),
  create: createHappy,
  unload: (scene: Phaser.Scene) => unloadPrefix(scene, HK.pre),
};
