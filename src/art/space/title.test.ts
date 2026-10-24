import { describe, expect, it } from 'vitest';
import { makeFont } from './lettering';
import { TITLE_GLINTS, TITLE_SIZE } from './title';

const font = makeFont(0.215, 0.205);

/** Share of the glyph box (w x 1) a letter paints, sampled on a 60 x 60 grid. */
function coverage(ch: string): number {
  const g = font[ch];
  let hit = 0;
  for (let j = 0; j < 60; j++) for (let i = 0; i < 60; i++) if (g.inside(((i + 0.5) / 60) * g.w, (j + 0.5) / 60)) hit++;
  return hit / 3600;
}

describe('wordmark lettering', () => {
  it('has every letter of CICCIO\'S INVADERS', () => {
    for (const ch of "CIO'SNVADER") expect(font[ch], ch).toBeDefined();
  });

  it('paints bold but open letters: every letter but the bar-shaped I and the apostrophe covers 25-80 % of its box', () => {
    for (const ch of 'COSNVADER') {
      const c = coverage(ch);
      expect(c, ch).toBeGreaterThan(0.25);
      expect(c, ch).toBeLessThan(0.8);
    }
    expect(coverage("'")).toBeGreaterThan(0.2);
  });

  it('keeps C open on the right where O is closed, and A open under its crossbar', () => {
    const c = font.C;
    const o = font.O;
    expect(o.inside(o.w - 0.05, 0.5)).toBe(true);
    expect(c.inside(c.w - 0.05, 0.5)).toBe(false);
    expect(font.A.inside(font.A.w / 2, 0.92)).toBe(false);
  });

  it('draws I as a plain bar and N with its diagonal (letters stay distinct)', () => {
    expect(font.I.inside(0.1, 0.5)).toBe(true);
    expect(font.N.inside(font.N.w / 2, 0.5)).toBe(true);
    expect(font.N.inside(0.26, 0.85)).toBe(false);
  });

  it('places both glints inside the canvas', () => {
    expect(TITLE_GLINTS).toHaveLength(2);
    for (const [dx, dy] of TITLE_GLINTS) {
      expect(Math.abs(dx)).toBeLessThan(TITLE_SIZE.w / 2);
      expect(Math.abs(dy)).toBeLessThan(TITLE_SIZE.h / 2);
    }
  });
});
