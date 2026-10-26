/**
 * v9 transition strips (BRIEF §8 "### v9" point 2, zoneKey(zone, 'blendL' | 'blendR'), 128x256, centro and
 * stadio only): the side strip easing from this zone into the NEXT one, drawn once just before the cross
 * street. Row 0 meets the cross street (the next zone above it), the bottom rows end in a vicolo crossing
 * the strip, a proper edge over whatever row of this zone's strip lies below. Top part in the next
 * zone's look, bottom part in this zone's, the sidewalk dithering from one paving to the other.
 *   centro -> stadio  left: liberty palazzi, a plain post-war palazzo, the stadium forecourt (pines,
 *                     rosanero bunting, ticket booth); right: liberty palazzi and a ficus, a palazzo of
 *                     Viale del Fante, the Favorita pines with the roadworks starting on the sidewalk.
 *   stadio -> mare    left: the end of the stands (the curva), Mediterranean scrub with a car park and
 *                     palms, the first cliffs and the sea; right: the park and the roadworks, a cream
 *                     palazzo, the first pastel houses of Terrasini with palms and lit lamps.
 */
import { Raster, hash2 } from '../hills/raster';
import { shade } from '../pixel';
import { RU, ZONE_PAL } from './colors';
import { GREEN_SHUTTER, LIBERTA } from './centro';
import { COAST_D, ROCK, ROCK_LIGHT, ROCK_SHADE, SAND, deepAt, seaAt } from './mare';
import { pines, roadworks, stadium } from './stadio';
import { FACADE_D, STRIP_H, STRIP_W, Strip, facade, lamp, palazzi, palm, paving, sidewalk, tree } from './street';

/** the vicolo across the bottom rows */
const ALLEY_Y = 248;
/** rows over which the sidewalk paving dithers from the next zone's to this zone's */
const MIX = 24;
const PINK = '#c45888';
const SEAT_BLACK = '#26222a';

type BlendZone = 'centro' | 'stadio';

/** Paving + sidewalk of both zones, dithered round `cut`; the next zone's above. */
function ground(zone: BlendZone, side: 'L' | 'R', cut: number): Strip {
  const next = zone === 'centro' ? 'stadio' : 'mare';
  const pave = { centro: '#9a9282', stadio: '#8e8a84', mare: '#a88a76' } as const;
  const a = new Strip(side, ZONE_PAL[zone]);
  const b = new Strip(side, ZONE_PAL[next]);
  for (const [s, z] of [[a, zone], [b, next]] as const) {
    sidewalk(s);
    paving(s, 12, FACADE_D, 0, STRIP_H, pave[z]);
  }
  for (let y = 0; y < cut + MIX; y++) {
    const t = (y - (cut - MIX)) / (2 * MIX);
    for (let x = 0; x < STRIP_W; x++) if (t < 0 || hash2(x, y, 61) > t) a.r.set(x, y, b.r.get(x, y));
  }
  return a;
}

/** A vicolo crossing the strip: asphalt, the shadow of the building above, the sidewalk running on. */
function alley(s: Strip): void {
  for (let y = ALLEY_Y; y < STRIP_H; y++) {
    for (let d = FACADE_D - 8; d < STRIP_W; d++) s.px(d, y, y < ALLEY_Y + 2 ? '#323238' : hash2(d, y, 62) < 0.1 ? '#4c4c52' : '#424248');
  }
  s.rect(FACADE_D - 8, ALLEY_Y, STRIP_W, 1, RU.bodyDark);
}

/** Rosanero bunting strung over the forecourt, a ticket booth, the stadium's outer wall at the top. */
function forecourt(s: Strip, y0: number, len: number): void {
  paving(s, FACADE_D - 8, STRIP_W, y0, len, '#8e8a84');
  for (let d = FACADE_D; d < STRIP_W; d += 2) {
    s.px(d, y0 + 18, Math.floor(d / 4) % 2 === 0 ? PINK : SEAT_BLACK);
    s.px(d, y0 + 50, Math.floor(d / 4) % 2 === 0 ? SEAT_BLACK : PINK);
  }
  s.rect(FACADE_D + 4, y0 + 26, 12, 10, '#e4e0d8'); // ticket booth
  s.rect(FACADE_D + 4, y0 + 26, 12, 1, RU.white);
  s.rect(FACADE_D + 4, y0 + 30, 2, 4, RU.glassDark);
  s.rect(FACADE_D + 4, y0 + 35, 12, 1, PINK);
  for (const [d, y] of [[56, y0 + 8], [92, y0 + 34], [112, y0 + 12]] as const) tree(s, d, y, 8, '#2e5a2c');
  for (let y = y0; y < y0 + 6; y++) for (let d = 24; d < STRIP_W; d++) s.px(d, y, d === 24 ? '#5a5862' : y % 16 < 2 ? '#7a7880' : '#8a8890');
}

/** The curva: the stands end in a concrete wall, the stair towers at its corners. */
function curvaEnd(s: Strip, y0: number): void {
  for (let y = y0; y < y0 + 8; y++) for (let d = 24; d < STRIP_W; d++) s.px(d, y, y === y0 ? '#5a5862' : (d % 12 === 0 ? '#7a7880' : '#8a8890'));
  for (const d of [30, 96]) {
    s.rect(d, y0 - 4, 10, 12, '#9a9ca3');
    s.rect(d, y0 - 4, 10, 1, '#b8bac0');
    s.rect(d + 3, y0 - 1, 4, 4, '#5a5862');
  }
}

