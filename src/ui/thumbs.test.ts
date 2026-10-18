import { describe, expect, it } from 'vitest';
import { PAL } from '../art/pixel';
import { levelThumb } from './thumbs';

interface Run {
  x: number;
  y: number;
  w: number;
  fill: string;
}

/** The painted runs of a thumbnail (pixelSvg writes one rect per horizontal run). */
function runs(level: 1 | 2 | 3): Run[] {
  return [...levelThumb(level).matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="1" fill="([^"]+)"/g)].map((m) => ({
    x: Number(m[1]),
    y: Number(m[2]),
    w: Number(m[3]),
    fill: m[4],
  }));
}

/** A landscape title card is wider than 16:9 and crops the 32-column art to about 20 columns around the centre. */
const SAFE = { from: 6, to: 26 };
const inside = (r: Run): boolean => r.x >= SAFE.from && r.x + r.w - 1 <= SAFE.to;

describe('level thumbnails survive the landscape crop', () => {
  it('level 1: the whole flag sits in the centre columns', () => {
    const flag = runs(1).filter((r) => r.fill === PAL.flagRed || r.fill === PAL.poleLight);
    expect(flag.length).toBeGreaterThan(0);
    expect(flag.every(inside)).toBe(true);
  });

  it('level 2: the castle and the bat sit in the centre columns', () => {
    const dark = runs(2).filter((r) => r.fill === PAL.castle);
    expect(dark.length).toBeGreaterThan(0);
    expect(dark.every(inside)).toBe(true);
  });

  it('level 3: the pilot has a skin-toned face, not the white of the old panda look', () => {
    expect(levelThumb(3)).not.toContain('#fcfcf4');
    expect(levelThumb(3)).toContain('#f4d2a8');
  });
});
