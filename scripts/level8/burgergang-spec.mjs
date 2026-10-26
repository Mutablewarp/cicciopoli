/**
 * Numbers of the BOSS-D art builder (scripts/level8/burgergang.mjs). Every coordinate is a pixel of the source
 * screenshot ref/level8_shirt_burger_gang_v2.png (1290 x 2796); stroke widths too. Found by eye on gridded crops.
 */
/** the ruffled top edge of the lettuce painted under the sunglasses: x 612..768, round crests every 14 px */
const LETTUCE_TOP = Array.from({ length: 157 }, (_, i) => [612 + i, 1070.5 - 2.6 * Math.abs(Math.sin((i * Math.PI) / 14))]);

export const SPEC = {
  source: 'ref/level8_shirt_burger_gang_v2.png',
  /** the mascot on the shirt (with its white sticker band) */
  crop: { x: 556, y: 990, w: 290, h: 300 },
  /** working upscale (label px per shirt px) */
  up: 4,
  /** the print's flat palette (sampled from the shirt; ink and white first) */
  palette: [
    ['ink', '#141414'], ['white', '#f7f7f5'],
    ['bun', '#cf8a42'], ['bunHi', '#edbd85'], ['bunSh', '#a8682c'],
    ['patty', '#8a5026'], ['pattyDk', '#57301a'],
    ['lettuce', '#4ba63f'], ['lettuceDk', '#2d6b25'],
    ['tomato', '#c9232d'], ['cheese', '#f7b62f'],
    ['blue', '#129ddb'], ['blueDk', '#1d6a90'],
    ['pink', '#e0287f'], ['yellow', '#ece04a'], ['cup', '#cc1f2a'],
  ],
  clean: {
    /** chroma under which a pixel is ink or white only, and the lightness that splits them (Lab) */
    grey: 14,
    split: 70,
    /** majority-vote despeckle: disc radius (label px) and passes */
    radius: 3,
    passes: 2,
    /** white sticker band width and the ink-gap seal (label px); ink edge of the part masks; drawn ink ring
     * outside the white band */
    band: 26,
    seal: 2.5,
    outline: 6,
    ring: 5,
    /** unsharp mask of the print's colours: blur radius (label px) and strength */
    sharpen: { px: 3, amount: 0.6 },
    /** thinner bits of the cut-out than this (label px, a radius) are dropped */
    open: 5,
    /** a label's pixel counts for its mean tone when the same label runs on this far (label px) all round */
    interior: 3,
  },
  /** shirt showing through enclosed holes: inside the bent arm, between the shoes */
  holes: [[603, 1080], [687, 1245]],
  /** the print's black shadow ovals under the shoes (cut just under the soles) */
  ground: [[540, 1261.6], [695, 1261.6], [699, 1268.6], [760, 1268.6], [766, 1265], [772, 1258], [780, 1250], [860, 1250], [860, 1300], [540, 1300]],
  /** the right sneaker's white sole runs into the sticker band with no ink between: it stays white */
  protect: [[695, 1262.5], [740, 1263.5], [752, 1259], [760, 1250], [766, 1250], [766, 1266], [760, 1268.8], [695, 1268.8]],
  /** feet point (centre of the ground line): boss space origin */
  foot: [697, 1268],
  /** how far (label px) a part runs on under the parts drawn in front of it (no seams between parts) */
  bleed: 4,
  /** atlas px per shirt px, padding between parts, max atlas width, WebP quality */
  tex: 2.5,
  pad: 4,
  maxW: 1024,
  quality: 0.9,
  /**
   * Parts in claim order (a pixel belongs to the first part that claims it; body = the rest); z = draw order. A
   * part is a polygon (optionally narrowed to `labels`) or seeded floods over `flood` colours (plus all its `labels`
   * pixels) grown `grow.px` label px into their outline colours, plus `fringe` label px of any colour round that,
   * plus `also` polygons. `under` = vector paint beneath
   * the part where a part in front hid it (shows when that part moves away; `inpaint` fills run the part's own
   * visible pixels of those colours on smoothly); `pivot` = the joint it turns around.
   */
  parts: [
    {
      name: 'gloveL',
      z: 7,
      poly: [[566, 994], [652, 994], [652, 1050], [630, 1068], [578, 1074], [564, 1045]],
      seeds: [[600, 1030], [595, 1050], [622, 1012], [632, 1034], [612, 1048]],
      flood: ['white'],
      grow: { px: 24, labels: ['ink'] },
      pivot: [624, 1095],
    },
    {
      name: 'mouth',
      z: 6,
      poly: [[699, 1056], [723, 1056], [728, 1070], [726, 1084], [699, 1084], [695, 1070]],
      labels: ['lettuce', 'lettuceDk', 'ink'],
      pivot: [711, 1070],
    },
    {
      name: 'shades',
      z: 5,
      poly: [[606, 1028], [650, 1042], [690, 1040], [748, 1036], [766, 1042], [760, 1068], [746, 1084], [700, 1088], [650, 1092], [635, 1083], [622, 1066], [606, 1052]],
      seeds: [[630, 1046], [698, 1058], [735, 1047], [662, 1070], [675, 1066], [736, 1056], [712, 1062]],
      flood: ['yellow', 'pink', 'white', 'tomato', 'cup'],
      labels: ['yellow', 'pink'],
      grow: { px: 16, labels: ['ink', 'pattyDk', 'bunSh', 'patty', 'bunHi'] },
      fringe: 6,
      under: [{ pts: [[634, 1044], [617, 1033]], strokes: [['pattyDk', 7], ['yellow', 4.5]] }],
      pivot: [690, 1062],
    },
    {
      name: 'armR',
      z: 3,
      poly: [[763, 1086], [776, 1082], [778, 1036], [842, 1036], [844, 1116], [763, 1116]],
      labels: ['ink', 'white', 'bun', 'bunHi', 'bunSh', 'patty', 'pattyDk', 'cup', 'pink', 'tomato', 'blue', 'blueDk'],
      under: [{ pts: [[768, 1097], [748, 1097]], strokes: [['ink', 16], ['bun', 11.5]] }],
      pivot: [765, 1097],
    },
    {
      name: 'armL',
      z: 2,
      poly: [[558, 1058], [600, 1058], [612, 1066], [624, 1080], [624, 1116], [558, 1116]],
      labels: ['ink', 'bun', 'bunHi', 'bunSh', 'patty', 'pattyDk'],
      under: [{ pts: [[618, 1096], [638, 1096]], strokes: [['ink', 17], ['bun', 12]] }],
      pivot: [624, 1095],
    },
    {
      name: 'legF',
      z: 1,
      poly: [[662, 1179], [714, 1179], [714, 1212], [788, 1212], [788, 1278], [686, 1278], [686, 1216], [662, 1216]],
      seeds: [[687, 1198]],
      flood: ['bun', 'bunHi'],
      grow: { px: 24, labels: ['ink', 'bunSh', 'pattyDk', 'patty'] },
      also: [[[686, 1212], [788, 1212], [788, 1278], [686, 1278]]],
      under: [{ pts: [[684, 1192], [672, 1166]], strokes: [['ink', 18], ['bun', 13]] }],
      pivot: [676, 1178],
    },
    {
      name: 'legB',
      z: 0,
      poly: [[654, 1179], [714, 1179], [714, 1212], [686, 1212], [686, 1278], [606, 1278], [606, 1200]],
      seeds: [[665, 1203]],
      flood: ['bun', 'bunHi'],
      grow: { px: 24, labels: ['ink', 'bunSh', 'pattyDk', 'patty'] },
      also: [[[606, 1204], [686, 1207], [686, 1278], [606, 1278]], [[606, 1182], [684, 1182], [684, 1210], [606, 1210]]],
      under: [{ pts: [[668, 1206], [688, 1184], [697, 1166]], strokes: [['ink', 16], ['bun', 11]] }],
      pivot: [692, 1178],
    },
    {
      name: 'body',
      z: 4,
      under: [
        { clip: [[610, 995], [775, 995], [775, 1086], [610, 1086]], ellipse: [688, 1072, 76, 75], inpaint: ['bun'], strokes: [['ink', 2.6]] },
        {
          clip: [[610, 995], [775, 995], [775, 1090], [610, 1090]],
          pts: [...LETTUCE_TOP, [768, 1092], [612, 1092]],
          close: true,
          fill: 'lettuce',
          strokes: [['lettuceDk', 1.6]],
        },
        { clip: [[680, 1041], [730, 1041], [730, 1060], [680, 1060]], ellipse: [703, 1031, 9.5, 14], fill: 'white', strokes: [['ink', 2.2]] },
      ],
      pivot: [690, 1178],
    },
  ],
  /** the BURGER GANG lettering under the mascot (arena sign): crop, upscale, black-to-alpha ramp (max channel) */
  gang: { crop: { x: 532, y: 1306, w: 312, h: 156 }, up: 3, black: 45, solid: 120 },
};
