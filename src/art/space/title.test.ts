import { describe, expect, it } from 'vitest';
import { FACE, FACE_PAL, FACE_SIZE } from './jetFace';
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

describe("Ciccio's face on the jet", () => {
  it('is a square grid with a colour for every character', () => {
    expect(FACE).toHaveLength(FACE_SIZE);
    for (const row of FACE) {
      expect(row).toHaveLength(FACE_SIZE);
      for (const ch of row) if (ch !== '.') expect(FACE_PAL[ch], ch).toBeDefined();
    }
  });

  it('is mirror symmetric apart from the shading (hair, glasses, smile)', () => {
    const solid = (r: string): string => [...r].map((c) => (c === '.' ? '.' : 'x')).join('');
    for (const row of FACE) expect(solid(row)).toBe([...solid(row)].reverse().join(''));
  });

  it('is a round head: the silhouette is a 15 px circle (5, 9, 11, 13, 15 px rows, mirrored)', () => {
    const widths = FACE.map((r) => [...r].filter((c) => c !== '.').length);
    expect(widths).toEqual([5, 9, 11, 13, 15, 15, 15, 15, 15, 15, 15, 13, 11, 9, 5]);
  });

  it('wears two round lenses (glints kept) with skin between them above and below the bridge', () => {
    const lens = (c: string): boolean => c === 'o' || c === 'g';
    expect(FACE.join('').split('').filter((c) => c === 'g')).toHaveLength(4);
    for (const y of [5, 7, 8, 9]) expect(FACE[y][7], `row ${y}`).toBe('s');
    expect(lens(FACE[6][7])).toBe(true);
    // corner pixels of each lens are cut: widest row 5 px, first and last row 3 px
    const run = (y: number): number => [...FACE[y]].filter(lens).length;
    expect([run(5), run(7), run(9)]).toEqual([6, 10, 6]);
  });

  it('keeps the head mostly white: skin outweighs hair 3 : 1', () => {
    const count = (re: RegExp): number => FACE.join('').replace(/[^a-zA-Z]/g, '').split('').filter((c) => re.test(c)).length;
    expect(count(/[sS]/)).toBeGreaterThan(count(/[hH]/) * 3);
  });

  it('has a dark smile of at least 5 px', () => {
    expect(FACE.join('').split('').filter((c) => c === 'm').length).toBeGreaterThanOrEqual(5);
  });
});
