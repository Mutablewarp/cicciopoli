/**
 * Level 8 shared art loading (CORE lane): the bitmaps of api.ts ImageAsset (the hero's HERO_ASSETS, a boss's
 * BossDef.assets) through the Phaser loader, the hero + shot / FX textures of the HERO lane
 * (src/game/cartoon/hero/index.ts) at the round's texture scale, and the owner's ORIGINAL face logo for the
 * golden ticket.
 */
import type Phaser from 'phaser';
import { FX, type ImageAsset } from './api';
import { unloadPrefix } from './draw/canvas';
import { HERO_ASSETS, loadHero } from './hero';
import { HERO_SHEET } from './hero/config';
import { CT_ASSETS } from '../../config/cartoon';

const LOGO: ImageAsset = { key: 'ct-core-logo', url: 'brand/ciccio-face-hd.png' };

/** Texture scale the hero art is drawn at (textures outlive the scene; 0 = not drawn yet). */
let heroK = 0;

/**
 * Loads the bitmaps not in the texture manager yet (urls relative to the site root); resolves when the loader is
 * done or after CT_ASSETS.timeoutMs. A file that fails or hangs is skipped: its texture is missing and the art
 * that wanted it falls back (a boss whose load() throws becomes the stand-in).
 */
export function preloadImages(scene: Phaser.Scene, list: readonly ImageAsset[], onProgress?: (p: number) => void): Promise<void> {
  const todo = list.filter((a) => !scene.textures.exists(a.key));
  if (todo.length === 0) return Promise.resolve();
  const load = scene.load;
  return new Promise((resolve) => {
    const progress = (p: number): void => onProgress?.(p);
    const failed = (file: { key: string; src?: string }): void => console.warn(`[cicciopoli] level 8 art not loaded: ${file.key} ${file.src ?? ''}`);
    const done = (): void => {
      window.clearTimeout(timer);
      load.off('progress', progress);
      load.off('loaderror', failed);
      load.off('complete', done);
      resolve();
    };
    const timer = window.setTimeout(done, CT_ASSETS.timeoutMs);
    load.on('progress', progress);
    load.on('loaderror', failed);
    load.once('complete', done);
    for (const a of todo) load.image(a.key, `${import.meta.env.BASE_URL}${a.url}`);
    load.start();
  });
}

/** Draws the hero and the FX at `k` (its bitmaps already preloaded); nothing to do when they are drawn at `k`. */
export function loadHeroArt(scene: Phaser.Scene, k: number): number {
  if (heroReady(scene, k)) return heroK;
  try {
    loadHero(scene, k);
  } catch (err) {
    console.error('[cicciopoli] cartoon hero art failed', err);
  }
  heroK = k;
  return heroK;
}

/** The hero art is drawn at `k`. */
export function heroReady(scene: Phaser.Scene, k: number): boolean {
  return heroK === k && scene.textures.exists(HERO_SHEET);
}

/** Frees the hero sheet, the FX and the hero bitmaps (redrawn at another k, or leaving the level). */
export function unloadHeroArt(scene: Phaser.Scene): void {
  for (const prefix of [HERO_SHEET, ...Object.values(FX)]) unloadPrefix(scene, prefix);
  for (const a of HERO_ASSETS) if (scene.textures.exists(a.key)) scene.textures.remove(a.key);
  heroK = 0;
}

export function heroScale(): number {
  return heroK || 1;
}

/** Loads public/brand/ciccio-face-hd.png once; resolves to its texture key, or null when it cannot load. */
export async function loadLogo(scene: Phaser.Scene): Promise<string | null> {
  await preloadImages(scene, [LOGO]);
  return scene.textures.exists(LOGO.key) ? LOGO.key : null;
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
