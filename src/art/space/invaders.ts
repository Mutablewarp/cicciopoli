/**
 * The marching formation: two alien designs (cute-menacing, Ciccio's palette), ringed
 * planets in three colours and asteroids in two sizes — 2 march frames each — plus the UFO.
 * All 16x16 frames except the UFO (32x16). Light from the top-left, dark outlines.
 */
import { rng } from '../pixel';
import { Buf, sheetOf, type Tones } from './buf';

const INK = '#120a1e';
const EYE = '#ffffff';
const PUPIL = '#1a0a14';

/* ---------------------------------------------------------------- aliens */

const GREEN: Tones = { hi: '#e0fc8a', base: '#8cd42c', shade: '#4c9a1c', dark: '#2a5c14' };
const ORANGE: Tones = { hi: '#ffd890', base: '#fc9000', shade: '#d05a00', dark: '#8a3000' };

/** One-eyed lime squid with an antenna bulb, angry brow and four wiggling tentacles. */
function alienA(b: Buf, f: number): void {
  // tentacles first so the head overlaps their roots
  const spread = f === 0 ? [-2, -1, 1, 2] : [1, 0, 0, -1];
  [3, 6, 9, 12].forEach((x, i) => {
    b.set(x, 11, GREEN.shade);
    b.set(x, 12, GREEN.base);
    b.set(x + spread[i] * 0.5, 13, GREEN.base);
    b.set(x + spread[i], 14, GREEN.shade);
  });
  b.set(7, 1, GREEN.shade);
  b.set(8, 1, GREEN.shade);
  b.sphere(7.5, 7, 6, 4.8, GREEN);
  b.set(7, 0, '#fcf070');
  b.set(8, 0, '#fcd400');
  // eye
  b.ellipse(7.5, 7, 2.6, 2, EYE);
  b.rect(7, f === 0 ? 7 : 6, 2, 2, PUPIL);
  b.set(7, f === 0 ? 7 : 6, '#5a3a8a');
  // angry V brow
  for (const [x, y] of [[4, 3], [5, 4], [6, 4], [9, 4], [10, 4], [11, 3]] as const) b.set(x, y, INK);
  // grin with one fang
  b.rect(6, 10, 4, 1, INK);
  b.set(7, 10, EYE);
  b.outline(INK);
}

/** Orange crab: eyes on stalks, raised / lowered pincers, little legs. */
function alienB(b: Buf, f: number): void {
  const up = f === 0;
  // open pincers: raised on one beat, lowered on the other
  const claw = up ? ['h.h', 'b.s', 'bbs', '.s.'] : ['.h.', 'hbs', 'b.s', 's.s'];
  const pal = { h: ORANGE.hi, b: ORANGE.base, s: ORANGE.shade };
  b.grid(claw, pal, 0, up ? 2 : 7);
  b.grid(claw, pal, 13, up ? 2 : 7);
  b.line(3, 8, 2, up ? 6 : 8, ORANGE.shade);
  b.line(12, 8, 13, up ? 6 : 8, ORANGE.shade);
  // legs
  for (const x of up ? [4, 7, 8, 11] : [5, 6, 9, 10]) {
    b.set(x, 11, ORANGE.shade);
    b.set(x + (x < 8 ? -1 : 1) * (up ? 1 : 0), 12, ORANGE.dark);
  }
  b.sphere(7.5, 8, 5.6, 3.6, ORANGE);
  // eye stalks + eyes
  for (const x of [5, 10]) {
    b.set(x, 4, ORANGE.shade);
    b.ellipse(x, 2.5, 1.6, 1.6, EYE);
    b.set(x + (up ? 0 : 1), up ? 3 : 2, PUPIL);
  }
  // angry lids slanting down to the middle
  for (const [x, y] of [[4, 1], [5, 1], [6, 2], [11, 1], [10, 1], [9, 2]] as const) b.set(x, y, INK);
  // mean mouth
  b.rect(5, 9, 6, 1, INK);
  b.set(6, 10, EYE);
  b.set(9, 10, EYE);
  b.outline(INK);
}

/* --------------------------------------------------------------- planets */

interface PlanetPal { body: Tones; band: string; ring: string; ringHi: string; ringDk: string }

const PLANETS: readonly PlanetPal[] = [
  { body: { hi: '#ffd2b8', base: '#f0645a', shade: '#b83a3a', dark: '#6e1e2a' }, band: '#d84c48', ring: '#fce4c0', ringHi: '#ffffff', ringDk: '#c8a070' },
  { body: { hi: '#b8fcec', base: '#30c0b0', shade: '#1a7c84', dark: '#0e4250' }, band: '#22a09c', ring: '#fcd400', ringHi: '#fcf070', ringDk: '#c08a00' },
  { body: { hi: '#ecd4ff', base: '#a070e0', shade: '#6440a8', dark: '#3a2266' }, band: '#8a58cc', ring: '#a8e4f4', ringHi: '#ffffff', ringDk: '#5aa0c8' },
];

