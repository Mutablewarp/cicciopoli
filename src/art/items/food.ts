/**
 * Food pickups (16x16, 4-frame idle shine): fries box, burger, brie wedge.
 */
import { PAL } from '../pixel';
import { Raster, diag, glint } from './raster';

type Pt = readonly [number, number];

/** Four frames of `base`, each with its own glint pixels (light sweeping left -> right). */
export function shineCycle(base: Raster, sweeps: readonly (readonly Pt[])[], outlineColor = PAL.ink, t = 0.7): Raster[] {
  return sweeps.map((pts) => {
    const f = base.clone();
    glint(f, pts, outlineColor, t);
    return f;
  });
}

/* ------------------------------------------------------------------ fries */

const FRY = { light: '#fde488', base: PAL.fry, dark: PAL.fryDark, crisp: '#b06408' };
/** Ciccio's maroon paper boat tray (photo, bottom box). */
const TRAY = {
  rim: '#dc7466',
  light: '#c24c48',
  base: '#a5363a',
  dark: '#7e2429',
  deep: '#5a161c',
  inner: '#6c1c22',
  liner: '#f6f2ea',
};

/** Fries: x at the tray, top row, lean (px at the tip), crispy dark tip. Drawn back to front. */
const FRIES: readonly (readonly [number, number, number, boolean])[] = [
  [7, 1, 1, false],
  [10, 2, 2, true],
  [2, 3, -1, true],
  [4, 1, 0, false],
  [9, 2, -1, false],
  [12, 4, 1, false],
  [6, 3, -1, true],
];

/** One 2-px fry: lit left side, shaded right side (separates it from its neighbour), crisp tip. */
function drawFry(r: Raster, x0: number, top: number, lean: number, crisp: boolean): void {
  const bottom = 9;
  for (let y = top; y <= bottom; y++) {
    const x = x0 + Math.round((lean * (bottom - y)) / (bottom - top));
    const tip = y === top;
    r.set(x, y, tip ? (crisp ? FRY.dark : FRY.base) : FRY.light);
    r.set(x + 1, y, tip ? (crisp ? FRY.crisp : FRY.dark) : y === top + 1 ? FRY.base : FRY.dark);
  }
}

/** Shadowed inside of the tray, visible between the fries. */
function drawBackWall(r: Raster): void {
  for (let y = 5; y <= 8; y++) for (let x = 2; x <= 13; x++) r.set(x, y, TRAY.inner);
}

/** Front wall: lit rim lip, sloped sides (boat), light from the top-left. */
function drawFrontWall(r: Raster): void {
  // checkered paper liner peeking over the rim, in front of the fries' feet
  for (let y = 7; y <= 8; y++) for (let x = 2; x <= 13; x++) r.set(x, y, (x + y) % 2 ? TRAY.liner : PAL.ink);
  for (let y = 9; y <= 14; y++) {
    const inset = y >= 13 ? 2 : y >= 11 ? 1 : 0;
    for (let x = 1 + inset; x <= 14 - inset; x++) {
      const l = x === 1 + inset;
      const rr = x === 14 - inset;
      let c = TRAY.base;
      if (y === 9) c = rr ? TRAY.light : TRAY.rim;
      else if (y === 14) c = TRAY.deep;
      else if (rr) c = TRAY.deep;
      else if (l) c = TRAY.light;
      else if (x >= 12 - inset || y === 13) c = TRAY.dark;
      r.set(x, y, c);
    }
  }
}

export function friesFrames(): Raster[] {
  const base = new Raster(16, 16);
  drawBackWall(base);
  for (const [x, top, lean, crisp] of FRIES) drawFry(base, x, top, lean, crisp);
  drawFrontWall(base);
  base.outline(PAL.ink);
  // a shine pixel hops across the fry tips, then along the rim
  return shineCycle(base, [
    [[3, 4], [4, 4]],
    [[5, 3], [5, 4]],
    [[7, 2], [8, 3]],
    [[9, 3], [9, 4], [12, 9]],
  ], PAL.ink, 0.85);
}

/* ----------------------------------------------------------------- burger */

