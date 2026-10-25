import { describe, expect, it } from 'vitest';
import type { Raster } from '../../hills/raster';
import { INGREDIENTS, LAYER, LAYER_H, layerCookFrame, layerFrame, type LayerKind } from '../keys';
import { buildLayerCook, buildLayers } from './layers';

/** Frill rows a layer may paint above its body (StackView / the setup-card burger keep 3). */
const FRILLS = 3;
const KINDS: readonly LayerKind[] = ['bunBottom', 'bunTop', ...INGREDIENTS];

const rows = (r: Raster): number[] => [...Array(r.h).keys()].filter((y) => [...Array(r.w).keys()].some((x) => r.get(x, y) !== 0));
const width = (r: Raster, y: number): number => [...Array(r.w).keys()].filter((x) => r.get(x, y) !== 0).length;

describe('side-view burger layers', () => {
  const layers = buildLayers();

  it('never paint above the frill rows over their body', () => {
    for (const kind of KINDS) {
      const top = Math.min(...rows(layers[layerFrame(kind)]));
      expect(top, kind).toBeGreaterThanOrEqual(LAYER.baseRow - LAYER_H[kind] - FRILLS);
    }
  });

  it('patty and cheddar overhang the round brioche (a burger, not a loaf)', () => {
    const widest = (k: LayerKind): number => Math.max(...rows(layers[layerFrame(k)]).map((y) => width(layers[layerFrame(k)], y)));
    expect(widest('manzo')).toBeGreaterThan(widest('bunBottom'));
    expect(widest('cheddar')).toBeGreaterThan(widest('manzo'));
    expect(widest('bunTop')).toBe(widest('bunBottom'));
  });

  it('the bottom heel is a round puck that leaves the paper free under the stack base', () => {
    const heel = layers[layerFrame('bunBottom')];
    const ys = rows(heel);
    expect(Math.max(...ys)).toBeLessThan(LAYER.baseRow); // the MONTAGGIO plate starts on the base row
    expect(Math.max(...ys.map((y) => width(heel, y))) / ys.length).toBeLessThan(4.2);
  });

  it('the perfect patty is golden-brown, far from the burnt one', () => {
    const luma = (r: Raster): number => {
      const top = LAYER.baseRow - LAYER_H.manzo;
      let sum = 0;
      let n = 0;
      for (let y = top + 1; y < LAYER.baseRow - 1; y++) {
        for (let x = LAYER.cx - 15; x <= LAYER.cx + 15; x++) {
          const c = r.get(x, y);
          sum += (0.299 * ((c >> 16) & 255) + 0.587 * ((c >> 8) & 255) + 0.114 * (c & 255)) / 255;
          n++;
        }
      }
      return sum / n;
    };
    const served = luma(layers[layerFrame('manzo')]);
    expect(served).toBeGreaterThan(0.33);
    expect(served - luma(buildLayerCook()[layerCookFrame('manzo', 'burnt')])).toBeGreaterThan(0.15);
  });
});
