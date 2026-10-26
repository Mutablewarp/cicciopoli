/**
 * IL BOSS DELLA BURGER GANG — the final boss of level 8 (BOSS-D lane), registered in ../index.ts. He is cut out of
 * the owner's Burger Gang shirt (art/boss.ts). Three phases: soda fizz + sunglasses boomerangs; the gang jumps in
 * while he throws bursting cans; he gulps the soda, turns giant and shakes the rooftop.
 */
import type Phaser from 'phaser';
import { type BossDef, type BossWorld, KMAX } from '../../api';
import { unloadPrefix } from '../../draw/canvas';
import { buildArena, loadArena } from './art/arena';
import { BOSS_ASSETS, loadBossArt } from './art/boss';
import { loadProps } from './art/props';
import { BG, BG_ID, PRE } from './config';
import { createRuntime } from './runtime';

/** The boss parts are resampled sharper than k (the giant phase scales them up), never above KMAX. */
const bossK = (k: number): number => Math.min(k * BG.giant, KMAX);

export const BURGERGANG: BossDef = {
  id: BG_ID,
  name: 'IL BOSS DELLA BURGER GANG',
  intro: "Sul tetto di Ciccio's comanda la Burger Gang!",
  tagline: "Il capo della gang. L'ultimo ostacolo.",
  music: 'cartoonFinal',
  hp: BG.hp,
  phases: BG.phases,
  assets: BOSS_ASSETS,
  load(scene: Phaser.Scene, k: number): void {
    loadBossArt(scene, bossK(k), k);
    loadProps(scene, k);
    loadArena(scene, k);
  },
  buildArena(scene: Phaser.Scene, k: number): Phaser.GameObjects.GameObject[] {
    return buildArena(scene, k);
  },
  create(world: BossWorld) {
    return createRuntime(world, bossK(world.k));
  },
  unload(scene: Phaser.Scene): void {
    unloadPrefix(scene, PRE);
  },
};
