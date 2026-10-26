/**
 * Level 6 pixel icons for the DOM UI: the menu food behind each power (nuggets, waffle fries, chicken pop corn,
 * cheddar, the booster), the trail fry, the freshness burger, the HUD truck, pins, stars, panel glyphs, the ▲ ▼
 * lane glyphs of the side view, the CICCIO FEVER flame and the ▲ ▼ ◀ ▶ glyphs of the COME SI GIOCA text.
 * Fills set to currentColor take their colour from CSS (pins, stars, glyphs).
 */
import { PAL } from '../../art/pixel';
import { RU } from '../../art/rush/colors';
import { pixelSvg } from '../dom';
import type { LegendIcon } from './text';

const K = PAL.ink;
const BROWN = '#3a1c06';

/** SCUDO NUGGETS: a shield of golden, bumpy breading. */
const NUGGET_SHIELD = [
  'kkkkkkkkkkkk',
  'kwllllllbbbk',
  'klwlbblllbok',
  'kllllbbbobok',
  'klbllbobbbok',
  'kblbbbbbbook',
  '.kbbbobbbok.',
  '.kbobbbbook.',
  '..kbbbbook..',
  '...kboook...',
  '....kook....',
  '.....kk.....',
];
/** WAFFLE RADAR: a lattice-cut waffle fry. */
const WAFFLE = [
  '..kkkkkkkk..',
  '.kLLyLyyLyk.',
  'kLhLhyhyhyOk',
  'kLLyLyyLyyOk',
  'kyhyhyhyhyOk',
  'kLyyLyyLyyOk',
  'kyhyhyhyhyOk',
  'kLyyLyyLyOOk',
  'kyhyhyhyhOOk',
  '.kyyyyyyOOk.',
  '..kkkkkkkk..',
];
/** POPCORN SPRINT: a striped cup of chicken pop corn. */
const POPCORN = [
  '..kkk.kkk...',
  '.kLyykLyykk.',
  'kLyyOkyyOLyk',
  'kyOykkkkkyOk',
  'kkkkwrwrwkkk',
  '.kwrwrwrwrk.',
  '.kwrwrwrwrk.',
  '.kwrwrwrwrk.',
  '..kwrwrwrk..',
  '..kwrwrwrk..',
  '..kkkkkkkk..',
];
/** CHEDDAR GRIP: a melting cheddar slice. */
const CHEDDAR = [
  'kkkkkkkkkkkk',
  'kLLLLLLLLLyk',
  'kLyyyyyyyyOk',
  'kyyyOyyyyyOk',
  'kyyyyyyOyyOk',
  'kyOyyyyyyyOk',
  'kyyyyyyyyOOk',
  'kkyyOkkyOkkk',
  '.kyyk.kyOk..',
  '.kyOk..kk...',
  '..kk........',
];
/** PROPULSORE: a red and white rocket on its flame. */
const ROCKET = [
  '.....kk.....',
  '....kwwk....',
  '...kwRRwk...',
  '...kwwwwk...',
  '...kwbbwk...',
  '...kwbbwk...',
  '...kwwwwk...',
  '..kRkwwkRk..',
  '.kRRkwwkRRk.',
  '.kRkkkkkkRk.',
  '....kYYk....',
  '....kyYk....',
  '.....kk.....',
];
/** PATATINE: one fry stick of a FRIES TRAIL, frame 0 of 'rush-fry' (art/rush/feverFx.ts) without its empty rim. */
const FRY = ['......kkk.', '.....kyyyk', '....kLLyOk', '...kLLyOk.', '..kLLyOk..', '.kcLyOk...', 'kwLyOk....', 'kyyOk.....', 'kyOk......', '.kk.......'];
/** Freshness meter: a small burger. */
const BURGER = [
  '...kkkkkk...',
  '.kkBBwBBBkk.',
  'kBBBBBBwBBBk',
  'kbbbbbbbbbbk',
  'kGgGgGgGgGgk',
  'kyyyyyyyyyyk',
  'kPPPPPPPPPPk',
  'kppppppppppk',
  'kBBBBBBBBBBk',
  '.kkkkkkkkkk.',
];
/** HUD progress marker: the Ciccio's truck from the side, facing right. */
const TRUCK = [
  'kkkkkkkkk.....',
  'kHHHHHHHkkkk..',
  'kbwwwbbbkcckk.',
  'kbbbbbbbkcccbk',
  'krWrWrWrkbbbyk',
  'kbbbbbbbbbbbbk',
  'kkgGgkkkkkgGgk',
  '..kkk.....kkk.',
];
/** Delivery pin; the head takes the CSS colour (done / next / later). */
const PIN = ['.kkkkk.', 'kcccccK', 'kcwwccK', 'kcwwccK', 'kccccck', '.kccck.', '.kccck.', '..kck..', '..kck..', '...k...'];
const STAR = [
  '......k......',
  '.....kck.....',
  '.....kck.....',
  '....kcwck....',
  'kkkkkcwcckkkk',
  'kcccccccccccK',
  '.kcccccccccK.',
  '..kcccccccK..',
  '..kcccKccck..',
  '.kccck.kccck.',
  '.kcck...kcck.',
  'kkkk.....kkkk',
];
/** Checkered finish flag at the end of the level 6 progress bar. */
const FINISH = ['kk.......', 'kwKwKwk..', 'kKwKwKwk.', 'kwKwKwKwk', 'kKwKwKwk.', 'kwKwKk...', 'kyk......', 'kyk......', 'kyk......', 'kyk......', 'kkk......'];
/** Side view lane buttons: the ◀ ▶ glyphs of the pad (ui/icons.ts) turned to point up / down. */
const TRI_UP = ['....kk....', '...kcck...', '..kcccck..', '.kcccccck.', 'kcccccccck', 'kkkkkkkkkk'];
const TRI_DOWN = [...TRI_UP].reverse();
/** CICCIO FEVER (HUD): a gold flame, white-hot at the core. */
const FLAME = ['...k....', '..kRk...', '..kRRk.k', '.kRYRkRk', '.kRYYRRk', 'kRYwYYRk', 'kRYwwYRk', 'kRYwwYRk', '.kRYYRk.', '..kkkk..'];
const GEAR = ['....kk....', '.kk.cc.kk.', '.kcccccck.', '..cckkcc..', 'kcck..kcck', 'kcck..kcck', '..cckkcc..', '.kcccccck.', '.kk.cc.kk.', '....kk....'];
const HELP = ['.kkkkkk.', 'kcccccck', 'kcckkcck', 'kkk.kcck', '...kcck.', '..kcck..', '..kcck..', '..kkkk..', '..kcck..', '..kkkk..'];
const TROPHY = ['kkkkkkkkkk', 'kcyyyyyyck', 'kcyyyyyyck', '.kyyyyyyk.', '.kyyyyyyk.', '..kyyyyk..', '...kyyk...', '...kyyk...', '..kkyykk..', '.kccccccK.', '.kkkkkkkk.'];

