/**
 * The owner's foods (ref/invaders_sprites.png), 20x20 each (drawn on a 16 px grid and painted
 * 1.25x bigger through Zoom so they read well on a phone), dark outlines, top-left light:
 * 0 cheese wheel · 1 roast chicken · 2 wheat ears · 3 drumstick · 4 lettuce ·
 * 5 cherry tomatoes on the vine · 6 egg · 7 cheese slices · 8 half bun.
 */
import { sheetOf, type Tones } from './buf';
import { FOOD_COUNT } from './keys';
import { Zoom } from './zoom';

export const FOOD_SIZE = 20;
const ZOOM = FOOD_SIZE / 16;

const INK = '#1c120e';
const BROWN: Tones = { hi: '#e8a868', base: '#b46a30', shade: '#84461c', dark: '#52260e' };
const BONE = '#fcf4e4';
const BONE_SH = '#d8c8b0';

function cheeseWheel(z: Zoom): void {
  // side band first, then the lighter top face with a dark rim line between them
  for (let y = 7; y <= 12; y += 0.8) z.ellipse(7.5, y, 6.6, 2.6, y > 10 ? '#b88038' : '#d49c50');
  for (let x = 2; x <= 5; x++) z.paint(x, 11, '#e4b468');
  z.ellipse(7.5, 6.4, 6.7, 2.8, INK);
  z.ellipse(7.5, 5.5, 6.3, 2.3, '#fce4a8');
  z.ellipse(6, 4.8, 3.6, 1.1, '#fff4d4');
  z.outline(INK);
}

function roastChicken(z: Zoom): void {
  // legs with bones poking out to the right (ref)
  z.sphere(11, 6, 2.6, 1.8, BROWN);
  z.sphere(11, 10.5, 2.6, 1.8, BROWN);
  z.sphere(6.5, 8.5, 5.6, 4.6, BROWN);
  z.ellipse(6, 10, 3.2, 1.6, BROWN.shade);
  z.ellipse(5.5, 9.5, 2.2, 0.9, BROWN.base);
  // bones poking out of the two legs: a shaft and a two-lobed knob (big-grid pixels)
  for (const y of [8, 13]) {
    z.b.set(16, y, BONE_SH);
    z.b.set(17, y, BONE);
    z.b.set(18, y - 1, BONE);
    z.b.set(18, y, BONE);
    z.b.set(18, y + 1, BONE);
    z.b.set(19, y - 1, BONE_SH);
    z.b.set(19, y + 1, BONE_SH);
  }
  z.set(4, 6, '#fcd8a8');
  z.set(5, 5, '#fcd8a8');
  z.outline(INK);
}

/** Three ears (20 px grid): kernels as paired golden ovals along a stalk, dark outline, a few awns. */
function wheat(z: Zoom): void {
  const { b } = z;
  const stem = '#8a6a24';
  const ears: readonly [number, number, number][] = [
    [3.5, 4.5, -0.55], // top x, top y, lean per kernel row
    [9.5, 1.5, 0],
    [15.5, 4.5, 0.55],
  ];
  for (const [x, y, lean] of ears) {
    b.line(x - lean * 3, y + 11, 9.5, 19, stem);
    b.line(x - lean * 3 + 1, y + 11, 10.5, 19, '#6a4e16');
    for (let k = 0; k < 5; k++) {
      const ky = y + 2.6 + k * 2.4;
      const kx = x + lean * k;
      b.ellipse(kx - 1.1, ky, 0.9, 1.5, k % 2 ? '#e0a030' : '#f4c050');
      b.ellipse(kx + 1.1, ky + 0.9, 0.9, 1.5, k % 2 ? '#f4c050' : '#c88428');
    }
    b.ellipse(x, y + 1.2, 0.8, 1.7, '#fce4a0');
    b.set(x, y - 1, '#fcecb8');
  }
  z.outline(INK);
}

function drumstick(z: Zoom): void {
  z.line(9, 9, 12, 12, BONE_SH);
  z.line(9, 10, 12, 13, BONE);
  z.ellipse(13, 12, 1, 1, BONE);
  z.ellipse(12, 14, 1, 1, BONE);
  z.set(14, 13, BONE_SH);
  z.sphere(6, 6, 5, 4.2, BROWN);
  z.set(9, 10, BROWN.shade);
  z.set(3, 4, '#fcd8a8');
  z.set(4, 3, '#fcd8a8');
  z.outline(INK);
}

