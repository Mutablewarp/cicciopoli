/**
 * KITCHEN.layer (frame = layerFrame(kind): 0 bunBottom, 1 bunTop, 2 + INGREDIENTS index, as served)
 * and KITCHEN.layerCook (frame = layerCookFrame(kind, look): raw / burnt of the COOKABLE kinds).
 */
import type { Raster } from '../../hills/raster';
import { COOKABLE, INGREDIENTS, type IngredientId } from '../keys';
import { bunBottom, bunTop, cosciaPanko, manzo, polloCroccante, polloPastellato, vegetale } from './layerBase';
import { brie, cheddar, gorgonzola, provola, scamorza, taleggio, tuma } from './layerCheese';
import type { Look } from './layerKit';
import { fichi, nocciole, noci, pere, sauce } from './layerSweet';
import {
  bacon, capuliato, cipollaCaramellata, cipollaCroccante, guanciale, lattuga, pancetta, peperoncino, pomodoro, songino,
} from './layerTop';

type Cookable = (typeof COOKABLE)[number];

const COOK: Readonly<Record<Cookable, (look: Look) => Raster>> = {
  manzo, vegetale, bacon, guanciale, polloPastellato, polloCroccante, cosciaPanko,
};

const SERVED: Readonly<Record<Exclude<IngredientId, Cookable>, () => Raster>> = {
  cheddar, brie, provola, taleggio, tuma, scamorza, gorgonzola,
  pancetta, songino, lattuga, pomodoro, cipollaCaramellata, cipollaCroccante, capuliato, peperoncino,
  pere, fichi, nocciole, noci,
  salsaCiccios: () => sauce('salsaCiccios'),
  salsaWhite: () => sauce('salsaWhite'),
  salsaBbq: () => sauce('salsaBbq'),
  maionese: () => sauce('maionese'),
  salsaJalapeno: () => sauce('salsaJalapeno'),
};

const isCookable = (k: IngredientId): k is Cookable => (COOKABLE as readonly IngredientId[]).includes(k);

export function buildLayers(): Raster[] {
  return [bunBottom(), bunTop(), ...INGREDIENTS.map((k) => (isCookable(k) ? COOK[k]('served') : SERVED[k]()))];
}

export function buildLayerCook(): Raster[] {
  return COOKABLE.flatMap((k) => [COOK[k]('raw'), COOK[k]('burnt')]);
}
