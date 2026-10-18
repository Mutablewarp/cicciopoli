/**
 * Level 5 "SPACCA TUTTO" world art pack (theme 'rampage'): smashed-up Palermo street at a comic
 * dusk. Every key of RAMPAGE / RAMPAGE_ANIMS in keys.ts is produced here; helpers live in ./rampage/.
 */
import type { AnimDef, ArtPack } from '../contracts';
import { RAMPAGE, RAMPAGE_ANIMS, TILE } from './keys';
import { sheetCanvas } from './hills/raster';
import { RAMPAGE_IMAGES, RAMPAGE_SHEETS } from './rampage/assets';
import { buildRampageTiles } from './rampage/tiles';

function loop(key: string, sheet: string, frames: number[], frameRate: number): AnimDef {
  return { key, sheet, frames, frameRate, repeat: -1 };
}

export function buildRampageArt(): ArtPack {
  return {
    name: 'rampage',
    sheets: RAMPAGE_SHEETS.map(([key, build]) => {
      const frames = build();
      return { key, canvas: sheetCanvas(frames), frameWidth: frames[0].w, frameHeight: frames[0].h };
    }),
    images: RAMPAGE_IMAGES.map(([key, build]) => ({ key, canvas: build().toCanvas() })),
    tilesets: [{ key: RAMPAGE.tiles, canvas: buildRampageTiles().toCanvas(), tileSize: TILE }],
    anims: [
      loop(RAMPAGE_ANIMS.flag, RAMPAGE.flag, [0, 1, 2, 3], 8),
      loop(RAMPAGE_ANIMS.flagCloth, RAMPAGE.flagCloth, [0, 1, 2, 3], 12),
      loop(RAMPAGE_ANIMS.checkpointOn, RAMPAGE.checkpoint, [1, 2, 3], 8),
      loop(RAMPAGE_ANIMS.bruteWalk, RAMPAGE.brute, [0, 1, 2, 3], 8),
      loop(RAMPAGE_ANIMS.megaburgerWalk, RAMPAGE.megaburger, [0, 1, 2, 3], 6),
    ],
  };
}
