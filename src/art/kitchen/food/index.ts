/**
 * KITCHEN-FOOD-ART lane: the food of level 7 (every ingredient in its pan, the side-view burger
 * layers, the griddle / fryer cooking states, the white paper boats of fries and starters, drinks, sauce bottles).
 * Every 'food' key of SHEET_SPEC / IMAGE_SPEC in ../keys.ts, as Raster builders (no DOM).
 */
import type { Raster } from '../../hills/raster';
import { KITCHEN } from '../keys';
import { buildBinBun, buildBinFill } from './bins';
import { buildDrinks, buildSauces } from './bottles';
import { buildBinSide, buildFryItems } from './fried';
import { buildGriddleItems } from './griddleItems';
import { buildLayerCook, buildLayers } from './layers';
import { buildCone, buildStarterBox } from './sides';

export const FOOD_SHEETS: readonly (readonly [string, () => Raster[]])[] = [
  [KITCHEN.binFill, buildBinFill],
  [KITCHEN.binSide, buildBinSide],
  [KITCHEN.layer, buildLayers],
  [KITCHEN.layerCook, buildLayerCook],
  [KITCHEN.griddleItem, buildGriddleItems],
  [KITCHEN.fryItem, buildFryItems],
  [KITCHEN.cone, buildCone],
  [KITCHEN.starterBox, buildStarterBox],
  [KITCHEN.drink, buildDrinks],
  [KITCHEN.sauce, buildSauces],
];

export const FOOD_IMAGES: readonly (readonly [string, () => Raster])[] = [[KITCHEN.binBun, buildBinBun]];
