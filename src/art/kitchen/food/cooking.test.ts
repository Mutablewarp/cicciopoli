import { describe, expect, it } from 'vitest';
import type { Raster } from '../../hills/raster';
import { FRY_ITEMS, FRY_STATE, GRIDDLE_ITEMS, GRIDDLE_STATE } from '../keys';
import { buildFryItems } from './fried';
import { buildGriddleItems } from './griddleItems';

/** Median luma (0..1) of the opaque pixels of a frame: the body colour, not the glints, embers or smoke. */
function luma(r: Raster): number {
  const ls = Array.from(r.px.filter((c) => c !== 0), (c) => (0.299 * ((c >> 16) & 255) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255)) / 255);
  return ls.sort((a, b) => a - b)[ls.length >> 1];
}

/** Median warmth (red minus blue, 0..1) of the opaque pixels: golden / browned food is warm, charcoal is not. */
function warmth(r: Raster): number {
  const ws = Array.from(r.px.filter((c) => c !== 0), (c) => (((c >> 16) & 255) - (c & 255)) / 255);
  return ws.sort((a, b) => a - b)[ws.length >> 1];
}

const widest = (r: Raster): number => Math.max(...Array.from({ length: r.h }, (_, y) => r.px.slice(y * r.w, (y + 1) * r.w).filter((c) => c !== 0).length));

describe('griddle items (v7: big, beautiful to watch)', () => {
  const items = buildGriddleItems();
  const frame = (id: (typeof GRIDDLE_ITEMS)[number], state: keyof typeof GRIDDLE_STATE): Raster =>
    items[GRIDDLE_ITEMS.indexOf(id) * GRIDDLE_STATE.count + GRIDDLE_STATE[state]];

  it('raw and PERFETTO patties are big rounds of meat (>= 36 of the 40 px across)', () => {
    for (const id of ['manzo', 'vegetale'] as const) {
      expect(widest(frame(id, 'raw')), id).toBeGreaterThanOrEqual(36);
      expect(widest(frame(id, 'perfect')), id).toBeGreaterThanOrEqual(36);
    }
  });

  it('the crust darkens state by state, perfect to over to burnt', () => {
    for (const id of ['manzo', 'vegetale'] as const) {
      const [perfect, over, burnt] = (['perfect', 'over', 'burnt'] as const).map((s) => luma(frame(id, s)));
      expect(perfect - over, id).toBeGreaterThan(0.05);
      expect(over - burnt, id).toBeGreaterThan(0.03);
    }
  });
});

describe('fry items (v7: big pieces in a raised basket)', () => {
  const items = buildFryItems();
  it.each(FRY_ITEMS)('%s: golden when perfect, dark when burnt, pale when raw', (id) => {
    const at = (s: number): Raster => items[FRY_ITEMS.indexOf(id) * FRY_STATE.count + s];
    expect(warmth(at(FRY_STATE.perfect)) - warmth(at(FRY_STATE.burnt))).toBeGreaterThan(0.15);
    expect(luma(at(FRY_STATE.raw)) - luma(at(FRY_STATE.burnt))).toBeGreaterThan(0.15);
  });
});
