// STUB (integrator) — replaced by the ITEMS agent. Flat placeholder art so the game boots.
import type { ArtPack, SheetDef } from '../contracts';
import { ITEMS, ITEM_ANIMS } from './keys';
import { buildFrames, makeCanvas, rect, ctxOf, PAL } from './pixel';

function flat(key: string, w: number, h: number, frames: number, color: string): SheetDef {
  return { key, canvas: buildFrames(frames, w, h, (ctx) => rect(ctx, 1, 1, w - 2, h - 2, color)), frameWidth: w, frameHeight: h };
}

export function buildItemsArt(): ArtPack {
  const badge = makeCanvas(8, 8);
  rect(ctxOf(badge), 1, 1, 6, 6, PAL.cheese);
  const sheets: SheetDef[] = [
    flat(ITEMS.fries, 16, 16, 4, PAL.fry),
    flat(ITEMS.burger, 16, 16, 4, PAL.bun),
    flat(ITEMS.brie, 16, 16, 4, PAL.creamLight),
    flat(ITEMS.provola, 16, 16, 4, PAL.cheese),
    flat(ITEMS.thai, 16, 16, 4, PAL.tomato),
    flat(ITEMS.crunchy, 24, 16, 4, PAL.bunDark),
    flat(ITEMS.cheeseShot, 12, 8, 2, PAL.cheese),
    flat(ITEMS.cheeseSplat, 24, 16, 6, PAL.cheeseLight),
    flat(ITEMS.club, 24, 24, 1, PAL.tomato),
    flat(ITEMS.flame, 16, 24, 6, PAL.lavaOrange),
    flat(ITEMS.wings, 32, 24, 4, PAL.bun),
    flat(ITEMS.shield, 48, 48, 4, 'rgba(252,240,216,0.25)'),
    flat(ITEMS.sparkle, 8, 8, 4, PAL.creamLight),
    flat(ITEMS.dust, 8, 8, 5, PAL.creamShade),
    flat(ITEMS.poof, 16, 16, 6, PAL.creamLight),
    flat(ITEMS.hitStar, 16, 16, 4, PAL.qOrangeLight),
    flat(ITEMS.crateBits, 8, 8, 4, PAL.bunDark),
    flat(ITEMS.digits, 6, 8, 12, PAL.cream),
  ];
  const loop = (key: string, sheet: string, frames: number[], rate: number, repeat = -1) => ({ key, sheet, frames, frameRate: rate, repeat });
  return {
    name: 'items',
    sheets,
    images: [{ key: ITEMS.badge, canvas: badge }],
    tilesets: [],
    anims: [
      loop(ITEM_ANIMS.fries, ITEMS.fries, [0, 1, 2, 3], 8),
      loop(ITEM_ANIMS.burger, ITEMS.burger, [0, 1, 2, 3], 8),
      loop(ITEM_ANIMS.brie, ITEMS.brie, [0, 1, 2, 3], 8),
      loop(ITEM_ANIMS.provola, ITEMS.provola, [0, 1, 2, 3], 8),
      loop(ITEM_ANIMS.thai, ITEMS.thai, [0, 1, 2, 3], 8),
      loop(ITEM_ANIMS.crunchy, ITEMS.crunchy, [0, 1, 2, 3], 8),
      loop(ITEM_ANIMS.cheeseShot, ITEMS.cheeseShot, [0, 1], 12),
      loop(ITEM_ANIMS.cheeseSplat, ITEMS.cheeseSplat, [0, 1, 2, 3, 4, 5], 14, 0),
      loop(ITEM_ANIMS.flame, ITEMS.flame, [0, 1, 2, 3, 4, 5], 14),
      loop(ITEM_ANIMS.wings, ITEMS.wings, [0, 1, 2, 3], 12),
      loop(ITEM_ANIMS.shield, ITEMS.shield, [0, 1, 2, 3], 8),
      loop(ITEM_ANIMS.sparkle, ITEMS.sparkle, [0, 1, 2, 3], 16, 0),
      loop(ITEM_ANIMS.dust, ITEMS.dust, [0, 1, 2, 3, 4], 16, 0),
      loop(ITEM_ANIMS.poof, ITEMS.poof, [0, 1, 2, 3, 4, 5], 16, 0),
      loop(ITEM_ANIMS.hitStar, ITEMS.hitStar, [0, 1, 2, 3], 20, 0),
    ],
  };
}
