/**
 * The "CICCIO'S" neon (92x24 x 2: on, brighter), warm orange-red like the neon script on the Sperlinga
 * brick (ref/level7_pov_order.png): condensed rounded caps, 16 px tall with a 2 px tube, slanted like a
 * script and underlined by a swash out of the S; a hot core on the top-left of the stroke, a red edge
 * on the bottom-right, a red halo, then a dark mount ring so it reads on the pale soffit. Also the round
 * face-logo disc (36x36 x 2: white, gold), a PIXEL FALLBACK only (the game draws the owner's original
 * logo over it), hand-pixelled after public/brand/ciccio-face.png: black hair with the tuft on the
 * right, thick brows, round black glasses on a bar, the little nose and the dark upper lip of the smile.
 */
import { Raster } from '../../hills/raster';
import { bayer } from '../../pixel';
import { KC } from './palette';

const C_ROWS = ['..####..', '.##..##.', '##....##', '##....##', ...Array<string>(8).fill('##......'), '##....##', '##....##', '.##..##.', '..####..'];
const O_ROWS = C_ROWS.map((row, y) => (y > 1 && y < 14 ? '##....##' : row));
const GLYPHS: Readonly<Record<string, readonly string[]>> = {
  C: C_ROWS,
  O: O_ROWS,
  I: Array<string>(16).fill('##'),
  "'": ['##', '##', '##', '.#', '#.', ...Array<string>(11).fill('..')],
  S: [
    '..####..', '.##..##.', '##....##', '##....##', '##......', '##......', '.##.....', '..###...',
    '...###..', '.....##.', '......##', '......##', '##....##', '##....##', '.##..##.', '..####..',
  ],
};
const NEON_W = 92;
const NEON_H = 24;
const GAP = 3;
/** glyph top row, script slant (px of lean per row), swash row */
const TOP = 1;
const SLANT = 0.22;
const SWASH = 19;

function tubeMask(text: string): Uint8Array {
  const m = new Uint8Array(NEON_W * NEON_H);
  const put = (x: number, y: number): void => {
    if (x >= 0 && x < NEON_W) m[y * NEON_W + x] = 1;
  };
  const width = [...text].reduce((w, ch) => w + GLYPHS[ch][0].length + GAP, -GAP);
  const left = Math.round((NEON_W - width) / 2) - 2;
  let x0 = left;
  for (const ch of text) {
    GLYPHS[ch].forEach((row, j) => {
      const lean = Math.round((16 - j) * SLANT);
      for (let i = 0; i < row.length; i++) if (row[i] === '#') put(x0 + i + lean, TOP + j);
    });
    x0 += GLYPHS[ch][0].length + GAP;
  }
  // the swash: out of the S's foot, back under the word, a little curl at the start
  for (let x = left + 2; x < x0; x++) {
    put(x, SWASH);
    put(x, SWASH + 1);
  }
  put(left, SWASH - 1);
  put(left + 1, SWASH - 1);
  put(left, SWASH - 2);
  return m;
}

export function buildNeon(): Raster[] {
  const m = tubeMask("CICCIO'S");
  const at = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < NEON_W && y < NEON_H && m[y * NEON_W + x] === 1;
  const dist = (x: number, y: number): number => {
    let best = 9;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (at(x + dx, y + dy)) best = Math.min(best, Math.hypot(dx, dy));
    return best;
  };
  return [false, true].map((bright) => {
    const r = new Raster(NEON_W, NEON_H);
    for (let y = 0; y < NEON_H; y++) {
      for (let x = 0; x < NEON_W; x++) {
        if (at(x, y)) {
          const core = !at(x - 1, y) || !at(x, y - 1);
          const edge = !at(x + 1, y) && !at(x, y + 1);
          r.set(x, y, core || (bright && !edge) ? KC.neonCore : edge && !bright ? KC.neonEdge : KC.neonTube);
          continue;
        }
        // solid halo hugging the tube, the dark mount line (reads on the pale soffit), a sparse glow
        const d = dist(x, y);
        if (d < 1.5) r.set(x, y, bright ? KC.neonTube : KC.neonGlow);
        else if (d < 2.5) r.set(x, y, bright ? KC.neonGlow : KC.neonMount);
        else if (d < 3.5 && (bright ? 0.7 : 0.3) > bayer(x, y)) r.set(x, y, bright ? KC.neonEdge : KC.neonGlow);
      }
    }
    return r;
  });
}

