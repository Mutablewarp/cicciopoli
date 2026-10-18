/**
 * Projectiles and effects: provola-stick shot, alien goo + meteor bits (enemy bombs),
 * lightning capsule, electric spark, grey smoke puff (ref), explosion, bolt icon.
 */
import { rng } from '../pixel';
import { Buf, sheetOf, type Tones } from './buf';

const INK = '#1c120e';

/** Vertical battered provola stick with a warm streak below (8x16). */
function shot(b: Buf, f: number): void {
  b.rect(1, 1, 6, 9, '#f0b850');
  b.rect(1, 1, 1, 8, '#fcdc90');
  b.rect(6, 2, 1, 8, '#c88430');
  b.rect(2, 1, 3, 1, '#fff0c0');
  for (const [x, y] of [[3, 3], [4, 6], [2, 7], [5, 4]] as const) b.set(x, y, '#c88430');
  b.set(3, 5, '#fcdc90');
  b.outline('#3a1c0a');
  const tail = f === 0 ? ['#fcd070', '#fcd070', '#f09030', '#f09030', '#c05a20'] : ['#fcd070', '#f09030', '#c05a20'];
  tail.forEach((c, i) => {
    b.set(3 + (i % 2), 11 + i, c, 0.9 - i * 0.16);
    if (i < 2) b.set(4 - (i % 2), 11 + i, c, 0.7);
  });
}

const GOO: Tones = { hi: '#e0fca0', base: '#7cd82c', shade: '#3a961c', dark: '#1a5a14' };

/** Wobbling alien goo drop (10x10). */
function goo(b: Buf, f: number): void {
  const squash = [0, 0.5, 0, -0.5][f];
  b.sphere(4.5, 5.8, 3.3 + squash * 0.5, 3.3 - squash * 0.5, GOO);
  b.set(4, 2, GOO.base);
  b.set(5, 2 + (f % 2), GOO.shade);
  b.set(4, 1, GOO.hi);
  b.outline('#0e2a0a');
}

/** Tumbling meteor bit with an ember tail above it (10x10). */
function rock(b: Buf, f: number): void {
  b.set(4, 0, '#fcd070', 0.6);
  b.set(5, 1, '#f09030', 0.8);
  b.set(4, 1, '#f09030', 0.7);
  const shapes = [
    ['..ab.', '.abbc', 'abbcc', 'bbbcc', '.bcc.'],
    ['.ab..', 'abbbc', 'abbcc', '.bbcc', '..cc.'],
    ['..aa.', 'abbbc', 'bbbcc', 'bbccc', '.ccc.'],
    ['.abb.', 'abbcc', 'bbbcc', '.bbc.', '..cc.'],
  ];
  b.grid(shapes[f], { a: '#dccab4', b: '#a08a72', c: '#6a5848' }, 2, 3);
  b.set(4, 5, '#fc9030');
  b.outline(INK);
}

/** Lightning capsule: cyan glass pill with a yellow bolt inside, steel caps, pulsing halo (14x20). */
function capsule(b: Buf, f: number): void {
  const glow = [0.25, 0.45, 0.7, 0.45][f];
  const core = new Buf(14, 20);
  for (let y = 4; y <= 15; y++) for (let x = 2; x <= 11; x++) core.set(x, y, '#58c4f4');
  core.sphere(6.5, 9.5, 5.2, 6.8, { hi: '#e8fcff', base: '#7ad8fc', shade: '#3a9ad8', dark: '#2464b0' }, true);
  for (const y of [1, 2, 3, 16, 17, 18]) {
    const inset = y === 1 || y === 18 ? 1 : 0;
    for (let x = 2 + inset; x <= 11 - inset; x++) core.set(x, y, x <= 5 ? '#e4e8f0' : x <= 8 ? '#a8b0c0' : '#6c7486');
  }
  core.grid(
    ['.....yy', '....yy.', '...yy..', '..yyyyy', '.yyyyy.', '....yy.', '...yy..', '..yy...', '.yy....', '.y.....'],
    { y: f === 2 ? '#ffffff' : '#fcf070' },
    4,
    5,
  );
  core.set(6, 6, '#ffffff');
  core.outline('#101634');
  for (let y = 0; y < 20; y++) {
    for (let x = 0; x < 14; x++) {
      if (core.alpha(x, y) > 0) continue;
      const near = core.alpha(x - 1, y) + core.alpha(x + 1, y) + core.alpha(x, y - 1) + core.alpha(x, y + 1);
      if (near > 0) b.set(x, y, '#a8f0ff', glow);
    }
  }
  b.stamp(core, 0, 0);
}

/** Electric impact: white core, cyan jagged rays, yellow sparks (16x16, once). */
function spark(b: Buf, f: number): void {
  const R = rng(91 + f);
  const len = [7, 6, 4, 2][f];
  for (let k = 0; k < 6; k++) {
    let a = (k / 6) * Math.PI * 2 + f * 0.4;
    let x = 7.5;
    let y = 7.5;
    for (let s = 0; s < len; s++) {
      a += (R() - 0.5) * 1.2;
      x += Math.cos(a);
      y += Math.sin(a);
      b.set(x, y, s < 2 ? '#ffffff' : s < len - 1 ? '#7ce8ff' : '#fcf070');
    }
  }
  if (f < 3) b.ellipse(7.5, 7.5, 2 - f * 0.6, 2 - f * 0.6, '#ffffff');
}

