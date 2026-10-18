/** 32x18 pixel thumbnails of the five levels for the title cards (deterministic; level 5 is 64x18, a wide card). */
import type { LevelId } from '../contracts';
import { PAL } from '../art/pixel';
import { CUTOUT_URL } from './cutout';
import { pixelSvg, seeded } from './dom';
import { LOGO_URL } from './loading';

const W = 32;
const H = 18;

class Grid {
  readonly rows: string[][];
  constructor(fill: string, readonly w = W) {
    this.rows = Array.from({ length: H }, () => Array<string>(w).fill(fill));
  }
  put(x: number, y: number, c: string): void {
    if (x >= 0 && x < this.w && y >= 0 && y < H) this.rows[y][x] = c;
  }
  rect(x: number, y: number, w: number, h: number, c: string): void {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.put(i, j, c);
  }
  /** Paints a sprite; '.' is transparent. */
  stamp(x: number, y: number, art: readonly string[]): void {
    art.forEach((row, j) => [...row].forEach((c, i) => c !== '.' && this.put(x + i, y + j, c)));
  }
  svg(pal: Readonly<Record<string, string>>): string {
    // slice: the art fills cards of any aspect, cropping evenly around the centre (a landscape card shows
    // ~20 of the 32 columns: key props stay in columns 6-26, see thumbs.test.ts)
    return pixelSvg(this.rows.map((r) => r.join('')), pal).replace('<svg ', '<svg preserveAspectRatio="xMidYMid slice" ');
  }
}

function hills(): string {
  const g = new Grid('s');
  g.rect(0, 7, W, 6, 'S');
  g.stamp(3, 2, ['..ccc...', '.cccccc.', 'cccccccc']);
  g.stamp(21, 1, ['.cc..', 'cccc.']);
  g.stamp(0, 6, ['....HH......', '...HhhH.....', '..HhhhhH....', '.HhhhhhhH...', 'HhhhhhhhhH..', 'hhhhhhhhhhh.']);
  g.stamp(9, 8, ['...HH...', '..HhhH..', '.HhhhhH.', 'Hhhhhhhh']);
  g.stamp(14, 4, ['kkkk', 'kq?k', 'kqqk', 'kkkk']);
  g.stamp(20, 4, ['kk...', 'krrk.', 'krrrk', 'krk..', 'kyk..', 'kyk..', 'kyk..', 'kyk..']);
  g.rect(0, 12, W, 1, 'g');
  for (let x = 1; x < W; x += 4) g.put(x, 11, 'g');
  g.rect(0, 13, W, 1, 'G');
  g.rect(0, 14, W, 4, 'b');
  for (let y = 14; y < H; y++) for (let x = (y % 2) * 2; x < W; x += 4) g.put(x, y, 'm');
  g.stamp(19, 12, ['.kk.', 'kkkk']);
  return g.svg({
    s: PAL.sky, S: PAL.skyPale, c: PAL.cream, H: PAL.hillLight, h: PAL.hill, g: PAL.grass, G: PAL.grassMid,
    b: PAL.brick, m: PAL.mortar, k: PAL.ink, q: PAL.qOrange, '?': PAL.qOrangeLight, r: PAL.flagRed, y: PAL.poleLight,
  });
}

function inferno(): string {
  const g = new Grid('B');
  g.rect(0, 5, W, 3, 'W');
  g.rect(0, 8, W, 3, 'R');
  g.rect(0, 11, W, 2, 'C');
  g.stamp(6, 2, ['..oooo..', '.oYYYYo.', 'oYo..oYo', '.oYYYYo.', '..oooo..']);
  g.stamp(19, 2, ['..K.K..', '..KKK..', '.KKKKK.', '.KKLKK.', '.KKKKK.', '.KLKKK.', 'KKKKKKK', 'KKKLKKK', 'KKKKKKK', 'KKKKKKK', 'KKKKKKK']);
  g.stamp(14, 4, ['K...K', 'KK.KK', '.KYK.']);
  g.rect(0, 13, 12, 1, 'e');
  g.rect(0, 14, 12, 1, 'd');
  g.rect(18, 13, 14, 1, 'e');
  g.rect(18, 14, 14, 1, 'd');
  g.rect(0, 15, W, 3, 'o');
  for (let x = 0; x < W; x += 3) g.put(x, 15 + (x % 2), 'Y');
  g.rect(12, 14, 6, 1, 'o');
  g.stamp(7, 11, ['.ww.', 'wNNw']);
  return g.svg({
    B: PAL.bordeaux, W: PAL.wine, R: PAL.lavaRed, C: PAL.coral, K: PAL.castle, L: PAL.castleLit,
    d: PAL.ink, e: PAL.ember, o: PAL.lavaOrange, Y: PAL.lavaYellow, w: PAL.fry, N: PAL.fryDark,
  });
}

