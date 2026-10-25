/**
 * "YOU ARE" / "SO GOLDEN!" (180x60): chunky 5x7 capitals blown up 2x and 3x, a gold ramp from a
 * pale top to a deep bottom, a diagonal shine stripe, a 2 px dark-gold extrusion, a brown then black
 * outline, and a few white sparkles. Also the 4-point sparkle shared with the trophy.
 */
import { Raster, outlineRaster } from '../../hills/raster';
import { KC } from './palette';

const GLYPHS: Readonly<Record<string, readonly string[]>> = {
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  G: ['.###.', '#...#', '#....', '#.###', '#...#', '#...#', '.###.'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  '!': ['##', '##', '##', '##', '##', '..', '##'],
  ' ': ['..', '..', '..', '..', '..', '..', '..'],
};

const lineWidth = (text: string, s: number): number => [...text].reduce((w, ch) => w + GLYPHS[ch][0].length * s + s, -s);

/** Stamps `text` (scale s) centred on cx with its top at y into a 0/1 mask. */
function stamp(m: Raster, text: string, cx: number, y: number, s: number): void {
  let x = Math.round(cx - lineWidth(text, s) / 2);
  for (const ch of text) {
    const g = GLYPHS[ch];
    g.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        if (row[i] !== '#') continue;
        for (let v = 0; v < s; v++) for (let u = 0; u < s; u++) m.set(x + i * s + u, y + j * s + v, '#ffffff');
      }
    });
    x += g[0].length * s + s;
  }
}

/** 4-point sparkle (arm length `len`) centred on (x, y). */
export function sparkle(r: Raster, x: number, y: number, len: number, col: string = KC.white): void {
  for (let k = -len; k <= len; k++) {
    r.set(x + k, y, Math.abs(k) === len ? KC.goldLight : col);
    r.set(x, y + k, Math.abs(k) === len ? KC.goldLight : col);
  }
}

/** Paints one gold line from its mask: ramp by row, shine stripe, extrusion below. */
function goldLine(r: Raster, m: Raster, y0: number, h: number): void {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = 0; x < r.w; x++) {
      if (m.get(x, y) === 0) continue;
      const t = (y - y0) / (h - 1);
      let c: string = t < 0.18 ? KC.goldHi : t < 0.45 ? KC.goldLight : t < 0.78 ? KC.gold : KC.goldShade;
      if (m.get(x, y - 1) === 0 && t > 0.3) c = KC.goldLight; // lit top of every stroke
      if (((x - y) % 26 + 26) % 26 < 3) c = KC.goldHi; // shine stripe
      r.set(x, y, c);
    }
  }
  for (let y = y0 + h + 1; y >= y0; y--) {
    for (let x = 0; x < r.w; x++) {
      if (r.get(x, y) !== 0) continue;
      if (m.get(x, y - 1) !== 0 || m.get(x, y - 2) !== 0) r.set(x, y, y >= y0 + h ? KC.goldDeep : KC.goldDark);
    }
  }
}

export function buildGoldenText(): Raster {
  const r = new Raster(180, 60);
  const m = new Raster(180, 60);
  stamp(m, 'YOU ARE', 90, 6, 2);
  stamp(m, 'SO GOLDEN!', 90, 28, 3);
  goldLine(r, m, 6, 14);
  goldLine(r, m, 28, 21);
  outlineRaster(r, KC.goldDeep);
  outlineRaster(r, KC.ink);
  for (const [x, y, len] of [[34, 10, 3], [146, 8, 2], [9, 36, 3], [172, 30, 2], [160, 55, 3], [22, 56, 2], [124, 2, 2]] as const) {
    sparkle(r, x, y, len);
  }
  return r;
}
