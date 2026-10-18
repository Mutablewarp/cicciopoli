/** Breakable props of the rampage street: brick wall block (4 crack stages), crate, steel drum. */
import { HC } from '../hills/colors';
import { Raster, hash2 } from '../hills/raster';
import { RC } from './colors';
import { pathR, rectR } from './draw';

type Pt = readonly [number, number];

/** Masonry courses: rows y0..y1 inside the ink frame, joints offset every other course. */
const COURSES: readonly (readonly [number, number])[] = [[1, 3], [5, 7], [9, 11], [13, 14]];

function wall(r: Raster, salt: number): void {
  const n = 15;
  for (let y = 0; y <= n; y++) {
    for (let x = 0; x <= n; x++) {
      if (x === 0 || y === 0 || x === n || y === n) r.set(x, y, RC.ink);
      else r.set(x, y, RC.brickMortar);
    }
  }
  COURSES.forEach(([y0, y1], c) => {
    const offset = c % 2 === 0 ? 0 : 3;
    for (let y = y0; y <= y1; y++) {
      for (let x = 1; x < n; x++) {
        const u = (x - 1 + offset) % 7;
        if (u === 6) continue;
        const brickId = Math.floor((x - 1 + offset) / 7);
        let col: string = hash2(brickId, c, salt) < 0.22 ? RC.brickSpeck : RC.brick;
        if (y === y0) col = RC.brickLight;
        else if (y === y1) col = RC.brickShade;
        else if (u === 0) col = RC.brickLight;
        r.set(x, y, col);
      }
    }
  });
}

const CRACKS: readonly (readonly (readonly Pt[])[])[] = [
  [[[8, 1], [7, 4], [9, 7], [8, 9]]],
  [[[8, 1], [7, 4], [9, 7], [8, 9], [6, 12], [7, 14]], [[9, 7], [12, 8], [14, 9]]],
  [
    [[8, 1], [7, 4], [9, 7], [8, 9], [6, 12], [7, 14]],
    [[9, 7], [12, 8], [14, 9]],
    [[3, 1], [4, 4], [3, 7], [5, 9]],
    [[12, 1], [11, 4], [13, 6]],
    [[8, 9], [11, 11], [13, 14]],
  ],
];

/** Bricks knocked out of the wall (top-left x, y of a 6x3 brick) per stage. */
const MISSING: readonly (readonly Pt[])[] = [[], [[2, 5]], [[2, 5], [9, 9], [10, 1]]];

/** Frames 0-3: intact, then progressively cracked and chipped (3 punches break it). */
export function buildBrick(): Raster[] {
  const frames: Raster[] = [];
  for (let stage = 0; stage < 4; stage++) {
    const r = new Raster(16, 16);
    wall(r, 7);
    if (stage > 0) {
      for (const [x, y] of MISSING[stage - 1]) {
        rectR(r, x, y, 6, 3, RC.ink);
        rectR(r, x, y, 6, 1, RC.brickMortar);
      }
      for (const path of CRACKS[stage - 1]) pathR(r, path, RC.ink);
    }
    if (stage === 3) {
      for (const [x, y] of [[14, 1], [14, 2], [13, 1], [1, 14], [2, 14]] as const) r.set(x, y, RC.brickLight);
      r.set(15, 0, null);
      r.set(0, 15, null);
      r.set(15, 1, RC.ink);
    }
    frames.push(r);
  }
  return frames;
}

const NAIL = HC.nail;

/** Wooden shipping crate with steel corner brackets and a stencilled arrow. */
export function buildCrate(): Raster {
  const r = new Raster(16, 16);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if ((x === 0 || x === 15) && (y === 0 || y === 15)) continue;
      if (x === 0 || y === 0 || x === 15 || y === 15) { r.set(x, y, RC.ink); continue; }
      const batten = x <= 2 || x >= 13;
      let col: string;
      if (batten) col = x === 1 ? HC.woodLight : x === 14 ? HC.woodDark : HC.woodShade;
      else if ((y - 1) % 4 === 3) col = HC.woodDark;
      else col = (y - 1) % 4 === 0 ? HC.woodLight : hash2(x, y, 12) < 0.12 ? HC.woodShade : HC.wood;
      r.set(x, y, col);
    }
  }
  for (const [x, y] of [[1, 1], [12, 1], [1, 12], [12, 12]] as const) {
    rectR(r, x, y, 3, 3, RC.steelLight);
    rectR(r, x + 2, y, 1, 3, RC.steelShade);
    rectR(r, x, y + 2, 3, 1, RC.steelShade);
    r.set(x + 1, y + 1, NAIL);
  }
  // stencilled "this way up" arrow
  for (const [x, y] of [[7, 4], [6, 5], [7, 5], [8, 5], [5, 6], [6, 6], [7, 6], [8, 6], [9, 6], [7, 7], [7, 8], [7, 9], [7, 10]] as const) r.set(x, y, RC.white);
  for (const [x, y] of [[8, 5], [9, 6], [8, 6], [7, 10]] as const) r.set(x, y, RC.whiteShade);
  return r;
}

/** Steel drum: pink-magenta paint, rolled ribs, hazard band and a lime bung. */
export function buildBarrel(): Raster {
  const r = new Raster(16, 16);
  const tone = [RC.ink, RC.drumLight, RC.drumLight, RC.drum, RC.drum, RC.drum, RC.drum, RC.drum, RC.drum, RC.drumShade, RC.drumShade, RC.drumDark, RC.drumDark, RC.ink];
  for (let y = 0; y < 16; y++) {
    for (let x = 1; x <= 14; x++) {
      const bulge = y === 0 || y === 15;
      if (bulge && (x === 1 || x === 14)) continue;
      r.set(x, y, y === 0 || y === 15 ? RC.ink : tone[x - 1]);
    }
  }
  rectR(r, 2, 1, 12, 1, RC.drumLight);
  rectR(r, 4, 2, 8, 1, RC.drumShade);
  r.set(11, 1, RC.lime);
  r.set(12, 1, RC.limeShade);
  for (const y of [4, 12]) {
    rectR(r, 1, y, 14, 1, RC.drumDark);
    rectR(r, 2, y + 1, 11, 1, RC.drumLight);
  }
  for (let y = 7; y <= 9; y++) {
    for (let x = 2; x <= 13; x++) r.set(x, y, (x + y) % 4 < 2 ? RC.white : RC.ink);
  }
  rectR(r, 1, 6, 14, 1, RC.ink);
  rectR(r, 1, 10, 14, 1, RC.ink);
  return r;
}
