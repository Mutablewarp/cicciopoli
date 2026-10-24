/**
 * 'rush-space' 256x256: the backdrop of the ROADCOASTER finale. Deep space and stars, a hard sun
 * on the left, and the Earth's curved limb filling the bottom: the blue Mediterranean with SICILY
 * lit just below the limb (Etna's snowy cone, the Egadi, the Aeolian islands, Malta), the toe of
 * Calabria across the strait, Tunisia and Libya along the bottom, a few clouds and the thin
 * atmosphere glow.
 */
import { Mask } from '../hills/mask';
import { Raster, hash2 } from '../hills/raster';
import { mix } from '../pixel';
import { rectR } from '../rampage/draw';

const S = 256;
/** The Earth: a big circle whose top crosses the lower half of the image. */
const EARTH = { cx: 150, cy: 520, r: 380 };

const SP = {
  top: '#03040c',
  low: '#0a1232',
  star: '#f4f6ff',
  starDim: '#8890b8',
  sea: '#1c4c9c',
  seaLight: '#2c68b8',
  seaShallow: '#3c88c8',
  glint: '#a8d4f4',
  land: '#6e8a3c',
  landLight: '#8ea24a',
  landDry: '#a8904e',
  landShade: '#4e6a2e',
  sand: '#b49a64',
  sandShade: '#a08656',
  coast: '#d8c890',
  etna: '#4a3c38',
  snow: '#f8f8f8',
  cloud: '#f2f6fa',
  cloudShade: '#b8c8dc',
  haze: '#8ac8f0',
  atmo1: '#c4ecff',
  atmo2: '#5ab0ea',
  atmo3: '#2a5ab0',
  night: '#061024',
  sun: '#fffef0',
  sunRing: '#ffe8a0',
  sunGlow: '#c8a860',
} as const;

type Pts = readonly (readonly [number, number])[];

/**
 * Coasts from real coordinates: x = 106 + 23.4 * (lon - 12.4), y = 149 + 16.5 * (38.27 - lat) (the
 * latitude foreshortened, as seen towards the limb). Sicily sits just below the limb, near the
 * middle, so it stays in view when a wide screen crops the art to its middle rows (y ~70..180).
 */
const SICILY: Pts = [
  [114, 150], [118, 153], [122, 151], [127, 150], [129, 152], [136, 154], [144, 153], [152, 151], [161, 151], [167, 150],
  [173, 150], [182, 149], [176, 154], [174, 156], [170, 160], [169, 162], [172, 166], [174, 169], [170, 175], [163, 175],
  [156, 172], [149, 169], [142, 168], [134, 166], [122, 162], [110, 159], [107, 157], [108, 153],
];
const CALABRIA: Pts = [[181, 151], [185, 154], [189, 156], [193, 154], [196, 150], [199, 146], [201, 142], [194, 141], [188, 142], [184, 145]];
/** Tunisia (Cap Bon) and Libya: the African shore along the left edge and the bottom. */
const AFRICA: Pts = [
  [0, 168], [20, 171], [34, 167], [47, 165], [52, 168], [57, 173], [66, 170], [74, 168], [72, 175], [66, 180], [64, 187],
  [69, 194], [66, 203], [62, 212], [68, 222], [80, 226], [100, 231], [124, 238], [148, 241], [169, 246], [186, 256], [0, 256],
];
/** Egadi, Pantelleria, Lampedusa, Malta + Gozo, the Aeolian islands: [x, y, w] */
const ISLETS: readonly (readonly [number, number, number])[] = [
  [102, 154, 2], [98, 154, 1], [95, 173, 2], [110, 195, 2], [152, 188, 3], [149, 187, 2], [163, 144, 2], [166, 146, 1], [169, 143, 1],
];
/** Mount Etna, west of Catania */
const ETNA = { x: 166, y: 157 };

function limbDistance(x: number, y: number): number {
  return EARTH.r - Math.hypot(x - EARTH.cx, y - EARTH.cy);
}

function space(r: Raster): void {
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      r.set(x, y, mix(SP.top, SP.low, Math.min(1, y / 170)));
      const h = hash2(x, y, 11);
      if (h < 0.004) r.set(x, y, SP.star);
      else if (h < 0.012) r.set(x, y, SP.starDim);
    }
  }
  for (const [x, y] of [[200, 40], [96, 70], [236, 110], [150, 22]] as const) {
    r.set(x, y, SP.star);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) r.set(x + dx, y + dy, SP.starDim);
  }
}