function invaders(): string {
  const g = new Grid('n');
  const rnd = seeded(303);
  for (let i = 0; i < 46; i++) g.put(Math.floor(rnd() * W), Math.floor(rnd() * H), rnd() < 0.7 ? 'u' : 'v');
  const alien = ['.g.g.', 'ggggg', 'gkgkg', '.ggg.', 'g...g'];
  g.stamp(3, 1, alien);
  g.stamp(10, 1, alien);
  g.stamp(24, 1, alien);
  g.stamp(16, 1, ['..pp..', 'rppppr', '..pp..']);
  g.stamp(5, 7, ['.aa.', 'aAaa', '.aa.']);
  g.stamp(22, 7, ['.aa.', 'aaAa', '.aa.']);
  g.stamp(16, 9, ['k', 'y', 'y', 'k']);
  g.stamp(15, 4, ['kk', 'YY', 'yy', 'kk']);
  g.stamp(8, 8, [
    '.......kk.......',
    '......kBbk......',
    '......kBbk......',
    '.....kkkkkk.....',
    '..k.kkkwwkkk.k..',
    '.kGkkqqwwqqkkGk.',
    'kbbbkwwwwwwkbbbk',
    'kbbbbkwmmwkbbbbk',
    'kkkbbbkkkkbbbkkk',
    '...kkkkGGkkkk...',
  ]);
  return g.svg({
    n: '#0b0d24', u: '#c8a060', v: '#e8eef8', g: '#7cd848', k: PAL.ink, p: '#c87adc', r: '#f0c870',
    a: '#8a8a96', A: '#b4b4be', y: '#e9b864', Y: '#fbe3a6', b: '#a8dcf4', B: '#e4f6fe', G: '#8a8a96', w: '#f4d2a8', m: '#c0784c', q: '#050505',
  });
}

function maze(): string {
  const g = new Grid('f');
  for (let x = 0; x < W; x++) {
    g.put(x, 0, x % 2 ? 'w' : 'k');
    g.put(x, H - 1, x % 2 ? 'k' : 'w');
  }
  for (let y = 0; y < H; y++) {
    g.put(0, y, y % 2 ? 'w' : 'k');
    g.put(W - 1, y, y % 2 ? 'k' : 'w');
  }
  g.rect(1, 1, W - 2, 1, 'M');
  g.rect(1, H - 2, W - 2, 1, 'M');
  g.rect(1, 1, 1, H - 2, 'M');
  g.rect(W - 2, 1, 1, H - 2, 'M');
  const walls: Array<[number, number, number, number]> = [[4, 4, 6, 2], [22, 4, 6, 2], [4, 12, 6, 2], [22, 12, 6, 2], [4, 7, 2, 4], [26, 7, 2, 4]];
  for (const [x, y, w, h] of walls) {
    g.rect(x, y, w, h, 'M');
    g.rect(x, y + h - 1, w, 1, 'm');
  }
  // centre plate: maroon tray with checkered liner, the official logo on top (an <image>, below)
  g.rect(11, 3, 10, 12, 'M');
  for (let x = 11; x < 21; x++) {
    g.put(x, 3, x % 2 ? 'w' : 'k');
    g.put(x, 14, x % 2 ? 'k' : 'w');
  }
  for (const y of [2, 10, 15]) for (let x = 3; x < W - 3; x += 2) if (g.rows[y][x] === 'f') g.put(x, y, 'n');
  for (const y of [4, 6, 8, 12, 14]) for (const x of [3, 9, 22, 28]) if (g.rows[y][x] === 'f') g.put(x, y, 'n');
  g.stamp(3, 2, ['L', 'y']);
  g.stamp(28, 13, ['L', 'y']);
  g.stamp(22, 7, ['.ccc.', 'cwcwc', 'cgcgc', 'ccccc', 'c.c.c']);
  const logo = `<image href="${LOGO_URL}" x="12" y="4.5" width="8" height="9" preserveAspectRatio="xMidYMid meet"/>`;
  return g
    .svg({ f: '#1e1a1e', k: PAL.ink, w: '#f4f0e8', M: '#8a1c22', m: '#5a0e14', n: '#e8a640', L: '#fbe3a6', y: '#b97a2c', g: '#050505', c: '#5cb43c' })
    .replace('</svg>', `${logo}</svg>`);
}

