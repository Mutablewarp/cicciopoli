/**
 * Backdrop and set pieces: deep navy sky, three seamless star tiles (tiny warm speckles,
 * ref/invaders_sprites.png), a dithered nebula, distant planet + moon (no outline, low
 * contrast), the animated black hole and the burger shield.
 */
import { bayer, ctxOf, makeCanvas, rng, smoothGradient } from '../pixel';
import { Buf, sheetOf, type Tones } from './buf';

/** Smooth per-row gradient: it is stretched to the view, so a dither would turn into scanlines. */
export function buildSky(): HTMLCanvasElement {
  const c = makeCanvas(4, 256);
  smoothGradient(ctxOf(c), 0, 0, 4, 256, [
    { at: 0, color: '#070a1e' },
    { at: 0.45, color: '#0d1232' },
    { at: 1, color: '#151b48' },
  ]);
  return c;
}

type StarLayer = 'far' | 'mid' | 'near';

/** Seamless 128x128 star tile; stars never straddle the edge so tiling is clean. */
export function buildStars(layer: StarLayer): HTMLCanvasElement {
  const b = new Buf(128, 128);
  const R = rng(layer === 'far' ? 101 : layer === 'mid' ? 202 : 303);
  const warm = ['#7a6450', '#8c7458', '#6a5a6e', '#a08a64'];
  const bright = ['#e8cc98', '#f4dcb0', '#c8b8e8', '#fcecc8'];
  const count = layer === 'far' ? 170 : layer === 'mid' ? 60 : 14;
  for (let i = 0; i < count; i++) {
    const x = 2 + Math.floor(R() * 124);
    const y = 2 + Math.floor(R() * 124);
    if (layer === 'far') {
      b.set(x, y, warm[Math.floor(R() * warm.length)], 0.55 + R() * 0.4);
    } else if (layer === 'mid') {
      const c = R() < 0.75 ? warm[Math.floor(R() * warm.length)] : bright[Math.floor(R() * bright.length)];
      b.set(x, y, c, 0.8);
      if (R() < 0.2) b.set(x + 1, y, c, 0.5);
    } else {
      const c = bright[Math.floor(R() * bright.length)];
      b.set(x, y, '#ffffff');
      if (R() < 0.5) {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) b.set(x + dx, y + dy, c, 0.55);
      } else b.set(x + 1, y, c, 0.7);
    }
  }
  return b.toCanvas();
}

/** Soft violet/blue nebula: smooth blobs quantised with an ordered dither, alpha only. */
export function buildNebula(): HTMLCanvasElement {
  const b = new Buf(128, 96);
  const R = rng(404);
  const blobs = Array.from({ length: 9 }, () => [20 + R() * 88, 18 + R() * 60, 12 + R() * 18] as const);
  const tones = ['#1a1848', '#26205a', '#36286a', '#4a2e72'];
  for (let y = 0; y < 96; y++) {
    for (let x = 0; x < 128; x++) {
      let v = 0;
      for (const [cx, cy, r] of blobs) v += Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / (r * r));
      const edge = Math.min(x, 127 - x, y, 95 - y) / 14;
      v *= Math.min(1, edge);
      const q = v * 2.2 + (bayer(x, y) - 0.5) * 0.5;
      if (q < 0.45) continue;
      const k = Math.min(tones.length - 1, Math.floor((q - 0.45) * 2));
      b.set(x, y, tones[k], 0.9);
    }
  }
  return b.toCanvas();
}

const FAR_PLANET: Tones = { hi: '#4a4a86', base: '#33356c', shade: '#25264f', dark: '#1a1b3c' };

export function buildFarPlanet(): HTMLCanvasElement {
  const b = new Buf(48, 32);
  const ring = (front: boolean): void => {
    for (let i = 0; i <= 120; i++) {
      const t = (i / 120) * Math.PI * (front ? 1 : -1);
      const x = 24 + Math.cos(t) * 22;
      const y = 16 + Math.sin(t) * 5 + Math.cos(t) * -3;
      b.set(x, y, front ? '#6a5a7e' : '#3c3656');
      b.set(x, y + 1, front ? '#4c4264' : '#2c2844');
    }
  };
  ring(false);
  b.sphere(24, 16, 11, 11, FAR_PLANET);
  for (let x = 14; x < 35; x++) b.paint(x, 13 + Math.round((x - 24) * 0.12), '#2c2e5e');
  ring(true);
  return b.toCanvas();
}

