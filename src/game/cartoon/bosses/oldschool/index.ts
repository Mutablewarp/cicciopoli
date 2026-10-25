/**
 * Boss 5 · THE OLD SCHOOL (BOSS-C lane): the smiling burger of the "The Old School" shirt held up by a GIANT
 * white glove in a 1930s diner. Phase 1 the hand slams, the burger flicks bacon, the bottles rain sauce and
 * the burger hops off; phase 2 the hand becomes a fist that pounds after the player and sweeps the floor.
 */
import type Phaser from 'phaser';
import type { BossDef } from '../../api';
import { unloadPrefix, worldSprite } from '../../draw/canvas';
import { MID, NEAR } from './arena';
import { createOldSchool } from './runtime';
import { loadTextures, PRE, TEX } from './textures';
import { OS } from './tuning';

const DEPTH = { far: -30, mid: -20, near: 30 } as const;

export const OLDSCHOOL: BossDef = {
  id: 'oldschool',
  name: 'THE OLD SCHOOL',
  intro: 'Sapori classici, botte senza tempo!',
  tagline: "Solo da Ciccio's, solo vecchia scuola.",
  music: 'cartoonBoss',
  hp: OS.hp,
  phases: OS.phases,
  load(scene: Phaser.Scene, k: number): void {
    loadTextures(scene, k);
  },
  buildArena(scene: Phaser.Scene, k: number): Phaser.GameObjects.GameObject[] {
    return [
      worldSprite(scene, 0, 0, TEX.far, k).setOrigin(0, 0).setDepth(DEPTH.far),
      worldSprite(scene, 0, MID.y, TEX.mid, k).setOrigin(0, 0).setDepth(DEPTH.mid),
      worldSprite(scene, 0, NEAR.y, TEX.near, k).setOrigin(0, 0).setDepth(DEPTH.near),
    ];
  },
  create: createOldSchool,
  unload(scene: Phaser.Scene): void {
    unloadPrefix(scene, PRE);
  },
};
