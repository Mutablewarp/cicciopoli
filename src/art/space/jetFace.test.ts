import { describe, expect, it } from 'vitest';
import { BADGE_PAL, BADGE_SIZE, badgeGrid, LOGO_AT } from './jetFace';
import { JET_LOGO } from './jetLogoBits';

const badge = badgeGrid();
const isFace = (x: number, y: number): boolean => {
  const ch = JET_LOGO[y - LOGO_AT.y]?.[x - LOGO_AT.x];
  return ch !== undefined && ch !== '.';
};
const mirrored = (row: string): boolean => row === [...row].reverse().join('');

describe("Ciccio's badge on the jet", () => {
  it('is the 17 x 23 logo face in black, dark grey and white, closed by a black contour', () => {
    expect(JET_LOGO).toHaveLength(23);
    for (const row of JET_LOGO) expect(row).toMatch(/^[ogw.]{17}$/);
    JET_LOGO.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        if (ch === 'o' || ch === '.') return;
        for (const n of [JET_LOGO[y - 1]?.[x], JET_LOGO[y + 1]?.[x], row[x - 1], row[x + 1]]) expect(n ?? '.', `${x},${y}`).not.toBe('.');
      }),
    );
  });

  it('keeps grey for the thin strokes only (never a 2 x 2 block)', () => {
    const g = (x: number, y: number): boolean => JET_LOGO[y]?.[x] === 'g';
    for (let y = 0; y < JET_LOGO.length; y++) {
      for (let x = 0; x < 17; x++) expect(g(x, y) && g(x + 1, y) && g(x, y + 1) && g(x + 1, y + 1), `${x},${y}`).toBe(false);
    }
  });

  it('reads brows, two round lenses on a bridge, nose and lips apart at 1:1', () => {
    expect(JET_LOGO[8].slice(5, 12)).toBe('ooowooo');
    expect(JET_LOGO[9].slice(5, 12)).not.toContain('o');
    // lenses mirrored about the middle column, joined by the bridge row only
    for (const row of JET_LOGO.slice(10, 15)) expect(mirrored(row.slice(3, 14)), row).toBe(true);
    expect(JET_LOGO.slice(10, 15).map((r) => r[8])).toEqual(['w', 'o', 'w', 'w', 'w']);
    expect(JET_LOGO[16].slice(7, 10)).toBe('gog');
    expect(JET_LOGO[18]).toContain('gooooog');
    expect(JET_LOGO[19]).toContain('ggg');
  });

  it("draws nose, mouth and chin mirror symmetric (the hair keeps the logo's lock on the right)", () => {
    for (const row of JET_LOGO.slice(14)) expect(mirrored(row), row).toBe(true);
    expect(mirrored(JET_LOGO[4])).toBe(false);
  });

  it('is a disc with a thin red ring (no 2 x 2 block) that never touches the face', () => {
    expect(badge).toHaveLength(BADGE_SIZE);
    for (const row of badge) {
      expect(row).toHaveLength(BADGE_SIZE);
      for (const ch of row) if (ch !== '.') expect(BADGE_PAL[ch], ch).toBeDefined();
    }
    const ring = (x: number, y: number): boolean => badge[y]?.[x] === 'r';
    for (let y = 0; y < BADGE_SIZE; y++) {
      for (let x = 0; x < BADGE_SIZE; x++) {
        expect(ring(x, y) && ring(x + 1, y) && ring(x, y + 1) && ring(x + 1, y + 1), `${x},${y}`).toBe(false);
        if (!isFace(x, y)) continue;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) expect(ring(x + dx, y + dy), `${x},${y}`).toBe(false);
      }
    }
    expect(badge[0].indexOf('r') + badge[0].lastIndexOf('r')).toBe(BADGE_SIZE - 1);
    expect(badge[(BADGE_SIZE - 1) / 2][0]).toBe('r');
  });
});
