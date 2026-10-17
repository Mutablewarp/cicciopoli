/**
 * The owner's foods (ref/invaders_sprites.png), 16x16 each, dark outlines, top-left light:
 * 0 cheese wheel · 1 roast chicken · 2 wheat ears · 3 drumstick · 4 lettuce ·
 * 5 cherry tomatoes on the vine · 6 egg · 7 cheese slices · 8 half bun.
 */
import { Buf, sheetOf, type Tones } from './buf';
import { FOOD_COUNT } from './keys';

const INK = '#1c120e';
const BROWN: Tones = { hi: '#e8a868', base: '#b46a30', shade: '#84461c', dark: '#52260e' };
const BONE = '#fcf4e4';
const BONE_SH = '#d8c8b0';

function cheeseWheel(b: Buf): void {
  // side band first, then the lighter top face with a dark rim line between them
  for (let y = 7; y <= 12; y++) b.ellipse(7.5, y, 6.6, 2.6, y > 10 ? '#b88038' : '#d49c50');
  for (let x = 2; x <= 5; x++) b.paint(x, 11, '#e4b468');
  b.ellipse(7.5, 6, 6.6, 2.6, INK);
  b.ellipse(7.5, 5.5, 6.4, 2.4, '#fce4a8');
  b.ellipse(6, 5, 3.6, 1.2, '#fff4d4');
  b.outline(INK);
}

function roastChicken(b: Buf): void {
  // legs with bones poking out to the right (ref)
  b.sphere(11, 6, 2.6, 1.8, BROWN);
  b.sphere(11, 10.5, 2.6, 1.8, BROWN);
  b.sphere(6.5, 8.5, 5.6, 4.6, BROWN);
  b.ellipse(6, 10, 3.2, 1.6, BROWN.shade);
  b.ellipse(5.5, 9.5, 2.2, 0.9, BROWN.base);
  for (const y of [5, 10]) {
    b.set(13, y, BONE_SH);
    b.set(14, y, BONE);
    b.set(15, y - 1, BONE);
    b.set(15, y + 1, BONE);
  }
  b.set(4, 6, '#fcd8a8');
  b.set(5, 5, '#fcd8a8');
  b.outline(INK);
}

/** Three ears: a stalk each, kernels as alternating chevrons, a few whiskers. */
function wheat(b: Buf): void {
  const stem = '#8a6a24';
  const ears: readonly [number, number, number][] = [
    [4, 3, -1], // top x, top y, lean (px per 6 rows)
    [8, 1, 0],
    [12, 3, 1],
  ];
  for (const [x, y, lean] of ears) {
    b.line(x - lean, y + 8, 8, 15, stem);
    for (let k = 0; k < 4; k++) {
      const ky = y + 1 + k * 2;
      const kx = x - Math.round((lean * k) / 3);
      b.set(kx - 1, ky, '#fcd070');
      b.set(kx - 1, ky + 1, '#e0a030');
      b.set(kx + 1, ky, '#f4c050');
      b.set(kx + 1, ky + 1, '#c08020');
      b.set(kx, ky + 1, '#a87018');
    }
    b.set(x, y, '#fce4a0');
    b.set(x + lean, y - 1, '#e8c070');
  }
  b.outline(INK);
}

function drumstick(b: Buf): void {
  b.line(9, 9, 12, 12, BONE_SH);
  b.line(9, 10, 12, 13, BONE);
  b.ellipse(13, 12, 1, 1, BONE);
  b.ellipse(12, 14, 1, 1, BONE);
  b.set(14, 13, BONE_SH);
  b.sphere(6, 6, 5, 4.2, BROWN);
  b.set(9, 10, BROWN.shade);
  b.set(3, 4, '#fcd8a8');
  b.set(4, 3, '#fcd8a8');
  b.outline(INK);
}

