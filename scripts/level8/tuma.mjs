#!/usr/bin/env node
/**
 * DON TUMA art, cut out of the owner's shirt photo ref/level8_shirt_tuma_siciliana_v2.png (BRIEF v8 point 1):
 * the coral line art is kept exactly (it becomes the ink) and its closed regions get natural colours; the
 * mascot is split into rig parts (pivots in src/game/cartoon/bosses/tuma/config.ts TUMA_RIG) and the potted
 * lemon trees, the oranges and the leaves of the print become arena props. Writes public/level8/tuma/*.webp.
 *
 *   node scripts/level8/tuma.mjs [--sheet <abs contact-sheet.png>] [--debug <abs dir>]
 *
 * Coordinates are px of each item's crop of the photo (1 unit = 1 px of the photo).
 */
import path from 'node:path';
import { ROOT, report, runInPage, writeDataUrls } from './tuma-kit.mjs';
import { sheetOf, splitLayers } from './tuma-cut.mjs';
import { buildLineArt } from './tuma-line.mjs';

const arg = (n) => {
  const i = process.argv.indexOf(n);
  return i > 0 ? process.argv[i + 1] : undefined;
};

const C = {
  ink: '#3b1a14',
  cheese: '#f7e9bf',
  rind: '#e9c46a',
  glove: '#fffaf0',
  cap: '#8c7a5c',
  capBand: '#6e5c42',
  shoe: '#5a3423',
  sole: '#d4a46a',
  tread: '#b88550',
  wood: '#c98f52',
  canvas: '#e0574a',
  nose: '#f0846c',
  mouth: '#8e2a22',
  tongue: '#ea7068',
  eye: '#fff8e6',
  brow: '#4a2a1a',
  leaf: '#6f9a3c',
  lemon: '#f6d43a',
  orange: '#f08c26',
  trunk: '#8a5a32',
  pot: '#c8643a',
  rim: '#d97a4a',
  soil: '#5a3a24',
  sand: '#ead19c',
};

