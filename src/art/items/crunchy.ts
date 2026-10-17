/**
 * Crunchy fried wings: the burning `crunchy` pickup (box art) and the worn `wings`
 * flap sheet (two crust wings drawn behind Ciccio, attach point (16,12)).
 */
import { rng } from '../pixel';
import { Raster } from './raster';
import { Mask, capsule, disc, shadeMask, speckle, type Tones } from './shapes';
import { FIRE, paintFlame } from './fire';

type Crust = Tones & { line: string; seam: string };

export const CRUST: Crust & { hi: string } = {
  hi: '#fde49a',
  rim: '#fccc68',
  light: '#f4aa40',
  base: '#dc8424',
  dark: '#a45214',
  deep: '#723008',
  line: '#3a1404',
  seam: '#8a3e0e',
};
const CRUST_FAR: Crust = {
  rim: '#e0983c',
  light: '#c87a24',
  base: '#a85c18',
  dark: '#7a3c0e',
  deep: '#522008',
  line: '#2a0e02',
  seam: '#5a2408',
};
const CRUMBS = ['#fcd070', '#fcc050', '#b85c14'];
const TAU = Math.PI * 2;

/** Crust material on a mask: bevel + crumb speckles, outlined on its own layer. */
function crustLayer(m: Mask, tones: Crust, seed: number): Raster {
  const layer = new Raster(m.w, m.h);
  shadeMask(layer, m, tones);
  speckle(layer, m, rng(seed), CRUMBS, 0.13);
  layer.outline(tones.line);
  return layer;
}

/* ------------------------------------------------------- crunchy pickup */

/** Two lumpy "bean" wings like on the box: bulb (x, y, r) -> tail (x, y, r). */
const PICKUP_WINGS: readonly (readonly [number, number, number, number, number, number])[] = [
  [6.4, 12, 3.3, 10.6, 9.6, 2.3],
  [15.6, 11.8, 3.3, 19.8, 9.4, 2.3],
];

/** Fire glow hugging the crust outline; a few pixels drop out each frame so it flickers. */
function halo(r: Raster, wings: Raster, rand: () => number): void {
  for (let y = 0; y < r.h; y++) {
    for (let x = 0; x < r.w; x++) {
      if (wings.alpha(x, y) > 0) continue;
      const touch = wings.alpha(x - 1, y) > 0 || wings.alpha(x + 1, y) > 0 || wings.alpha(x, y - 1) > 0 || wings.alpha(x, y + 1) > 0;
      if (touch && rand() < 0.8) r.set(x, y, wings.alpha(x, y + 1) > 0 ? FIRE.core : FIRE.hot, 0.95);
    }
  }
}

function crunchyFrame(i: number, n: number): Raster {
  const r = new Raster(24, 16);
  const p = (i / n) * TAU;
  const tongues: readonly (readonly [number, number, number, number])[] = [
    [3.5, 11, 7, 0], [7, 10, 9, 1.7], [10.5, 10, 8, 3.1], [13.5, 11, 7, 4.2], [17, 10, 9, 0.9], [20.5, 10, 8, 2.6],
  ];
  for (const [x, base, h, off] of tongues) paintFlame(r, x, base, h + 1.8 * Math.sin(p + off), 2.2, p + off);
  const wings = new Raster(24, 16);
  PICKUP_WINGS.forEach(([bx, by, br, tx, ty, tr], k) => {
    const shape = capsule(bx, by, tx, ty, br, tr);
    const bulge = disc(bx + 1.4, by + 0.4, br - 0.5);
    const m = Mask.of(24, 16, (x, y) => shape(x, y) || bulge(x, y)).roughen(rng(31 + k), 0.16, 0.12);
    wings.draw(crustLayer(m, CRUST, 50 + k));
  });
  halo(r, wings, rng(200 + i));
  r.draw(wings);
  // hot glints on the crust that flicker with the fire
  const glints: readonly (readonly [number, number])[] = [[5, 11], [9, 9], [14, 11], [18, 9], [7, 12], [16, 13]];
  glints.forEach(([x, y], k) => {
    if ((k + i) % 3 !== 0 && wings.alpha(x, y) > 0 && !wings.is(x, y, CRUST.line)) r.set(x, y, k % 2 ? CRUST.hi : FIRE.hot);
  });
  return r;
}