const FOOD = { k: BROWN, w: '#fff0b8', l: '#f4c25a', b: '#d88a2a', o: '#a85a14' };
const WAFFLE_PAL = { k: BROWN, L: '#fbe3a6', y: '#e9b864', O: '#b97a2c', h: '#7a4614' };
const POPCORN_PAL = { k: K, L: '#fbe3a6', y: '#e9a64a', O: '#a85a14', w: '#f4f0e8', r: '#e8301c' };
const CHEDDAR_PAL = { k: '#5a2a04', L: '#ffd27a', y: '#f59a1a', O: '#c86a08' };
const ROCKET_PAL = { k: K, w: '#f4f0e8', R: '#e8301c', b: '#60ccf0', Y: '#ffe25a', y: '#ff8a1c' };
const FRY_PAL = { k: RU.ink, L: RU.goldLight, y: RU.gold, O: RU.goldShade, w: RU.white, c: RU.flameCore };
const BURGER_PAL = { k: K, B: PAL.bun, b: PAL.bunDark, w: PAL.creamLight, G: PAL.lettuce, g: '#3c9a14', y: PAL.cheese, P: PAL.patty, p: '#3c1c10' };
const TRUCK_PAL = { k: '#050506', H: '#5c5c68', b: '#34343c', w: '#ffffff', r: '#ff2a34', W: '#f4f0e8', c: '#8ad0f0', y: '#ffe080', g: '#8a8a94', G: '#d0d0d8' };
const FLAME_PAL = { k: K, R: '#e8301c', Y: '#ffc21a', w: '#fff3a0' };
const TONED = { k: K, K: K, c: 'currentColor', w: '#ffffff', y: 'currentColor' };

