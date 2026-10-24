/**
 * Level 6 art for the DOM screens: the side-view truck (title card, pre-run stage) and the driver portraits.
 * Only those two are rasterised, from the rush pack's raster manifest (src/art/rush/assets.ts): the full pack
 * (buildRushArt) is built by RushScene alone, so the title never blocks on it. Built once per session as data
 * URLs; a failed load is forgotten so the next screen tries again. Callers show pixel stand-ins meanwhile.
 */
import { RUSH } from '../../art/rush/keys';

export interface RushArt {
  /** RUSH.truckSide, 160x80, facing right */
  truck: string;
  /** RUSH.driverPortraits, three 32x32 frames side by side (null if the pack lacks it) */
  drivers: string | null;
}

let art: Promise<RushArt | null> | undefined;

async function load(): Promise<RushArt | null> {
  const [{ RUSH_IMAGES, RUSH_SHEETS }, { sheetCanvas }] = await Promise.all([import('../../art/rush/assets'), import('../../art/hills/raster')]);
  const truck = RUSH_IMAGES.find(([key]) => key === RUSH.truckSide)?.[1]();
  if (!truck) return null;
  const portraits = RUSH_SHEETS.find(([key]) => key === RUSH.driverPortraits)?.[1]();
  return { truck: truck.toCanvas().toDataURL(), drivers: portraits ? sheetCanvas(portraits).toDataURL() : null };
}

export function rushArt(): Promise<RushArt | null> {
  art ??= load()
    .catch(() => null)
    .then((a) => {
      if (!a) art = undefined;
      return a;
    });
  return art;
}