function lettuce(b: Buf): void {
  const G: Tones = { hi: '#b4f05c', base: '#5cc020', shade: '#2e8a1c', dark: '#1a5a14' };
  const leaves: readonly [number, number, number, number][] = [
    [4, 10, 3.5, 2.6], [11, 10, 3.5, 2.6], [7.5, 8, 4, 3.6], [5, 6, 2.6, 2.4], [10.5, 6, 2.6, 2.4], [7.5, 11.5, 4.6, 2],
  ];
  for (const [x, y, rx, ry] of leaves) b.sphere(x, y, rx, ry, G);
  // pale veins
  b.line(7, 12, 7, 6, '#d8fca0');
  b.line(7, 9, 5, 7, '#d8fca0');
  b.line(8, 10, 10, 7, '#d8fca0');
  b.outline(INK);
}

function tomatoes(b: Buf): void {
  const RED: Tones = { hi: '#ffb0a0', base: '#e83020', shade: '#b0180e', dark: '#6a0a06' };
  b.line(1, 15, 14, 2, '#3a7a1c');
  b.line(2, 15, 15, 2, '#2a5a14');
  const berries: readonly [number, number][] = [[3, 10], [7, 12], [8, 7], [12, 9], [12, 4]];
  for (const [x, y] of berries) {
    b.sphere(x, y, 2.3, 2.3, RED);
    b.set(x, y - 2, '#5cc020');
    b.set(x - 1, y - 2, '#3a8a1c');
    b.set(x + 1, y - 2, '#3a8a1c');
  }
  b.outline(INK);
}

function egg(b: Buf): void {
  const E: Tones = { hi: '#fffaf0', base: '#f0dcc0', shade: '#d4b490', dark: '#a8845c' };
  for (let y = 2; y <= 14; y++) {
    const t = (y - 2) / 12;
    const half = Math.sqrt(Math.max(0, 1 - Math.pow(t * 2 - 1, 2))) * (3.2 + t * 1.6);
    for (let x = Math.round(7.5 - half); x <= Math.round(7.5 + half); x++) b.set(x, y, E.base);
  }
  b.sphere(7.5, 9, 5.2, 6.6, E, true);
  b.outline(INK);
}

/** Three provola slices fanned out; each slice gets an ink edge where it covers the one behind. */
function cheeseSlices(b: Buf): void {
  const discs: readonly [number, number][] = [[11, 9], [8, 8], [5, 7]];
  for (const [x, y] of discs) {
    for (let j = -6; j <= 6; j++) {
      for (let i = -6; i <= 6; i++) {
        const u = i / 4.9;
        const v = j / 4.6;
        const d = u * u + v * v;
        if (d > 1 && d < 1.5 && b.alpha(x + i, y + j) > 0) b.set(x + i, y + j, INK);
      }
    }
    b.ellipse(x, y + 1, 4.4, 4.2, '#dcc89c');
    b.ellipse(x, y, 4.4, 4.2, '#fcf0d4');
    b.ellipse(x - 1, y - 1, 2.4, 2, '#fffaf0');
  }
  b.outline(INK);
}

function halfBun(b: Buf): void {
  const BUN: Tones = { hi: '#fcd28a', base: '#e8942c', shade: '#b8661a', dark: '#7a3e10' };
  for (let y = 4; y <= 12; y++) {
    const t = (12 - y) / 8;
    const half = Math.sqrt(Math.max(0, 1 - t * t)) * 7;
    for (let x = Math.round(7.5 - half); x <= Math.round(7.5 + half); x++) b.set(x, y, BUN.base);
  }
  b.sphere(7.5, 12, 7.4, 8.4, BUN, true);
  b.rect(1, 12, 14, 1, '#c0782a');
  for (const [x, y] of [[5, 7], [9, 6], [7, 9], [11, 9], [4, 10]] as const) b.set(x, y, '#fff4d8');
  b.outline(INK);
}

const DRAW: readonly ((b: Buf) => void)[] = [
  cheeseWheel, roastChicken, wheat, drumstick, lettuce, tomatoes, egg, cheeseSlices, halfBun,
];

export function buildFoods(): HTMLCanvasElement {
  return sheetOf(FOOD_COUNT, 16, 16, (b, i) => DRAW[i](b));
}