const SW = 64;
/** Level 5 thumb: purple / magenta comic dusk, starburst, smashed bricks; the hero is the cut-out (pixel stand-in until it loads). */
function spacca(): string {
  const g = new Grid('P', SW);
  const bands: Array<[number, string]> = [[4, 'Q'], [7, 'R'], [10, 'S'], [13, 'T']];
  for (const [y, c] of bands) g.rect(0, y, SW, H, c);
  const cx = 31.5;
  const cy = 9.5;
  for (let y = 0; y < 15; y++) {
    for (let x = 0; x < SW; x++) {
      const a = Math.atan2(y - cy, x - cx);
      const r = Math.hypot(x - cx, y - cy);
      const t = (a * 14) / (Math.PI * 2);
      const edge = 13 * (0.45 + 0.55 * Math.abs(2 * (t - Math.floor(t)) - 1));
      if (r > edge + 1.2 && Math.floor((a + Math.PI) / (Math.PI / 12)) % 2 === 0) g.put(x, y, g.rows[y][x] === 'P' ? 'Q' : 'a');
      else if (r <= edge + 1) g.put(x, y, r > edge ? 'w' : r > edge - 1 ? 'N' : 'm');
    }
  }
  g.rect(0, 15, SW, 3, 'e');
  g.rect(0, 15, SW, 1, 'E');
  for (let x = 2; x < SW; x += 7) g.put(x, 16 + (x % 2), 'c');
  g.stamp(8, 12, ['.rrBrr.', 'rBrrrBr', 'rrrBrrr']);
  g.stamp(14, 9, ['rB', 'rr']);
  g.stamp(47, 5, ['rB', 'Br']);
  g.stamp(51, 10, ['rBr', 'rrr']);
  g.stamp(55, 13, ['.rr.', 'rBrr', 'rrrB']);
  const hero = new Grid('.', SW);
  hero.stamp(24, 2, [
    '......kkkk......',
    '.....khhhhk.....',
    '.....hhhhhhk....',
    '....ksskssGk....',
    '....kGGGGGGk....',
    '..kkkkGwwGkkkk..',
    '.kGGGGGGGGGGGGk.',
    'kGLGGGGGGGGGGGgk',
    'kGGGkGGGGGGkGGgk',
    'kGGGGkuuuukGGGgk',
    '.kGGGkuuuUkGGgk.',
    '..kGGkuuUUkGgk..',
    '..kGGkUkkUkGgk..',
    '.kGGGk.kk.kGGgk.',
    '.kkkkk....kkkkk.',
  ]);
  const pal = {
    P: '#2a0e4a', Q: '#4a1470', R: '#8a1c8c', S: '#c8267c', T: '#f0803c', a: '#6a1a8e', m: '#ec2a9c', N: '#ff6ac0', w: '#fff6e8',
    e: '#2e2436', E: '#5a4a68', c: '#14101a', r: '#a85a30', B: '#d68a4c', k: PAL.ink, G: '#a6d62c', L: '#e4fa7a', g: '#6c9a14', h: '#1c1c1c', s: '#050505',
    u: '#8a38cc', U: '#52207a',
  };
  const art = hero.svg(pal);
  const cutout = `<image class="cc-thumb__cutout" href="${CUTOUT_URL}" x="22" y="0.5" width="20" height="17" preserveAspectRatio="xMidYMax meet"/>`;
  return g.svg(pal).replace('</svg>', `<g class="cc-thumb__fallback">${art.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g>${cutout}</svg>`);
}

const BUILDERS: Record<LevelId, () => string> = { 1: hills, 2: inferno, 3: invaders, 4: maze, 5: spacca };

export function levelThumb(level: LevelId): string {
  return BUILDERS[level]();
}
