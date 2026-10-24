/** Scenery per zone: road strips (./road), side strips and the wide-view fillers (one module per zone). */
import type { Raster } from '../hills/raster';
import { centroSide } from './centro';
import type { RushZone } from './keys';
import { mareFill, mareSide } from './mare';
import { stadioFill, stadioSide } from './stadio';
import { centroFill, terrasiniFill } from './town';

export { buildRoad } from './road';

/**
 * Sizes differ from the keys.ts manifest: the centro and mare left strips are 128 x SIDE_L_H (./street:
 * their landmark once per period), every filler is 256x256 (varied blocks, no visible grid).
 * Scenery keys beyond the manifest: 'sideRPlain' 128x256 = the right strip without the Ciccio's
 * storefront, to tile while the strip with it is drawn once as the landmark (rows in ./street
 * STOREFRONT); 'fillR' = the filler beyond the right strip (Terrasini: the old town, not the sea;
 * centro / stadio: another district / part of the park than 'fill', so the sides never mirror).
 */
export type ExtraPart = 'sideRPlain' | 'fillR';

export function extraKey(zone: RushZone, part: ExtraPart): string {
  return `rush-${part}-${zone}`;
}

const SIDES: Readonly<Record<RushZone, (side: 'L' | 'R', shop: boolean) => Raster>> = { centro: centroSide, stadio: stadioSide, mare: mareSide };
const FILLS: Readonly<Record<RushZone, (side: 'L' | 'R') => Raster>> = {
  centro: centroFill,
  stadio: stadioFill,
  mare: (side) => (side === 'L' ? mareFill() : terrasiniFill()),
};

export function buildSide(zone: RushZone, side: 'L' | 'R', shop = true): Raster {
  return SIDES[zone](side, shop);
}

export function buildFill(zone: RushZone, side: 'L' | 'R' = 'L'): Raster {
  return FILLS[zone](side);
}