/** Sun-baked scrub with a car park, then the first cliffs: the sea widens towards the cross street. */
function scrubToCoast(s: Strip, y0: number, len: number): void {
  for (let y = y0; y < y0 + len; y++) {
    for (let d = FACADE_D - 8; d < STRIP_W; d++) s.px(d, y, hash2(d, y, 63) < 0.25 ? '#7a7444' : hash2(d, y, 64) < 0.1 ? '#5e6a34' : '#6a6a3c');
  }
  // car park on the scrub: bays and three parked cars
  for (let k = 0; k < 6; k++) s.rect(36, y0 + 64 + k * 10, 14, 1, '#d8d0c0');
  for (const [k, c] of [[0, '#7a3a34'], [2, '#3a4a6a'], [3, '#b8b4a8']] as const) {
    s.rect(38, y0 + 66 + k * 10, 10, 7, c);
    s.rect(41, y0 + 67 + k * 10, 4, 5, shade(c, 0.15));
  }
  for (const [d, y] of [[70, y0 + 70], [100, y0 + 100], [86, y0 + 120]] as const) tree(s, d, y, 5, '#5a6a30');
  palm(s, 17, y0 + 84);
  // the coast: the cliff edge sweeps from the strip's far edge (no sea) to the mare strip's coast at the cross street
  const coastLen = 72;
  for (let y = y0; y < y0 + coastLen; y++) {
    const t = (y0 + coastLen - y) / coastLen;
    const edge = Math.round(STRIP_W - t * (STRIP_W - COAST_D) + 3 * Math.sin(y * 0.4));
    s.rect(12, y, 3, 1, y % 12 === 0 ? RU.whiteShade : '#e8dcc8'); // promenade parapet starts
    for (let d = 15; d < STRIP_W; d++) {
      if (d < edge - 10) continue;
      s.px(d, y, d < edge ? (d > edge - 3 ? ROCK_SHADE : hash2(d, y, 65) < 0.2 ? ROCK_LIGHT : ROCK) : d < edge + 2 ? RU.white : seaAt(d, y, deepAt(d, y)));
    }
    if (y > y0 + 20 && y < y0 + 34) for (let d = edge - 12; d < edge - 4; d++) s.px(d, y, SAND); // a little cove
  }
}

/** Pastel Terrasini houses with palms and lit lamps (mare look). */
function pastelHouses(s: Strip, y0: number): void {
  facade(s, { y: y0, len: 44, colour: '#f2d088', floors: 2, shutter: '#3a7a8a', balcony: true, awning: '#2a6ad0', roof: 'terrace' });
  facade(s, { y: y0 + 44, len: 52, colour: '#e8a8c0', floors: 2, shutter: '#3a7a8a', balcony: false, awning: null, roof: 'terrace' });
  for (const y of [y0 + 14, y0 + 62]) palm(s, 17, y);
}

export function buildBlend(zone: BlendZone, side: 'L' | 'R'): Raster {
  if (zone === 'centro') {
    const s = ground(zone, side, 112);
    if (side === 'L') {
      forecourt(s, 0, 64);
      facade(s, { y: 64, len: 48, colour: '#d4c4b0', floors: 4, shutter: '#5a6a5a', balcony: false, awning: null, roof: 'terrace' });
      palazzi(s, 112, ALLEY_Y, 7, LIBERTA);
      tree(s, 16, 160, 6, '#3a6e30');
    } else {
      pines(s, 0, 72, 12);
      roadworks(s, 4, 56);
      facade(s, { y: 72, len: 48, colour: '#d4c4b0', floors: 4, shutter: '#5a6a5a', balcony: true, awning: '#3a5aa0', roof: 'terrace' });
      facade(s, { y: 120, len: 64, colour: '#e4b0a0', floors: 3, shutter: GREEN_SHUTTER, balcony: true, awning: '#b8402e', roof: 'tiles' });
      facade(s, { y: 184, len: ALLEY_Y - 184, colour: '#ead8b0', floors: 3, shutter: GREEN_SHUTTER, balcony: true, awning: '#2e6a4a', roof: 'terrace' });
      tree(s, 16, 200, 6, '#3a6e30');
    }
    alley(s);
    for (let y = 24; y < ALLEY_Y; y += 64) lamp(s, y, false);
    return s.r;
  }
  const s = ground(zone, side, 136);
  if (side === 'L') {
    scrubToCoast(s, 0, 136);
    stadium(s, 144, ALLEY_Y - 144);
    for (let y = 136; y < 144; y++) for (let d = FACADE_D - 8; d < STRIP_W; d++) s.px(d, y, hash2(d, y, 66) < 0.2 ? '#7a7444' : '#6a6a3c');
    curvaEnd(s, 144);
  } else {
    pastelHouses(s, 0);
    facade(s, { y: 96, len: 56, colour: '#e8dcc0', floors: 3, shutter: '#5a6a5a', balcony: true, awning: '#d8642e', roof: 'terrace' });
    pines(s, 152, ALLEY_Y - 152, 12);
    roadworks(s, 160, 64);
  }
  alley(s);
  for (let y = 8; y < ALLEY_Y; y += 48) lamp(s, y, y < 136);
  return s.r;
}
