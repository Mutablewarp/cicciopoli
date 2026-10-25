/**
 * Level 7 "CICCIO'S KITCHEN" art pack: the counter view (Sperlinga dining room, La Lumia steel
 * counter, bulb beam, neon, customers, golden award), the kitchen stations (worktop, griddle,
 * fryer, bins, tray, fx) and the food (bin contents, burger layers, cooking states, sides, drinks,
 * sauces). Every key of KITCHEN in ./kitchen/keys.ts is produced by exactly one of the three lists.
 */
import type { ArtPack } from '../contracts';
import { sheetCanvas } from './hills/raster';
import { COUNTER_IMAGES, COUNTER_SHEETS } from './kitchen/counter';
import { FOOD_IMAGES, FOOD_SHEETS } from './kitchen/food';
import { KITCHEN_ANIMS } from './kitchen/keys';
import { STATION_IMAGES, STATION_SHEETS } from './kitchen/station';

export const KITCHEN_SHEET_LIST = [...COUNTER_SHEETS, ...STATION_SHEETS, ...FOOD_SHEETS];
export const KITCHEN_IMAGE_LIST = [...COUNTER_IMAGES, ...STATION_IMAGES, ...FOOD_IMAGES];

export function buildKitchenArt(): ArtPack {
  return {
    name: 'kitchen',
    sheets: KITCHEN_SHEET_LIST.map(([key, build]) => {
      const frames = build();
      return { key, canvas: sheetCanvas(frames), frameWidth: frames[0].w, frameHeight: frames[0].h };
    }),
    images: KITCHEN_IMAGE_LIST.map(([key, build]) => ({ key, canvas: build().toCanvas() })),
    tilesets: [],
    anims: Object.values(KITCHEN_ANIMS).map(([key, sheet, frames, frameRate, repeat]) => ({
      key,
      sheet,
      frames: [...frames],
      frameRate,
      repeat,
    })),
  };
}
