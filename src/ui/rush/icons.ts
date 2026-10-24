/**
 * Level 6 pixel icons for the DOM UI: the menu food behind each power (nuggets, waffle fries, chicken pop corn,
 * cheddar, the booster), the fries tray, the freshness burger, the HUD truck, pins, stars and panel glyphs.
 * Fills set to currentColor take their colour from CSS (pins, stars, glyphs).
 */
import { PAL } from '../../art/pixel';
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
/** Score pickup: Ciccio's fries tray. */
const FRIES = [
  '.k.kk.k.kk..',
  'kykyykykyyk.',
  'kyykykyykyk.',
  'kykyykykyyk.',
  'kkkkkkkkkkkk',
  'kRRRRRRRRRRk',
  'kRwwRRRRwwRk',
  '.kRRRRRRRRk.',
  '.kRRRRRRRRk.',
  '..kkkkkkkk..',
];
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
const GEAR = ['....kk....', '.kk.cc.kk.', '.kcccccck.', '..cckkcc..', 'kcck..kcck', 'kcck..kcck', '..cckkcc..', '.kcccccck.', '.kk.cc.kk.', '....kk....'];
const HELP = ['.kkkkkk.', 'kcccccck', 'kcckkcck', 'kkk.kcck', '...kcck.', '..kcck..', '..kcck..', '..kkkk..', '..kcck..', '..kkkk..'];
const TROPHY = ['kkkkkkkkkk', 'kcyyyyyyck', 'kcyyyyyyck', '.kyyyyyyk.', '.kyyyyyyk.', '..kyyyyk..', '...kyyk...', '...kyyk...', '..kkyykk..', '.kccccccK.', '.kkkkkkkk.'];

const FOOD = { k: BROWN, w: '#fff0b8', l: '#f4c25a', b: '#d88a2a', o: '#a85a14' };
const WAFFLE_PAL = { k: BROWN, L: '#fbe3a6', y: '#e9b864', O: '#b97a2c', h: '#7a4614' };
const POPCORN_PAL = { k: K, L: '#fbe3a6', y: '#e9a64a', O: '#a85a14', w: '#f4f0e8', r: '#e8301c' };
const CHEDDAR_PAL = { k: '#5a2a04', L: '#ffd27a', y: '#f59a1a', O: '#c86a08' };
const ROCKET_PAL = { k: K, w: '#f4f0e8', R: '#e8301c', b: '#60ccf0', Y: '#ffe25a', y: '#ff8a1c' };
const FRIES_PAL = { k: K, y: PAL.fry, R: '#e8301c', w: '#f4f0e8' };
const BURGER_PAL = { k: K, B: PAL.bun, b: PAL.bunDark, w: PAL.creamLight, G: PAL.lettuce, g: '#3c9a14', y: PAL.cheese, P: PAL.patty, p: '#3c1c10' };
const TRUCK_PAL = { k: '#050506', H: '#5c5c68', b: '#34343c', w: '#ffffff', r: '#ff2a34', W: '#f4f0e8', c: '#8ad0f0', y: '#ffe080', g: '#8a8a94', G: '#d0d0d8' };
const TONED = { k: K, K: K, c: 'currentColor', w: '#ffffff', y: 'currentColor' };

export const shieldSvg = (): string => pixelSvg(NUGGET_SHIELD, FOOD);
export const waffleSvg = (): string => pixelSvg(WAFFLE, WAFFLE_PAL);
export const popcornSvg = (): string => pixelSvg(POPCORN, POPCORN_PAL);
export const cheddarSvg = (): string => pixelSvg(CHEDDAR, CHEDDAR_PAL);
export const rocketSvg = (): string => pixelSvg(ROCKET, ROCKET_PAL);
export const friesSvg = (): string => pixelSvg(FRIES, FRIES_PAL);
export const burgerSvg = (): string => pixelSvg(BURGER, BURGER_PAL, 'cc-fresh__icon');
export const truckSvg = (): string => pixelSvg(TRUCK, TRUCK_PAL);
export const pinSvg = (): string => pixelSvg(PIN, TONED, 'cc-pin__svg');
export const starSvg = (): string => pixelSvg(STAR, TONED, 'cc-star__svg');
export const finishSvg = (): string => pixelSvg(FINISH, { k: K, w: '#ffffff', K: '#26262c', y: PAL.poleLight }, 'cc-flag');
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
    fries: friesSvg,
  };
  return svgs[icon]();
}
