/**
 * Boss 1 · MONSIEUR BRIE (the "Brie with friends" shirt): a brie wedge with a beret on a blue bicycle
 * along a country road. Phase 0 on the bike, phase 1 on foot and melting. BOSS-A lane.
 */
import type Phaser from 'phaser';
import type { BossDef } from '../../api';
import { unloadPrefix } from '../../draw/canvas';
import { runBoss } from './kit/runner';
import { BRIE as C } from './config';
import { buildArena } from './arena';
import { KEY, PREFIX, loadBrie } from './look';
import { BRIE_BRAIN } from './patterns';
import { makeBrieRig } from './rig';

export const BRIE: BossDef = {
  id: 'brie',
  name: 'MONSIEUR BRIE',
  intro: 'Monsieur Brie vuole il suo pane!',
  tagline: 'Brie with friends... ma tu non sei suo amico.',
  music: 'cartoonBoss',
  hp: C.hp,
  phases: C.phases,
  load: loadBrie,
  buildArena: (scene: Phaser.Scene, k: number) => buildArena(scene, k),
  create: (world) =>
    runBoss(world, BRIE_BRAIN, makeBrieRig(world), {
      mark: KEY.mark,
      alert: KEY.alert,
      alertY: (phase) => (phase === 0 ? 200 : 168),
      telegraphSfx: 'ex',
      phaseLine: 'Basta pedalare! Adesso mi sciolgo… di rabbia!',
      lines: {
        baguette: 'Baguette in arrivo!',
        charge: 'Drin drin! Largo!',
        beret: 'Attento al basco!',
        hop: 'Oplà!',
        javelin: 'Pane fresco, tutto per te!',
      },
      lineChance: 0.45,
      depthMarks: -5,
      depthAlert: 15,
      teleFlashMs: 70,
      hitFlashMs: 45,
      hitFlashGapMs: 110,
      teleBright: 1.75,
      hitBright: 1.4,
      easeMs: 110,
    }),
  unload: (scene) => unloadPrefix(scene, PREFIX),
};
