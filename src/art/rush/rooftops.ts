/**
 * Old-town roofs seen from above, for the fillers beyond the side strips in wide views (./town tiles
 * them into 256x256 grids of varied blocks). Here the primitives and one hand-made 64x64 block of
 * old Palermo, seamless both ways: a hipped and a gabled terracotta roof, terraces
 * paved in cotto with water tanks, a stair hut and washing lines, a courtyard with an orange tree
 * and a church with a majolica dome (yellow, green and blue tiles, as on Palermo's churches).
 * Streets run along the right and bottom edges; buildings cast short shadows to the bottom-right.
 * The roof primitives take a RoofLook so ./town reuses them for the Terrasini old town.
 */
import { Raster, hash2 } from '../hills/raster';
import { mix, shade } from '../pixel';
import { ZONE_PAL } from './colors';

const N = 64;
const P = ZONE_PAL.centro;
const PALERMO = {
  roof: P.roof,
  roofLight: P.roofLight,
  roofShade: P.roofShade,
  street: '#5a5650',
  streetLight: '#625e57',
  kerb: '#6e6a62',
  shadow: '#403c38',
  alley: '#38342f',
  cotto: '#8e6450',
  cottoJoint: '#7a5444',
  cement: '#7c776c',
  cementJoint: '#6c675e',
  parapet: '#b0a694',
  parapetShade: '#6a6258',
  hut: '#b8ac94',
  hutShade: '#8e846e',
  tank: '#c4c4be',
  tankLight: '#deded8',
  tankBlue: '#4a70a8',
  yard: '#857a6a',
  leaf: '#335c2c',
  leafLight: '#4a7a3a',
  orange: '#e0902c',
  majYellow: '#d4a83c',
  majGreen: '#2e7a62',
  majBlue: '#3a5a98',
  lantern: '#d8ccb0',
  grass: '#46603a',
  frondTip: '#2a4422',
  lime: '#bcb6a8',
  limeJoint: '#a29c90',
  bloom: '#b4407a',
  bloomLight: '#cc5a94',
  bloomDark: '#7e2c56',
};
/** Colours of an old-town block (Palermo here; ./town recolours it for Terrasini). */
export type RoofLook = Readonly<Record<keyof typeof PALERMO, string>>;
export const CENTRO_LOOK: RoofLook = PALERMO;
const C = CENTRO_LOOK;

export type Box = readonly [x: number, y: number, w: number, h: number];

export const set = (r: Raster, x: number, y: number, c: string): void => r.set(((x % N) + N) % N, ((y % N) + N) % N, c);
export const fill = (r: Raster, [x, y, w, h]: Box, c: string): void => {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(r, x + i, y + j, c);
};

/** Ground: the streets on the right and bottom edges, the narrow vicoli, the courtyard. */
function ground(r: Raster): void {
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) set(r, x, y, hash2(x, y, 31) < 0.12 ? C.streetLight : C.street);
  fill(r, [0, N - 1, N, 1], C.kerb); // pavement along the next block
  fill(r, [N - 1, 0, 1, N], C.kerb);
  fill(r, [28, 0, 2, 58], C.alley);
  fill(r, [0, 22, 28, 2], C.alley);
  fill(r, [30, 20, 14, 14], C.yard);
}

/** Shadows the buildings cast to the bottom-right (light from the top-left). */
export function shadows(r: Raster, boxes: readonly Box[], k: RoofLook): void {
  for (const [x, y, w, h] of boxes) fill(r, [x + 2, y + 2, w, h], k.shadow);
}

/** Hipped tile roof: four slopes lit from the top-left, tile courses, light hip lines. */
export function hipped(r: Raster, [x0, y0, w, h]: Box, k: RoofLook): void {
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const dt = j;
      const db = h - 1 - j;
      const dl = i;
      const dr = w - 1 - i;
      const m = Math.min(dt, db, dl, dr);
      const vertical = m === dt || m === db;
      let c = m === dt ? k.roofLight : m === dl ? k.roof : m === db ? k.roofShade : mix(k.roof, k.roofShade, 0.6);
      if (vertical ? j % 3 === 2 : i % 3 === 2) c = shade(c, -0.12);
      const hip = [dt, db, dl, dr].filter((d) => d === m).length > 1;
      const ridge = m === dt && db - dt === 1;
      if ((hip || ridge) && m > 0) c = shade(k.roofLight, 0.12);
      set(r, x0 + i, y0 + j, c);
    }
  }
}

/** Gable roof with the ridge running down the middle: lit left slope, shaded right slope. */
export function gable(r: Raster, [x0, y0, w, h]: Box, k: RoofLook): void {
  const ridge = Math.floor(w / 2);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      let c = i < ridge ? k.roofLight : k.roofShade;
      if (i % 3 === 0) c = shade(c, -0.1);
      else if ((j + (Math.floor(i / 3) % 2) * 2) % 4 === 0) c = shade(c, -0.06);
      if (i === ridge || i === ridge - 1) c = i === ridge ? k.roof : shade(k.roofLight, 0.12);
      set(r, x0 + i, y0 + j, c);
    }
  }
  fill(r, [x0, y0 + h - 1, w, 1], shade(k.roofShade, -0.2)); // eaves
}

