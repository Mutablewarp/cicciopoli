/**
 * Ciccio's 3/4 head (facing right), hand-drawn as an ASCII grid from the logo:
 * glossy side-swept hair, thick brows, ROUND BLACK GLASSES with glints, small nose,
 * gentle smile. Variants are small patches over the base grid.
 */
import { C } from './palette';
import { grid, type Raster } from './raster';

export type HeadVariant = 'normal' | 'blink' | 'hurt' | 'joy' | 'fly' | 'grit';

/** Frame anchor "between the lenses" inside the 18x18 grid. */
export const BRIDGE = { x: 11, y: 10 } as const;

const PAL: Record<string, string> = {
  k: C.ink,
  R: C.hairRim,
  h: C.hair,
  H: C.hairHi,
  G: C.hairHi2,
  b: C.hair,
  s: C.skin,
  S: C.skinSh,
  d: C.skinDk,
  c: C.blush,
  g: C.lens,
  r: C.lensHi,
  w: C.glint,
  m: C.mouth,
  t: C.teeth,
  T: C.tongue,
};

// cols 0..17 — back of the head on the left, face on the right.
const BASE: readonly string[] = [
  '......RRRRRk......', // 0
  '....RRhhhhhhkk....', // 1
  '..RRhhhHGHhhhhkk..', // 2  gloss arc (light from top-left)
  '.RhhhHHhhhhhhhhhk.', // 3
  '.RhhHhhhhhhhHHHhk.', // 4  fringe swept forward
  'Rhhhhhssssssssshk.', // 5  arched hairline, big forehead (logo)
  'Rhhhhssbbbbsbbbsk.', // 6  thick brows
  'Rhhhhsbssssssssbk.', // 7  brow ends curl down, gap above the lenses
  'khhhsssgggsssggsk.', // 8  round black lenses
  'khhdskgwgggkgwggk.', // 9  arm, glints, bridge
  'khhdSsgggggsggggk.', // 10
  '.khdSsggggrsgggrk.', // 11
  '.khdsssgggssSggsk.', // 12
  '..kdsccsssdsssSssk', // 13 nose tip, smile corners tucked under it
  '..kssssssssmmmsSk.', // 14 smile
  '...ksssssssSSSsk..', // 15 lower-lip shadow
  '....kSSssssSSSSk..', // 16 chubby chin
  '.....kkkkkkkkkk...', // 17
];

interface Patch {
  x: number;
  y: number;
  rows: readonly string[];
}

// '_' keeps the base pixel.
const PATCHES: Record<HeadVariant, readonly Patch[]> = {
  normal: [],
  // brows drop onto the frames and the glints go out: a blink behind dark lenses
  blink: [
    { x: 6, y: 6, rows: ['_ssss_sss', 'bbbbb_bbb'] },
    { x: 7, y: 9, rows: ['g_____g'] },
  ],
  hurt: [
    { x: 7, y: 5, rows: ['__bb_b__', 'bbss_sbb'] },
    { x: 10, y: 13, rows: ['smmms', 'smTms', '_sms_'] },
  ],
  joy: [
    { x: 7, y: 5, rows: ['bbbb_bbb', 'ssss_sss'] },
    { x: 10, y: 13, rows: ['mmmmm', 'mtttm', '_mTm_'] },
  ],
  fly: [{ x: 6, y: 6, rows: ['_ssss_sss', 'bbbbb_bbb'] }],
  grit: [
    { x: 7, y: 6, rows: ['bbss_sbb', 'ssbb_b__'] },
    { x: 10, y: 13, rows: ['mmmmm', 'mtttm', '_mmm_'] },
  ],
};

function applied(v: HeadVariant): string[] {
  const rows = BASE.map((r) => r.split(''));
  for (const p of PATCHES[v]) {
    p.rows.forEach((pr, dy) => {
      for (let dx = 0; dx < pr.length; dx++) {
        if (pr[dx] !== '_') rows[p.y + dy][p.x + dx] = pr[dx];
      }
    });
  }
  return rows.map((r) => r.join(''));
}

const CACHE = new Map<HeadVariant, string[]>();

export function headRows(v: HeadVariant): string[] {
  let rows = CACHE.get(v);
  if (!rows) {
    rows = applied(v);
    CACHE.set(v, rows);
  }
  return rows;
}

/** Paints the head with its top-left grid corner at (ox, oy). */
export function paintHead(r: Raster, v: HeadVariant, ox: number, oy: number): void {
  grid(r, headRows(v), PAL, ox, oy);
}