function sun(r: Raster): void {
  const cx = 22;
  const cy = 34;
  for (let y = cy - 14; y <= cy + 14; y++) {
    for (let x = cx - 14; x <= cx + 14; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= 4.5) r.set(x, y, SP.sun);
      else if (d <= 6.5) r.set(x, y, SP.sunRing);
      else if (d <= 10 && (x + y) % 2 === 0) r.set(x, y, SP.sunGlow);
      else if (d <= 14 && (x % 2 === 0 && y % 2 === 0)) r.set(x, y, SP.sunGlow);
    }
  }
  rectR(r, cx - 20, cy, 41, 1, SP.sunRing); // lens flare streak
  rectR(r, cx, cy - 12, 1, 25, SP.sunGlow);
}

function earth(r: Raster): void {
  const land = new Mask(S, S);
  for (const p of [SICILY, CALABRIA]) land.poly(p, 1);
  for (const [x, y, w] of ISLETS) land.rect(x, y, w, 1, 1);
  land.poly(AFRICA, 2);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const d = limbDistance(x, y);
      if (d < -4) continue;
      if (d < 0) {
        const band = d >= -1 ? SP.atmo1 : d >= -2 ? SP.atmo2 : (x + y) % 2 === 0 ? SP.atmo3 : null;
        if (band) r.set(x, y, band);
        continue;
      }
      let col: string;
      const id = land.get(x, y);
      if (id) {
        const coastal = !land.get(x - 1, y) || !land.get(x + 1, y) || !land.get(x, y - 1) || !land.get(x, y + 1);
        const h = hash2(x >> 1, y >> 1, 7);
        // Sicily and Calabria green and sunlit, Africa a calmer desert so the island stands out
        if (id === 2) col = coastal ? SP.coast : h < 0.25 ? SP.sandShade : h < 0.85 ? SP.sand : SP.landDry;
        else col = coastal ? SP.coast : h < 0.25 ? SP.landDry : h < 0.6 ? SP.landLight : h < 0.92 ? SP.land : SP.landShade;
      } else {
        const nearLand = land.get(x - 2, y) || land.get(x + 2, y) || land.get(x, y - 2) || land.get(x, y + 2);
        col = nearLand ? SP.seaShallow : (x + 2 * y) % 7 === 0 ? SP.seaLight : SP.sea;
        // the sun's glint on the sea, low on the left
        // ordered dither (solid core, checker ring, sparse rim) so it reads as one calm reflection
        const g = Math.hypot((x - 90) / 2.2, y - 186);
        if (g < 2.5 || (g < 5 && (x + y) % 2 === 0) || (g < 7.5 && x % 2 === 0 && y % 2 === 0)) col = SP.glint;
      }
      if (d < 12) col = mix(col, SP.haze, (1 - d / 12) * 0.55); // haze towards the limb
      if (x > 196) col = mix(col, SP.night, Math.min(0.45, (x - 196) / 130)); // dusk on the far right, Sicily stays lit
      r.set(x, y, col);
    }
  }
}

function etna(r: Raster): void {
  const { x, y } = ETNA;
  rectR(r, x - 2, y + 1, 5, 1, SP.etna);
  rectR(r, x - 1, y, 3, 1, SP.etna);
  r.set(x, y - 1, SP.snow);
  r.set(x - 1, y, SP.snow);
  r.set(x, y, SP.snow);
}

/** Lumpy cloud banks (cx, cy, rx, ry): white tops, blue-grey bellies, kept off Sicily. */
function clouds(r: Raster): void {
  const banks = [[214, 166, 18, 3], [96, 210, 16, 3], [206, 222, 22, 4], [34, 192, 16, 3], [138, 212, 14, 2], [236, 196, 12, 2]] as const;
  for (const [cx, cy, rx, ry] of banks) {
    for (let y = cy - ry - 1; y <= cy + ry + 1; y++) {
      for (let x = cx - rx - 2; x <= cx + rx + 2; x++) {
        const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + hash2(x >> 1, y, 9) * 0.6;
        if (d > 1.05 || limbDistance(x, y) < 1) continue;
        r.set(x, y, y > cy + ry * 0.3 ? SP.cloudShade : SP.cloud);
      }
    }
  }
}

export function buildSpace(): Raster {
  const r = new Raster(S, S);
  space(r);
  sun(r);
  earth(r);
  etna(r);
  clouds(r);
  return r;
}
