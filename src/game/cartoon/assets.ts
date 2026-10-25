/**
 * Level 8 shared art loading (CORE lane): the hero + shot / FX textures of the HERO lane
 * (src/game/cartoon/hero/index.ts) at the round's texture scale, and the owner's ORIGINAL face logo
 * for the golden ticket.
 */
import type Phaser from 'phaser';
import { FX } from './api';
import { unloadPrefix } from './draw/canvas';
import { loadHero } from './hero';
import { HERO_SHEET } from './hero/config';

const LOGO_KEY = 'ct-core-logo';
const LOGO_URL = `${import.meta.env.BASE_URL}brand/ciccio-face-hd.png`;

/** Texture scale the hero art is drawn at (textures outlive the scene; 0 = not drawn yet). */
let heroK = 0;

/** Draws the hero and the FX at `k`; after a rotation to another k they are redrawn (no round is up then). */
export function loadHeroArt(scene: Phaser.Scene, k: number): number {
  if (heroK === k && scene.textures.exists(HERO_SHEET)) return heroK;
  for (const prefix of [HERO_SHEET, ...Object.values(FX)]) unloadPrefix(scene, prefix);
  try {
    loadHero(scene, k);
  } catch (err) {
    console.error('[cicciopoli] cartoon hero art failed', err);
  }
  heroK = k;
  return heroK;
}

export function heroScale(): number {
  return heroK || 1;
}

/** Loads public/brand/ciccio-face-hd.png once; resolves to its texture key, or null when it cannot load. */
export function loadLogo(scene: Phaser.Scene): Promise<string | null> {
  if (scene.textures.exists(LOGO_KEY)) return Promise.resolve(LOGO_KEY);
  return new Promise((resolve) => {
    const done = (): void => resolve(scene.textures.exists(LOGO_KEY) ? LOGO_KEY : null);
    scene.load.image(LOGO_KEY, LOGO_URL);
    scene.load.once('complete', done);
    scene.load.start();
  });
}

/** Plays `key-anim` once when it exists, else shows frame 0 of `key`. */
export function playFx(sprite: Phaser.GameObjects.Sprite, key: string): boolean {
  const a = `${key}-anim`;
  if (sprite.scene.anims.exists(a)) {
    sprite.play(a);
    return true;
  }
  sprite.setTexture(key);
  return false;
}