const BURGER_PAL: Readonly<Record<string, string>> = {
  k: PAL.ink,
  L: '#f8c878',
  b: PAL.bun,
  d: PAL.bunDark,
  w: '#fff4d8',
  G: '#a8e050',
  g: PAL.lettuce,
  q: '#2c8a1c',
  C: PAL.cheeseLight,
  c: PAL.cheese,
  P: '#7c4428',
  p: PAL.patty,
  x: '#3a1a0c',
  B: '#f0a850',
};

const BURGER = [
  '................',
  '.....kkkkkk.....',
  '...kkLLLLbbkk...',
  '..kLLwLLbbbwbk..',
  '.kLLbbbbbwbbbdk.',
  '.kLbwbbbbbbbwdk.',
  '.kbbbbbbbbbbbdk.',
  '.kddddddddddddk.',
  'kGgGGgGGgGGgGGqk',
  '.kqcCCccqcCccqk.',
  '.kPpcpPpppcpppk.',
  '.kpppcpppppppxk.',
  '.kxxxxxxxxxxxxk.',
  '.kBbbbbbbbbbbdk.',
  '..kddddddddddk..',
  '...kkkkkkkkkk...',
];

export function burgerFrames(): Raster[] {
  const base = new Raster(16, 16);
  base.grid(BURGER, BURGER_PAL);
  return shineCycle(base, [diag(2, 6, 3), diag(4, 6, 4), diag(7, 6, 4), diag(10, 6, 3)]);
}

/* ------------------------------------------------------------------- brie */

const BRIE = {
  rindHi: '#ffffff',
  rind: '#f7f1e3',
  rindTex: '#e0d4b8',
  rindShade: '#cbbc9c',
  pasteLight: '#fff0b8',
  paste: '#f8da80',
  pasteDark: '#e6b850',
  ooze: '#d8a040',
  spark: '#fcd468',
};

/** First filled column of each row: top face (rows 4-7) rises from the tip to the back. */
const BRIE_LEFT: Readonly<Record<number, number>> = { 4: 11, 5: 9, 6: 6, 7: 4 };
const BRIE_TIP = 2;
const BRIE_BACK = 14;

function brieColor(x: number, y: number, left: number): string {
  if (x === BRIE_BACK) return BRIE.rindShade; // rind arc at the back, facing away from the light
  if (y === 13) return x === BRIE_TIP ? BRIE.paste : BRIE.rindShade;
  if (x === BRIE_BACK - 1) return BRIE.rind;
  if (y <= 7) return x === left ? BRIE.rindHi : BRIE.rind; // bloomy top face
  if (y === 8) return BRIE.rindHi; // rind line along the top of the cut
  if (x >= BRIE_BACK - 2 - Math.max(0, y - 10)) return BRIE.pasteDark;
  return y === 9 ? BRIE.pasteLight : BRIE.paste;
}

/** Wedge: tip at the left, rind back at the right, creamy cut face (oozing) towards the viewer. */
function brieBase(): Raster {
  const r = new Raster(16, 16);
  for (let y = 4; y <= 13; y++) {
    const left = BRIE_LEFT[y] ?? BRIE_TIP;
    for (let x = left; x <= BRIE_BACK; x++) r.set(x, y, brieColor(x, y, left));
  }
  for (const [x, y] of [[12, 5], [8, 6], [11, 7], [5, 7], [13, 9]] as const) r.set(x, y, BRIE.rindTex);
  // molten paste bulging out of the tip
  r.set(1, 11, BRIE.paste);
  r.set(1, 12, BRIE.ooze);
  r.outline(PAL.ink);
  return r;
}

export function brieFrames(): Raster[] {
  const base = brieBase();
  const frames = shineCycle(base, [[[3, 9]], [[6, 9], [5, 10]], [[9, 9], [8, 10]], [[11, 9]]], PAL.ink, 0.8);
  // a little sparkle twinkles above the tip
  const spark: readonly (readonly [number, number][])[] = [[], [[5, 2]], [[5, 2], [4, 2], [6, 2], [5, 1], [5, 3]], [[5, 2]]];
  frames.forEach((f, i) => spark[i].forEach(([x, y], k) => f.set(x, y, k === 0 ? BRIE.rindHi : BRIE.spark)));
  return frames;
}
