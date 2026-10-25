/**
 * Stand-ins for every texture / animation of the 'kitchen' pack (sizes and frame counts straight
 * from the manifest, src/art/kitchen/keys.ts), so level 7 always runs, with simple coloured boxes,
 * when the pack failed to load or lacks a key. Plus the 2x2 particle pixel the scene uses itself.
 */
import type Phaser from 'phaser';
import { IMAGE_SPEC, KITCHEN_ANIMS, SHEET_SPEC, type KitchenLane } from '../../art/kitchen/keys';
import { ctxOf, makeCanvas } from '../../art/pixel';
import { ensureAnims, ensureTextures, type AnimSpec, type TexSpec } from '../placeholders';

/** White 2x2 pixel for tinted particles (confetti, crumbs, sauce drops). */
export const KITCHEN_PX = 'kitchen-scene-px';

const LANE_COLOR: Readonly<Record<KitchenLane, string>> = { counter: '#8a6a52', station: '#a8acb4', food: '#e0a050' };
/** Sprites that are mostly transparent in the real pack (fx over the stations): see-through stand-ins. */
const SEE_THROUGH = new Set(['kitchen-griddle-heat', 'kitchen-sizzle', 'kitchen-smoke', 'kitchen-sparkle', 'kitchen-gold-rays']);

const TEXTURES: readonly TexSpec[] = [
  ...Object.entries(SHEET_SPEC).map(([key, [w, h, frames, lane]]): TexSpec => ({ key, w, h, frames, kind: 'sheet', color: SEE_THROUGH.has(key) ? 'transparent' : LANE_COLOR[lane] })),
  ...Object.entries(IMAGE_SPEC).map(([key, [w, h, lane]]): TexSpec => ({ key, w, h, color: SEE_THROUGH.has(key) ? 'transparent' : LANE_COLOR[lane] })),
];

const ANIMS: readonly AnimSpec[] = Object.values(KITCHEN_ANIMS).map(([key, sheet, frames, frameRate, repeat]) => ({ key, sheet, frames: [...frames], frameRate, repeat }));

/** Registers stand-ins for whatever the pack did not provide; returns the missing keys. */
export function ensureKitchenArt(scene: Phaser.Scene): string[] {
  const missing = ensureTextures(scene, TEXTURES);
  ensureAnims(scene, ANIMS);
  if (!scene.textures.exists(KITCHEN_PX)) {
    const c = makeCanvas(2, 2);
    const ctx = ctxOf(c);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 2, 2);
    scene.textures.addCanvas(KITCHEN_PX, c);
  }
  return missing;
}
