import { describe, expect, it } from 'vitest';
import { ditherIndex, fsin, rgba } from './buf';

describe('inferno pixel buffer helpers', () => {
  it('packs colours as little-endian RGBA words', () => {
    expect(rgba('#ff8000')).toBe(0xff0080ff);
    expect(rgba('#102030', 0)).toBe(0x00302010);
  });

  it('dithers within the ramp bounds and hard-thresholds with spread 0', () => {
    expect(ditherIndex(8, -1, 0, 0)).toBe(0);
    expect(ditherIndex(8, 2, 3, 3)).toBe(7);
    expect(ditherIndex(3, 0.24, 1, 2, 0)).toBe(0);
    expect(ditherIndex(3, 0.26, 1, 2, 0)).toBe(1);
  });

  it('sine lookup matches Math.sin, including negative angles', () => {
    for (const a of [-7.1, -1, 0, 0.5, 2.2, 13.7]) expect(Math.abs(fsin(a) - Math.sin(a))).toBeLessThan(0.003);
  });
});
