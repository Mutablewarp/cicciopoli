import { describe, expect, it } from 'vitest';
import { ITEMS, ITEM_ANIMS } from '../keys';
import { PAL } from '../pixel';
import { ITEM_ANIM_DEFS, ITEM_SHEETS } from '../items';
import { badgeRaster } from './cheese';
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
};

const build = (): Map<string, Raster[]> => new Map(ITEM_SHEETS.map(([key, frames]) => [key, frames()]));
const opaque = (r: Raster): number => r.data.filter((_, i) => i % 4 === 3 && r.data[i] > 0).length;

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
});
