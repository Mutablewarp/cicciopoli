import { describe, expect, it } from 'vitest';
import { ITEMS, ITEM_ANIMS } from '../keys';
import { PAL } from '../pixel';
import { ITEM_ANIM_DEFS, ITEM_SHEETS } from '../items';
import { badgeRaster } from './batter';
import type { Raster } from './raster';

/** [frame width, frame height, frame count] required by keys.ts. */
const SPEC: Readonly<Record<string, readonly [number, number, number]>> = {
  [ITEMS.fries]: [16, 16, 4],
  [ITEMS.burger]: [16, 16, 4],
  [ITEMS.brie]: [16, 16, 4],
  [ITEMS.provola]: [16, 16, 4],
  [ITEMS.thai]: [16, 16, 4],
  [ITEMS.crunchy]: [24, 16, 4],
  [ITEMS.cheeseShot]: [12, 8, 2],
  [ITEMS.cheeseSplat]: [24, 16, 6],
  [ITEMS.club]: [24, 24, 1],
  [ITEMS.flame]: [16, 24, 6],
  [ITEMS.wings]: [32, 24, 4],
  [ITEMS.shield]: [48, 48, 4],
  [ITEMS.sparkle]: [8, 8, 4],
  [ITEMS.dust]: [8, 8, 5],
  [ITEMS.poof]: [16, 16, 6],
  [ITEMS.hitStar]: [16, 16, 4],
  [ITEMS.crateBits]: [8, 8, 4],
  [ITEMS.digits]: [6, 8, 12],
  [ITEMS.nugget]: [12, 12, 6],
  [ITEMS.cheeseEngulf]: [32, 32, 8],
  [ITEMS.burn]: [32, 32, 8],
};

const build = (): Map<string, Raster[]> => new Map(ITEM_SHEETS.map(([key, frames]) => [key, frames()]));
const opaque = (r: Raster): number => r.data.filter((_, i) => i % 4 === 3 && r.data[i] > 0).length;
/** Opaque pixels inside the 24x24 enemy box of the 32x32 kill FX (centred, bottom row 31). */
const enemyBoxCover = (r: Raster): number => {
  let n = 0;
  for (let y = 8; y < 32; y++) for (let x = 4; x < 28; x++) if (r.alpha(x, y) === 255) n++;
  return n / (24 * 24);
};
const width = (r: Raster): number => {
  const xs: number[] = [];
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) if (r.alpha(x, y) > 0) xs.push(x);
  return Math.max(...xs) - Math.min(...xs) + 1;
};

describe('items art pack', () => {
  const sheets = build();

  it('produces every ITEMS key with the manifest sizes and frame counts', () => {
    const keys = new Set([...sheets.keys(), ITEMS.badge]);
    expect(keys).toEqual(new Set(Object.values(ITEMS)));
    for (const [key, [w, h, n]] of Object.entries(SPEC)) {
      const frames = sheets.get(key) ?? [];
      expect(frames.length, key).toBe(n);
      for (const f of frames) {
        expect([f.w, f.h], key).toEqual([w, h]);
        expect(opaque(f), key).toBeGreaterThan(0);
      }
    }
    const badge = badgeRaster();
    expect([badge.w, badge.h]).toEqual([8, 8]);
  });

  it('declares every ITEM_ANIMS key on a valid sheet and frame range', () => {
    expect(new Set(ITEM_ANIM_DEFS.map((a) => a.key))).toEqual(new Set(Object.values(ITEM_ANIMS)));
    for (const a of ITEM_ANIM_DEFS) {
      const count = sheets.get(a.sheet)?.length ?? 0;
      expect(a.frames.every((f) => f < count), a.key).toBe(true);
    }
  });

  it('is deterministic and fast', () => {
    const t0 = performance.now();
    const again = build();
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(120);
    for (const [key, frames] of sheets) {
      frames.forEach((f, i) => expect(Array.from(again.get(key)?.[i].data ?? []), `${key}#${i}`).toEqual(Array.from(f.data)));
    }
  });

  it('keeps gameplay anchor points meaningful', () => {
    const club = sheets.get(ITEMS.club)?.[0];
    expect(club?.alpha(5, 19)).toBe(255); // grip sits on the bone handle
    expect(club?.is(5, 19, PAL.ink)).toBe(false);
    expect(club?.alpha(17, 6)).toBe(255); // meaty bulb up-right
    for (const f of sheets.get(ITEMS.shield) ?? []) expect(f.alpha(24, 26)).toBe(0); // face stays visible
    for (const f of sheets.get(ITEMS.wings) ?? []) expect(f.alpha(16, 12)).toBeGreaterThan(0); // attached at the shoulders
  });

  it('draws the v2 food FX the way gameplay uses them', () => {
    const engulf = sheets.get(ITEMS.cheeseEngulf) ?? [];
    expect(enemyBoxCover(engulf[3]), 'engulf#3 hides the enemy').toBe(1);
    expect(enemyBoxCover(engulf[4]), 'engulf#4 still hides it').toBe(1);
    expect(opaque(engulf[7])).toBeLessThan(opaque(engulf[6])); // puddle fading
    const burn = sheets.get(ITEMS.burn) ?? [];
    expect(enemyBoxCover(burn[3]), 'burn#3 flames over the silhouette').toBeGreaterThan(0.6);
    expect(enemyBoxCover(burn[0])).toBeLessThan(0.15); // starts small at the base
    const nugget = (sheets.get(ITEMS.nugget) ?? []).map(width);
    expect(nugget[0]).toBeGreaterThan(nugget[2]); // coin spin: squashes to the edge-on frame...
    expect(nugget[2]).toBeGreaterThan(nugget[3]);
    expect(nugget[4]).toBeGreaterThan(nugget[3]); // ...and opens up again
    for (const f of sheets.get(ITEMS.cheeseShot) ?? []) {
      expect(f.alpha(10, 4), 'stick at the front (right)').toBe(255);
      expect(f.alpha(1, 2) + f.alpha(1, 3)).toBeLessThan(255 * 2); // translucent streak trails behind (left)
    }
  });
});
