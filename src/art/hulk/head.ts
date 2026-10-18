/**
 * Hero head, hand-drawn as an ASCII grid (24 x 17, facing right): the logo face of Ciccio on lime skin — a tall
 * spiky quiff of three black tufts (like the T-shirt) cut short at the ear, a forehead with a brow line,
 * a skin row, then two ROUND black lenses (cut corners, a glint each, a bridge between), a rounded jaw with a real chin and a
 * small smirk with a raised corner. Face variants are small patches over the base grid.
 */
import { HEAD_PAL } from './palette';
import type { Face } from './rig';

export const HEAD_W = 24;
export const HEAD_H = 17;

/** Frame anchor "between the lenses" inside the grid. */
export const BRIDGE = { x: 11, y: 9 } as const;

/** Grid pixel that sits on the neck socket (centre of the chin). */
export const NECK = { x: 12, y: 16 } as const;

/** First and last grid row of the lenses (identical in every face variant). */
export const LENS_ROWS = [7, 11] as const;

const BASE: readonly string[] = [
  '.......R.....R.....R....', // 0
  '......Rhh..RHhh..RHhh...', // 1
  '....RHhhhhRHhhhhRHhhhh..', // 2
  '...RhhhHhhHhhhhhGhhhhHh.', // 3
  '....cssssssssssssssS....', // 4
  '...csbbbbbbssbbbbbbsS...', // 5
  '...cssssssbssbssssssS...', // 6
  '...cssggggssssggggssS...', // 7
  '...csgwggggssgwggggsS...', // 8
  '...csggggggbbggggggsS...', // 9
  '...csgggrrgssgggrrgsS...', // 10
  '...cssggggssssggggssS...', // 11
  '....csssssssssssssssSS..', // 12
  '....csssmmmmmmmmmsSS....', // 13
  '.....cssstttttmsssSS....', // 14
  '.......cssSSSSSsSS......', // 15
  '........cSSSSSSSS.......', // 16
];

interface Patch {
  x: number;
  y: number;
  rows: readonly string[];
}

/** The smirk line of BASE runs one pixel past an 8 px open mouth (col 16): wipe it so the shout has clean rounded corners. */
const CLEAR_TAIL: Patch = { x: 16, y: 13, rows: ['s'] };

const PATCHES: Record<Face, readonly Patch[]> = {
  grit: [],
  // shout: 8 px wide, dark inside, a curved upper lip, six teeth and a small tongue, rounded corners
  roar: [CLEAR_TAIL, { x: 8, y: 13, rows: ['smmmmmms', 'mtttttum', 'smmTTmms'] }],
  hurt: [
    CLEAR_TAIL,
    { x: 5, y: 5, rows: ['bbbbbb', 'sbbbbb'] },
    { x: 13, y: 5, rows: ['bbbbbb', 'bbbbbs'] },
    { x: 8, y: 13, rows: ['smmmmmms', 'mmmmmmmm', 'smmTTmms'] },
  ],
  // grin: a wide dark smile line over the teeth, a bigger tongue
  joy: [CLEAR_TAIL, { x: 8, y: 13, rows: ['mmmmmmmm', 'mtttttum', 'smTTTTms'] }],
};

const CACHE = new Map<Face, string[]>();

export function headRows(face: Face): string[] {
  const hit = CACHE.get(face);
  if (hit) return hit;
  const rows = BASE.map((r) => r.split(''));
  for (const p of PATCHES[face]) {
    p.rows.forEach((pr, dy) => {
      for (let dx = 0; dx < pr.length; dx++) rows[p.y + dy][p.x + dx] = pr[dx];
    });
  }
  const out = rows.map((r) => r.join(''));
  CACHE.set(face, out);
  return out;
}

/** Colour of a grid letter (the whole face, shading included, is hand-placed in the grid). */
export const gridColour = (ch: string): string | undefined => HEAD_PAL[ch];
