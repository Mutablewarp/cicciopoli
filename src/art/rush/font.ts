/**
 * 3x5 pixel capitals for the truck vinyl and the street signs (PALERMO, SICILY!, SEGUICI!,
 * LAVORI, PROSSIMA APERTURA ...). Narrow glyphs (I, !, ') keep long words inside the panels.
 */
import type { Raster } from '../hills/raster';

const GLYPHS: Readonly<Record<string, readonly string[]>> = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  B: ['##.', '#.#', '##.', '#.#', '##.'],
  C: ['.##', '#..', '#..', '#..', '.##'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'],
  E: ['###', '#..', '##.', '#..', '###'],
  F: ['###', '#..', '##.', '#..', '#..'],
  G: ['.##', '#..', '#.#', '#.#', '.##'],
  H: ['#.#', '#.#', '###', '#.#', '#.#'],
  I: ['#', '#', '#', '#', '#'],
  K: ['#.#', '#.#', '##.', '#.#', '#.#'],
  L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'],
  N: ['#..#', '##.#', '#.##', '#..#', '#..#'],
  O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  P: ['##.', '#.#', '##.', '#..', '#..'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'],
  // full middle bar: the diagonal 3x5 S read as a Z on the truck door
  S: ['.##', '#..', '###', '..#', '##.'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'],
  V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
  Z: ['###', '..#', '.#.', '#..', '###'],
  '!': ['#', '#', '#', '.', '#'],
  "'": ['#', '#', '.', '.', '.'],
  '.': ['.', '.', '.', '.', '#'],
  ' ': ['.', '.', '.', '.', '.'],
};

export const FONT_H = 5;

export function textWidth(text: string): number {
  let w = 0;
  for (const ch of text) w += (GLYPHS[ch]?.[0].length ?? 0) + 1;
  return Math.max(0, w - 1);
}

/** Draws `text` with its top-left at (x, y); returns the x after the last glyph. */
export function drawText(r: Raster, text: string, x: number, y: number, color: string): number {
  let cx = x;
  for (const ch of text) {
    const g = GLYPHS[ch];
    if (!g) throw new Error(`rush font: no glyph '${ch}'`);
    g.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) if (row[i] === '#') r.set(cx + i, y + j, color);
    });
    cx += g[0].length + 1;
  }
  return cx - 1;
}

/** Centred text with a 1-px drop shadow (signs on busy backgrounds). */
export function drawCentred(r: Raster, text: string, cx: number, y: number, color: string, shadow?: string): void {
  const x = Math.round(cx - textWidth(text) / 2);
  if (shadow) drawText(r, text, x + 1, y + 1, shadow);
  drawText(r, text, x, y, color);
}
