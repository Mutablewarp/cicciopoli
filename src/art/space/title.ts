/**
 * "CICCIO'S / INVADERS" wordmark (ref/invaders_title.png): bold white italic wide letters,
 * the bottom line bigger and on a curved baseline, dark outline + navy drop shadow.
 * Hand-made glyphs so the art is identical on every device (no system fonts).
 */
import { Buf } from './buf';

type Glyph = readonly string[];

/* 10-row glyphs, stroke 3 */
const SMALL: Readonly<Record<string, Glyph>> = {
  C: ['..xxxxx.', '.xxxxxxx', 'xxx...xx', 'xxx.....', 'xxx.....', 'xxx.....', 'xxx.....', 'xxx...xx', '.xxxxxxx', '..xxxxx.'],
  I: Array.from({ length: 10 }, () => 'xxx'),
  O: ['..xxxx..', '.xxxxxx.', 'xxx..xxx', 'xxx..xxx', 'xxx..xxx', 'xxx..xxx', 'xxx..xxx', 'xxx..xxx', '.xxxxxx.', '..xxxx..'],
  "'": ['xxx', 'xxx', '.xx', '.x.', '...', '...', '...', '...', '...', '...'],
  S: ['.xxxxxx.', 'xxxxxxxx', 'xxx...x.', 'xxxxx...', '.xxxxxx.', '...xxxxx', '.....xxx', '.x...xxx', 'xxxxxxxx', '.xxxxxx.'],
};

const H = 13;

function diagonalGlyph(w: number, at: (y: number) => [number, number][]): Glyph {
  return Array.from({ length: H }, (_, y) => {
    const row = Array.from({ length: w }, () => '.');
    for (const [a, b] of at(y)) for (let x = Math.max(0, a); x <= Math.min(w - 1, b); x++) row[x] = 'x';
    return row.join('');
  });
}

/* 13-row glyphs, stroke 4 */
const BIG: Readonly<Record<string, Glyph>> = {
  I: Array.from({ length: H }, () => 'xxxx'),
  N: diagonalGlyph(11, (y) => {
    const d = Math.round(1 + (y * 6) / 12);
    return [[0, 3], [7, 10], [d, d + 3]];
  }),
  V: diagonalGlyph(11, (y) => {
    const s = Math.round((y * 3.5) / 12);
    return [[s, s + 3], [10 - s - 3, 10 - s]];
  }),
  A: diagonalGlyph(11, (y) => {
    const s = Math.round(((12 - y) * 3.5) / 12);
    const legs: [number, number][] = [[s, s + 3], [10 - s - 3, 10 - s]];
    if (y === 8 || y === 9) legs.push([s, 10 - s]);
    return legs;
  }),
  D: ['xxxxxxx...', 'xxxxxxxxx.', 'xxxx..xxxx', 'xxxx...xxx', 'xxxx...xxx', 'xxxx...xxx', 'xxxx...xxx', 'xxxx...xxx', 'xxxx...xxx', 'xxxx...xxx', 'xxxx..xxxx', 'xxxxxxxxx.', 'xxxxxxx...'],
  E: ['xxxxxxxx', 'xxxxxxxx', 'xxxx....', 'xxxx....', 'xxxx....', 'xxxxxxx.', 'xxxxxxx.', 'xxxx....', 'xxxx....', 'xxxx....', 'xxxx....', 'xxxxxxxx', 'xxxxxxxx'],
  R: ['xxxxxxx...', 'xxxxxxxxx.', 'xxxx..xxxx', 'xxxx...xxx', 'xxxx..xxxx', 'xxxxxxxxx.', 'xxxxxxxx..', 'xxxx.xxxx.', 'xxxx.xxxx.', 'xxxx..xxxx', 'xxxx..xxxx', 'xxxx...xxx', 'xxxx...xxx'],
  S: ['..xxxxxx..', '.xxxxxxxxx', 'xxxx...xxx', 'xxxx......', 'xxxxx.....', '.xxxxxxx..', '..xxxxxxx.', '.....xxxxx', '......xxxx', '......xxxx', 'xxx...xxxx', 'xxxxxxxxx.', '.xxxxxxx..'],
};

interface Placed {
  glyph: Glyph;
  x: number;
  y: number;
}

function layout(text: string, font: Readonly<Record<string, Glyph>>, gap: number, curve: number): { items: Placed[]; width: number } {
  const items: Placed[] = [];
  let x = 0;
  for (const ch of text) {
    const g = font[ch];
    items.push({ glyph: g, x, y: 0 });
    x += g[0].length + gap;
  }
  const width = x - gap;
  // curved baseline: the ends of the line sit lower than the middle
  for (const it of items) {
    const mid = it.x + it.glyph[0].length / 2;
    const u = (mid - width / 2) / (width / 2);
    it.y = Math.round(curve * u * u);
  }
  return { items, width };
}

/** Wordmark canvas (≈ 96x36). Shown at 2x in the playfield. */
export function buildTitle(): HTMLCanvasElement {
  const top = layout("CICCIO'S", SMALL, 1, 0);
  const bottom = layout('INVADERS', BIG, 1, 3);
  const pad = 3;
  const shear = 0.27;
  const w = Math.max(top.width, bottom.width) + Math.ceil(H * shear) + pad * 2 + 2;
  const h = 10 + 2 + H + 3 + pad * 2 + 2;
  const fill = new Buf(w, h);
  const put = (lines: { items: Placed[]; width: number }, oy: number, rows: number): void => {
    const ox = pad + Math.round((w - pad * 2 - 2 - lines.width) / 2);
    for (const it of lines.items) {
      it.glyph.forEach((row, y) => {
        const slant = Math.round((rows - 1 - y) * shear);
        for (let x = 0; x < row.length; x++) {
          if (row[x] !== 'x') continue;
          // white with a cool shade on the lowest rows (light from above)
          fill.set(ox + it.x + x + slant, oy + it.y + y, y >= rows - 2 ? '#c8d6f4' : '#ffffff');
        }
      });
    }
  };
  put(top, pad, 10);
  put(bottom, pad + 12, H);
  const out = new Buf(w, h);
  // navy drop shadow down-right, then the dark outline, then the letters
  const shadow = new Buf(w, h);
  shadow.stamp(fill, 0, 0);
  shadow.outline('#0a0c24');
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (shadow.alpha(x, y) > 0) out.set(x + 1, y + 2, '#2c3a8a');
  out.stamp(shadow, 0, 0);
  return out.toCanvas();
}
