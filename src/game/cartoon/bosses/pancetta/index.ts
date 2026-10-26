/**
 * Boss 2 · PANCETTA LO SKATER (the PANCETTA shirt): the pig in dungarees and a knotted bandana crouching
 * on his skateboard, cut from the shirt's line art (PANCETTA_ASSETS), in a skatepark on the Palermo
 * seafront. Phase 0 on the floor, phase 1 up on the half-pipe in the background. BOSS-A lane.
 */
import type { BossDef } from '../../api';
import { unloadPrefix } from '../../draw/canvas';
import { runBoss } from '../brie/kit/runner';
import { PANCETTA as C } from './config';
import { KEY, PANCETTA_ASSETS, PREFIX, buildArena, loadPancetta } from './look';
import { PANCETTA_BRAIN } from './patterns';
import { makePancettaRig } from './rig';

export const PANCETTA: BossDef = {
  id: 'pancetta',
  name: 'PANCETTA LO SKATER',
  intro: 'Pancetta scende in pista!',
  tagline: 'Il re dello skatepark del lungomare.',
  music: 'cartoonBoss',
  hp: C.hp,
  phases: C.phases,
  assets: PANCETTA_ASSETS,
  load: loadPancetta,
  buildArena,
  create: (world) =>
    runBoss(world, PANCETTA_BRAIN, makePancettaRig(world), {
      mark: KEY.mark,
      alert: KEY.alert,
      alertY: (phase) => (phase === 0 ? 176 : 150),
      telegraphSfx: 'ex',
      phaseLine: 'Salgo sulla rampa… guardami volare!',
      lines: {
        board: 'Kickflip!',
        stomp: 'Ollie!',
        bacon: 'Pancetta al vento!',
        dive: 'Tuffo dalla rampa!',
        rain: 'Piovono ruote!',
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
