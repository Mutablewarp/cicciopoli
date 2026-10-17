/**
 * `burn` (32x32, 8 frames once): an enemy hit by the Thai-wing club catches fire.
 * Flames rise from the ground (bottom row 31) over a ~24x24 silhouette, then collapse
 * into a dark ash cloud with embers and thin smoke wisps.
 */
import { Raster } from './raster';
import { FIRE, paintFlame } from './fire';
import { Mask, disc, shadeMask } from './shapes';

const ASH = { rim: '#a69a98', light: '#82767a', base: '#62585c', dark: '#463e42', deep: '#332c30', line: '#141012' };
const WISP = ['#9a8e8e', '#7a6e70'];

/** Flame tongue: x, height, half-width, phase, hot core. */
type Tongue = readonly [number, number, number, number, boolean];

const FLAMES: readonly (readonly Tongue[])[] = [
  [[9, 6, 2, 0.3, false], [15, 8, 2.4, 1.9, true], [21, 7, 2.2, 3.1, true], [25, 4, 1.6, 4.4, false]],
  [[6, 9, 2.4, 1.1, false], [26, 10, 2.4, 2.6, false], [11, 13, 2.8, 0.2, true], [16.5, 15, 3, 2.2, true], [21.5, 12, 2.8, 4.1, true]],
  [[5.5, 15, 3, 0.9, false], [26.5, 16, 3, 3.6, false], [10, 21, 3.6, 2.4, false], [22, 20, 3.6, 0.5, false], [16, 25, 5.4, 1.4, true], [11, 14, 3, 5.1, true], [21, 15, 3, 3.3, true]],
  [[5.5, 19, 3.2, 2.1, false], [26.5, 20, 3.2, 4.8, false], [9.5, 26, 3.8, 0.8, false], [22.5, 25, 3.8, 3.4, false], [16, 30, 6.6, 2.6, true], [10.5, 17, 3.2, 1.6, true], [21.5, 18, 3.2, 5.6, true]],
  [[6, 17, 3.2, 3.3, false], [26, 16, 3, 0.4, false], [10, 22, 3.6, 2, false], [22, 23, 3.6, 4.6, false], [16, 26, 6, 3.8, true], [11, 13, 2.8, 2.9, true], [21, 12, 2.8, 0.9, true]],
  [[9, 6, 2.2, 4.2, false], [16, 8, 2.6, 0.6, true], [23, 5, 2, 2.2, false]],
  [[14, 4, 1.8, 1.4, false], [20, 3, 1.4, 3.3, false]],
  [],
];

/** Ash cloud puffs per frame (x, y, r), plus ember sparks (x, y, hot). */
const ASH_STAGES: readonly { puffs: readonly (readonly [number, number, number])[]; embers: readonly (readonly [number, number, boolean])[] }[] = [
  { puffs: [], embers: [] },
  { puffs: [], embers: [[8, 18, false], [24, 16, true]] },
  { puffs: [], embers: [[6, 8, true], [25, 6, false], [15, 2, true]] },
  { puffs: [], embers: [[4, 6, false], [28, 4, true], [13, 1, false], [19, 0, true]] },
  { puffs: [[16, 5, 3.6], [11.5, 7, 2.6], [20.5, 6.5, 2.8]], embers: [[5, 2, true], [27, 3, false]] },
  {
    puffs: [[16, 17, 5.6], [10, 20, 4.4], [22, 19.5, 4.6], [12.5, 11.5, 4.4], [19.5, 10.5, 4.2], [16, 6, 3.4], [7, 25, 3], [25, 25, 3.2]],
    embers: [[7, 9, true], [25, 7, true], [15, 1, false], [28, 15, false], [4, 16, true], [21, 2, true]],
  },
  {
    puffs: [[15, 12, 4.6], [9.5, 14.5, 3.4], [21, 13, 3.8], [12.5, 6.5, 3.2], [19, 5.5, 3], [16, 18.5, 2.6]],
    embers: [[6, 4, false], [26, 3, true], [12, 0, true], [23, 21, false], [9, 22, true]],
  },
  { puffs: [], embers: [[8, 2, false], [24, 1, false]] },
];

/** Thin rising wisps for the last frame: start x, phase. */
const WISPS: readonly (readonly [number, number])[] = [[11, 0.4], [16.5, 2.2], [21.5, 4.1]];

/** Little heap of ash left on the ground (frames 6-7). */
function ashPile(r: Raster): void {
  const rows = ['....kkkkk....', '..kkdbbbdkk..', '.kdbbdbbbddk.'];
  const pal: Readonly<Record<string, string>> = { k: ASH.line, b: ASH.base, d: ASH.dark };
  r.grid(rows, pal, 10, 29);
  r.set(14, 30, ASH.light);
  r.set(13, 31, ASH.light);
}

function ashCloud(r: Raster, puffs: readonly (readonly [number, number, number])[]): void {
  if (puffs.length === 0) return;
  // each puff shaded on its own, lowest first, so the cloud reads as separate billows
  const cloud = new Raster(32, 32);
  for (const [x, y, rad] of [...puffs].sort((a, b) => b[1] - a[1])) {
    const puff = new Raster(32, 32);
    shadeMask(puff, Mask.of(32, 32, disc(x, y, rad)), ASH);
    puff.outline(ASH.deep);
    cloud.draw(puff);
  }
  cloud.outline(ASH.line);
  r.draw(cloud);
}

function burnFrame(i: number): Raster {
  const r = new Raster(32, 32);
  ashCloud(r, ASH_STAGES[i].puffs);
  for (const [x, h, hw, phase, hot] of FLAMES[i]) paintFlame(r, x, 31, h, hw, phase, hot);
  if (i >= 6) ashPile(r);
  if (i === 7) {
    for (const [x0, ph] of WISPS) {
      for (let y = 27; y >= 6; y--) {
        const x = Math.round(x0 + 1.6 * Math.sin(y * 0.38 + ph));
        r.set(x, y, WISP[y > 16 ? 0 : 1], y > 16 ? 0.75 : 0.25 + 0.05 * (y - 6));
      }
    }
  }
  for (const [x, y, hot] of ASH_STAGES[i].embers) {
    r.set(x, y, hot ? FIRE.hot : FIRE.orange);
    if (hot) r.set(x, y + 1, FIRE.red);
  }
  return r;
}

export function burnFrames(): Raster[] {
  return Array.from({ length: 8 }, (_, i) => burnFrame(i));
}
