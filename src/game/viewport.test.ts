import { describe, expect, it } from 'vitest';
import { computeZoom, effectiveDpr, MIN_VIEW_H, MIN_VIEW_W } from './viewport';

describe('computeZoom', () => {
  const cases: [string, number, number, number][] = [
    ['iPhone landscape', 844, 390, 3],
    ['iPhone portrait game area', 390, 560, 3],
    ['Android portrait', 412, 600, 2.625],
    ['Android landscape', 915, 412, 2.625],
    ['desktop 1080p', 1920, 1080, 1],
    ['laptop retina', 1440, 760, 2],
    ['small window', 640, 360, 1],
    ['iPad landscape', 1180, 820, 2],
  ];
  for (const [name, w, h, dpr] of cases) {
    it(`${name} keeps a playable framing`, () => {
      const z = computeZoom(w, h, dpr);
      expect(z.viewW).toBeGreaterThanOrEqual(MIN_VIEW_W - 0.001);
      expect(z.viewH).toBeGreaterThanOrEqual(Math.min(MIN_VIEW_H, (h * dpr) / z.zoom) - 0.001);
      expect(z.viewH).toBeLessThanOrEqual(420);
      if (z.zoom >= 1.5) expect(Number.isInteger(z.zoom)).toBe(true);
    });
  }

  it('survives zero sizes during rotation', () => {
    const z = computeZoom(0, 0, 3);
    expect(Number.isFinite(z.zoom)).toBe(true);
    expect(z.zoom).toBeGreaterThan(0);
  });
});

describe('effectiveDpr', () => {
  it('caps and sanitises', () => {
    expect(effectiveDpr(undefined)).toBe(1);
    expect(effectiveDpr(4)).toBe(3);
    expect(effectiveDpr(2)).toBe(2);
    expect(effectiveDpr(Number.NaN)).toBe(1);
  });
});
