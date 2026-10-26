#!/usr/bin/env node
/**
 * HAPPY BOX art, cut out of the owner's shirt photo ref/level8_shirt_make_it_happy_v2.png (BRIEF v8 point 1):
 * crop the mascot, upscale x4, clean its colours on the print's palette keeping the lines, the teeth and the
 * lettering (happy-cut.mjs), keep the white sticker ring of the shirt (an even ink line inside it, a thin one
 * outside), split it into rig parts (pivots in src/game/cartoon/bosses/happy/config.ts HAPPY_RIG) and give each
 * part what a moving neighbour uncovers, with its own sticker edge (no cut or hairline when the parts move).
 * Rebuilds the MAKE IT HAPPY mural the same way. Writes public/level8/happy/*.webp.
 *
 *   node scripts/level8/happy.mjs [--sheet <abs contact-sheet.png>] [--debug <abs dir>]
 *
 * All polygon / seed coordinates are crop px (CROP below, 1 unit = 1 px of the photo).
 */
import path from 'node:path';
import { ROOT, report, runInPage, writeDataUrls } from './tuma-kit.mjs';
import { buildCutout, unsharp } from './happy-cut.mjs';
import { sheetOf, splitLayers } from './tuma-cut.mjs';

const arg = (n) => {
  const i = process.argv.indexOf(n);
  return i > 0 ? process.argv[i + 1] : undefined;
};

/** the colours drawn in the game (the print's colours, the lines in level-8 ink) */
const PAINT = { ink: '#1c1511', line: '#1f4a63', white: '#f4f6f6', blue: '#0a9fe2', pink: '#e0087f', grey: '#8d8790', yellow: '#e2ae48' };

export const HAPPY_SPEC = {
  ref: 'ref/level8_shirt_make_it_happy_v2.png',
  crop: { x: 545, y: 1165, w: 300, h: 260 },
  /** processing scale (crop px -> work px) and output scale (crop px -> file px) */
  work: 4,
  out: 2.5,
  palette: { ink: '#121314', line: '#24485a', white: '#eef2f3', blue: '#069de0', pink: '#de067d', grey: '#868088', yellow: '#d8a84c' },
  paint: PAINT,
  /** the inside of the box, seen when the lid lifts */
  inside: '#123a52',
  /** where a palette entry is allowed (elsewhere the pixel falls back to ink / line / white / blue) */
  only: {
    pink: [[[210, 40], [236, 40], [282, 128], [280, 146], [254, 150], [212, 64]]],
    grey: [[[210, 40], [236, 40], [282, 128], [280, 146], [254, 150], [212, 64]]],
    yellow: [[[92, 12], [222, 12], [222, 48], [92, 48]]],
  },
  /** the colour mix of an edge ramps over this part of the photo's mix (crisper than the photo) */
  sharp: [0.1, 0.9],
  /** unsharp mask [radius crop px, amount] before the colour model */
  unsharp: [1, 0.8],
  /** blur radius (crop px) that smooths the silhouette's edge */
  smooth: 0.5,
  /** the white sticker ring: min channel above whiteMin (grey-ish), grown by ringPad work px */
  whiteMin: 150,
  ringPad: 2,
  /** removed before anything: the HAPPY lettering above the lid, the floor shadow ellipse */
  cuts: [
    [[0, 0], [300, 0], [300, 12], [171, 12], [171, 6], [155, 6], [155, 12], [0, 12]],
    [[0, 234], [300, 234], [300, 260], [0, 260]],
    [[40, 222], [63, 222], [66, 234], [40, 234]],
    [[198, 222], [230, 222], [230, 234], [196, 234]],
  ],
  /** shirt showing through closed loops of the outline (between the legs, inside the can arm) */
  holes: [[110, 192], [166, 188], [205, 110]],
  centre: [190, 60],
  /** the sticker: ink line round the mascot, white ring, ink edge outside the ring (crop px) */
  edge: 0.8,
  ring: 2.4,
  outline: 0.7,
  /** ink edge of a hidden continuation (`under` of a part with `rim`, crop px) */
  rim: 1,
  /**
   * rig parts, back to front: polygon (crop px; null = the rest), `under` = where the layer continues beneath the
   * parts in front of it (`underFill` colour, `rim` ink edge), `sticker` = it also gets its own white ring there
   * (tuma-cut.mjs), `inkEdge` = a thin ink edge where its cut crosses flat colour, `minus` = colour it never
   * takes, `open` = the box inside under the lid. The cuts run along the print's own lines: the feet start under
   * the box's bottom band, the can arm's edge runs in the gap beside the box.
   */
  parts: [
    { name: 'wing', poly: [[18, 62], [60, 62], [93, 99], [95, 105], [60, 124], [56, 132], [18, 114]], under: [[[56, 128], [60, 121], [95, 102], [106, 106], [106, 134], [66, 138]]], underFill: PAINT.blue, rim: true, sticker: true },
    {
      name: 'feet',
      poly: [[40, 240], [40, 204], [80, 198], [118, 196], [118, 172], [124, 169], [145, 169], [147, 174], [204, 174], [204, 240]],
      // the legs go on up under the box (it bobs on them)
      under: [[[126, 148], [143, 148], [143, 171], [126, 171]]],
      underFill: PAINT.blue,
      rim: true,
      sticker: true,
    },
    {
      name: 'body',
      poly: null,
      // the box's side face behind the left arm, its right side behind the can arm's shoulder, its corner under the finger
      under: [
        [[60, 128], [66, 122], [92, 108], [106, 160], [104, 172], [96, 174], [80, 160], [66, 142]],
        [[178, 110], [196, 110], [192, 128], [188, 145], [186, 160], [178, 160]],
        [[203, 38], [212, 38], [212, 46], [210, 56], [203, 56]],
      ],
      underFill: PAINT.blue,
      rim: true,
      sticker: true,
      open: [[100, 42], [110, 34], [200, 30], [209, 36], [205, 42]],
    },
    { name: 'lid', poly: [[94, 0], [220, 0], [220, 34], [214, 41], [206, 42], [102, 43], [94, 41]], minus: { colour: 'blue', pad: 0.3 }, sticker: true },
    { name: 'armL', poly: [[14, 150], [60, 136], [86, 130], [100, 138], [106, 160], [98, 178], [88, 198], [76, 208], [60, 216], [36, 214], [14, 196]] },
    { name: 'armR', poly: [[212, 28], [224, 16], [262, 40], [286, 80], [298, 126], [290, 156], [252, 158], [228, 148], [200, 150], [189, 148], [191, 126], [197, 120], [201, 105], [205, 90], [209, 76], [211, 66], [211, 56], [212, 46]], inkEdge: true },
  ],
};

