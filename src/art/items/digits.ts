/**
 * Score-popup digits (6x8 cells): frames 0-9, 10 = '+', 11 = 'x'.
 * Chunky 5x7 cream glyphs at (0,0); the dark outline wraps them where the cell allows
 * (right, bottom, counters) so "+30" reads on both the sky and the lava levels.
 */
import { PAL } from '../pixel';
import { Raster } from './raster';

const GLYPHS: readonly (readonly string[])[] = [
  ['.###.', '##.##', '##.##', '##.##', '##.##', '##.##', '.###.'],
  ['.##..', '###..', '.##..', '.##..', '.##..', '.##..', '####.'],
  ['.###.', '##.##', '...##', '..##.', '.##..', '##...', '#####'],
  ['####.', '...##', '...##', '.###.', '...##', '...##', '####.'],
  ['..###', '.####', '##.##', '##.##', '#####', '...##', '...##'],
  ['#####', '##...', '####.', '...##', '...##', '##.##', '.###.'],
  ['.###.', '##...', '####.', '##.##', '##.##', '##.##', '.###.'],
  ['#####', '...##', '..##.', '..##.', '.##..', '.##..', '.##..'],
  ['.###.', '##.##', '##.##', '.###.', '##.##', '##.##', '.###.'],
  ['.###.', '##.##', '##.##', '.####', '...##', '...##', '.###.'],
  ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  ['.....', '.....', '##.##', '.###.', '..#..', '.###.', '##.##'],
];

const INK = { top: '#fffaf0', body: PAL.cream, bottom: PAL.creamShade };

function glyph(rows: readonly string[]): Raster {
  const r = new Raster(6, 8);
  const top = rows.findIndex((row) => row.includes('#'));
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== '#') continue;
      // lit top row, shaded underside of every stroke
      r.set(x, y, y === top ? INK.top : rows[y + 1]?.[x] !== '#' ? INK.bottom : INK.body);
    }
  });
  r.outline(PAL.ink);
  return r;
}

export function digitFrames(): Raster[] {
  return GLYPHS.map(glyph);
}
