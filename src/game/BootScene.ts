import Phaser from 'phaser';
import type { ArtPack } from '../contracts';
import { registerArtPack } from '../art/register';

/** Registry key holding the ArtPacks built by main.ts before Phaser boots (ciccio + items). */
export const BASE_PACKS_KEY = 'basePacks';

/**
 * Registers the always-needed textures (Ciccio, items, FX). Level-specific art
 * (hills / inferno) is built lazily by GameScene when a level opens.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'boot' });
  }

  create(): void {
    const packs = (this.registry.get(BASE_PACKS_KEY) as ArtPack[] | undefined) ?? [];
    for (const p of packs) registerArtPack(this, p);
    this.game.events.emit('boot-ready');
  }
}
