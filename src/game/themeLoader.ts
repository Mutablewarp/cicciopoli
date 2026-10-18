/**
 * Lazy theme art: the level pack (hills / inferno / rampage, plus the level 5 hero `hulk`) is
 * code-split and built only when its level opens. A pack that fails to build is reported (the
 * scene shows an error and goes back to the menu), its gaps are filled with placeholders so
 * nothing crashes, and it is built again the next time the level opens.
 */
import type Phaser from 'phaser';
import type { ArtPack, CiccioArtPack, GameUI } from '../contracts';
import { registerArtPack } from '../art/register';
import { ensureAnims, ensureTextures } from './placeholders';
import { BASE_ANIMS, BASE_REQUIRED, type ThemeConfig } from './themes';

const ART_MODULES = import.meta.glob('../art/{hills,inferno,rampage,hulk}.ts');

type ArtRef = ThemeConfig['art'][number];

export interface ThemeLoad {
  /** texture keys that fell back to placeholders */
  missing: string[];
  /** art modules that could not be built (retried on the next call) */
  failed: string[];
}

/** Registry key of a hero pack built here, so the scene can read its anchors (also after a restart). */
export const heroPackKey = (name: string): string => `pack:${name}`;
const builtKey = (ref: ArtRef): string => `built:${ref.module}`;
/** Registry key of the set of texture keys currently held by placeholders. */
const PLACEHOLDERS = 'placeholder-keys';

function placeholders(scene: Phaser.Scene): Set<string> {
  let set = scene.registry.get(PLACEHOLDERS) as Set<string> | undefined;
  if (!set) {
    set = new Set();
    scene.registry.set(PLACEHOLDERS, set);
  }
  return set;
}

/** Art packs of the theme that are not built yet (a failed one counts as not built). */
function pending(scene: Phaser.Scene, theme: ThemeConfig): ArtRef[] {
  return theme.art.filter((ref) => scene.registry.get(builtKey(ref)) !== true);
}

/** True when opening the theme has to build art (so the loading screen is worth showing). */
export function needsArt(scene: Phaser.Scene, theme: ThemeConfig): boolean {
  return pending(scene, theme).length > 0;
}

/** Lets the loading bar paint between heavy synchronous steps. */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function buildPack(ref: ArtRef): Promise<ArtPack> {
  const load = ART_MODULES[ref.module];
  if (!load) throw new Error(`no art module ${ref.module}`);
  const build = ((await load()) as Record<string, unknown>)[ref.builder];
  if (typeof build !== 'function') throw new Error(`${ref.module} has no ${ref.builder}`);
  return (build as () => ArtPack)();
}

/** Frees the keys a pack is about to fill: an earlier failed try left placeholders there. */
function dropPlaceholders(scene: Phaser.Scene, pack: ArtPack): void {
  const held = placeholders(scene);
  for (const a of pack.anims) {
    if (held.has(a.sheet) && scene.anims.exists(a.key)) scene.anims.remove(a.key);
  }
  for (const d of [...pack.sheets, ...pack.images, ...pack.tilesets]) {
    if (held.delete(d.key)) scene.textures.remove(d.key);
  }
}

export interface LoadOptions {
  /** goes false when the caller was cancelled (menu / restart while loading): the load then stops at once and never touches the loading screen again */
  alive?: () => boolean;
  /** how a pack is built (tests swap it) */
  build?: (ref: ArtRef) => Promise<ArtPack>;
}

/** Registers the theme packs (once per session) and fills any gap with placeholders. */
export async function loadThemeArt(scene: Phaser.Scene, theme: ThemeConfig, ui: GameUI, opts: LoadOptions = {}): Promise<ThemeLoad> {
  const { alive = () => true, build = buildPack } = opts;
  const failed: string[] = [];
  const todo = pending(scene, theme);
  if (todo.length > 0) {
    ui.setLoading(0.4, theme.loadingText);
    await nextFrame();
    for (const [i, ref] of todo.entries()) {
      if (!alive()) break;
      try {
        const pack = await build(ref);
        dropPlaceholders(scene, pack);
        registerArtPack(scene, pack);
        if ('anchors' in pack) scene.registry.set(heroPackKey(pack.name), pack as CiccioArtPack);
        scene.registry.set(builtKey(ref), true);
      } catch (err) {
        failed.push(ref.module);
        console.error('[cicciopoli] theme art failed', ref.module, err);
      }
      if (!alive()) break;
      ui.setLoading(0.4 + (0.5 * (i + 1)) / todo.length, theme.loadingText);
      await nextFrame();
    }
  }
  const missing = [...ensureTextures(scene, BASE_REQUIRED), ...ensureTextures(scene, theme.required)];
  missing.forEach((key) => placeholders(scene).add(key));
  ensureAnims(scene, BASE_ANIMS);
  ensureAnims(scene, theme.anims);
  return { missing, failed };
}
