/** Pixel-art and vector icons for the DOM UI (all inline SVG, no image files). */
import { PAL } from '../art/pixel';
import { pixelSvg } from './dom';

const K = PAL.ink;

/** Ciccio head (progress marker, favicon): black hair with side fringe, round black glasses. */
export const HEAD_ROWS = [
  '....kkkkkk....',
  '..kkhhhhhhkk..',
  '.khhhHHHhhhhk.',
  '.khhHhhhhhhhhk',
  'khhhhhhhhhhhhk',
  'khhhsssssshhhk',
  'khsggssssggshk',
  'kggwgggggwgggk',
  'ksggggssggggsk',
  'kssggssdsggssk',
  '.kssssssssssk.',
  '.ksssssmmsssk.',
  '..ksssssssskk.',
  '...kkkkkkkk...',
];
export const HEAD_PAL = {
  k: K, h: '#1c1c1c', H: '#4a4c58', s: PAL.skin, d: PAL.skinShade, g: '#050505', w: '#ffffff', m: PAL.skinDark,
};
export const headSvg = (cls = ''): string => pixelSvg(HEAD_ROWS, HEAD_PAL, cls);

/** Crunchy nugget (the coins of v2): golden-brown bumpy breading, light from the top-left. */
const NUGGET = [
  '..kkk.kk..',
  '.kwllkllk.',
  'klwlllbbbk',
  'kllwlbbbok',
  'klllbbobbk',
  'kblbbbbbok',
  'kbbbobbook',
  '.kbbbbook.',
  '.kooodook.',
  '..kkkkkk..',
];
export const nuggetSvg = (): string =>
  pixelSvg(NUGGET, { k: '#3a1c06', w: '#fff0b8', l: '#f4c25a', b: '#d88a2a', o: '#a85a14', d: '#7a3c0a' }, 'cc-coin');

const BRIE = [
  '..........kk',
  '........kkwk',
  '......kkwwwk',
  '....kkwwwwwk',
  '..kkwwwwwwck',
  'kkwwwwwwwcck',
  'kcccccccccck',
  'kcYccccYcccs',
  'kccccccccssk',
  'kccYcccccssk',
  'kssssssssssk',
  'kkkkkkkkkkkk',
];
/** Provola Goat: three battered provola sticks (rectangular, golden-beige batter). */
const GOAT = [
  '....kkkkk....',
  '....kLLyk....',
  '....kLyykkkkk',
  'kkkkkyyOkkLyk',
  'kLykkLyykkyyk',
  'kyOkkyyykkyOk',
  'kLykkyOykkLyk',
  'kyykkLyykkyyk',
  'kOykkyyOkkyOk',
  'kyykkyyykkOyk',
  'kOOkkOOOkkOOk',
  'kkkkkkkkkkkkk',
];
/** One battered provola stick (maze power pellet, FUOCO shot). */
const STICK = [
  '..kkk..',
  '.kLLyk.',
  'kLLyyyk',
  'kLyyOyk',
  'kyyyyyk',
  'kLyOyyk',
  'kyyyyOk',
  'kyOyyyk',
  'kyyyyOk',
  '.kOOOk.',
  '..kkk..',
];
const STICK_PAL = { k: '#3a1c06', L: '#fbe3a6', y: '#e9b864', O: '#b97a2c' };
/** FUOCO: a provola stick shooting up on a short flame. */
const FUOCO = [
  '...kkk...',
  '..kLLyk..',
  '.kLLyyyk.',
  '.kLyyOyk.',
  '.kyyyyyk.',
  '.kLyOyyk.',
  '.kyyyyOk.',
  '..kOOOk..',
  '.kkrRrkk.',
  'krRYYRrk.',
  '.krRYRk..',
  '..krRk...',
  '...kk....',
];
/** FULMINE: a fat lightning bolt. */
const BOLT = [
  '......kkkk',
  '.....kYyyk',
  '....kYyyk.',
  '...kYyyk..',
  '..kYyyykkk',
  '.kYyyyyyyk',
  'kkkkkyyyk.',
  '....kyyk..',
  '...kyyk...',
  '...kyk....',
  '..kyk.....',
  '..kk......',
];
const THAI = [
  '..kkkk......',
  '.kRRrrk.....',
  'kRrrwrrk....',
  'kRrrrrerk...',
  'krwrrrrrdk..',
  'krrrerrwdk..',
  '.krrrrrddk..',
  '..kdrrddkk..',
  '...kkddkbk..',
  '.....kkbbkkk',
  '.......kbbbk',
  '........kbk.',
];
const WINGS = [
  '.........kk.',
  '.......kkGGk',
  '.....kkGGggk',
  '....kGGgggdk',
  '...kGggggdk.',
  '..kGgggggdk.',
  '.kGgggdgdk..',
  'kGgkgdkdk...',
  'kgkgkdkk....',
  'kkkkkk......',
  '............',
  '............',
];
const FOOD_PAL = {
  k: K,
  w: PAL.creamLight,
  c: '#f2dc98',
  s: '#cdb46a',
  Y: '#e8c870',
  L: PAL.cheeseLight,
  y: PAL.cheese,
  O: PAL.cheeseDark,
  r: '#e0441c',
  R: '#ff8a4a',
  d: '#9a2410',
  b: PAL.creamLight,
  e: '#5cc020',
  g: PAL.fry,
  G: PAL.poleLight,
};
export const brieSvg = (): string => pixelSvg(BRIE, FOOD_PAL);
export const goatSvg = (): string => pixelSvg(GOAT, STICK_PAL);
export const pelletSvg = (): string => pixelSvg(STICK, STICK_PAL);
export const fuocoSvg = (): string => pixelSvg(FUOCO, { ...STICK_PAL, r: '#e0441c', R: '#ff8a1c', Y: '#ffe25a' });
export const boltSvg = (): string => pixelSvg(BOLT, { k: K, Y: '#fffbd0', y: PAL.cheese });
export const thaiSvg = (): string => pixelSvg(THAI, FOOD_PAL);
export const wingsSvg = (): string => pixelSvg(WINGS, { ...FOOD_PAL, d: PAL.fryDark });

