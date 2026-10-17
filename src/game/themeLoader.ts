/**
 * Lazy theme art: the level pack (hills / inferno) is code-split and built only when
 * its level opens. Any failure falls back to placeholders, never to a crash.
 */
import type Phaser from 'phaser';
import type { ArtPack, GameUI } from '../contracts';
import { registerArtPack } from '../art/register';
import { ensureAnims, ensureTextures } from './placeholders';
import { BASE_ANIMS, BASE_REQUIRED, type ThemeConfig } from './themes';

const ART_MODULES = import.meta.glob('../art/{hills,inferno}.ts');

/** Lets the loading bar paint between heavy synchronous steps. */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function buildPack(ref: ThemeConfig['art'][number]): Promise<ArtPack | null> {
  const load = ART_MODULES[ref.module];
  if (!load) return null;
  const mod = (await load()) as Record<string, unknown>;
  const build = mod[ref.builder];
  if (typeof build !== 'function') return null;
  return (build as () => ArtPack)();
}

/** Registers the theme packs (once per session) and fills any gap with placeholders. */
export async function loadThemeArt(scene: Phaser.Scene, theme: ThemeConfig, ui: GameUI): Promise<string[]> {
  if (!scene.textures.exists(theme.tileset)) {
    ui.setLoading(0.4, theme.loadingText);
    await nextFrame();
    for (const [i, ref] of theme.art.entries()) {
      if (ref.skipIf && scene.textures.exists(ref.skipIf)) continue; // already built by another level
      try {
        const pack = await buildPack(ref);
        if (pack) registerArtPack(scene, pack);
      } catch (err) {
        console.error('[cicciopoli] theme art failed, using placeholders', ref.module, err);
      }
      ui.setLoading(0.4 + (0.5 * (i + 1)) / theme.art.length, theme.loadingText);
      await nextFrame();
    }
  }
  const missing = [...ensureTextures(scene, BASE_REQUIRED), ...ensureTextures(scene, theme.required)];
  ensureAnims(scene, BASE_ANIMS);
  ensureAnims(scene, theme.anims);
  return missing;
}