const SMOKE: Tones = { hi: '#d4d8e2', base: '#9ca0b0', shade: '#707486', dark: '#545868' };

/** Grey cartoon smoke puff (ref): bumpy cloud with curls; grows, then breaks up (24x24). */
function smoke(b: Buf, f: number): void {
  const R = rng(13);
  const blobs = Array.from({ length: 7 }, (_, i) => {
    const a = (i / 7) * Math.PI * 2 + R() * 0.5;
    return [Math.cos(a), Math.sin(a), 0.8 + R() * 0.5] as const;
  });
  const grow = [0.45, 0.75, 1, 1.08, 1.05, 0.9][f];
  const spread = [0.6, 0.85, 1, 1.25, 1.6, 2][f];
  const fade = [1, 1, 1, 0.9, 0.7, 0.45][f];
  for (const [dx, dy, s] of blobs) {
    const r = 3.6 * s * grow * (f >= 4 ? 0.75 : 1);
    b.sphere(11.5 + dx * 5 * spread, 11.5 + dy * 4.4 * spread, r, r, SMOKE);
  }
  if (f <= 3) b.sphere(11.5, 11.5, 5 * grow, 4.6 * grow, SMOKE);
  if (f >= 1 && f <= 3) {
    // the curls of the owner's drawing
    b.paint(9, 10, SMOKE.dark);
    b.paint(10, 9, SMOKE.dark);
    b.paint(11, 10, SMOKE.dark);
    b.paint(14, 13, SMOKE.dark);
    b.paint(15, 12, SMOKE.dark);
  }
  b.outline('#3a3c4c');
  if (fade < 1) for (let i = 3; i < b.data.length; i += 4) b.data[i] = Math.round(b.data[i] * fade);
}

/** Explosion: flash, fireball, ring of debris, smoke (24x24, 7 frames). */
function boom(b: Buf, f: number): void {
  const R = rng(55);
  const fire: Tones = { hi: '#ffffff', base: '#fcf070', shade: '#fc9c30', dark: '#e8401c' };
  const hot: Tones = { hi: '#fcf070', base: '#fc9c30', shade: '#e8401c', dark: '#8a1c0c' };
  const r = [3, 6, 8, 8.5, 7, 5, 3][f];
  if (f <= 1) b.ellipse(11.5, 11.5, r, r, f === 0 ? '#ffffff' : '#fff8c0');
  else if (f <= 4) b.sphere(11.5, 11.5, r, r, f === 2 ? fire : hot);
  else b.sphere(11.5, 11.5, r, r, SMOKE);
  if (f >= 3 && f <= 4) {
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) if (Math.hypot(x - 11.5, y - 11.5) < r - 3.5) b.clear(x, y);
  }
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + R() * 0.6;
    const d = [0, 5, 8, 10, 11, 11.5, 11.5][f] * (0.8 + R() * 0.3);
    if (f === 0) continue;
    const c = f < 3 ? '#fcf070' : f < 5 ? '#fc9c30' : '#707486';
    b.set(11.5 + Math.cos(a) * d, 11.5 + Math.sin(a) * d, c);
    if (f < 4) b.set(11.5 + Math.cos(a) * (d - 1), 11.5 + Math.sin(a) * (d - 1), '#e8401c');
  }
  if (f >= 2) b.outline(f >= 5 ? '#3a3c4c' : '#5a120a');
}

function boltIcon(b: Buf): void {
  b.grid(
    ['.....yy', '....yyw', '...yyw.', '..yyyyy', '.yyyyy.', '...yy..', '..yy...', '.yy....', '.y.....'],
    { y: '#fcd400', w: '#fff8c0' },
    2,
    1,
  );
  b.outline('#1a1a3a');
}

export function buildShot(): HTMLCanvasElement {
  return sheetOf(2, 8, 16, shot);
}
export function buildGoo(): HTMLCanvasElement {
  return sheetOf(4, 10, 10, goo);
}
export function buildRock(): HTMLCanvasElement {
  return sheetOf(4, 10, 10, rock);
}
export function buildCapsule(): HTMLCanvasElement {
  return sheetOf(4, 14, 20, capsule);
}
export function buildSpark(): HTMLCanvasElement {
  return sheetOf(4, 16, 16, spark);
}
export function buildSmoke(): HTMLCanvasElement {
  return sheetOf(6, 24, 24, smoke);
}
export function buildBoom(): HTMLCanvasElement {
  return sheetOf(7, 24, 24, boom);
}
export function buildBoltIcon(): HTMLCanvasElement {
  const b = new Buf(12, 12);
  boltIcon(b);
  return b.toCanvas();
}