/** Ringed planet; the ring tilts between the two march frames. */
function planet(b: Buf, p: PlanetPal, f: number): void {
  const cx = 7.5;
  const cy = 7.5;
  const tilt = f === 0 ? 0.28 : -0.28;
  const ringAt = (t: number): [number, number] => {
    const x = Math.cos(t) * 6.9;
    const y = Math.sin(t) * 2.1;
    return [cx + x, cy + y + x * tilt];
  };
  const steps = 72;
  // back half of the ring
  for (let i = 0; i < steps / 2; i++) {
    const [x, y] = ringAt(Math.PI + (i / (steps / 2)) * Math.PI);
    b.set(x, y, p.ringDk);
  }
  b.sphere(cx, cy, 4.6, 4.6, p.body);
  // soft bands across the globe
  for (let x = 3; x <= 12; x++) {
    b.paint(x, Math.round(cy - 1 + (x - cx) * tilt * 0.4), p.band);
    b.paint(x, Math.round(cy + 2 + (x - cx) * tilt * 0.4), p.band);
  }
  b.outline(INK);
  // front half of the ring, over the outline
  for (let i = 0; i <= steps / 2; i++) {
    const t = (i / (steps / 2)) * Math.PI;
    const [x, y] = ringAt(t);
    b.set(x, y, Math.cos(t) < -0.3 ? p.ringHi : p.ring);
    b.set(x, y + 1, INK);
  }
  for (const end of [0, Math.PI]) {
    const [x, y] = ringAt(end);
    b.set(x + (end === 0 ? 1 : -1), y, INK);
  }
}

/* ------------------------------------------------------------- asteroids */

const ROCK: Tones = { hi: '#dccab4', base: '#a08a72', shade: '#6a5848', dark: '#3e322c' };

/** Lumpy rock with craters; frame 1 is the same rock turned a quarter. */
function asteroid(b: Buf, r: number, seed: number, f: number): void {
  const R = rng(seed);
  const lumps = Array.from({ length: 7 }, () => R() * 0.24 - 0.1);
  const rot = f * (Math.PI / 2);
  const cx = 7.5;
  const cy = 7.5;
  const radius = (a: number): number => {
    const k = ((((a - rot) / (Math.PI * 2)) % 1) + 1) % 1 * lumps.length;
    const i = Math.floor(k);
    const t = k - i;
    return r * (1 + lumps[i] * (1 - t) + lumps[(i + 1) % lumps.length] * t);
  };
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (Math.hypot(dx, dy) <= radius(Math.atan2(dy, dx))) b.set(x, y, ROCK.base);
    }
  }
  b.sphere(cx, cy, r + 1.4, r + 1.4, ROCK, true);
  const craters = Array.from({ length: r > 4 ? 3 : 2 }, () => [R() * Math.PI * 2, R() * r * 0.55, R() < 0.5 ? 1 : 1.5] as const);
  for (const [a, d, cr] of craters) {
    const x = Math.round(cx + Math.cos(a + rot) * d);
    const y = Math.round(cy + Math.sin(a + rot) * d);
    b.paint(x, y, ROCK.dark);
    b.paint(x + 1, y + 1, ROCK.hi);
    if (cr > 1) {
      b.paint(x + 1, y, ROCK.shade);
      b.paint(x, y + 1, ROCK.shade);
    }
  }
  b.outline(INK);
}

/* ------------------------------------------------------------------- UFO */

const SAUCER: Tones = { hi: '#ffd0f2', base: '#f060c0', shade: '#a8308a', dark: '#5a1450' };
const DOME: Tones = { hi: '#ffffff', base: '#a8f0fc', shade: '#4cb8dc', dark: '#2a6ca8' };

function ufo(b: Buf, f: number): void {
  b.sphere(19.5, 8.5, 6.2, 5.6, DOME);
  // little green pilot silhouette in the dome
  b.rect(17, 6, 4, 4, '#8cd42c');
  b.set(17, 6, '#e0fc8a');
  b.set(18, 7, PUPIL);
  for (let y = 10; y < 20; y++) for (let x = 0; x < 40; x++) b.clear(x, y);
  b.sphere(19.5, 12.5, 17.5, 4.5, SAUCER);
  b.rect(5, 15, 30, 1, SAUCER.dark);
  // running lights
  for (let i = 0; i < 7; i++) {
    const x = 6 + i * 4.8;
    const on = (i + f) % 3 === 0;
    b.set(x, 12, on ? '#fff3a0' : '#c84a9c');
    b.set(x + 1, 12, on ? '#fcd400' : '#a8308a');
  }
  b.outline(INK);
}

/* --------------------------------------------------------------- sheets */

export function buildAlienA(): HTMLCanvasElement {
  return sheetOf(2, 16, 16, (b, f) => alienA(b, f));
}

export function buildAlienB(): HTMLCanvasElement {
  return sheetOf(2, 16, 16, (b, f) => alienB(b, f));
}

export function buildPlanets(): HTMLCanvasElement {
  return sheetOf(6, 16, 16, (b, i) => planet(b, PLANETS[Math.floor(i / 2)], i % 2));
}

export function buildAsteroids(): HTMLCanvasElement {
  return sheetOf(4, 16, 16, (b, i) => (i < 2 ? asteroid(b, 5.4, 77, i) : asteroid(b, 3.6, 31, i - 2)));
}

export function buildUfo(): HTMLCanvasElement {
  return sheetOf(4, 40, 20, (b, f) => ufo(b, f));
}
