/**
 * Zone 2 ZONA STADIO (Viale del Fante). Left: the stadium, its tiers striped pink-and-black
 * (rosanero) with grey stairways, the stand roof and the floodlight towers. Right: roadworks on the
 * sidewalk (barrier fence, gravel pile, a mini digger), the umbrella pines of the Favorita park and
 * the Ciccio's Stadio storefront. Filler: the Favorita park (pines, clearings, gravel avenues).
 */
import { Raster, hash2 } from '../hills/raster';
import { shade } from '../pixel';
import { rectR } from '../rampage/draw';
import { RU, ZONE_PAL } from './colors';
import { streetLife } from './life';
import { FACADE_D, STOREFRONT, STRIP_H, STRIP_W, Strip, ciccios, facade, hedges, lamp, paving, sidewalk, tree } from './street';

const PINK = '#c45888';
const PINK_DARK = '#94406c';
const SEAT_BLACK = '#26222a';
const CONCRETE = '#8a8890';
const PINE = '#2e5a2c';
/** the rosanero shirts of the fans on the stadium sidewalk */
const FANS = [PINK, SEAT_BLACK, PINK, '#f0ece0'] as const;

/** The stands over rows y0..y0+len (the whole strip by default; the stadio -> mare blend ends them early). */
export function stadium(s: Strip, y0 = 0, len = STRIP_H): void {
  paving(s, 12, 24, y0, len, '#8e8a84');
  for (let y = y0; y < y0 + len; y++) {
    for (let d = 24; d < STRIP_W; d++) {
      let c: string;
      if (d < 32) c = d === 24 ? shade(CONCRETE, -0.3) : (y % 16 < 2 ? shade(CONCRETE, -0.2) : CONCRETE); // outer wall
      else if (d < 104) {
        const row = Math.floor((d - 32) / 3);
        const aisle = y % 32 < 3;
        const lit = 0.04 * Math.floor((d - 32) / 12);
        c = aisle ? '#9c9aa2' : (d - 32) % 3 === 2 ? '#3a3640' : row % 2 === 0 ? shade(PINK, lit - 0.08) : SEAT_BLACK;
        if (!aisle && row % 2 === 0 && hash2(d, y, 15) < 0.05) c = PINK_DARK; // fans
      } else if (d < 108) c = '#3a3640';
      else c = (d - 108) % 6 === 0 ? '#76787f' : y % 8 === 0 ? '#86888f' : '#9a9ca3'; // stand roof
      s.px(d, y, c);
    }
  }
  // floodlight towers on the roof edge: lamp banks lit even by day
  for (const y of [40, 168].filter((row) => row - 6 >= y0 && row + 8 <= y0 + len)) {
    s.rect(104, y - 2, 6, 6, '#5a5862');
    s.rect(112, y - 6, 12, 14, RU.bodyDark);
    for (let j = 0; j < 12; j += 3) for (let i = 0; i < 10; i += 3) s.rect(113 + i, y - 5 + j, 2, 2, j === 0 ? RU.white : RU.amberHot);
  }
  // pink-and-black banners hanging on the outer wall
  for (const y of [8, 72, 136, 200].filter((row) => row >= y0 && row + 10 <= y0 + len)) {
    for (let j = 0; j < 10; j++) s.rect(25, y + j, 6, 1, j % 4 < 2 ? PINK : SEAT_BLACK);
  }
}

/** Roadworks on the sidewalk band: plastic fence, gravel heap, a small yellow digger. */
export function roadworks(s: Strip, y0: number, len: number): void {
  for (let y = y0; y < y0 + len; y++) {
    for (let d = 12; d < FACADE_D; d++) s.px(d, y, hash2(d, y, 19) < 0.3 ? '#7a5e40' : '#94744e');
    s.px(12, y, Math.floor(y / 4) % 2 === 0 ? RU.check : RU.white);
    s.px(13, y, Math.floor(y / 4) % 2 === 0 ? RU.checkDark : RU.whiteShade);
  }
  for (let j = -6; j <= 6; j++) for (let i = 0; i < 7 - Math.abs(j); i++) s.px(14 + i, y0 + 14 + j, i > 4 - Math.abs(j) / 2 ? '#b8a07a' : '#a08a66');
  const dy = y0 + len - 22;
  s.rect(14, dy, 7, 12, '#e8b020'); // digger body
  s.rect(14, dy, 7, 1, '#ffd860');
  s.rect(15, dy + 2, 4, 4, RU.glass);
  s.rect(17, dy + 12, 2, 6, '#c08a10'); // arm + bucket
  s.rect(15, dy + 18, 5, 3, RU.rim);
}

