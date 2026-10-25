/** DON TUMA (BOSS-B lane): boss 3 of the rush — "100% TUMA SICILIANA" on a terrace over the sea. */
import type Phaser from 'phaser';
import type { BossDef } from '../../api';
import { image, sheet, unloadPrefix } from '../../draw/canvas';
import { TUMA_POSES, drawTuma } from './art';
import { buildTumaArena, loadTumaArena } from './arena';
import { BODY, SHOT, TK, TUMA_CFG as C } from './config';
import { DUST, GLINT, SPLAT, drawDust, drawGlint } from './kit/toon';
import { BEAM, JAWS, drawBeam, drawChair, drawJaws, drawShot, drawSplat } from './props';
import { createTuma } from './runtime';

export const TUMA: BossDef = {
  id: 'tuma',
  name: 'DON TUMA',
  intro: 'Guai a chi disturba la siesta di Don Tuma!',
  tagline: '100% Siciliano, 100% permaloso.',
  music: 'cartoonBoss',
  hp: C.hp,
  phases: C.phases,
  load(scene: Phaser.Scene, k: number): void {
    const texK = Math.min(k, C.kMax) * C.scale;
    sheet(scene, TK.body, BODY.w, BODY.h, TUMA_POSES.length, texK, drawTuma);
    image(scene, TK.chair, BODY.w, BODY.h, texK, drawChair);
    sheet(scene, TK.shot, SHOT.w, SHOT.h, 4, k, drawShot);
    sheet(scene, TK.splat, SPLAT.w, SPLAT.h, 12, k, drawSplat);
    sheet(scene, TK.beam, BEAM.w, BEAM.h, 3, k, drawBeam);
    sheet(scene, TK.jaws, JAWS.w, JAWS.h, 3, k, drawJaws);
    sheet(scene, TK.glint, GLINT.w, GLINT.h, 2, k, drawGlint);
    sheet(scene, TK.dust, DUST.w, DUST.h, 3, k, drawDust);
    loadTumaArena(scene, TK.pre, k);
  },
  buildArena: (scene: Phaser.Scene, k: number) => buildTumaArena(scene, TK.pre, k),
  create: createTuma,
  unload: (scene: Phaser.Scene) => unloadPrefix(scene, TK.pre),
};
