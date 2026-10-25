import { describe, expect, it } from 'vitest';
import { packColor } from '../../hills/raster';
import { STILL_FROM, buildBeam, buildCounterTop } from './counter';
import { KC } from './palette';
import { buildCounterProps } from './props';
import { buildRoomTall, buildRoomWide } from './room';

/** Rows of the corrugated canopy on top of the beam tile; the game and the DOM scenery tile them up to the ceiling. */
const CANOPY_ROWS = 10;
const row = (px: Uint32Array, w: number, y: number): number[] => Array.from(px.subarray(y * w, (y + 1) * w));
/** mean luma (0-255) of rows y0..y1-1 */
function luma(px: Uint32Array, w: number, y0: number, y1: number): number {
  let sum = 0;
  for (const c of px.subarray(y0 * w, y1 * w)) sum += 0.3 * ((c >>> 16) & 255) + 0.59 * ((c >>> 8) & 255) + 0.11 * (c & 255);
  return sum / ((y1 - y0) * w);
}

describe('beam canopy', () => {
  const [normal, flash] = buildBeam();

  it('is the same on every row, so it tiles upwards without seams', () => {
    for (let y = 1; y < CANOPY_ROWS; y++) expect(row(normal.px, normal.w, y)).toEqual(row(normal.px, normal.w, 0));
  });

  it('does not change in the flash frame (the ceiling above is always tiled from frame 0)', () => {
    for (let y = 0; y < CANOPY_ROWS; y++) expect(row(flash.px, flash.w, y)).toEqual(row(normal.px, normal.w, y));
  });

  it('flashes the bulbs', () => {
    expect(flash.px).not.toEqual(normal.px);
  });
});

describe('counter top', () => {
  const top = buildCounterTop();

  it('repeats every 4 rows from STILL_FROM, so the game tiles rows 52-55 on down the screen without a seam', () => {
    for (let y = STILL_FROM + 4; y < top.h; y++) expect(row(top.px, top.w, y)).toEqual(row(top.px, top.w, y - 4));
  });

  it('goes on down as darker polished steel, as in the photo: under the sheen, never a pale or black band', () => {
    const tiled = luma(top.px, top.w, 52, 56);
    expect(tiled).toBeLessThan(luma(top.px, top.w, 10, 22));
    expect(tiled).toBeGreaterThan(110);
    expect(tiled).toBeLessThan(160);
  });

  it('reflects the lights as soft warm streaks: no hot tick at the lip, warm on down the tiled rows', () => {
    const hot = [KC.bulb, KC.bulbCore].map(packColor);
    for (let y = 0; y < 9; y++) expect(row(top.px, top.w, y).some((c) => hot.includes(c))).toBe(false);
    // red minus blue of a column over the tiled rows: warm under the streaks that carry on (x 16, 58), cool between
    const warmth = (x: number): number => {
      let sum = 0;
      for (let y = 52; y < 56; y++) sum += ((top.px[y * top.w + x] >>> 16) & 255) - (top.px[y * top.w + x] & 255);
      return sum;
    };
    expect(warmth(16)).toBeGreaterThan(warmth(32) + 40);
    expect(warmth(58)).toBeGreaterThan(warmth(32) + 20);
  });
});

describe('dining room', () => {
  it.each([['portrait', buildRoomTall], ['landscape', buildRoomWide]] as const)(
    'shows the street window and the CICCIOPOLY poster of the POV photo in %s',
    (_, build) => {
      const px = Array.from(build().px);
      for (const c of [KC.facade, KC.posterSky, KC.poster]) expect(px.filter((p) => p === packColor(c)).length).toBeGreaterThan(40);
    },
  );
});

describe('counter props', () => {
  const r = buildCounterProps();
  const at = (x: number, y: number): number => r.px[y * r.w + x];

  it('stand on their own base: one solid piece, grown up from the bottom row, nothing floating', () => {
    const seen = new Set<number>();
    const todo = [...row(r.px, r.w, r.h - 1).keys()].filter((x) => at(x, r.h - 1) !== 0).map((x) => (r.h - 1) * r.w + x);
    for (let i = todo.pop(); i !== undefined; i = todo.pop()) {
      if (seen.has(i) || !r.px[i]) continue; // out of the image (undefined) or transparent
      seen.add(i);
      const x = i % r.w;
      todo.push(i - r.w, i + r.w, ...(x > 0 ? [i - 1] : []), ...(x < r.w - 1 ? [i + 1] : []));
    }
    expect(seen.size).toBeGreaterThan(0);
    expect(seen.size).toBe(r.px.filter((c) => c !== 0).length);
  });

  it('light the steel cup from the left', () => {
    const lum = (x0: number, x1: number): number => {
      let sum = 0;
      for (let y = 22; y < 38; y++) for (let x = x0; x < x1; x++) { const c = at(x, y); sum += ((c >>> 16) & 255) + ((c >>> 8) & 255) + (c & 255); }
      return sum;
    };
    expect(lum(32, 38)).toBeGreaterThan(lum(43, 49) * 1.15);
  });
});