export function crunchyFrames(): Raster[] {
  return Array.from({ length: 4 }, (_, i) => crunchyFrame(i, 4));
}

/* --------------------------------------------------------- worn wings */

const deg = (d: number): number => (d * Math.PI) / 180;
/** Direction of the wing arm per pose (shoulder -> tip): up, mid, down. */
const POSES = [deg(-124), deg(-152), deg(178)];
/** Arm joints in wing space (u along the wing, v towards the trailing edge): [u, v, radius]. */
const ARM: readonly (readonly [number, number, number])[] = [[-1, 0, 3.4], [6, -1.2, 2.6], [13, -0.4, 1.4]];
/** Crust feathers hanging from the arm: [u, v, root radius, length, tip radius]. */
const FEATHERS: readonly (readonly [number, number, number, number, number])[] = [
  [3, 0, 2.2, 6.5, 1.7],
  [6.5, -0.4, 2.3, 7.5, 1.7],
  [10, -0.6, 2.2, 8, 1.5],
  [13, -0.4, 1.8, 7, 1.3],
];
const LEAN = deg(32); // feathers lean towards the tip so their points sweep back

/**
 * Little wing: a crust "arm" (leading edge) with four fried feathers hanging from it,
 * drawn in wing space and mapped to the frame by the pose angle. Each new piece leaves a
 * soft seam where it overlaps the previous ones; the silhouette gets the dark outline.
 */
function wingLayer(dir: number, rx: number, ry: number, scale: number, tones: Crust, seed: number): Raster {
  const c = Math.cos(dir);
  const s = Math.sin(dir);
  const at = (u: number, v: number): [number, number] => [rx + (u * c + v * s) * scale, ry + (u * s - v * c) * scale];
  const r = new Raster(32, 24);
  const piece = (pred: (x: number, y: number) => boolean, k: number): void => {
    const m = Mask.of(32, 24, pred).roughen(rng(seed + k), 0.05, 0.03);
    const layer = new Raster(32, 24);
    shadeMask(layer, m, tones);
    speckle(layer, m, rng(seed + 10 + k), CRUMBS, 0.06);
    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 32; x++) {
        const ring = !m.has(x, y) && (m.has(x - 1, y) || m.has(x + 1, y) || m.has(x, y - 1) || m.has(x, y + 1));
        if (ring && r.alpha(x, y) > 0) r.set(x, y, tones.seam);
      }
    }
    r.draw(layer);
  };
  FEATHERS.forEach(([u, v, r0, len, r1], k) => {
    const [ax, ay] = at(u, v);
    const [bx, by] = at(u + Math.sin(LEAN) * len, v + Math.cos(LEAN) * len);
    piece(capsule(ax, ay, bx, by, r0 * scale, r1 * scale), k);
  });
  const joints = ARM.map(([u, v, rad]) => [...at(u, v), rad * scale] as const);
  const arm1 = capsule(joints[0][0], joints[0][1], joints[1][0], joints[1][1], joints[0][2], joints[1][2]);
  const arm2 = capsule(joints[1][0], joints[1][1], joints[2][0], joints[2][1], joints[1][2], joints[2][2]);
  piece((x, y) => arm1(x, y) || arm2(x, y), 9);
  r.outline(tones.line);
  return r;
}

function wingsFrame(dir: number, seed: number): Raster {
  const r = new Raster(32, 24);
  r.draw(wingLayer(dir + deg(24), 18, 11, 0.72, CRUST_FAR, 70 + seed)); // far wing, behind, more upright
  r.draw(wingLayer(dir, 16, 12, 0.86, CRUST, 90 + seed));
  return r;
}

export function wingsFrames(): Raster[] {
  // up, mid, down, mid — same seed per pose so both "mid" frames are identical
  return [0, 1, 2, 1].map((k) => wingsFrame(POSES[k], k * 20));
}
