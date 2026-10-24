/**
 * Road strips 120x128 (3 lanes of 40, seamless vertically): speckled asphalt, patched repairs,
 * cracks, a manhole, the dashed lane lines and the solid edge lines. centro = clean city asphalt,
 * stadio = patched and worn with yellow roadworks marks, mare = warm asphalt dusted with sand.
 */
import { Raster, hash2 } from '../hills/raster';
import { mix } from '../pixel';
import { RU, ZONE_PAL } from './colors';
import { LANE_W, ROAD_W, type RushZone } from './keys';

export const ROAD_H = 128;
const DASH = 16;
const PERIOD = 32;

function wrap(y: number): number {
  return ((y % ROAD_H) + ROAD_H) % ROAD_H;
}

export function buildRoad(zone: RushZone): Raster {
  const p = ZONE_PAL[zone];
  const r = new Raster(ROAD_W, ROAD_H);
  for (let y = 0; y < ROAD_H; y++) {
    for (let x = 0; x < ROAD_W; x++) {
      const h = hash2(x, y, 17);
      r.set(x, y, h < 0.07 ? p.asphLight : h > 0.93 ? p.asphShade : p.asph);
    }
  }
  const patches = zone === 'stadio' ? [[6, 10, 26, 30], [50, 70, 22, 40], [88, 20, 24, 18]] : [[48, 84, 20, 14]];
  for (const [x0, y0, w, h] of patches) {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const y = wrap(y0 + j);
        r.set(x0 + i, y, hash2(x0 + i, y, 23) < 0.1 ? p.asph : RU.asphPatch);
      }
    }
  }
  // hairline cracks
  for (const [x0, y0, len] of [[22, 40, 14], [96, 100, 10], [64, 8, 8]] as const) {
    let x = x0;
    for (let j = 0; j < len; j++) {
      r.set(x, wrap(y0 + j), p.asphDark);
      if (hash2(x0, j, 29) < 0.4) x += hash2(j, x0, 31) < 0.5 ? -1 : 1;
    }
  }
  // manhole cover in the middle lane
  for (let j = -3; j <= 3; j++) {
    for (let i = -3; i <= 3; i++) {
      if (i * i + j * j > 11) continue;
      const rim = i * i + j * j > 6;
      r.set(60 + i, wrap(56 + j), rim ? p.asphDark : (i + j) % 2 === 0 ? RU.tyreLight : p.asphShade);
    }
  }
  if (zone === 'mare') {
    for (let y = 0; y < ROAD_H; y++) for (let x = 0; x < ROAD_W; x++) if (hash2(x, y, 41) < 0.012) r.set(x, y, '#8a7262'); // sand
  }
  // lane dashes + solid edge lines
  const lane = zone === 'mare' ? mix(p.lane, RU.amber, 0.15) : p.lane;
  for (let k = 1; k < 3; k++) {
    const x = k * LANE_W - 1;
    for (let y = 0; y < ROAD_H; y++) {
      if (y % PERIOD >= DASH) continue;
      r.set(x, y, lane);
      r.set(x + 1, y, y % PERIOD === DASH - 1 ? RU.laneShade : lane);
    }
  }
  for (let y = 0; y < ROAD_H; y++) {
    r.set(2, y, RU.laneShade);
    r.set(ROAD_W - 3, y, RU.laneShade);
  }
  if (zone === 'stadio') {
    for (let y = 0; y < ROAD_H; y += 8) {
      r.set(5, y, '#d8b020'); // yellow temporary roadworks line
      r.set(5, y + 1, '#d8b020');
      r.set(5, y + 2, '#d8b020');
    }
  }
  return r;
}