export const shieldSvg = (): string => pixelSvg(NUGGET_SHIELD, FOOD);
export const waffleSvg = (): string => pixelSvg(WAFFLE, WAFFLE_PAL);
export const popcornSvg = (): string => pixelSvg(POPCORN, POPCORN_PAL);
export const cheddarSvg = (): string => pixelSvg(CHEDDAR, CHEDDAR_PAL);
export const rocketSvg = (): string => pixelSvg(ROCKET, ROCKET_PAL);
export const burgerSvg = (): string => pixelSvg(BURGER, BURGER_PAL, 'cc-fresh__icon');
export const truckSvg = (): string => pixelSvg(TRUCK, TRUCK_PAL);
export const pinSvg = (): string => pixelSvg(PIN, TONED, 'cc-pin__svg');
export const starSvg = (): string => pixelSvg(STAR, TONED, 'cc-star__svg');
export const finishSvg = (): string => pixelSvg(FINISH, { k: K, w: '#ffffff', K: '#26262c', y: PAL.poleLight }, 'cc-flag');
export const triUpSvg = (): string => pixelSvg(TRI_UP, { k: K, c: PAL.cream }, 'cc-glyph');
export const triDownSvg = (): string => pixelSvg(TRI_DOWN, { k: K, c: PAL.cream }, 'cc-glyph');
export const flameSvg = (): string => pixelSvg(FLAME, FLAME_PAL, 'cc-flame');
export const gearSvg = (): string => pixelSvg(GEAR, TONED, 'cc-glyph');
export const helpSvg = (): string => pixelSvg(HELP, TONED, 'cc-glyph');
export const trophySvg = (): string => pixelSvg(TROPHY, TONED, 'cc-glyph');

/** Icon of a legend row / power chip; the booster teaser is a dark rocket silhouette. */
export function legendSvg(icon: LegendIcon): string {
  if (icon === 'secret') return pixelSvg(ROCKET, { k: '#6a6a72', w: '#26262c', R: '#26262c', b: '#26262c', Y: '#26262c', y: '#26262c' });
  const svgs: Record<Exclude<LegendIcon, 'secret'>, () => string> = {
    shield: shieldSvg,
    radar: waffleSvg,
    sprint: popcornSvg,
    grip: cheddarSvg,
    jet: rocketSvg,
    fries: () => pixelSvg(FRY, FRY_PAL),
  };
  return svgs[icon]();
}

/** Arrow glyphs of the COME SI GIOCA text, as tall as a Press Start capital (the font has none: a fallback drew them
 *  half as tall). Up / down 7x7, left / right 4x7, in the text colour. */
const KEY_UP = ['...c...', '..ccc..', '..ccc..', '.ccccc.', '.ccccc.', 'ccccccc', 'ccccccc'];
const KEY_LEFT = ['...c', '..cc', '.ccc', 'cccc', '.ccc', '..cc', '...c'];
const KEYS: Readonly<Record<string, { rows: readonly string[]; cls: string; name: string }>> = {
  '▲': { rows: KEY_UP, cls: 'cc-key__v', name: 'su' },
  '▼': { rows: [...KEY_UP].reverse(), cls: 'cc-key__v', name: 'giù' },
  '◀': { rows: KEY_LEFT, cls: 'cc-key__h', name: 'sinistra' },
  '▶': { rows: KEY_LEFT.map((r) => [...r].reverse().join('')), cls: 'cc-key__h', name: 'destra' },
};

/** `html` with each ▲ ▼ ◀ ▶ drawn as a pixel glyph (named for screen readers). */
export const keyGlyphs = (html: string): string =>
  html.replace(/[▲▼◀▶]/g, (ch) => {
    const k = KEYS[ch];
    return `<span class="cc-key" role="img" aria-label="${k.name}">${pixelSvg(k.rows, { c: 'currentColor' }, k.cls)}</span>`;
  });
