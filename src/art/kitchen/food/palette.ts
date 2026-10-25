/**
 * Level 7 food palette: every ingredient of the real Ciccio's menu gets its own hue family so the
 * player tells CHEDDAR from PROVOLA, SONGINO from LATTUGA at a glance (light / base / shade / dark,
 * light from the top-left). Packaging follows the real white paper boats with the light-grey golf
 * print (ref/level7_wrap_tray.jpg).
 */
import type { Tone } from '../../hills/mask';

/** Warm near-black outline of every food piece (reads tastier than the neutral PAL.ink). */
export const INK = '#26120a';
export const WHITE = '#fffcf2';

const t = (light: string, base: string, shade: string, dark?: string): Tone => (dark ? { light, base, shade, dark } : { light, base, shade });

export const T = {
  // brioche bun: egg-washed golden dome, pale crumb on the cut face
  bun: t('#fbc96a', '#e8952c', '#c0661c'),
  bunCrust: t('#d8822a', '#b8601c', '#8e4412'),
  crumb: t('#fff2cc', '#fce2a8', '#ecc483'),
  // beef: raw marbled red, cooked deep brown crust with a juicy edge, burnt charcoal
  beefRaw: t('#f2747a', '#d64650', '#a82a38'),
  beef: t('#8e4a24', '#5e2c14', '#3e1a0a'),
  beefOver: t('#5a3420', '#3e2214', '#28140a'),
  char: t('#4a3c36', '#2c2220', '#181212'),
  veggieRaw: t('#9aa654', '#76823a', '#525c26'),
  veggie: t('#8a7432', '#6a5424', '#463616'),
  // served patties in side view: golden-brown seared crust (beef) / golden (veggie), as PERFETTO on the griddle
  beefSide: t('#bc6c3a', '#93502a', '#6a361a', '#4c2412'),
  vegGolden: t('#d8b45c', '#ac8436', '#74561e'),
  // the patties' top face seen a little from above, a step lighter than their side
  beefRawTop: t('#ffa8a8', '#f47c80', '#d64650'),
  beefTop: t('#e8a462', '#c87c44', '#a05c30'),
  charTop: t('#5c4c46', '#3c302c', '#2c2220'),
  veggieRawTop: t('#bcc878', '#9aa654', '#76823a'),
  vegTop: t('#f0d480', '#d8b45c', '#ac8436'),
  // fried chicken: batter (pastellato), craggy crumb (croccante), spiky panko (coscia)
  batterRaw: t('#fbf0d4', '#f2dcb0', '#d8bc88'),
  batter: t('#ffd27a', '#f0aa44', '#c47a22'),
  crumbRaw: t('#f8dcaa', '#e0b87c', '#ac844e'),
  crisp: t('#f4b04a', '#d8862a', '#a45a16'),
  pankoRaw: t('#fff2c4', '#f2cf7e', '#c8963e', '#946628'),
  panko: t('#ffe09a', '#eea248', '#bc7020', '#8a4a10'),
  burntFry: t('#6a4426', '#40261a', '#26160e'),
  // cheeses
  cheddar: t('#ffc848', '#ff9810', '#d86a00', '#9c4600'),
  brieRind: t('#ffffff', '#f6f2e8', '#d6cfc0'),
  brie: t('#fff0b8', '#f6d888', '#dcb460'),
  provola: t('#fffae6', '#f8ecc6', '#e2cf9c'),
  provolaRind: t('#e8bc74', '#d4a058', '#a8742c'),
  taleggio: t('#fff6d6', '#fcecc0', '#e8d29a'),
  taleggioRind: t('#ffa476', '#ee8456', '#c05a36'),
  tuma: t('#fffbec', '#fbf2d8', '#e4d6ae'),
  honey: t('#ffe070', '#f4ac1c', '#c47806'),
  scamorza: t('#fff2d0', '#f6e2b6', '#e0c48c'),
  scamorzaRind: t('#c8843e', '#a0602a', '#6e3c16'),
  gorgonzola: t('#fffae4', '#f6eecc', '#ddd0a4'),
  vein: t('#86c2b2', '#4e8e86', '#2e5e5a'),
  // cured pork
  baconRaw: t('#f47478', '#dc4650', '#a82a36'),
  bacon: t('#d4602e', '#aa361e', '#701c10'),
  fatRaw: t('#fff0ea', '#f8dcd2', '#e6b8aa'),
  fat: t('#fcd494', '#f0b06a', '#c8803c'),
  guancialeFat: t('#fffaf0', '#fcecdc', '#e8cfb8'),
  pancetta: t('#fcc6c4', '#f29c9e', '#cc6a74'),
  // vegetables
  songino: t('#56ac44', '#2f7c2c', '#1c5420', '#0f3814'),
  lattuga: t('#d4fa94', '#a2e050', '#6cb02c', '#3e7a18'),
  tomato: t('#ff6c50', '#e8321f', '#b01c14', '#741008'),
  tomatoFlesh: t('#ffb4a0', '#ff8a70', '#f06650'),
  onion: t('#d6903e', '#a65e1e', '#703c10', '#4a2408'),
  crispyOnion: t('#ffd878', '#eaa63a', '#b87418', '#7a4810'),
  capuliato: t('#ff6a4a', '#e02c1c', '#a81810'),
  chilli: t('#ff5c40', '#e01c18', '#a00c0c'),
  // sweet / crunchy
  pear: t('#ffe690', '#f2c04a', '#c88a1c', '#8a5410'),
  jam: t('#94427a', '#62204e', '#3e0e2e'),
  figSkin: t('#8a4a7a', '#562450', '#341232'),
  figFlesh: t('#f6dcc8', '#d0405a', '#9a2440'),
  hazelnut: t('#d8944e', '#a8642c', '#70401a', '#4a2810'),
  walnut: t('#ecc088', '#c8945a', '#94643a', '#5e3c20'),
  // sauces (as on the menu)
  salsaCiccios: t('#ffae86', '#f47a4c', '#c85030'),
  salsaWhite: t('#ffffff', '#f2eee4', '#cdc6b8'),
  salsaBbq: t('#904428', '#5c2610', '#3a1406'),
  maionese: t('#fff8d2', '#fbe69a', '#e2c66c'),
  salsaJalapeno: t('#b2e070', '#7cbc3c', '#4c8a20'),
  // fryer sides
  friesRaw: t('#fff6d8', '#f4e6b4', '#d8c48a'),
  fries: t('#fff09a', '#fcc030', '#d88a10'),
  meatballRaw: t('#d29a74', '#a86a48', '#7a4630', '#5a3020'),
  meatball: t('#b06434', '#7e3e1c', '#54260e', '#3a1808'),
  greenRaw: t('#d4e8a4', '#aac870', '#7e9c48'),
  green: t('#d8c450', '#a8a432', '#6e7a22'),
  friesBurnt: t('#9a6428', '#6e4216', '#46280a'),
  // griddle doneness of the beef seen from above
  beefSeared: t('#e08a74', '#b8605a', '#8a3a3a'),
  beefGolden: t('#cc8444', '#9e5428', '#6a3014'),
  // ceramic ramekin / bowl, packaging
  ceramic: t('#ffffff', '#ecebe6', '#c4c0ba'),
  parchment: t('#fffaf0', '#efe8da', '#c8bca6'),
  // Ciccio's white paper boat (fries / starters)
  boat: t('#fffdf6', '#f3eee2', '#ddd4c2', '#a89c86'),
  steel: t('#f2f4f8', '#c8ccd4', '#8a909c'),
} as const;

/** Egg-washed brioche, dark -> light (dithered by ballLight on the dome and the bin tops). */
export const BUN_RAMP = ['#7e3a10', '#a4521a', '#c2661e', '#da8028', '#ec9c3c', '#f8b856', '#ffd282', '#fff0c0'] as const;

export const C = {
  marbling: '#fcd0cc',
  juice: '#b86a3a',
  sheen: '#c88a52',
  ember: '#ff7a1e',
  emberHot: '#ffc840',
  ash: '#6a5e58',
  pea: '#8ad048',
  carrot: '#f08a28',
  corn: '#f8d850',
  seed: '#f8de6a',
  stem: '#4a8a2c',
  veinLight: '#eefcc8',
  jamSeed: '#d8a070',
  rindSpeck: '#e4ddcc',
  golf: '#d6cfbf',
  golfInside: '#c9c0ad',
  label: '#fcfaf2',
  glass: '#e4f2f6',
  glassShade: '#a8c8d4',
  glassDark: '#6e94a4',
} as const;
