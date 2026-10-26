/**
 * v9 FX (BRIEF §8 "### v9" point 3): one golden fry stick of a FRIES TRAIL with a glint sweeping
 * along it (16x16 x 4, big and fat enough to read in portrait), the CICCIO FEVER gold sparkle trail
 * behind the truck (40x24 x 4, drawn like 'rush-grip': its top row under the rear bumper, the sparkles
 * slide down 6 px a frame so the loop is seamless), the white air streak of a SFIORATO! near miss
 * (4x40) and the zone particles (6x6 x 12: 0-3 plane-tree leaves tumbling, 4-7 dust puffs, 8-11 sea spray).
 */
import { Raster, gridR, hash2, outlineRaster } from '../hills/raster';
import { rectR } from '../rampage/draw';
import { RU } from './colors';
import { turnRows } from './lettering';

const FRY = 16;
/** the stick lies on the diagonals x + y = 13..17 (lit edge, lit, middle, middle, shaded crust), |x - y| <= 11 */
const FRY_S = 15;
const FRY_HALF = 11;
const FRY_TONES = [RU.goldLight, RU.goldLight, RU.gold, RU.gold, RU.goldShade] as const;

/** One fat fry: a crisp diagonal stick, lit top-left, darker cut ends, a glint running up its lit edge. */
export function buildFry(): Raster[] {
  return [0, 1, 2, 3].map((f) => {
    const r = new Raster(FRY, FRY);
    for (let y = 0; y < FRY; y++) {
      for (let x = 0; x < FRY; x++) {
        const s = x + y - FRY_S;
        const along = x - y;
        const taper = Math.max(0, Math.abs(s) - 1); // rounded ends
        if (Math.abs(s) > 2 || Math.abs(along) > FRY_HALF - taper) continue;
        const end = Math.abs(along) >= FRY_HALF - 1 - taper;
        r.set(x, y, end ? (s === 2 ? RU.goldShade : RU.gold) : FRY_TONES[s + 2]);
      }
    }
    // the glint: a white pixel and its warm halo sliding up the lit edge, a star at the tip on the last frame
    if (f < 3) {
      const a = -7 + f * 6;
      const gx = (FRY_S - 2 + a) / 2;
      const gy = (FRY_S - 2 - a) / 2;
      r.set(gx, gy, RU.white);
      r.set(gx + 1, gy - 1, RU.flameCore);
    } else {
      for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] as const) r.set(12 + dx, 3 + dy, dx === 0 && dy === 0 ? RU.white : RU.flameCore);
    }
    outlineRaster(r, RU.ink);
    return r;
  });
}

const FEVER_W = 40;
const FEVER_H = 24;
/** centres of the two gold streams (under the rear tyres of the 40 px truck) */
const STREAMS = [8, 31] as const;
const SPARKS = 6;

function star(r: Raster, x: number, y: number, big: boolean): void {
  r.set(x, y, RU.white);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    r.set(x + dx, y + dy, RU.goldLight);
    if (big) r.set(x + 2 * dx, y + 2 * dy, RU.flameYellow);
  }
}

/** Two tapering streams of gold dust from the tyres, dithered away down the frame, stars riding them. */
export function buildFever(): Raster[] {
  return [0, 1, 2, 3].map((f) => {
    const r = new Raster(FEVER_W, FEVER_H);
    for (let y = 0; y < FEVER_H; y++) {
      const t = y / FEVER_H;
      const half = 3 - Math.floor(t * 3);
      for (const cx of STREAMS) {
        for (let x = cx - half; x <= cx + half; x++) {
          if (t > 0.4 && (x + y + f) % 2 === 0) continue;
          if (t > 0.75 && hash2(x, y + f * 6, 71) < 0.5) continue;
          const core = Math.abs(x - cx) < half;
          r.set(x, y, core ? ((y + f * 2) % 4 === 0 ? RU.flameCore : RU.goldLight) : RU.gold);
        }
      }
    }
    for (let k = 0; k < SPARKS; k++) {
      const y = (k * 4 + f * 6 + Math.floor(hash2(k, 0, 72) * 4)) % FEVER_H;
      const x = 3 + Math.floor(hash2(k, 1, 72) * (FEVER_W - 6));
      star(r, x, y, k % 3 === 0 && y < FEVER_H - 6);
    }
    return r;
  });
}

/** 4x40 white air streak, brightest in the middle, thinning and breaking up at both ends. */
export function buildStreak(): Raster {
  const r = new Raster(4, 40);
  for (let y = 0; y < 40; y++) {
    const edge = Math.min(y, 39 - y);
    if (edge < 4 && y % 2 === 1) continue;
    r.set(1, y, edge < 8 ? RU.whiteShade : RU.white);
    if (edge >= 6) r.set(2, y, edge >= 12 ? RU.white : RU.whiteShade);
    if (edge >= 14) {
      r.set(0, y, y % 3 === 0 ? RU.whiteShade : null);
      r.set(3, y, y % 3 === 1 ? RU.whiteShade : null);
    }
  }
  return r;
}

/** A plane-tree (platano) leaf: lobed blade, lighter midrib and stem. */
const LEAF: readonly string[] = [
  '..g.g.',
  '.gggg.',
  'ggVggg',
  '.gVgg.',
  '..Vg..',
  '.s....',
];
const LEAF_PAL = { g: '#5e9440', V: '#a8d070', s: '#7a5a2a' };
const DUST = '#c4b08a';
const DUST_LIGHT = '#e0d0aa';
const SPRAY = '#cfe8f4';

/** 0-3 a leaf turning a quarter each frame, 4-7 a dust puff growing and thinning, 8-11 spray bursting. */
export function buildBits(): Raster[] {
  const leaves: Raster[] = [];
  let rows: readonly string[] = LEAF;
  for (let f = 0; f < 4; f++) {
    const r = new Raster(6, 6);
    gridR(r, rows, LEAF_PAL);
    leaves.push(r);
    rows = turnRows(rows);
  }
  const dust = [0, 1, 2, 3].map((f) => {
    const r = new Raster(6, 6);
    const rad = [1.6, 2, 2.6, 3][f];
    for (let y = 0; y < 6; y++) {
      for (let x = 0; x < 6; x++) {
        const d = Math.hypot(x - 2.5, y - 2.5);
        if (d > rad || (f >= 2 && (x + y + f) % 2 === 0) || (f === 3 && hash2(x, y, 73) < 0.5)) continue;
        r.set(x, y, d < rad - 1 && x + y < 5 ? DUST_LIGHT : DUST);
      }
    }
    return r;
  });
  const drops: readonly (readonly (readonly [number, number])[])[] = [
    [[2, 3], [3, 2], [3, 3], [2, 2], [1, 3], [4, 2]],
    [[1, 2], [4, 1], [3, 4], [2, 3], [0, 3], [5, 2]],
    [[0, 1], [5, 0], [4, 4], [1, 4], [3, 2], [2, 0]],
    [[0, 0], [5, 3], [2, 5], [4, 1], [1, 2]],
  ];
  const spray = drops.map((pts, f) => {
    const r = new Raster(6, 6);
    pts.forEach(([x, y], i) => r.set(x, y, (i + f) % 2 === 0 ? RU.white : SPRAY));
    if (f === 0) rectR(r, 2, 2, 2, 2, RU.white);
    return r;
  });
  return [...leaves, ...dust, ...spray];
}
