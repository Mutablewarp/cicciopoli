#!/usr/bin/env node
/**
 * Rebuilds THE OLD SCHOOL boss art from the owner's shirt (ref/level8_shirt_old_school_v2.png, black line art):
 * the line art is kept exactly (x4 upscale, threshold, anti-aliased coverage), its closed regions get natural
 * colours (bun, patty, double cheddar, double bacon, BBQ sauce, the white gloves), and it is cut into parts
 * for the rubber-hose rig: burger (with the bun the fingers hide painted in), waving arm, the giant hand's
 * back (palm painted where the burger hides it) and its front fingers.
 *
 *   node scripts/level8/oldschool.mjs [--debug <dir>]
 *
 * Writes public/level8/oldschool/{burger,arm,hand-back,hand-front}.webp and src/game/cartoon/bosses/oldschool/
 * sprites.ts (the source-pixel box of every part, read by the rig).
 */
import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dataUrl, openKit, save } from './oldschool-kit.mjs';
import { buildLineArt } from './oldschool-lineart.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const debugDir = args.includes('--debug') ? args[args.indexOf('--debug') + 1] : null;

/** points of the quadratic curve p0 → p1 bent toward c (n segments, p0 excluded) */
function curve(p0, c, p1, n = 12) {
  return Array.from({ length: n }, (_, k) => {
    const t = (k + 1) / n;
    const u = 1 - t;
    return [u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]];
  });
}

const CFG = {
  s: 4,
  crop: { x: 410, y: 1085, w: 490, h: 570 },
  ink: '#1c1511',
  inkLum: 120,
  paperLum: 175,
  solidLum: 60,
  close: 6,
  small: 2500,
  solid: 14,
  ring: 1.1,
  lineW: 2.4,
  outScale: 0.5,
  cel: { shadow: 3.5, light: 2.5, shadowAmt: 0.2, lightAmt: 0.32 },
  colors: {
    bun: '#eba54a',
    bunBottom: '#e49a42',
    patty: '#5e321c',
    cheese: '#f7b52c',
    bacon: '#d6574a',
    sauce: '#a8421f',
    whiteSauce: '#f4ead0',
    glove: '#fbf7ee',
    tongue: '#ec5a72',
    mouth: '#5a1216',
    detail: '#fffdf6',
    speck: '#c98a55',
  },
  /** eyebrows float above the head: keep their ink */
  keep: [[595, 1160], [632, 1178]],
  regions: [
    [664, 1280, 'bun'], [535, 1244, 'bun'], [544, 1193, 'bun'], [510, 1205, 'glove'],
    [594, 1437, 'bunBottom'],
    [538, 1164, 'glove'], [751, 1494, 'glove'],
    [500, 1265, 'cheese'], [485, 1388, 'cheese'], [574, 1412, 'cheese'], [699, 1362, 'cheese'],
    [495, 1337, 'bacon'], [554, 1367, 'bacon'], [689, 1404, 'bacon'],
    [678, 1441, 'sauce'], [665, 1461, 'sauce'], [584, 1377, 'whiteSauce'],
    [597, 1287, 'tongue'],
  ],
  /** solid black inside these zones is food, not line: the patty and the open mouth */
  solidZones: [
    { color: 'patty', poly: [[455, 1285], [470, 1265], [520, 1280], [600, 1310], [680, 1335], [760, 1365], [770, 1440], [700, 1455], [640, 1440], [560, 1420], [500, 1405], [455, 1340]] },
    { color: 'mouth', poly: [[583, 1255], [642, 1250], [640, 1298], [585, 1298]] },
  ],
  details: [{ color: '#c98a55', poly: [[455, 1270], [540, 1300], [640, 1340], [760, 1380], [770, 1440], [700, 1450], [600, 1420], [520, 1390], [450, 1330]] }],
  hand: [[751, 1494]],
  /** the waving arm = the glove and its hose; the hand's fingers in front of the bun */
  arm: [[538, 1164], [510, 1205]],
  /** the arm never takes pixels outside this (the eye and the eyebrow next to the glove stay on the face) */
  armLimit: [[468, 1086], [600, 1086], [600, 1135], [577, 1150], [570, 1172], [560, 1182], [530, 1180], [523, 1200], [516, 1225], [512, 1240], [505, 1250], [490, 1250], [468, 1180]],
  handFront: [[640, 1185], [720, 1190], [790, 1215], [805, 1260], [790, 1320], [765, 1352], [748, 1342], [700, 1290], [655, 1245], [640, 1215]],

  paint: {
    // the bun dome the front fingers hide, and the palm the burger hides
    burger: [{ color: 'bun', under: 'handFront', grow: 3, poly: [[648, 1203], ...curve([648, 1203], [752, 1218], [764, 1348]), [700, 1310], [655, 1250]] }],
    handBack: [{ color: 'glove', under: 'burger', grow: 3, poly: [[575, 1456], ...curve([575, 1456], [615, 1350], [768, 1338]), [800, 1360], [800, 1480], [700, 1500], [600, 1470]] }],
  },
  joined: [['handBack', 'handFront']],
  lines: { arm: [[[506, 1238], [514, 1258]]] },
};

const FILES = { burger: 'burger', arm: 'arm', handBack: 'hand-back', handFront: 'hand-front' };

const { page, close } = await openKit();
try {
  const res = await page.evaluate(buildLineArt, { cfg: CFG, url: dataUrl(path.join(ROOT, 'ref/level8_shirt_old_school_v2.png')), debug: !!debugDir });
  if (res.unpainted.length) console.log('unseeded big regions (x, y, area):', JSON.stringify(res.unpainted));
  for (const [part, file] of Object.entries(FILES)) save(path.join(ROOT, 'public/level8/oldschool', `${file}.webp`), res.files[part]);
  if (debugDir) {
    save(path.join(debugDir, 'os_parts.png'), res.parts);
    save(path.join(debugDir, 'os_color.png'), res.color);
    save(path.join(debugDir, 'os_sheet.png'), res.sheet);
    save(path.join(debugDir, 'oldschool_refmask.png'), res.refmask);
  }
  const round = (v) => Math.round(v * 100) / 100;
  const lines = Object.entries(res.boxes).map(([k, b]) => `  ${k}: { x: ${round(b.x)}, y: ${round(b.y)}, w: ${round(b.w)}, h: ${round(b.h)} },`);
  writeFileSync(
    path.join(ROOT, 'src/game/cartoon/bosses/oldschool/sprites.ts'),
    `/** GENERATED by scripts/level8/oldschool.mjs: where each part image sits on the shirt, in source px. */\nexport const OS_SRC = {\n${lines.join('\n')}\n} as const;\n`,
  );
  console.log(JSON.stringify(res.boxes));
} finally {
  await close();
}
