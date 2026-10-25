/**
 * KITCHEN-STATION-ART lane: the CUCINA equipment of level 7 seen 3/4 top-down (worktop, back wall,
 * griddle, fryer, pans, paper, wrap, tray, drinks rack, pedal bin) and the kitchen fx (steam, smoke,
 * sizzle, sparkle, the tutorial hand). Every 'station' key of SHEET_SPEC / IMAGE_SPEC in ../keys.ts,
 * as Raster builders (no DOM: tests run in node).
 */
import type { Raster } from '../../hills/raster';
import { KITCHEN } from '../keys';
import { buildFryOil, buildFryer, buildBasket } from './fryer';
import { buildPointer, buildSizzle, buildSmoke, buildSparkle, buildSteam } from './fx';
import { buildGriddle, buildGriddleHeat } from './griddle';
import { buildShelf, buildTrash, buildTray } from './serve';
import { buildWallTiles, buildWorktop } from './surfaces';
import { buildBin, buildPaper, buildWrap } from './ware';

/** Fingertip hot spot of the tutorial hand (frame 0), for the game to aim the pointer. */
export { POINTER_TIP } from './fx';
/** Rim of the fryer basket inside a basket frame (the game centres the fryItem and the oil well on it). */
export { BASKET_MOUTH } from './fryer';

export const STATION_SHEETS: readonly (readonly [string, () => Raster[]])[] = [
  [KITCHEN.griddleHeat, buildGriddleHeat],
  [KITCHEN.fryOil, buildFryOil],
  [KITCHEN.basket, buildBasket],
  [KITCHEN.wrap, buildWrap],
  [KITCHEN.trash, buildTrash],
  [KITCHEN.steam, buildSteam],
  [KITCHEN.smoke, buildSmoke],
  [KITCHEN.sizzle, buildSizzle],
  [KITCHEN.sparkle, buildSparkle],
  [KITCHEN.pointer, buildPointer],
];

export const STATION_IMAGES: readonly (readonly [string, () => Raster])[] = [
  [KITCHEN.worktop, buildWorktop],
  [KITCHEN.wallTiles, buildWallTiles],
  [KITCHEN.griddle, buildGriddle],
  [KITCHEN.fryer, buildFryer],
  [KITCHEN.bin, buildBin],
  [KITCHEN.paper, buildPaper],
  [KITCHEN.tray, buildTray],
  [KITCHEN.shelf, buildShelf],
];
