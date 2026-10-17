import Phaser from 'phaser';
import type { ArtPack, TilesetDef } from '../contracts';
import { ctxOf, makeCanvas } from './pixel';

/** Tileset extrusion: every tile gets a 1-px border copied from its own edge (stops seams). */
export const TILESET_MARGIN = 1;
export const TILESET_SPACING = 2;

function extrude(def: TilesetDef): HTMLCanvasElement {
  const { canvas: src, tileSize: t } = def;
  const cols = Math.floor(src.width / t);
  const rows = Math.floor(src.height / t);
  const step = t + TILESET_SPACING;
  const out = makeCanvas(cols * step, rows * step);
  const ctx = ctxOf(out);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const sx = c * t;
      const sy = r * t;
      const dx = c * step + TILESET_MARGIN;
      const dy = r * step + TILESET_MARGIN;
      ctx.drawImage(src, sx, sy, t, t, dx, dy, t, t);
      ctx.drawImage(src, sx, sy, t, 1, dx, dy - 1, t, 1); // top
      ctx.drawImage(src, sx, sy + t - 1, t, 1, dx, dy + t, t, 1); // bottom
      ctx.drawImage(src, sx, sy, 1, t, dx - 1, dy, 1, t); // left
      ctx.drawImage(src, sx + t - 1, sy, 1, t, dx + t, dy, 1, t); // right
      ctx.drawImage(src, sx, sy, 1, 1, dx - 1, dy - 1, 1, 1);
      ctx.drawImage(src, sx + t - 1, sy, 1, 1, dx + t, dy - 1, 1, 1);
      ctx.drawImage(src, sx, sy + t - 1, 1, 1, dx - 1, dy + t, 1, 1);
      ctx.drawImage(src, sx + t - 1, sy + t - 1, 1, 1, dx + t, dy + t, 1, 1);
    }
  }
  return out;
}

/**
 * Registers every texture and animation of a pack. Idempotent: keys that already
 * exist are skipped, so packs can be registered again after a scene restart.
 * Tilesets are stored under their key and must be added to tilemaps with
 * margin TILESET_MARGIN and spacing TILESET_SPACING.
 */
export function registerArtPack(scene: Phaser.Scene, pack: ArtPack): void {
  const tex = scene.textures;
  for (const s of pack.sheets) {
    if (tex.exists(s.key)) continue;
    tex.addSpriteSheet(s.key, s.canvas as unknown as HTMLImageElement, {
      frameWidth: s.frameWidth,
      frameHeight: s.frameHeight,
    });
  }
  for (const i of pack.images) {
    if (tex.exists(i.key)) continue;
    tex.addCanvas(i.key, i.canvas);
  }
  for (const t of pack.tilesets) {
    if (tex.exists(t.key)) continue;
    tex.addCanvas(t.key, extrude(t));
  }
  for (const a of pack.anims) {
    if (scene.anims.exists(a.key)) continue;
    scene.anims.create({
      key: a.key,
      frames: scene.anims.generateFrameNumbers(a.sheet, { frames: a.frames }),
      frameRate: a.frameRate,
      repeat: a.repeat,
      yoyo: a.yoyo ?? false,
    });
  }
}
