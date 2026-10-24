#!/usr/bin/env node
/**
 * Bakes the official logo face (public/brand/ciccios-logo.png) into src/art/space/jetLogoBits.ts:
 * the 17x23 px head drawn on the round white badge of the level-3 jet (src/art/space/jetFace.ts).
 *
 *   1. area-average the head box onto the grid: outside '.', then by ink share black 'o',
 *      dark grey 'g', light grey 'l', white 'w';
 *   2. close the face with a black contour (on the white badge a white face has no edge);
 *   3. hand-clean the rows where 1:1 phone pixels need it (EDITS: each states the baked row it
 *      replaces, so a changed source logo fails here instead of silently drifting).
 * Light grey never survives step 3: the final grid is black, dark grey (the logo's thin strokes)
 * and white. Deterministic: re-running rewrites an identical file.
 *
 *   node scripts/jet-logo-bits.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'public', 'brand', 'ciccios-logo.png');
const OUT = path.join(root, 'src', 'art', 'space', 'jetLogoBits.ts');

/** Source box (px) of the head, found from the logo's alpha rows (same box as scripts/logo-bits.mjs). */
const HEAD = { x: 8, y: 8, w: 553, h: 798 };
const GRID = { w: 17, h: 23 };
/** A cell is inside the head from this alpha coverage; ink share thresholds, darkest first. */
const MIN_INSIDE = 0.45;
const LEVELS = [
  [0.66, 'o'],
  [0.4, 'g'],
  [0.16, 'l'],
  [0, 'w'],
];

/**
 * Hand cleaning, row by row (baked row -> final row). The bake gives the silhouette, the hair
 * mass and where each feature sits; at 17 px the brows melt into the glasses and the thin nose
 * and lip lines average to light grey, so those rows are redrawn: solid black for brows, lenses
 * and upper lip, dark grey for the thin strokes (brow tails, glasses arms, nose, lip corners).
 */
const EDITS = [
  { row: 0, from: '.....oooooooo....', to: '......ooooo......', why: 'round crown, 1 px of disc under the ring' },
  { row: 1, from: '....oooooooooo...', to: '....ooooooooo....', why: 'crown follows the ring' },
  { row: 3, from: '..ooooggoooooooo.', to: '..oooooooooooooo.', why: 'solid hair (no grey parting)' },
  { row: 4, from: '.ooolwwwwwwwgooo.', to: '.ooooowwwwwoooooo', why: 'hairline arch, the lock on the right' },
  { row: 5, from: '.oolwwwwwwwwwgooo', to: '.ooowwwwwwwwooooo', why: 'hairline arch' },
  { row: 6, from: 'oogwwwwwwwwwwwooo', to: 'ooowwwwwwwwwwoooo', why: 'side hair, solid' },
  { row: 8, from: 'oowwwwwwwwwwwwgoo', to: 'oowwwooowooowwooo', why: 'two black brows, 1 px apart' },
  { row: 9, from: 'oowlooogwwooogloo', to: 'oowggwwwwwwwggwoo', why: 'brow tails in grey, white above the lenses' },
  { row: 10, from: 'ooloooolwwloooloo', to: 'oowwooowwwooowwoo', why: 'round lens tops (corners cut)' },
  { row: 11, from: 'ogwgoooowlooooggo', to: 'oogooooooooooogoo', why: 'full lens row with the bridge, grey arms' },
  { row: 12, from: 'ogooooooooooooogo', to: 'oowooooowooooowoo', why: 'lenses apart below the bridge' },
  { row: 13, from: '.owooooolwoooooo.', to: 'oowooooowooooowoo', why: 'lenses apart, full face width' },
  { row: 14, from: '.owwooogwwgooowo.', to: 'owwwooowwwooowwwo', why: 'round lens bottoms' },
  { row: 15, from: '.owwwwwwwwwwwwwo.', to: 'owwwwwgwwwgwwwwwo', why: 'nose sides in grey' },
  { row: 16, from: '.owwwwwwwwwwwwwo.', to: 'owwwwwwgogwwwwwwo', why: 'nose tip: black between grey nostrils' },
  { row: 17, from: '.owwwwwwwlwwwwwo.', to: 'owwwwwwwwwwwwwwwo', why: 'clean cheeks above the mouth' },
  { row: 18, from: '..owwwllggllwwo..', to: '.owwwgooooogwwwo.', why: 'upper lip: one black line, grey corners' },
  { row: 19, from: '...owwwwwwwwwwo..', to: '.owwwwwgggwwwwwo.', why: 'lower lip in grey' },
  { row: 20, from: '....owwwwwwwwo...', to: '..owwwwwwwwwwwo..', why: 'jaw mirrored about the middle column' },
  { row: 21, from: '.....oowwwwoo....', to: '...ooowwwwwooo...', why: 'chin, centred' },
  { row: 22, from: '.......oooo......', to: '......ooooo......', why: 'chin bottom centred, 1 px of disc over the ring' },
];

const png = PNG.sync.read(readFileSync(SRC));

/** Alpha coverage of the box and the share of that coverage that is black ink. */
function cover(bx, by, bw, bh) {
  let all = 0;
  let ink = 0;
  for (let y = Math.floor(by); y < Math.ceil(by + bh); y++) {
    const wy = Math.min(y + 1, by + bh) - Math.max(y, by);
    for (let x = Math.floor(bx); x < Math.ceil(bx + bw); x++) {
      const wx = Math.min(x + 1, bx + bw) - Math.max(x, bx);
      const i = (y * png.width + x) * 4;
      const a = (wx * wy * png.data[i + 3]) / 255;
      all += a;
      ink += a * (1 - png.data[i] / 255);
    }
  }
  return { inside: all / (bw * bh), ink: all > 0 ? ink / all : 0 };
}

const bw = HEAD.w / GRID.w;
const bh = HEAD.h / GRID.h;
const baked = Array.from({ length: GRID.h }, (_, j) =>
  Array.from({ length: GRID.w }, (_, i) => {
    const c = cover(HEAD.x + i * bw, HEAD.y + j * bh, bw, bh);
    return c.inside < MIN_INSIDE ? '.' : LEVELS.find(([t]) => c.ink >= t)[1];
  }),
);
const at = (i, j) => baked[j]?.[i] ?? '.';
const outlined = baked.map((row, j) =>
  row.map((ch, i) => (ch !== 'o' && ch !== '.' && [at(i - 1, j), at(i + 1, j), at(i, j - 1), at(i, j + 1)].includes('.') ? 'o' : ch)).join(''),
);

const rows = [...outlined];
for (const e of EDITS) {
  if (rows[e.row] !== e.from) throw new Error(`row ${e.row}: baked '${rows[e.row]}', edit expects '${e.from}' (logo changed?)`);
  rows[e.row] = e.to;
}
for (const r of rows) if (r.length !== GRID.w || /[^ogw.]/.test(r)) throw new Error(`bad row '${r}'`);

writeFileSync(
  OUT,
  `/** Generated by scripts/jet-logo-bits.mjs from public/brand/ciccios-logo.png: do not edit. */
/**
 * Ciccio's official face for the jet badge, ${GRID.w}x${GRID.h} px: 'o' black ink, 'g' dark grey
 * (the logo's thin strokes), 'w' white face, '.' outside the head.
 */
export const JET_LOGO: readonly string[] = [
${rows.map((r) => `  '${r}',`).join('\n')}
];
`,
);
console.log(`wrote ${path.relative(root, OUT)} (${GRID.w}x${GRID.h}, ${EDITS.length} hand-cleaned rows)`);