function lettuce(z: Zoom): void {
  const G: Tones = { hi: '#b4f05c', base: '#5cc020', shade: '#2e8a1c', dark: '#1a5a14' };
  const leaves: readonly [number, number, number, number][] = [
    [4, 10, 3.5, 2.6], [11, 10, 3.5, 2.6], [7.5, 8, 4, 3.6], [5, 6, 2.6, 2.4], [10.5, 6, 2.6, 2.4], [7.5, 11.5, 4.6, 2],
  ];
  for (const [x, y, rx, ry] of leaves) z.sphere(x, y, rx, ry, G);
  // pale veins
  z.line(7, 12, 7, 6, '#d8fca0');
  z.line(7, 9, 5, 7, '#d8fca0');
  z.line(8, 10, 10, 7, '#d8fca0');
  z.outline(INK);
}

function tomatoes(z: Zoom): void {
  const RED: Tones = { hi: '#ffb0a0', base: '#e83020', shade: '#b0180e', dark: '#6a0a06' };
  z.line(1, 15, 14, 2, '#3a7a1c');
  z.line(2, 15, 15, 2, '#2a5a14');
  const berries: readonly [number, number][] = [[3, 10], [7, 12], [8, 7], [12, 9], [12, 4]];
  for (const [x, y] of berries) {
    z.sphere(x, y, 2.3, 2.3, RED);
    z.set(x, y - 2, '#5cc020');
    z.set(x - 1, y - 2, '#3a8a1c');
    z.set(x + 1, y - 2, '#3a8a1c');
  }
  z.outline(INK);
}

function egg(z: Zoom): void {
  const E: Tones = { hi: '#fffaf0', base: '#f0dcc0', shade: '#d4b490', dark: '#a8845c' };
  for (let Y = 0; Y < FOOD_SIZE; Y++) {
    const y = z.back(Y);
    if (y < 1.6 || y > 14.4) continue;
    const t = (y - 2) / 12;
    const half = Math.sqrt(Math.max(0, 1 - Math.pow(t * 2 - 1, 2))) * (3.2 + t * 1.6);
    for (let X = 0; X < FOOD_SIZE; X++) if (Math.abs(z.back(X) - 7.5) <= half + 0.2) z.b.set(X, Y, E.base);
  }
  z.sphere(7.5, 9, 5.2, 6.6, E, true);
  z.outline(INK);
}

/** Three provola slices fanned out; each slice gets an ink edge where it covers the one behind. */
function cheeseSlices(z: Zoom): void {
  const discs: readonly [number, number][] = [[11, 9], [8, 8], [5, 7]];
  for (const [x, y] of discs) {
    for (let Y = 0; Y < FOOD_SIZE; Y++) {
      for (let X = 0; X < FOOD_SIZE; X++) {
        const u = (z.back(X) - x) / 4.9;
        const v = (z.back(Y) - y) / 4.6;
        const d = u * u + v * v;
        if (d > 1 && d < 1.5 && z.b.alpha(X, Y) > 0) z.b.set(X, Y, INK);
      }
    }
    z.ellipse(x, y + 1, 4.4, 4.2, '#dcc89c');
    z.ellipse(x, y, 4.4, 4.2, '#fcf0d4');
    z.ellipse(x - 1, y - 1, 2.4, 2, '#fffaf0');
  }
  z.outline(INK);
}

function halfBun(z: Zoom): void {
  const BUN: Tones = { hi: '#fcd28a', base: '#e8942c', shade: '#b8661a', dark: '#7a3e10' };
  for (let Y = 0; Y < FOOD_SIZE; Y++) {
    const y = z.back(Y);
    if (y < 3.6 || y > 12.4) continue;
    const t = (12 - y) / 8;
    const half = Math.sqrt(Math.max(0, 1 - t * t)) * 7;
    for (let X = 0; X < FOOD_SIZE; X++) if (Math.abs(z.back(X) - 7.5) <= half + 0.2) z.b.set(X, Y, BUN.base);
  }
  z.sphere(7.5, 12, 7.4, 8.4, BUN, true);
  z.rect(1, 12, 14, 1, '#c0782a');
  for (const [x, y] of [[5, 7], [9, 6], [7, 9], [11, 9], [4, 10]] as const) z.set(x, y, '#fff4d8');
  z.outline(INK);
}

const DRAW: readonly ((z: Zoom) => void)[] = [
  cheeseWheel, roastChicken, wheat, drumstick, lettuce, tomatoes, egg, cheeseSlices, halfBun,
];

export function buildFoods(): HTMLCanvasElement {
  return sheetOf(FOOD_COUNT, FOOD_SIZE, FOOD_SIZE, (b, i) => DRAW[i](new Zoom(b, ZOOM)));
}
