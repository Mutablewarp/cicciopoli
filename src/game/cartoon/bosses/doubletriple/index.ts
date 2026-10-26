/**
 * Boss 6 · DOUBLE TRIPLE (BOSS-C lane): the walking double burger of the shirt (the art is cut out of the shirt,
 * look.ts), blue sneakers and a peace sign, on a Palermo street at dusk in front of the Ciccio's storefront. Phase 1 it throws its patties
 * like frisbees, rolls three cheddar waves, cracks bacon whips and stomps across; phase 2 it splits in two.
 */
import type Phaser from 'phaser';
import type { BossDef } from '../../api';
import { unloadPrefix, worldSprite } from '../../draw/canvas';
import { NEAR } from './arena';
import { DT_ASSETS } from './look';
import { createDoubleTriple } from './runtime';
import { loadTextures, PRE, TEX } from './textures';
import { DT } from './tuning';

const DEPTH = { far: -30, mid: -20, near: 30 } as const;

export const DOUBLETRIPLE: BossDef = {
  id: 'doubletriple',
  name: 'DOUBLE TRIPLE',
  intro: 'Doppio burger, triplo guaio!',
  tagline: 'Due burger, tre cheddar, zero pietà.',
  music: 'cartoonBoss',
  hp: DT.hp,
  phases: DT.phases,
  assets: DT_ASSETS,
  load(scene: Phaser.Scene, k: number): void {
    loadTextures(scene, k);
  },
  buildArena(scene: Phaser.Scene, k: number): Phaser.GameObjects.GameObject[] {
    return [
      worldSprite(scene, 0, 0, TEX.far, k).setOrigin(0, 0).setDepth(DEPTH.far),
      worldSprite(scene, 0, 0, TEX.mid, k).setOrigin(0, 0).setDepth(DEPTH.mid),
      worldSprite(scene, 0, NEAR.y, TEX.near, k).setOrigin(0, 0).setDepth(DEPTH.near),
    ];
  },
  create: createDoubleTriple,
  unload(scene: Phaser.Scene): void {
    unloadPrefix(scene, PRE);
  },
};
