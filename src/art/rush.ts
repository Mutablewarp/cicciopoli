/**
 * Level 6 "CICCIO'S RUSH" art pack: the Ciccio's burger truck (top-down, side view, flying,
 * floating in orbit for the finale), Palermo traffic, hazards, menu pickups, FX, deliveries,
 * driver portraits and the three zones of scenery. Every key of RUSH / RUSH_ANIMS / zoneKey in
 * ./rush/keys.ts is produced here; helpers live in ./rush/.
 */
import type { ArtPack } from '../contracts';
import { sheetCanvas } from './hills/raster';
import { RUSH_ANIM_LIST, RUSH_IMAGES, RUSH_SHEETS } from './rush/assets';

export function buildRushArt(): ArtPack {
  return {
    name: 'rush',
    sheets: RUSH_SHEETS.map(([key, build]) => {
      const frames = build();
      return { key, canvas: sheetCanvas(frames), frameWidth: frames[0].w, frameHeight: frames[0].h };
    }),
    images: RUSH_IMAGES.map(([key, build]) => ({ key, canvas: build().toCanvas() })),
    tilesets: [],
    anims: RUSH_ANIM_LIST.map(([key, sheet, frames, frameRate]) => ({ key, sheet, frames: [...frames], frameRate, repeat: -1 })),
  };
}
