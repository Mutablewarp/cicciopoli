/** The word "SPACCA!" in white comic lettering with a lime outline, 64 x 24 (hand-drawn 2-px strokes, italic). */
import { Raster } from '../../ciccio/raster';
import { INK } from '../palette';
import { ringed } from './poly';

export const TEXT_W = 64;
export const TEXT_H = 24;

const GLYPHS: Readonly<Record<string, readonly string[]>> = {
  S: ['.####.', '##..##', '##....', '##....', '.###..', '..###.', '....##', '....##', '....##', '##..##', '##..##', '.####.'],
  P: ['#####.', '##..##', '##..##', '##..##', '##..##', '#####.', '##....', '##....', '##....', '##....', '##....', '##....'],
  A: ['..###..', '.#####.', '##...##', '##...##', '##...##', '##...##', '#######', '#######', '##...##', '##...##', '##...##', '##...##'],
  C: ['.####.', '##..##', '##....', '##....', '##....', '##....', '##....', '##....', '##....', '##..##', '##..##', '.####.'],
  '!': ['##', '##', '##', '##', '##', '##', '##', '..', '..', '##', '##', '##'],
};

const WORD = 'SPACCA!';
const LIME = '#a3d52c';
const LIME_DARK = '#5f9a1c';
const WHITE = '#ffffff';
const SHADE = '#c9d3dc';
const SKEW = 0.3;
const GAP = 2;

export function spaccaText(): Raster {
  const letters = new Raster(TEXT_W, TEXT_H);
  const widths = [...WORD].map((ch) => GLYPHS[ch][0].length);
  const total = widths.reduce((a, b) => a + b, 0) + (WORD.length - 1) * GAP + Math.round(11 * SKEW);
  let x0 = Math.round((TEXT_W - total) / 2);
  const y0 = Math.round((TEXT_H - 12) / 2);
  [...WORD].forEach((ch, i) => {
    GLYPHS[ch].forEach((row, y) => {
      const shift = Math.round((11 - y) * SKEW);
      for (let x = 0; x < row.length; x++) {
        if (row[x] !== '#') continue;
        const lowEdge = y === 11 || GLYPHS[ch][y + 1]?.[x] !== '#';
        letters.set(x0 + x + shift, y0 + y, lowEdge ? SHADE : WHITE);
      }
    });
    x0 += widths[i] + GAP;
  });
  const lime = new Raster(TEXT_W, TEXT_H);
  const thick = ringed(letters, LIME);
  for (let i = 0; i < thick.px.length; i++) {
    const c = thick.px[i];
    if (c === LIME) {
      const y = Math.floor(i / TEXT_W);
      lime.px[i] = y > 12 ? LIME_DARK : LIME;
    } else lime.px[i] = c;
  }
  return ringed(lime, INK);
}