export const TUMA_SPEC = {
  ref: 'ref/level8_shirt_tuma_siciliana_v2.png',
  work: 4,
  out: 2.5,
  /** line art: darkness 255 - luma above `low` and above `frac` x its local max (radius r crop px) */
  line: { r: 2.5, low: 62, frac: 0.6 },
  /** ink edge of a hidden continuation (`under` of a part with `rim`, crop px) */
  rim: 1.1,
  /** width of the strokes that close a broken line (`close`, crop px) */
  closeW: 1.6,
  /** a `solid` fill keeps this much ink round its edge (crop px) */
  solidInset: 1.8,
  minArea: 2,
  ink: C.ink,
  items: [
    {
      name: 'rig',
      crop: { x: 515, y: 1015, w: 350, h: 320 },
      poly: [[4, 16], [100, 4], [175, 0], [332, 0], [340, 16], [304, 136], [306, 166], [282, 200], [292, 252], [215, 251], [186, 224], [176, 252], [166, 288], [156, 295], [140, 298], [44, 270], [28, 248], [25, 214], [14, 210], [12, 176], [38, 170], [55, 171], [64, 134], [53, 133], [52, 120], [40, 74], [4, 60]],
      reach: 3.2,
      /** unsharp mask [radius crop px, amount] before the line mask: the sandals' close lines stay apart */
      unsharp: [1.2, 1],
      /** the left pot behind the deck chair (its body, its rim) */
      skip: [[20, 220], [17, 205]],
      /** the shirt inside the deck chair frame */
      holes: [[100, 265], [235, 225]],
      /** around the legs the print's solid coral is the deck chair's canvas seen between them */
      solid: [{ poly: [[68, 128], [118, 128], [124, 150], [160, 160], [160, 214], [68, 214]], colour: C.canvas }],
      /** where each sandal's sole meets its footbed at the toe */
      close: [[80, 198, 86, 203], [142, 228, 148, 233]],
      seeds: [
        [65, 40, C.glove], [25, 32, C.glove], [245, 175, C.glove],
        [259, 100, C.rind],
        [220, 15, C.cap], [205, 37, C.capBand],
        [190, 48, C.brow], [228, 58, C.brow],
        [175, 62, C.eye], [168, 70, C.eye], [180, 85, C.eye], [198, 78, C.eye], [215, 90, C.eye],
        [170, 102, C.nose], [165, 125, C.mouth], [162, 137, C.tongue],
        [290, 40, C.canvas], [275, 100, C.canvas], [205, 180, C.canvas], [106, 184, C.canvas],
        [299, 117, C.wood],
        // the crossed legs (cheese, like his arm) and the two sandals of the shirt, coloured alike: light footbed, dark sole
        [100, 146, C.cheese], [140, 180, C.cheese],
        [40, 199, C.sole], [36, 186, C.sole], [50, 208, C.shoe], [80, 222, C.sole], [100, 240, C.shoe],
        [95, 163, C.canvas], [29, 222, C.wood], [100, 195, C.wood],
        [90, 268, C.wood], [165, 230, C.wood], [316, 60, C.wood], [80, 121, C.wood], [80, 127, C.wood], [66, 150, C.wood], [200, 203, C.wood], [240, 236, C.wood],
      ],
      /** rig parts, back to front (polygon null = the rest); `under` = where the layer continues beneath the parts covering it */
      parts: [
        // the deck chair's canvas goes on behind Don Tuma (seen when he leans or melts)
        { name: 'chairBack', poly: null, fill: C.wood, under: [[[215, 16], [270, 14], [300, 40], [300, 186], [124, 186], [104, 150], [110, 136], [170, 146]]], underFill: C.canvas, rim: true },
        {
          name: 'legs',
          // the upper leg + its sandal, the lower leg + its sandal (the chair post, the seat and its bar stay with the chair)
          polys: [
            [[8, 176], [40, 170], [58, 172], [66, 152], [74, 140], [92, 136], [114, 138], [116, 154], [92, 154], [82, 164], [80, 176], [88, 184], [88, 212], [60, 214], [8, 214]],
            [[64, 206], [90, 204], [118, 206], [126, 200], [132, 180], [140, 164], [152, 158], [158, 170], [150, 200], [148, 246], [64, 246]],
          ],
          fill: C.sole,
          // where the legs go on under the cheese
          under: [[[104, 136], [122, 132], [124, 152], [108, 156]], [[140, 150], [160, 148], [160, 166], [146, 166]]],
          underFill: C.cheese,
          rim: true,
        },
        // the arm goes on into the cheese as a tube (no patch when it waves)
        { name: 'wave', poly: [[0, 10], [95, 4], [118, 82], [120, 104], [100, 108], [60, 82], [0, 60]], fill: C.cheese, under: [[[110, 84], [126, 97], [116, 110], [100, 100]]], underFill: C.cheese, rim: true },
        // the cheese goes on behind the armrest (no gap when he bobs)
        { name: 'body', poly: [[106, 100], [118, 62], [150, 30], [178, 2], [262, 2], [268, 40], [264, 120], [256, 145], [230, 150], [200, 160], [175, 172], [140, 168], [115, 150]], fill: C.cheese, under: [[[176, 138], [232, 134], [224, 154], [176, 160]]], underFill: C.cheese },
        // the armrest in front of him: its top edge runs along the drawn one (no piece of the cheese stays behind when he bobs)
        { name: 'chairFront', poly: [[176, 146], [256, 140], [258, 124], [300, 118], [310, 170], [270, 205], [228, 205], [176, 168]], fill: C.wood },
      ],
    },
    {
      /** the potted lemon tree right of the deck chair (the chair bar hides its crown's left: mirrored from the right) */
      name: 'tree',
      crop: { x: 795, y: 1035, w: 160, h: 270 },
      poly: [[52, 0], [160, 0], [160, 270], [0, 270], [0, 160], [22, 140], [40, 100]],
      mirrorTop: { axis: 88, below: 101 },
      reach: 3.2,
      seeds: [
        [85, 40, C.lemon], [110, 40, C.lemon], [50, 75, C.lemon], [75, 70, C.lemon], [112, 72, C.lemon],
        [88, 125, C.trunk], [84, 112, C.trunk], [92, 140, C.trunk],
        [75, 168, C.rim], [75, 190, C.pot], [75, 158, C.soil],
        [120, 230, C.sand], [130, 215, C.sand],
        [25, 215, C.orange], [60, 230, C.orange],
      ],
      parts: [{ name: 'tree', poly: null, fill: C.leaf }],
    },
  ],
};

const sheet = arg('--sheet');
const debug = arg('--debug');
const res = await runInPage(buildLineArt, { ...TUMA_SPEC, wantSheet: Boolean(sheet), wantDebug: Boolean(debug) }, [TUMA_SPEC.ref], [splitLayers, sheetOf]);
const files = Object.fromEntries(Object.entries(res.files).map(([k, v]) => [`${k}.webp`, v]));
report('tuma', writeDataUrls(path.join(ROOT, 'public/level8/tuma'), files), 1.2 * 1024 * 1024 * 0.6);
if (sheet && res.sheet) writeDataUrls(path.dirname(sheet), { [path.basename(sheet)]: res.sheet });
if (debug) writeDataUrls(debug, res.debug);
for (const [k, v] of Object.entries(res.iou)) {
  process.stdout.write(`tuma ${k}: silhouette IoU vs reference ${v.toFixed(3)}  size ${res.size[k].join('x')} px\n`);
  // BRIEF v8 point 1: the rig at rest must cover the print's silhouette
  if (v < 0.9) process.exitCode = 1;
}