/**
 * The shirt's MAKE IT HAPPY lettering (the mural on the alley wall), rebuilt like the mascot: x`work`, unsharp,
 * two-colour model on the print's palette (crisp letter edges, flat white and pink instead of the photo's blur and
 * creases) with the black shirt -> transparent, written at the game's texture scale. The mascot's lid under the
 * letters is taken off below `lidTop` (under the drips of A, P, P and Y, which keep their round ends).
 */
export const MURAL_SPEC = {
  crop: { x: 505, y: 1040, w: 395, h: 160 },
  work: 4,
  /** file px per crop px = HAPPY_CFG.texMax (src/game/cartoon/bosses/happy/config.ts): no upscale in the game */
  out: 2.5,
  palette: { shirt: '#121314', white: '#eef2f3', pink: '#de067d' },
  paint: { shirt: null, white: PAINT.white, pink: PAINT.pink },
  unsharp: [1, 0.8],
  sharp: [0.15, 0.85],
  /** the lid (its knob touches the second P's drip: the cut rounds the drip's end there) */
  lid: [[[125, 137], [196, 137], [199, 129], [202, 132.5], [206, 133.5], [210, 132.5], [213, 129], [216, 137], [280, 137], [280, 160], [125, 160]]],
};

function buildMural(PX, s, imgs) {
  const { crop, work: K } = s;
  const W = crop.w * K;
  const H = crop.h * K;
  const px = PX.pixels(PX.crop(imgs[0], crop.x, crop.y, crop.w, crop.h, K));
  unsharp(PX, px, s.unsharp[0] * K, s.unsharp[1]);
  const names = Object.keys(s.palette);
  const { a, b, t } = PX.project(px, names.map((n) => s.palette[n]), names.map(() => null));
  const lid = PX.polyMask(W, H, s.lid, K);
  const paint = names.map((n) => (s.paint[n] ? PX.hex(s.paint[n]) : null));
  const [lo, hi] = s.sharp;
  const d = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) {
    if (lid[i]) continue;
    const u = Math.max(0, Math.min(1, (t[i] - lo) / (hi - lo)));
    const v = u * u * (3 - 2 * u);
    const A = paint[a[i]];
    const B = paint[b[i]];
    // the shirt (no paint) is the transparent part of the mix
    const alpha = (A ? 1 - v : 0) + (B ? v : 0);
    if (alpha <= 0) continue;
    for (let c = 0; c < 3; c++) d[i * 4 + c] = ((A ? A[c] * (1 - v) : 0) + (B ? B[c] * v : 0)) / alpha;
    d[i * 4 + 3] = alpha * 255;
  }
  return { mural: PX.resize(PX.toCanvas({ w: W, h: H, d }), crop.w * s.out, crop.h * s.out).toDataURL('image/webp', 0.9) };
}

const sheet = arg('--sheet');
const debug = arg('--debug');
const res = await runInPage(buildCutout, { ...HAPPY_SPEC, wantSheet: Boolean(sheet), wantDebug: Boolean(debug) }, [HAPPY_SPEC.ref], [splitLayers, sheetOf, unsharp]);
const mural = await runInPage(buildMural, MURAL_SPEC, [HAPPY_SPEC.ref], [unsharp]);
const files = Object.fromEntries(Object.entries({ ...res.files, ...mural }).map(([k, v]) => [`${k}.webp`, v]));
report('happy', writeDataUrls(path.join(ROOT, 'public/level8/happy'), files), 1.2 * 1024 * 1024 * 0.5);
if (sheet) writeDataUrls(path.dirname(sheet), { [path.basename(sheet)]: res.sheet });
if (debug) writeDataUrls(debug, res.debug);
process.stdout.write(`happy silhouette IoU vs reference: ${res.iou.toFixed(3)}  size ${res.size.join('x')} px\n`);
// BRIEF v8 point 1: the rig at rest must cover the print's silhouette
if (res.iou < 0.9) {
  process.stderr.write('happy: silhouette IoU under 0.9\n');
  process.exitCode = 1;
}