export function pines(s: Strip, y0: number, len: number, d0: number): void {
  for (let y = y0; y < y0 + len; y++) for (let d = d0; d < STRIP_W; d++) s.px(d, y, hash2(d, y, 13) < 0.2 ? '#4a5a34' : '#3e4e2e');
  for (let k = 0; k < len / 12; k++) {
    const y = y0 + 6 + k * 12 + Math.floor(hash2(k, y0, 3) * 6);
    tree(s, d0 + 14 + Math.floor(hash2(k, d0, 5) * 60), y, 9, PINE);
    tree(s, d0 + 50 + Math.floor(hash2(k, d0, 7) * 40), y + 6, 8, shade(PINE, 0.08));
  }
  hedges(s, y0, len, d0 + 2);
}

/** `shop` false: the plain strip, the Ciccio's Stadio storefront left out (the game draws it once). */
export function stadioSide(side: 'L' | 'R', shop = true): Raster {
  const s = new Strip(side, ZONE_PAL.stadio);
  sidewalk(s);
  if (side === 'L') {
    stadium(s);
    streetLife(s, 41, [], FANS); // fans walking to the stadium
  } else {
    paving(s, 12, FACADE_D, 0, STRIP_H, '#8e8a84');
    pines(s, 0, 96, 12);
    roadworks(s, 4, 80);
    facade(s, { y: 96, len: 80, colour: '#d4c4b0', floors: 4, shutter: '#5a6a5a', balcony: true, awning: null, roof: 'terrace' });
    if (shop) ciccios(s, STOREFRONT.stadio.y, STOREFRONT.stadio.len);
    pines(s, 176, 80, 12);
    roadworks(s, 184, 64);
    streetLife(s, 42, [[STOREFRONT.stadio.y, STOREFRONT.stadio.len]]);
  }
  for (let y = 24; y < STRIP_H; y += 64) lamp(s, y, false);
  return s.r;
}

/** Side of the Favorita park filler and of its tree grid cells. */
const PARK = 256;
const PARK_CELL = 32;
const CLEARING = 0.12;
const AVENUE_W = 5;
/**
 * Per filler: hash seed and the gravel avenues crossing the park (column, row). The left and right
 * parks differ, so side by side at the same height they never mirror.
 */
const PARKS = { L: { seed: 0, x: 92, y: 172 }, R: { seed: 50, x: 30, y: 60 } } as const;

/** Round pine crown wrapping round the park tile, lit top-left. */
function crown(r: Raster, cx: number, cy: number, rad: number, c: string): void {
  for (let j = -rad; j <= rad; j++) {
    for (let i = -rad; i <= rad; i++) {
      const q = (i * i + j * j) / (rad * rad);
      if (q > 1 || (q > 0.8 && hash2(i + cx, j + cy, 3) < 0.4)) continue;
      const col = i + j < -rad / 2 ? shade(c, 0.18) : q > 0.55 && hash2(i, j, 5) < 0.5 ? shade(c, -0.22) : c;
      rectR(r, (cx + i + PARK) % PARK, (cy + j + PARK) % PARK, 1, 1, col);
    }
  }
}

/** 256x256 seamless Favorita park: umbrella pines on a jittered grid, a few clearings, two gravel avenues. */
export function stadioFill(side: 'L' | 'R'): Raster {
  const park = PARKS[side];
  const r = new Raster(PARK, PARK);
  for (let y = 0; y < PARK; y++) for (let x = 0; x < PARK; x++) r.set(x, y, hash2(x, y, 13) < 0.2 ? '#4a5a34' : '#3e4e2e');
  for (let k = 0; k < PARK; k++) {
    for (let i = 0; i < AVENUE_W; i++) {
      const c = hash2(k, i, 17) < 0.15 ? '#9a8a68' : '#b0a07c';
      r.set(park.x + i, k, c);
      r.set(k, park.y + i, c);
    }
  }
  const tones = [PINE, shade(PINE, 0.08), shade(PINE, -0.05)];
  const n = PARK / PARK_CELL;
  for (let gy = 0; gy < n; gy++) {
    for (let gx = 0; gx < n; gx++) {
      const h = (s: number): number => hash2(gx, gy, park.seed + s);
      if (h(21) < CLEARING) continue;
      const cx = gx * PARK_CELL + 4 + Math.floor(h(22) * 24);
      const cy = gy * PARK_CELL + 4 + Math.floor(h(23) * 24);
      crown(r, cx, cy, 8 + Math.floor(h(24) * 5), tones[Math.floor(h(25) * tones.length)]);
    }
  }
  return r;
}
