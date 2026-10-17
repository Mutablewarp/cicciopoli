/** Two tiny bitmap fonts: 5x7 captions ("PRONTI!", "VAI IN BUCA!") and the 3x5 tray-print wordmark. */
import type { Ctx } from '../pixel';

type Font = Readonly<Record<string, readonly string[]>>;

export const CAPTION: Font = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.###.', '#...#', '#....', '#....', '#....', '#...#', '.###.'],
  I: ['###', '.#.', '.#.', '.#.', '.#.', '.#.', '###'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '.#.#.', '.#.#.', '..#..'],
  '!': ['#', '#', '#', '#', '#', '.', '#'],
  ' ': ['..', '..', '..', '..', '..', '..', '..'],
};

export const PRINT: Font = {
  C: ['.##', '#..', '#..', '#..', '.##'],
  I: ['#', '#', '#', '#', '#'],
  O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  S: ['.##', '#..', '.#.', '..#', '##.'],
  "'": ['#', '#', '.', '.', '.'],
};

export function textWidth(font: Font, text: string, gap = 1): number {
  let w = 0;
  for (const ch of text) w += (font[ch]?.[0].length ?? 0) + gap;
  return Math.max(0, w - gap);
}

/** Draws `text` with its top-left at (x, y); `shade` colours the rows from `shadeFrom` down. */
export function drawText(
  ctx: Ctx,
  font: Font,
  text: string,
  x: number,
  y: number,
  color: string,
  shade?: { color: string; from: number },
  gap = 1,
): void {
  let cx = x;
  for (const ch of text) {
    const g = font[ch];
    if (!g) throw new Error(`font: no glyph '${ch}'`);
    g.forEach((row, j) => {
      ctx.fillStyle = shade && j >= shade.from ? shade.color : color;
      for (let i = 0; i < row.length; i++) if (row[i] === '#') ctx.fillRect(cx + i, y + j, 1, 1);
    });
    cx += g[0].length + gap;
  }
}
