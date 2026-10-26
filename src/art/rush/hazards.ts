/**
 * Road hazards, top-down with the slight rear tilt: traffic cone, red-white roadworks barrier with
 * amber lamps, the roadworks pit with cones and a LAVORI sign, and the glossy puddle of spilled
 * Ciccio's sauce (2-frame shine) with the knocked-over sauce pot.
 */
import { Mask, paintMask } from '../hills/mask';
import { Raster, hash2, outlineRaster } from '../hills/raster';
import { rectR } from '../rampage/draw';
import { RU } from './colors';
import { drawCentred } from './font';

function cone(r: Raster, ox: number, oy: number): void {
  rectR(r, ox, oy + 8, 12, 3, RU.coneShade); // square rubber base
  rectR(r, ox, oy + 8, 12, 1, RU.cone);
  for (let y = 0; y < 9; y++) {
    const half = Math.floor(y / 2);
    const l = ox + 5 - half;
    const w = 2 + half * 2;
    const band = y === 3 || y === 4;
    rectR(r, l, oy + y, w, 1, band ? RU.white : RU.cone);
    r.set(l, oy + y, band ? RU.white : RU.coneLight);
    r.set(l + w - 1, oy + y, band ? RU.whiteShade : RU.coneShade);
  }
}

export function buildCone(): Raster {
  const r = new Raster(12, 12);
  cone(r, 0, 0);
  outlineRaster(r, RU.ink);
  return r;
}

/** One-lane barrier: red-white chevron board on two feet, an amber lamp at each end. */
export function buildBarrier(): Raster {
  const r = new Raster(40, 16);
  for (let y = 5; y < 11; y++) {
    for (let x = 1; x < 39; x++) r.set(x, y, Math.floor((x + y) / 4) % 2 === 0 ? RU.check : RU.white);
  }
  rectR(r, 1, 5, 38, 1, RU.checkLight);
  rectR(r, 1, 10, 38, 1, RU.checkDark);
  for (const x of [4, 32]) {
    rectR(r, x, 11, 4, 4, RU.rim); // feet
    rectR(r, x, 11, 4, 1, RU.rimLight);
  }
  for (const x of [2, 35]) {
    rectR(r, x, 1, 3, 4, RU.amber);
    r.set(x + 1, 2, RU.amberHot);
  }
  outlineRaster(r, RU.ink);
  return r;
}

/** `r` turned a quarter turn counter-clockwise: it shows as `r` once the side-view camera turns the world. */
function quarterTurn(r: Raster): Raster {
  const out = new Raster(r.h, r.w);
  for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) out.set(x, y, r.get(r.w - 1 - y, x));
  return out;
}

/**
 * 'rush-works' sheet 40x40: frame 0 the pit for the upright view, frame 1 the same pit turned a quarter
 * turn for the v9 side view, so its LAVORI sign reads left to right there (the game shows frame 1 when turned).
 */
export function buildWorks(): Raster[] {
  const pit = buildWorksPit();
  return [pit, quarterTurn(pit)];
}

/** 40x40 roadworks pit: torn asphalt, dark hole, dirt, cones at the corners, the LAVORI sign. */
function buildWorksPit(): Raster {
  const r = new Raster(40, 40);
  const m = new Mask(40, 40);
  m.rect(6, 6, 28, 18, 1);
  for (let x = 6; x < 34; x++) {
    if (hash2(x, 0, 21) < 0.4) m.set(x, 5, 1);
    if (hash2(x, 1, 21) < 0.4) m.set(x, 24, 1);
  }
  m.rect(10, 9, 20, 12, 2);
  m.ellipse(20, 15, 8, 4, 3);
  paintMask(m, r, {
    1: { light: '#a07a52', base: '#7e5a3a', shade: '#5a3e28' },
    2: { light: '#4a3426', base: '#3a281e', shade: '#2a1c14' },
    3: { light: '#241812', base: '#1a120e', shade: '#120c0a' },
  }, { shadeDepth: 1 });
  for (const [x, y] of [[8, 7], [28, 20], [13, 21], [31, 8]] as const) rectR(r, x, y, 2, 2, RU.asphLight); // asphalt chunks
  for (const [x, y] of [[0, 0], [28, 0], [0, 17], [28, 17]] as const) cone(r, x, y);
  // the sign faces the traffic coming from below
  rectR(r, 6, 28, 28, 10, RU.check);
  rectR(r, 7, 29, 26, 8, RU.white);
  drawCentred(r, 'LAVORI', 20, 31, RU.ink);
  rectR(r, 12, 38, 2, 2, RU.rim);
  rectR(r, 26, 38, 2, 2, RU.rim);
  outlineRaster(r, RU.ink);
  return r;
}

/** 32x24 spilled Ciccio's sauce: a flat splash with a wobbly edge and round droplets; the gloss slides (shine). */
export function buildPuddle(): Raster[] {
  return [0, 1].map((f) => {
    const r = new Raster(32, 24);
    const m = new Mask(32, 24);
    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 32; x++) {
        const d = ((x - 15.5) / 13) ** 2 + ((y - 12) / 7) ** 2 + 0.45 * hash2(x >> 2, y >> 2, 51);
        if (d < 1) m.set(x, y, 1);
      }
    }
    for (const [x, y] of [[2, 6], [29, 4], [27, 21], [4, 19], [16, 1]] as const) m.rect(x, y, 2, 2, 1);
    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 32; x++) {
        if (!m.get(x, y)) continue;
        const rim = !m.get(x, y - 1) || !m.get(x, y + 1) || !m.get(x - 1, y) || !m.get(x + 1, y);
        r.set(x, y, rim ? RU.sauceShade : RU.sauce);
      }
    }
    const dx = f * 4;
    for (const [x, y, c] of [[8, 9, RU.sauceLight], [9, 8, RU.white], [10, 8, RU.white], [11, 8, RU.sauceLight], [12, 8, RU.sauceLight], [7, 10, RU.sauceLight], [19, 13, RU.sauceLight], [20, 13, RU.white]] as const) {
      if (m.get(x + dx, y)) r.set(x + dx, y, c);
    }
    outlineRaster(r, RU.sauceDark);
    return r;
  });
}
