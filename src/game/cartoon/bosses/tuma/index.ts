/** DON TUMA (BOSS-B lane): boss 3 of the rush — "100% TUMA SICILIANA", cut out of the owner's shirt. */
import type Phaser from 'phaser';
import type { BossDef } from '../../api';
import { image, sheet, unloadPrefix } from '../../draw/canvas';
import { buildTumaArena, loadTumaArena } from './arena';
import { SHOT, TK, TREE, TUMA_ASSETS, TUMA_RIG, TUMA_RIG_LAYERS, TUMA_TREE_LAYER, TUMA_CFG as C, treeTex, tumaTex } from './config';
import { loadRig } from './kit/rig';
import { DUST, GLINT, SPLAT, drawDust, drawGlint } from './kit/toon';
import { BEAM, JAWS, WHEEL, drawBeam, drawJaws, drawShot, drawSplat, drawWheel } from './props';
import { createTuma } from './runtime';

export const TUMA: BossDef = {
  id: 'tuma',
  name: 'DON TUMA',
  intro: 'Guai a chi disturba la siesta di Don Tuma!',
  tagline: '100% Siciliano, 100% permaloso.',
  music: 'cartoonBoss',
  hp: C.hp,
  phases: C.phases,
  assets: TUMA_ASSETS,
  load(scene: Phaser.Scene, k: number): void {
    loadRig(scene, TUMA_RIG_LAYERS, TUMA_RIG.w, TUMA_RIG.h, tumaTex(k));
    loadRig(scene, [TUMA_TREE_LAYER], TREE.w, TREE.h, treeTex(k));
    sheet(scene, TK.shot, SHOT.w, SHOT.h, 4, k, drawShot);
    sheet(scene, TK.splat, SPLAT.w, SPLAT.h, 12, k, drawSplat);
    sheet(scene, TK.beam, BEAM.w, BEAM.h, 3, k, drawBeam);
    sheet(scene, TK.jaws, JAWS.w, JAWS.h, 3, k, drawJaws);
    image(scene, TK.wheel, WHEEL.w, WHEEL.h, k, drawWheel);
    sheet(scene, TK.glint, GLINT.w, GLINT.h, 2, k, drawGlint);
    sheet(scene, TK.dust, DUST.w, DUST.h, 3, k, drawDust);
    loadTumaArena(scene, TK.pre, k);
  },
  buildArena: (scene: Phaser.Scene, k: number) => buildTumaArena(scene, TK.pre, k),
  create: createTuma,
  unload: (scene: Phaser.Scene) => unloadPrefix(scene, TK.pre),
};
