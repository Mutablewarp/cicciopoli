/**
 * Level 7 pixel icons for the DOM UI: the patience faces, the ticket tick / cross, the INCASSO coin, a side-view burger (stand-in
 * until the art pack's stack is built) and the four COME SI GIOCA steps. Fills set to currentColor take their
 * colour from CSS (tick, cross). Ciccio's face is never redrawn in pixels: faceLogoHtml shows the owner's original.
 */
import { PAL } from '../../art/pixel';
import { FACE_URL } from '../../art/space/keys';
import { pixelSvg } from '../dom';
import type { PatienceMood, StepIcon } from './text';

const K = PAL.ink;

const FACE: Readonly<Record<PatienceMood, readonly string[]>> = {
  happy: [
    '...kkkkk...',
    '..kyyyyyk..',
    '.kyyyyyyyk.',
    'kyykyyykyyk',
    'kyykyyykyyk',
    'kyyyyyyyyyk',
    'kykyyyyykyk',
    'kyykkkkkyyk',
    '.kyyyyyyyk.',
    '..kyyyyyk..',
    '...kkkkk...',
  ],
  worried: [
    '...kkkkk...',
    '..kyyyyyk.b',
    '.kyyyyyyykb',
    'kyykyyykyyk',
    'kyykyyykyyk',
    'kyyyyyyyyyk',
    'kyyyyyyyyyk',
    'kyykykykyyk',
    '.kyykykyyk.',
    '..kyyyyyk..',
    '...kkkkk...',
  ],
  angry: [
    '...kkkkk...',
    '..krrrrrk..',
    '.krrrrrrrk.',
    'krkrrrrrkrk',
    'krrkrrrkrrk',
    'krrkrrrkrrk',
    'krrrrrrrrrk',
    'krrrkkkrrrk',
    '.krkrrrkrk.',
    '..krrrrrk..',
    '...kkkkk...',
  ],
};
const FACE_PAL = { k: K, y: '#fcd400', r: '#ff5a3c', b: '#8ad0f0' };

const TICK = ['......c', '.....cc', 'c...cc.', 'cc.cc..', '.ccc...', '..c....'];
const CROSS = ['cc...cc', '.cc.cc.', '..ccc..', '.cc.cc.', 'cc...cc'];

/** Side view, bottom bun to top bun: the shape the player builds. */
const BURGER = [
  '.......kkkkkkkk.......',
  '....kkkBBBBBBBBkkk....',
  '..kkBBBwBBBBBwBBBBkk..',
  '.kBBBBBBBBwBBBBBBBBBk.',
  'kBBwBBBBBBBBBBBwBBBBBk',
  'kbBBBBBBBBBBBBBBBBBBbk',
  'kbbbbbbbbbbbbbbbbbbbbk',
  'kGgGGgGGGgGGgGGGgGGgGk',
  'kRRRrRRRRRRRRRrRRRRRRk',
  'kyyyyyyyyyyyyyyyyyyyyk',
  'kPPPPPPPPPPPPPPPPPPPPk',
  'kpPPpPPPpPPPPpPPPpPPpk',
  'kppppppppppppppppppppk',
  'kBBBBBBBBBBBBBBBBBBBBk',
  'kbbbbbbbbbbbbbbbbbbbbk',
  '.kkkkkkkkkkkkkkkkkkkk.',
];
const BURGER_PAL = {
  k: K, B: PAL.bun, b: PAL.bunDark, w: PAL.creamLight, G: PAL.lettuce, g: '#3c9a14',
  R: PAL.tomato, r: '#ff8a6a', y: PAL.cheese, P: PAL.patty, p: '#3c1c10',
};

const STEP: Readonly<Record<Exclude<StepIcon, 'stack'>, readonly string[]>> = {
  // the scontrino, torn at the bottom
  order: [
    '..kkkkkkkkkk..',
    '..kwwwwwwwwk..',
    '..kwkkkkkwwk..',
    '..kwwwwwwwwk..',
    '..kwkkkwkkwk..',
    '..kwwwwwwwwk..',
    '..kwkkwkkkwk..',
    '..kwwwwwwwwk..',
    '..kwoooooowk..',
    '..kwwwwwwwwk..',
    '..kwkwkwkwkk..',
    '..kk.k.k.k.k..',
  ],
  // a patty on the black griddle, golden sparkle
  griddle: [
    '..........Y...',
    '.........YWY..',
    '..........Y...',
    '...kkkkkk.....',
    '..kPPPPPPk....',
    '.kPpPPPpPPk...',
    'kkPPPpPPPPkkkk',
    'kdkpppppppkddk',
    'kddkkkkkkkdddk',
    'kdddddddddddsk',
    'kssssssssssssk',
    'kkkkkkkkkkkkkk',
  ],
  // black tray: wrapped burger + drink can
  serve: [
    '..........kkk.',
    '..........kck.',
    '.kkkkkk..kcCck',
    'kwwowwwk.kcCck',
    'kwwwwowk.kwwwk',
    'kowwwwwk.kcCck',
    '.kkkkkk..kcCck',
    'kkkkkkkkkkkkkk',
    'kTTTTTTTTTTTTk',
    '.kkkkkkkkkkkk.',
  ],
};
const STEP_PAL = {
  k: K, w: '#fbf6ea', o: '#fc9000', P: PAL.patty, p: '#3c1c10', d: '#2c2c32', s: '#8a8a94',
  Y: '#fcd400', W: '#ffffff', c: '#e81c24', C: '#ff6a5a', T: '#3a3a42',
};

/** Gold euro coin of the HUD's INCASSO. */
const COIN = [
  '...kkkkk...',
  '.kkwwyyykk.',
  '.kwyydddyk.',
  'kwyydyyyyok',
  'kyyddddyyok',
  'kyyydyyyyok',
  'kyyddddyyok',
  'kyyydyyyyok',
  '.kyyydddok.',
  '.kkoooookk.',
  '...kkkkk...',
];
const COIN_PAL = { k: K, w: PAL.cheeseLight, y: PAL.cheese, o: PAL.cheeseDark, d: '#7a4a00' };

export const coinSvg = (): string => pixelSvg(COIN, COIN_PAL, 'cc-ktill__coin');
export const faceSvg = (mood: PatienceMood): string => pixelSvg(FACE[mood], FACE_PAL, 'cc-kface__svg');
export const tickSvg = (): string => pixelSvg(TICK, { c: 'currentColor' }, 'cc-kmark');
export const crossSvg = (): string => pixelSvg(CROSS, { c: 'currentColor' }, 'cc-kmark');
export const burgerSideSvg = (cls = ''): string => pixelSvg(BURGER, BURGER_PAL, cls);
export const stepSvg = (icon: StepIcon): string => (icon === 'stack' ? burgerSideSvg('cc-kstep__svg') : pixelSvg(STEP[icon], STEP_PAL, 'cc-kstep__svg'));
/** The owner's original face logo (public/brand/ciccio-face.png, smooth, never pixelated) on a white disc, like the counter's. */
export const faceLogoHtml = (cls = ''): string =>
  `<span class="cc-klogo ${cls}"><img src="${FACE_URL}" alt="" draggable="false" decoding="async"></span>`;