export function buildFarMoon(): HTMLCanvasElement {
  const b = new Buf(20, 20);
  b.sphere(9.5, 9.5, 8, 8, { hi: '#6a6488', base: '#4c4870', shade: '#36345a', dark: '#262646' });
  for (const [x, y] of [[7, 7], [12, 11], [8, 13]] as const) {
    b.paint(x, y, '#36345a');
    b.paint(x + 1, y + 1, '#6a6488');
  }
  return b.toCanvas();
}

/** Black hole: dark core, hot rim, three spiral arms of a violet/pink/amber disk (8-frame loop). */
export function buildHole(): HTMLCanvasElement {
  const arms = 3;
  const disk = ['#2a1450', '#4a2280', '#7a38a8', '#c050b8', '#f08ab8', '#fcd0a0'];
  return sheetOf(8, 64, 64, (b, f) => {
    const rot = (f / 8) * ((Math.PI * 2) / arms);
    for (let y = 0; y < 64; y++) {
      for (let x = 0; x < 64; x++) {
        const dx = x - 31.5;
        const dy = (y - 31.5) * 1.15;
        const r = Math.hypot(dx, dy);
        if (r > 31) continue;
        if (r < 8.5) {
          b.set(x, y, r < 7 ? '#000000' : '#0c0418');
          continue;
        }
        if (r < 10.2) {
          b.set(x, y, r < 9.3 ? '#fff4d8' : '#fcb060');
          continue;
        }
        const a = Math.atan2(dy, dx);
        const swirl = Math.sin(arms * (a + rot) + Math.log(r) * 5.2) * 0.5 + 0.5;
        const fall = 1 - (r - 10) / 21;
        const v = swirl * fall * 1.25 + fall * 0.35 + (bayer(x, y) - 0.5) * 0.28;
        if (v < 0.22) continue;
        const k = Math.max(0, Math.min(disk.length - 1, Math.floor(v * disk.length * 0.95)));
        b.set(x, y, disk[k], Math.min(1, 0.35 + fall));
      }
    }
  });
}

/** Burger shield, 32x20: sesame bun, lettuce frill, cheese drip, patty, bottom bun with an arch. */
export function buildShield(): HTMLCanvasElement {
  const b = new Buf(32, 20);
  const bun: Tones = { hi: '#fcd28a', base: '#e8942c', shade: '#b8661a', dark: '#7a3e10' };
  for (let y = 1; y <= 7; y++) {
    const t = (7.5 - y) / 7;
    const half = Math.sqrt(Math.max(0, 1 - t * t)) * 14.5;
    for (let x = Math.round(15.5 - half); x <= Math.round(15.5 + half); x++) b.set(x, y, bun.base);
  }
  b.sphere(15.5, 8, 15, 8.5, bun, true);
  for (const [x, y] of [[8, 3], [13, 2], [18, 3], [23, 4], [11, 5], [16, 5], [21, 6], [6, 6]] as const) b.set(x, y, '#fff4d8');
  for (let x = 1; x <= 30; x++) {
    b.set(x, 8, x % 3 === 0 ? '#b4f05c' : '#5cc020');
    b.set(x, 9, x % 4 === 1 ? '#2e8a1c' : '#5cc020');
  }
  for (let x = 1; x <= 30; x++) b.set(x, 10, '#fcd400');
  for (const x of [5, 12, 19, 26]) {
    b.set(x, 11, '#fcd400');
    b.set(x, 12, '#d89c00');
  }
  for (let y = 11; y <= 14; y++) {
    for (let x = 1; x <= 30; x++) {
      if (b.alpha(x, y) > 0) continue;
      b.set(x, y, y === 11 ? '#7a3e22' : (x + y * 3) % 7 === 0 ? '#3a1a0c' : '#5a2c18');
    }
  }
  for (let y = 15; y <= 18; y++) {
    const inset = y === 18 ? 2 : 0;
    for (let x = 1 + inset; x <= 30 - inset; x++) b.set(x, y, y === 15 ? '#f4b860' : y === 18 ? '#b8661a' : '#e0902c');
  }
  // arch under the middle (the classic hiding spot)
  for (let y = 16; y <= 18; y++) for (let x = 12; x <= 19; x++) if (y > 16 || (x > 12 && x < 19)) b.clear(x, y);
  b.outline('#2a1408');
  return b.toCanvas();
}