/** Flat terrace paved in squares, with a parapet lit on the top-left. */
export function terrace(r: Raster, [x0, y0, w, h]: Box, base: string, joint: string, k: RoofLook): void {
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) set(r, x0 + i, y0 + j, i % 4 === 0 || j % 4 === 0 ? joint : hash2(x0 + i, y0 + j, 32) < 0.06 ? joint : base);
  }
  fill(r, [x0, y0, w, 1], k.parapet);
  fill(r, [x0, y0, 1, h], k.parapet);
  fill(r, [x0, y0 + h - 1, w, 1], k.parapetShade);
  fill(r, [x0 + w - 1, y0, 1, h], k.parapetShade);
}

/** Round water tank from above (5x5) with its shadow. */
export function tank(r: Raster, x: number, y: number, c: string, k: RoofLook): void {
  fill(r, [x + 1, y + 2, 5, 4], k.shadow);
  fill(r, [x + 1, y, 3, 5], c);
  fill(r, [x, y + 1, 5, 3], c);
  set(r, x + 1, y + 1, k.tankLight);
  set(r, x + 2, y + 1, k.tankLight);
}

/** Washing line with three pieces of laundry. */
export function laundry(r: Raster, x: number, y: number, len: number, k: RoofLook): void {
  for (let i = 0; i < len; i++) set(r, x + i, y, k.parapetShade);
  for (const [c, i] of [['#c84a40', 1], ['#e8e4d8', 4], ['#4a7ac0', 8], ['#d8b040', 11]] as const) {
    if (i + 2 <= len) fill(r, [x + i, y + 1, 2, 2], c);
  }
}

/** Citrus tree in the courtyard: round crown, light top-left, a few oranges (lemons in Terrasini). */
export function orangeTree(r: Raster, cx: number, cy: number, k: RoofLook): void {
  for (let j = -5; j <= 5; j++) {
    for (let i = -5; i <= 5; i++) {
      const q = (i * i + j * j) / 26;
      if (q > 1) continue;
      set(r, cx + i + 2, cy + j + 2, k.shadow);
    }
  }
  for (let j = -5; j <= 5; j++) {
    for (let i = -5; i <= 5; i++) {
      const q = (i * i + j * j) / 26;
      if (q > 1 || (q > 0.75 && hash2(i, j, 33) < 0.35)) continue;
      set(r, cx + i, cy + j, i + j < -3 ? k.leafLight : q > 0.6 && i + j > 2 ? shade(k.leaf, -0.2) : k.leaf);
    }
  }
  for (const [i, j] of [[-2, -1], [2, -3], [1, 2], [-3, 2]] as const) set(r, cx + i, cy + j, k.orange);
}

/** Church with a majolica dome: cotto roof, drum, tiles in ribbed bands, the lantern on top. */
function church(r: Raster, box: Box): void {
  const [x0, y0, w, h] = box;
  terrace(r, box, C.cotto, C.cottoJoint, C);
  const cx = x0 + Math.floor(w / 2);
  const cy = y0 + Math.floor(h / 2);
  const R = 7;
  for (let j = -R - 1; j <= R + 1; j++) {
    for (let i = -R - 1; i <= R + 1; i++) {
      const d = Math.hypot(i, j);
      if (d > R + 1.2) continue;
      if (d > R + 0.2) {
        set(r, cx + i, cy + j, C.parapet); // the drum
        continue;
      }
      // eight gores alternating green and yellow, a blue band round the foot
      const gore = Math.floor(((Math.atan2(j, i) + Math.PI) / (2 * Math.PI)) * 8 + 0.5) % 8;
      const base = d > R - 1.5 ? C.majBlue : gore % 2 === 0 ? C.majGreen : C.majYellow;
      const lit = i + j < -R * 0.5;
      const dark = i + j > R * 0.6;
      set(r, cx + i, cy + j, lit ? shade(base, 0.2) : dark ? shade(base, -0.25) : base);
    }
  }
  fill(r, [cx - 1, cy - 1, 3, 3], C.lantern);
  set(r, cx - 1, cy - 1, '#f0e8d0');
}

/** The hand-made Palermo block with the majolica church (./town hazes it with the rest of the filler). */
export function palermoBlock(): Raster {
  const r = new Raster(N, N);
  ground(r);
  const A: Box = [0, 0, 28, 22];
  const B: Box = [30, 0, 28, 18];
  const D: Box = [46, 20, 12, 14];
  const Cg: Box = [0, 24, 26, 34];
  const E: Box = [28, 36, 12, 22];
  const F: Box = [42, 36, 16, 22];
  shadows(r, [A, B, D, Cg, E, F], C);
  hipped(r, A, C);
  terrace(r, B, C.cotto, C.cottoJoint, C);
  fill(r, [48, 8, 7, 6], C.hut); // stair hut
  fill(r, [48, 13, 7, 1], C.hutShade);
  fill(r, [54, 8, 1, 6], C.hutShade);
  fill(r, [50, 14, 3, 1], C.shadow);
  tank(r, 33, 3, C.tank, C);
  tank(r, 40, 3, C.tankBlue, C);
  laundry(r, 33, 11, 13, C);
  terrace(r, D, C.cement, C.cementJoint, C);
  tank(r, 49, 23, C.tank, C);
  orangeTree(r, 36, 26, C);
  gable(r, Cg, C);
  terrace(r, E, C.cement, C.cementJoint, C);
  laundry(r, 30, 42, 9, C);
  tank(r, 31, 49, C.tankBlue, C);
  church(r, F);
  return r;
}
