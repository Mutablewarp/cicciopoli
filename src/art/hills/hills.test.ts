import { describe, expect, it } from 'vitest';
import { buildArmor } from './armor';
import { buildChili } from './chili';
import { buildFlower, buildBush, buildTree } from './flora';
import { buildCheckpoint, buildFlag, buildHole } from './goal';
import { buildPickle } from './pickle';
import { buildCrate, buildQBlock, buildRock, buildSign } from './props';
import { type Raster, packColor } from './raster';

const opaqueInRow = (r: Raster, y: number): boolean => {
  for (let x = 0; x < r.w; x++) if (r.get(x, y) !== 0) return true;
  return false;
};

describe('hills raster art (sizes from src/art/keys.ts)', () => {
  it('sheets have the contracted frame counts and sizes', () => {
    const cases: [Raster[], number, number, number][] = [
      [buildQBlock(), 16, 16, 5], [buildFlag(), 32, 64, 4], [buildCheckpoint(), 16, 32, 4],
      [buildFlower(), 8, 8, 4], [buildPickle(), 24, 24, 7], [buildChili(), 24, 24, 5], [buildArmor(), 32, 32, 6],
    ];
    for (const [frames, w, h, n] of cases) {
      expect(frames).toHaveLength(n);
      for (const f of frames) expect([f.w, f.h]).toEqual([w, h]);
    }
  });

  it('images have the contracted sizes', () => {
    const sizes = [buildCrate(), buildHole(), buildTree(), buildBush(), buildRock(), buildSign()].map((r) => [r.w, r.h]);
    expect(sizes).toEqual([[16, 16], [32, 10], [32, 48], [32, 16], [16, 8], [16, 16]]);
  });

  it('flag pole base is at (8,63) in every frame', () => {
    for (const f of buildFlag()) expect(f.get(8, 63)).not.toBe(0);
  });

  it('props and enemies stand on the bottom row of their frame', () => {
    const grounded = [...buildPickle().slice(0, 6), ...buildChili().slice(0, 3), ...buildArmor(), buildHole(), buildTree(), buildRock()];
    for (const f of grounded) expect(opaqueInRow(f, f.h - 1) || opaqueInRow(f, f.h - 2)).toBe(true);
  });

  it('enemies face left (eyes / grin left of centre)', () => {
    const white = packColor('#fcfcf0');
    for (const f of [...buildPickle().slice(0, 6), ...buildChili().slice(0, 4), ...buildArmor().slice(0, 4)]) {
      let sum = 0;
      let n = 0;
      for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) if (f.get(x, y) === white) { sum += x; n++; }
      expect(n).toBeGreaterThan(0);
      expect(sum / n).toBeLessThan(f.w / 2);
    }
  });

  it('is deterministic', () => {
    const a = [...buildPickle(), ...buildChili(), ...buildArmor(), buildTree()];
    const b = [...buildPickle(), ...buildChili(), ...buildArmor(), buildTree()];
    a.forEach((r, i) => expect(Array.from(r.px)).toEqual(Array.from(b[i].px)));
  });
});
