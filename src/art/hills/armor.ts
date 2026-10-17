/**
 * Burger corazzato 32x32, faces LEFT: burger wearing a knight helmet and an
 * armour belt, bun-teeth grin, short legs. 0-3 walk, 4 clang (stomped), 5 dazed.
 */
import { PAL } from '../pixel';
import { Mask, paintMask, type Tone } from './mask';
import { Raster, gridR, outlineRaster, packColor } from './raster';

const STEEL: Tone = { light: '#eef2f8', base: '#aab6c4', shade: '#6e7a8c', dark: '#505a6a' };
const BUN: Tone = { light: PAL.bunLight, base: PAL.bun, shade: PAL.bunDark };
const PATTY: Tone = { light: '#7a4028', base: PAL.patty, shade: '#3c1c10' };
const LEG: Tone = { light: '#6a6a7a', base: '#4a4a58', shade: '#30303c' };
const MOUTH: Tone = { light: '#5a1410', base: '#3a0a08', shade: '#3a0a08' };
const LETTUCE: Tone = { light: '#8ae040', base: PAL.lettuce, shade: '#3a9018' };

enum M { Steel = 1, Bun, Patty, Leg, Boot, Mouth, Lettuce, Belt }

interface Step { bob: number; legs: [number, number]; lift: [number, number] }

const WALK: readonly Step[] = [
  { bob: 0, legs: [-2, 2], lift: [0, 0] },
  { bob: -1, legs: [0, 0], lift: [1, 0] },
  { bob: 0, legs: [2, -2], lift: [0, 0] },
  { bob: -1, legs: [0, 0], lift: [0, 1] },
];

function bodyMask(s: Step): Mask {
  const m = new Mask(32, 32);
  const b = s.bob;
  // legs + sabatons (pointed toes face left); boots stay planted while the body bobs
  const legX: [number, number] = [11 + s.legs[0], 18 + s.legs[1]];
  legX.forEach((lx, i) => {
    const lift = s.lift[i];
    m.rect(lx, 24 + b, 3, 5 - b - lift, M.Leg);
    m.rect(lx - 2, 29 - lift, 5, 2, M.Boot);
    m.set(lx - 3, 30 - lift, M.Boot);
  });
  // bottom bun, patty, armour belt, grin
  m.ellipse(16, 21 + b, 12, 4, M.Bun);
  m.ellipse(16, 18 + b, 13, 2, M.Patty);
  m.rect(5, 20 + b, 23, 3, M.Belt);
  m.rect(4, 16 + b, 13, 3, M.Mouth);
  for (let x = 4; x <= 28; x++) m.set(x, 15 + b + (x % 3 === 0 ? 1 : 0), M.Lettuce);
  // helmet dome, widest at the rim (y = 14), with a short visor beak pointing left
  for (let y = 4 + b; y <= 14 + b; y++) {
    const dy = y - (14 + b);
    const half = Math.round(12 * Math.sqrt(Math.max(0, 1 - (dy * dy) / (11.4 * 11.4))));
    m.span(16 - half, 16 + half, y, M.Steel);
  }
  m.rect(2, 9 + b, 3, 3, M.Steel);
  m.set(1, 10 + b, M.Steel);
  return m;
}

function details(r: Raster, s: Step, glow: string): void {
  const b = s.bob;
  // visor slit with two angry glowing eyes
  for (let x = 4; x <= 18; x++) r.set(x, 9 + b, '#141414');
  for (let x = 5; x <= 17; x++) r.set(x, 10 + b, '#2a2a34');
  gridR(r, ['ww...ww', '.w...w.'], { w: glow }, 6, 9 + b);
  // breathing holes + rivets along the rim
  for (const x of [8, 11, 14]) r.set(x, 12 + b, '#3c4450');
  for (const x of [6, 12, 18, 24]) r.set(x, 14 + b, '#eef2f8');
  // crest ridge and red plume
  for (let y = 5; y <= 8; y++) r.set(17, y + b, '#eef2f8');
  gridR(r, ['..rr.', '.rRRr', 'rRr..'], { r: '#c81818', R: '#fc4a3a' }, 16, 2 + b);
  // teeth: top and bottom rows of the grin
  for (let x = 5; x <= 15; x += 2) {
    r.set(x, 16 + b, '#fcfcf0');
    r.set(x + 1, 16 + b, '#d8d8cc');
    if (x < 14) r.set(x + 1, 18 + b, '#fcfcf0');
  }
  // cheese drip on the patty, belt rivets
  gridR(r, ['yyyy', '.yy.', '..y.'], { y: PAL.cheese }, 20, 17 + b);
  for (const x of [8, 14, 20, 26]) r.set(x, 22 + b, '#eef2f8');
}

function frame(s: Step, mode: 'walk' | 'clang' | 'dazed'): Raster {
  const m = bodyMask(s);
  const r = new Raster(32, 32);
  paintMask(m, r, {
    [M.Steel]: STEEL, [M.Bun]: BUN, [M.Patty]: PATTY, [M.Leg]: LEG, [M.Boot]: STEEL,
    [M.Mouth]: MOUTH, [M.Lettuce]: LETTUCE, [M.Belt]: STEEL,
  }, { shadeDepth: 2, lightDepth: 1 });
  details(r, s, mode === 'clang' ? '#ffffff' : '#fcd400');
  if (mode === 'dazed') {
    gridR(r, ['k.k...k.k', '.k.....k.', 'k.k...k.k'], { k: '#fcd400' }, 6, 9);
  }
  outlineRaster(r, mode === 'clang' ? '#ffffff' : PAL.ink);
  if (mode === 'clang') {
    // whole armour flashes one step brighter + sparks flying off the top
    const up = new Map([[STEEL.base, '#ffffff'], [STEEL.shade, STEEL.light], [STEEL.dark ?? STEEL.shade, STEEL.base]]
      .map(([a, b]) => [packColor(a), packColor(b)] as const));
    r.map((c) => up.get(c) ?? c);
    for (const [x, y] of [[3, 3], [28, 2], [1, 8], [30, 9], [10, 0], [23, 0]] as const) {
      r.set(x, y, '#fcf070');
      r.set(x + 1, y, '#ffffff');
    }
  }
  if (mode === 'dazed') {
    const star = ['.y.', 'yYy', '.y.'];
    gridR(r, star, { y: '#fcd400', Y: '#ffffff' }, 3, 0);
    gridR(r, star, { y: '#fcd400', Y: '#ffffff' }, 25, 1);
    gridR(r, ['.y.', 'y.y', '.y.'], { y: '#fcf070' }, 13, -1);
  }
  return r;
}

export function buildArmor(): Raster[] {
  return [
    ...WALK.map((s) => frame(s, 'walk')),
    frame({ bob: 1, legs: [-1, 1], lift: [0, 0] }, 'clang'),
    frame({ bob: 0, legs: [0, 0], lift: [0, 0] }, 'dazed'),
  ];
}
