/**
 * The pixel keys that have a HIGH-RESOLUTION brand stand-in (src/game/kitchen/brand: the kraft wrap,
 * the paper boats, the face disc with the owner's original logo): the same frames, shown at the
 * art size with brandScale(). Missing brand textures (no logo file, no canvas) = the pixel art.
 */
import type Phaser from 'phaser';
import { KITCHEN } from '../../art/kitchen/keys';
import { BRAND, brandScale, type BrandPiece } from './brand';

const PIECE: Readonly<Partial<Record<string, BrandPiece>>> = {
  [KITCHEN.wrap]: 'wrap',
  [KITCHEN.cone]: 'cone',
  [KITCHEN.starterBox]: 'starterBox',
  [KITCHEN.faceDisc]: 'faceDisc',
};

/** Texture to show for a pixel key, and the factor its art scale is multiplied by. */
export function hiRes(scene: Phaser.Scene, key: string): { key: string; k: number } {
  const piece = PIECE[key];
  if (!piece || !scene.textures.exists(BRAND[piece])) return { key, k: 1 };
  return { key: BRAND[piece], k: brandScale(scene, piece) };
}

/** Shows `key` (or its hi-res stand-in) at `frame` and art scale `scale` on a sprite. */
export function showHiRes<T extends Phaser.GameObjects.Sprite>(s: T, key: string, frame: number, scale: number): T {
  const h = hiRes(s.scene, key);
  if (s.texture.key !== h.key) s.setTexture(h.key, frame);
  else s.setFrame(frame);
  return s.setScale(scale * h.k);
}
