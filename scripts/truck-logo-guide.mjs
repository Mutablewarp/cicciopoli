#!/usr/bin/env node
/**
 * Tracing guide for the hand-pixelled truck vinyl in src/art/rush/lettering.ts: levels the white
 * "Ciccio's" script, the burger and "The Burger Truck" of ref/truck_top.png (render of the real van,
 * the side is rotated by -13 deg) and prints an area-averaged, thresholded bake at the requested
 * size ('#' = white vinyl). The bake is only a guide: thin strokes break up at game size, so the
 * final grids are drawn by hand over it.
 *
 *   node scripts/truck-logo-guide.mjs [part=word|burger|tagline] [width] [height] [threshold=0.45]
 *   e.g. node scripts/truck-logo-guide.mjs word 40 16
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const png = PNG.sync.read(readFileSync(path.join(root, 'ref', 'truck_top.png')));

/** The van side, levelled around this centre; part boxes are relative to it (source px). */
const SIDE = { cx: 700, cy: 690, angle: (-13 * Math.PI) / 180, black: 60, white: 200 };
const PARTS = {
  word: { u: -332, v: -122, w: 418, h: 127 },
  burger: { u: 86, v: -125, w: 112, h: 104 },
  tagline: { u: -194, v: -8, w: 352, h: 44 },
};
const SS = 8;

const [part = 'word', tw = '40', th = '16', thr = '0.45'] = process.argv.slice(2);
const box = PARTS[part];
if (!box) {
  console.error(`unknown part '${part}' (word | burger | tagline)`);
  process.exit(2);
}

/** Whiteness 0..1 of the levelled side at (u, v): black paint and red checkers read 0. */
function white(u, v) {
  const { cx, cy, angle, black, white: w } = SIDE;
  const x = Math.round(cx + u * Math.cos(angle) - v * Math.sin(angle));
  const y = Math.round(cy + u * Math.sin(angle) + v * Math.cos(angle));
  const i = (y * png.width + x) * 4;
  const m = Math.min(png.data[i], png.data[i + 1], png.data[i + 2]);
  return Math.max(0, Math.min(1, (m - black) / (w - black)));
}

const W = Number(tw);
const H = Number(th);
for (let j = 0; j < H; j++) {
  let row = '';
  for (let i = 0; i < W; i++) {
    let s = 0;
    for (let b = 0; b < SS; b++) {
      for (let a = 0; a < SS; a++) s += white(box.u + ((i + (a + 0.5) / SS) * box.w) / W, box.v + ((j + (b + 0.5) / SS) * box.h) / H);
    }
    row += s / (SS * SS) >= Number(thr) ? '#' : '.';
  }
  console.log(row);
}
