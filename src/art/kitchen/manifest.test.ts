import { describe, expect, it } from 'vitest';
import type { Raster } from '../hills/raster';
import { COUNTER_IMAGES, COUNTER_SHEETS } from './counter';
import { FOOD_IMAGES, FOOD_SHEETS } from './food';
import { IMAGE_SPEC, KITCHEN, KITCHEN_ANIMS, SHEET_SPEC, type KitchenLane } from './keys';
import { STATION_IMAGES, STATION_SHEETS } from './station';

type SheetList = readonly (readonly [string, () => Raster[]])[];
type ImageList = readonly (readonly [string, () => Raster])[];

const LANES: Record<KitchenLane, { sheets: SheetList; images: ImageList }> = {
  counter: { sheets: COUNTER_SHEETS, images: COUNTER_IMAGES },
  station: { sheets: STATION_SHEETS, images: STATION_IMAGES },
  food: { sheets: FOOD_SHEETS, images: FOOD_IMAGES },
};

const opaque = (r: Raster): number => r.px.reduce((n, c) => n + (c !== 0 ? 1 : 0), 0);

describe('kitchen art manifest (integrator contract)', () => {
  it('every KITCHEN key is specified exactly once', () => {
    const specified = [...Object.keys(SHEET_SPEC), ...Object.keys(IMAGE_SPEC)].sort();
    expect(specified).toEqual(Object.values(KITCHEN).sort());
  });

  for (const lane of Object.keys(LANES) as KitchenLane[]) {
    it(`${lane} lane builds exactly its sheets, right frame size and count, none blank`, () => {
      const want = Object.entries(SHEET_SPEC).filter(([, s]) => s[3] === lane).map(([k]) => k).sort();
      expect(LANES[lane].sheets.map(([k]) => k).sort()).toEqual(want);
      for (const [key, build] of LANES[lane].sheets) {
        const [w, h, n] = SHEET_SPEC[key];
        const frames = build();
        expect(frames.length, key).toBe(n);
        frames.forEach((f, i) => {
          expect([f.w, f.h], `${key}[${i}]`).toEqual([w, h]);
          expect(opaque(f), `${key}[${i}] is blank`).toBeGreaterThan(0);
        });
      }
    });

    it(`${lane} lane builds exactly its images, right size, none blank`, () => {
      const want = Object.entries(IMAGE_SPEC).filter(([, s]) => s[2] === lane).map(([k]) => k).sort();
      expect(LANES[lane].images.map(([k]) => k).sort()).toEqual(want);
      for (const [key, build] of LANES[lane].images) {
        const r = build();
        expect([r.w, r.h], key).toEqual(IMAGE_SPEC[key].slice(0, 2));
        expect(opaque(r), `${key} is blank`).toBeGreaterThan(0);
      }
    });
  }

  it('art is deterministic (same pixels on every build)', () => {
    for (const { sheets, images } of Object.values(LANES)) {
      for (const [key, build] of sheets) expect(build().map((f) => f.px.join()), key).toEqual(build().map((f) => f.px.join()));
      for (const [key, build] of images) expect(build().px.join(), key).toBe(build().px.join());
    }
  });

  it('animations point at existing frames', () => {
    for (const [key, sheet, frames] of Object.values(KITCHEN_ANIMS)) {
      const spec = SHEET_SPEC[sheet];
      expect(spec, key).toBeDefined();
      for (const f of frames) expect(f, key).toBeLessThan(spec[2]);
    }
  });

  it('seamless strips and fillers have no transparent pixels', () => {
    const solid = [KITCHEN.counterTop, KITCHEN.wallTiles, KITCHEN.worktop, KITCHEN.roomFill, KITCHEN.roomTall, KITCHEN.roomWide];
    const all = Object.values(LANES).flatMap((l) => l.images);
    for (const key of solid) {
      const r = all.find(([k]) => k === key)?.[1]();
      if (r) expect(opaque(r), key).toBe(r.w * r.h); // missing keys are reported by the per-lane tests
    }
  });
});