/** 22x28 face logo: k black (hair, brows, round lenses, nose, lips, jaw line), w white skin,
 * g a lens glint, '.' the disc. */
const FACE: readonly string[] = [
  '.......kkkkkkkk.......',
  '.....kkkkkkkkkkkkkk...',
  '...kkkkkkkkkkkkkkkkk..',
  '..kkkkkkkkkkkkkkkkkkk.',
  '.kkkkkkkkkkkkkkkkkkkk.',
  '.kkkkkkkkkwwwwwwkkkkk.',
  '.kkkkkkwwwwwwwwwwwkkk.',
  'kkkkkwwwwwwwwwwwwwwkkk',
  'kkkkwwwwwwwwwwwwwwwwkk',
  'kkkwwwwwwwwwwwwwwwwwkk',
  'kkwwkkkkwwwwwwkkkkwwkk',
  'kkwkkkkkkwwwwkkkkkkwkk',
  'kkwwwwwwwwwwwwwwwwwwkk',
  'kwwwkkkkwwwwwwkkkkwwwk',
  'kkkkgkkkkwwwwkgkkkkkkk',
  'kwwkkkkkkkkkkkkkkkkwwk',
  'kwwkkkkkkwwwwkkkkkkwwk',
  'kwwkkkkkkwwwwkkkkkkwwk',
  'kwwwkkkkwwwwwwkkkkwwwk',
  'kwwwwwwwwwkwwwwwwwwwwk',
  'kwwwwwwwwwkwwwwwwwwwwk',
  '.kwwwwwwwkkkkwwwwwwwk.',
  '.kwwwwwwwwwwwwwwwwwwk.',
  '.kwwwwwkkkkkkkkwwwwwk.',
  '..kwwwwwwkkkkwwwwwwk..',
  '...kwwwwwwkkwwwwwwk...',
  '....kkwwwwwwwwwwkk....',
  '......kkkkkkkkkk......',
];

export interface DiscPal {
  ink: string;
  rim: string;
  disc: string;
  discShade: string;
  skin: string;
  line: string;
}

export const WHITE_DISC: DiscPal = { ink: KC.ink, rim: '#c4c4c0', disc: KC.white, discShade: '#e2e2dc', skin: KC.white, line: KC.ink };
const GOLD: DiscPal = { ink: KC.goldDeep, rim: KC.goldShade, disc: KC.gold, discShade: KC.goldShade, skin: KC.goldLight, line: KC.goldDeep };

/** Round disc of radius `rad` (outline included) centred in a size x size raster, with a face grid on it
 * (k / m black, w skin, g shade: the grids of ./neon and ../../rush/lettering). */
export function faceDisc(size: number, rad: number, face: readonly string[], p: DiscPal): Raster {
  const r = new Raster(size, size);
  const c = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
      if (d >= rad) continue;
      const lit = (x + 0.5 - c) + (y + 0.5 - c); // > 0 towards the bottom-right
      r.set(x, y, d >= rad - 1 ? p.ink : d >= rad - 2 ? p.rim : lit > rad * 0.9 && d > rad - 5 ? p.discShade : p.disc);
    }
  }
  const ox = Math.round(c - face[0].length / 2);
  const oy = Math.round(c - face.length / 2);
  face.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === 'k' || ch === 'm') r.set(ox + i, oy + j, p.line);
      else if (ch === 'w') r.set(ox + i, oy + j, p.skin);
      else if (ch === 'g') r.set(ox + i, oy + j, p.discShade);
    }
  });
  return r;
}

export function buildFaceDisc(): Raster[] {
  const gold = faceDisc(36, 18, FACE, GOLD);
  for (const [x, y] of [[9, 7], [10, 6], [27, 9]] as const) gold.set(x, y, KC.goldHi); // glints on the gold
  return [faceDisc(36, 18, FACE, WHITE_DISC), gold];
}
