/**
 * Level 7 pixel scenery for the DOM screens, from behind the polished steel counter: the black pergola bar with
 * warm lights, white tiles with blue grout, Sperlinga greenery at the sides. Used by the title card (thumbs.ts,
 * with a burger on the counter and the owner's original face logo on its disc) and the pre-shift stage (setup.ts).
 * The art pack's own scene and burger stack (art.ts, lazy) are laid over it once built.
 */
import { FACE_URL } from '../../art/space/keys';
import { Grid } from '../grid';
import { burgerSideSvg } from './icons';

const PALETTE = {
  n: '#3a3a40', m: '#56565e', K: '#0e0e10', Y: '#fff0a0', y: '#e8a040',
  T: '#ecebe2', t: '#d4d6d0', g: '#3c6cc0', p: '#3c9a2c', P: '#6cc83c', a: '#141414',
  S: '#eef2f4', Z: '#b4bcc2', r: '#9aa2a8', k: '#141414',
  B: '#e0902c', b: '#a85a18', w: '#fcf0d8', G: '#5cc020', q: '#fcd400', U: '#5a2c18', u: '#3c1c10',
};

/** Rows of the pergola bar (with its lights under it) and of the counter, for a grid `h` rows tall. */
const BEAM_ROWS = 3;
const counterTop = (h: number): number => h - Math.max(5, Math.round(h * 0.26));

function paint(g: Grid): void {
  const top = counterTop(g.h);
  // white tiles, blue grout every 3 px (offset rows, like the real wall)
  for (let y = BEAM_ROWS; y < top; y++) {
    for (let x = 0; x < g.w; x++) {
      const grout = (y - BEAM_ROWS) % 3 === 2 || (x + (Math.floor((y - BEAM_ROWS) / 3) % 2) * 2) % 4 === 3;
      g.put(x, y, grout ? 'g' : y % 2 && x % 5 === 1 ? 't' : 'T');
    }
  }
  // the ceiling above the black pergola bar, warm lights hanging under it
  for (let x = 0; x < g.w; x++) g.put(x, 0, x % 2 ? 'm' : 'n');
  g.rect(0, 1, g.w, BEAM_ROWS - 1, 'K');
  for (let x = 3; x < g.w; x += 8) {
    g.put(x, BEAM_ROWS, 'Y');
    g.put(x - 1, BEAM_ROWS, 'y');
    g.put(x + 1, BEAM_ROWS, 'y');
    g.put(x, BEAM_ROWS + 1, 'y');
  }
  // trailing plants on both sides
  const vine = (x0: number, dir: 1 | -1): void => {
    for (let i = 0; i < 4; i++) {
      const len = top - BEAM_ROWS - 2 - ((i * 3) % 5);
      for (let y = BEAM_ROWS; y < BEAM_ROWS + len; y++) g.put(x0 + dir * i + ((y + i) % 3 === 0 ? dir : 0), y, (y + i) % 2 ? 'p' : 'P');
    }
  };
  vine(0, 1);
  vine(g.w - 1, -1);
  // the polished steel top: a bright front edge, darker towards the player, warm reflections under the lights
  g.rect(0, top, g.w, 1, 'S');
  for (let y = top + 1; y < g.h; y++) g.rect(0, y, g.w, 1, y - top < 3 ? 'Z' : 'r');
  for (let x = 3; x < g.w; x += 8) g.rect(x, top + 1, 1, g.h - top - 1, 'y');
}

/** Side-view burger on the counter, 11x10, bottom bun on `base`. */
function burger(g: Grid, x: number, base: number): void {
  g.stamp(x, base - 9, [
    '...kkkkk...',
    '.kkBBwBBkk.',
    'kBBwBBBBwBk',
    'kbbbbbbbbbk',
    'kGGGGGGGGGk',
    'kqqqqqqqqqk',
    'kUUUUUUUUUk',
    'kuuuuuuuuuk',
    'kBBBBBBBBBk',
    '.kkkkkkkkk.',
  ]);
}

/** The face disc on the title card's counter, left of the burger and inside the landscape crop (columns 6-26). */
const DISC = { cx: 9.2, cy: 15.4, r: 2 } as const;

/**
 * Title card art (32x18): a burger on the counter; the art pack's scene replaces it via `.has-art`. The face disc is
 * the owner's original image (smooth), over either.
 */
export function kitchenThumb(): string {
  const g = new Grid('T');
  paint(g);
  burger(g, 11, counterTop(g.h));
  const art = '<image class="cc-thumb__kitchen" x="0" y="0" width="32" height="18" preserveAspectRatio="xMidYMid slice"/>';
  const { cx, cy, r } = DISC;
  const disc =
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" stroke="${PALETTE.k}" stroke-width="0.3" shape-rendering="geometricPrecision"/>` +
    `<image href="${FACE_URL}" x="${cx - r}" y="${cy - r * 0.8}" width="${2 * r}" height="${1.65 * r}" preserveAspectRatio="xMidYMid meet"/>`;
  return g.svg(PALETTE).replace('</svg>', `${art}${disc}</svg>`);
}

/** Wide backdrop of the pre-shift stage (the big burger is its own element on top). */
export function stageSvg(): string {
  const g = new Grid('T', 72, 26);
  paint(g);
  return g.svg(PALETTE);
}

/** The big burger of the pre-shift stage until the art pack's stack is ready. */
export const stageBurgerSvg = (): string => burgerSideSvg('cc-kstage__fallback');
