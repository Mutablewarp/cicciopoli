/**
 * ITEMS art pack: pickups, worn power-ups, projectiles and generic FX shared by both levels.
 * Every key of ITEMS / ITEM_ANIMS in ./keys.ts is produced here. Drawing lives in ./items/
 * as pure Raster frames (no DOM), converted to canvases only at this boundary.
 */
import type { AnimDef, ArtPack } from '../contracts';
import { ITEMS, ITEM_ANIMS } from './keys';
import type { Raster } from './items/raster';
import { sheetOf } from './items/raster';
import { brieFrames, burgerFrames, friesFrames } from './items/food';
import { badgeRaster, cheeseShotFrames, provolaFrames } from './items/batter';
import { cheeseEngulfFrames, cheeseSplatFrames } from './items/cheese';
import { nuggetFrames } from './items/nugget';
import { burnFrames } from './items/burn';
import { clubFrames, thaiFrames } from './items/glaze';
import { crunchyFrames, wingsFrames } from './items/crunchy';
import { flameFrames } from './items/fire';
import { shieldFrames } from './items/aura';
import { crateBitsFrames, dustFrames, hitStarFrames, poofFrames, sparkleFrames } from './items/fx';
import { digitFrames } from './items/digits';

/** Sheet key -> frame builder, in manifest order. Exported for the pack's unit test. */
export const ITEM_SHEETS: readonly (readonly [string, () => Raster[]])[] = [
  [ITEMS.fries, friesFrames],
  [ITEMS.burger, burgerFrames],
  [ITEMS.brie, brieFrames],
  [ITEMS.provola, provolaFrames],
  [ITEMS.thai, thaiFrames],
  [ITEMS.crunchy, crunchyFrames],
  [ITEMS.cheeseShot, cheeseShotFrames],
  [ITEMS.cheeseSplat, cheeseSplatFrames],
  [ITEMS.club, clubFrames],
  [ITEMS.flame, flameFrames],
  [ITEMS.wings, wingsFrames],
  [ITEMS.shield, shieldFrames],
  [ITEMS.sparkle, sparkleFrames],
  [ITEMS.dust, dustFrames],
  [ITEMS.poof, poofFrames],
  [ITEMS.hitStar, hitStarFrames],
  [ITEMS.crateBits, crateBitsFrames],
  [ITEMS.digits, digitFrames],
  [ITEMS.nugget, nuggetFrames],
  [ITEMS.cheeseEngulf, cheeseEngulfFrames],
  [ITEMS.burn, burnFrames],
];

const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

function anim(key: string, sheet: string, frames: number, frameRate: number, loop: boolean): AnimDef {
  return { key, sheet, frames: range(frames), frameRate, repeat: loop ? -1 : 0 };
}

export const ITEM_ANIM_DEFS: readonly AnimDef[] = [
  anim(ITEM_ANIMS.fries, ITEMS.fries, 4, 8, true),
  anim(ITEM_ANIMS.burger, ITEMS.burger, 4, 8, true),
  anim(ITEM_ANIMS.brie, ITEMS.brie, 4, 8, true),
  anim(ITEM_ANIMS.provola, ITEMS.provola, 4, 8, true),
  anim(ITEM_ANIMS.thai, ITEMS.thai, 4, 8, true),
  anim(ITEM_ANIMS.crunchy, ITEMS.crunchy, 4, 8, true),
  anim(ITEM_ANIMS.cheeseShot, ITEMS.cheeseShot, 2, 12, true),
  anim(ITEM_ANIMS.cheeseSplat, ITEMS.cheeseSplat, 6, 14, false),
  anim(ITEM_ANIMS.flame, ITEMS.flame, 6, 14, true),
  anim(ITEM_ANIMS.wings, ITEMS.wings, 4, 12, true),
  anim(ITEM_ANIMS.shield, ITEMS.shield, 4, 8, true),
  anim(ITEM_ANIMS.sparkle, ITEMS.sparkle, 4, 16, false),
  anim(ITEM_ANIMS.dust, ITEMS.dust, 5, 16, false),
  anim(ITEM_ANIMS.poof, ITEMS.poof, 6, 16, false),
  anim(ITEM_ANIMS.hitStar, ITEMS.hitStar, 4, 20, false),
  anim(ITEM_ANIMS.nugget, ITEMS.nugget, 6, 10, true),
  anim(ITEM_ANIMS.cheeseEngulf, ITEMS.cheeseEngulf, 8, 14, false),
  anim(ITEM_ANIMS.burn, ITEMS.burn, 8, 14, false),
];

export function buildItemsArt(): ArtPack {
  return {
    name: 'items',
    sheets: ITEM_SHEETS.map(([key, frames]) => sheetOf(key, frames())),
    images: [{ key: ITEMS.badge, canvas: badgeRaster().canvas() }],
    tilesets: [],
    anims: [...ITEM_ANIM_DEFS],
  };
}