/** Smooth heart: red fill, dark outline, white glint top-left. Empty = dark socket. */
export function heartSvg(): string {
  const shape =
    'M12 21.2C12 21.2 2.2 14.9 2.2 8.1 2.2 4.8 4.7 2.4 7.7 2.4 9.6 2.4 11.2 3.4 12 5 12.8 3.4 14.4 2.4 16.3 2.4 19.3 2.4 21.8 4.8 21.8 8.1 21.8 14.9 12 21.2 12 21.2Z';
  return (
    `<svg class="cc-heart" viewBox="0 0 24 24" aria-hidden="true">` +
    `<path class="cc-heart__base" d="${shape}"/>` +
    `<path class="cc-heart__shade" d="M17.8 5.2c2.2 1.3 2.6 4.4 1.2 7.3-1.6 3.2-4.6 5.6-7 7.2 3.4-3.2 6.4-7.4 5.8-14.5z"/>` +
    `<ellipse class="cc-heart__glint" cx="6.9" cy="7.2" rx="1.6" ry="2.5" transform="rotate(35 6.9 7.2)"/>` +
    `<path class="cc-heart__line" d="${shape}"/>` +
    `</svg>`
  );
}

export const LOCK_SVG = pixelSvg(
  ['..kkkk..', '.kwkkwk.', '.kwk.kwk', 'kkkkkkkk', 'kyyyyyyk', 'kyyOOyyk', 'kyyOOyyk', 'kyyyyyyk', 'kkkkkkkk'],
  { k: K, w: PAL.creamShade, y: PAL.cheese, O: PAL.cheeseDark },
  'cc-lock',
);

/** Cream glyphs with a dark rim, for control buttons and the pause button. */
const GLYPH = { k: K, c: PAL.cream };
export const ARROW_LEFT = pixelSvg(
  ['....kk', '...kck', '..kcck', '.kccck', 'kcccck', 'kcccck', '.kccck', '..kcck', '...kck', '....kk'],
  GLYPH,
  'cc-glyph',
);
export const ARROW_RIGHT = pixelSvg(
  ['kk....', 'kck...', 'kcck..', 'kccck.', 'kcccck', 'kcccck', 'kccck.', 'kcck..', 'kck...', 'kk....'],
  GLYPH,
  'cc-glyph',
);
export const ARROW_UP = pixelSvg(
  ['....kk....', '...kcck...', '..kcccck..', '.kcccccck.', 'kcccccccck', 'kkkcccckkk', '..kcccck..', '..kcccck..', '..kkkkkk..'],
  GLYPH,
  'cc-glyph',
);
export const ARROW_DOWN = pixelSvg(
  ['..kkkkkk..', '..kcccck..', '..kcccck..', 'kkkcccckkk', 'kcccccccck', '.kcccccck.', '..kcccck..', '...kcck...', '....kk....'],
  GLYPH,
  'cc-glyph',
);
export const PAUSE_GLYPH = pixelSvg(
  ['kkkk.kkkk', 'kcck.kcck', 'kcck.kcck', 'kcck.kcck', 'kcck.kcck', 'kcck.kcck', 'kcck.kcck', 'kcck.kcck', 'kkkk.kkkk'],
  GLYPH,
  'cc-glyph',
);

const SPEAKER = ['....kk......', '...kck......', 'kkkcck......', 'kcccck......', 'kcccck......', 'kcccck......', 'kcccck......', 'kkkcck......', '...kck......', '....kk......'];
const WAVES = ['', '.........c..', '.......c..c.', '........c..c', '........c..c', '........c..c', '........c..c', '.......c..c.', '.........c..'];
const CROSS = ['', '', '', '.......r...r', '........r.r.', '.........r..', '........r.r.', '.......r...r'];
/** Paints the non-'.' pixels of `add` over `base`. */
function overlay(base: readonly string[], add: readonly string[]): string[] {
  return base.map((row, y) =>
    row
      .split('')
      .map((c, x) => {
        const a = add[y]?.[x];
        return a && a !== '.' ? a : c;
      })
      .join(''),
  );
}
export const SPEAKER_ON = pixelSvg(overlay(SPEAKER, WAVES), GLYPH, 'cc-glyph');
export const SPEAKER_OFF = pixelSvg(overlay(SPEAKER, CROSS), { ...GLYPH, r: PAL.heart }, 'cc-glyph');

/** Small red golf flag at the end of the progress track. */
export const FLAG_SVG = pixelSvg(
  ['kk.......', 'kRrrk....', 'kRrrrrk..', 'kRrrrrrrk', 'kRrrrrk..', 'kRrk.....', 'kyk......', 'kyk......', 'kyk......', 'kyk......', 'kkk......'],
  { k: K, r: PAL.flagRed, R: '#ff5a5a', y: PAL.poleLight },
  'cc-flag',
);
