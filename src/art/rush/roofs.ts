/**
 * Roofs of the side-strip palazzi (out to the strip's far edge, where the v9 caps take over).
 * 'tiles': a hipped terracotta roof (four slopes lit from the screen's top-left, tile courses, light
 * hips, chimneys with their shadow). 'terrace': the flat Palermo terrace, lived in: parapets, water
 * tanks and washing lines, potted plants along the parapet, a parasol over a table, a solar water
 * heater, a satellite dish, weathering stains.
 */
import { hash2 } from '../hills/raster';
import { mix, shade } from '../pixel';
import { RU } from './colors';
import { STRIP_W, type Strip } from './strip';

const TERRACE_JOINT = '#55524c';
const POT = '#b4683c';
const LEAF = '#4a8a3a';
const LEAF_LIGHT = '#6aa84a';
const FLOWERS = ['#e05a9c', '#f0d040', '#f0f0e8', '#e04848'] as const;
const PARASOLS = [['#d84a3a', '#f0ece0'], ['#2e8a5a', '#f0ece0'], ['#e8a020', '#f6f0e0'], ['#3a6ab0', '#f0ece0']] as const;
const TANK_STEP = 18;

/** d of the pixel `dx` px to the screen-right of d (the strips mirror). */
const right = (s: Strip, d: number, dx: number): number => (s.side === 'L' ? d - dx : d + dx);

export function roof(s: Strip, y0: number, len: number, d0: number, kind: 'terrace' | 'tiles'): void {
  if (kind === 'tiles') hipped(s, y0, len, d0);
  else terrace(s, y0, len, d0);
}

/** Hipped tile roof in screen space: the top slope lit, the left one plain, bottom and right shaded. */
function hipped(s: Strip, y0: number, len: number, d0: number): void {
  const p = s.pal;
  const [xa, xb] = [s.x(d0), s.x(STRIP_W - 1)];
  const [xl, xr] = [Math.min(xa, xb), Math.max(xa, xb)];
  for (let y = y0; y < y0 + len; y++) {
    for (let d = d0; d < STRIP_W; d++) {
      const x = s.x(d);
      const [dt, db, dl, dr] = [y - y0, y0 + len - 1 - y, x - xl, xr - x];
      const m = Math.min(dt, db, dl, dr);
      const across = m === dt || m === db;
      let c: string = m === dt ? p.roofLight : m === dl ? p.roof : m === db ? p.roofShade : mix(p.roof, p.roofShade, 0.6);
      if (across ? (y - y0) % 3 === 2 : x % 3 === 2) c = shade(c, -0.12);
      const hip = [dt, db, dl, dr].filter((v) => v === m).length > 1;
      if (hip && m > 0) c = shade(p.roofLight, 0.12);
      if (m === 0) c = shade(p.roofShade, -0.2); // the eave
      s.px(d, y, c);
    }
  }
  const depth = STRIP_W - d0;
  for (let k = 0; k < (len >= 48 ? 2 : 1); k++) {
    const d = d0 + 8 + Math.floor(hash2(y0, k, 21) * (depth - 18));
    const y = y0 + 5 + Math.floor(hash2(y0, k, 22) * (len - 12));
    for (let j = 1; j < 4; j++) s.px(right(s, d, 3), y + j, shade(p.roofShade, -0.25)); // the chimney's shadow
    for (let i = 1; i < 4; i++) s.px(right(s, d, i), y + 3, shade(p.roofShade, -0.25));
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) s.px(right(s, d, i), y + j, j === 0 ? '#c8b8a0' : '#9a8a78');
    s.px(right(s, d, 1), y + 1, RU.bodyDark);
  }
}

/** Parasol seen from above: eight alternating gores round a white finial, its shadow to the bottom-right. */
function parasol(s: Strip, d: number, y: number, pair: readonly [string, string], ground: string): void {
  const R = 4;
  for (let j = -R; j <= R + 1; j++) {
    for (let i = -R; i <= R + 1; i++) {
      if (Math.hypot(i - 1, j - 1) <= R && Math.hypot(i, j) > R) s.px(right(s, d, i), y + j, shade(ground, -0.3));
    }
  }
  for (let j = -R; j <= R; j++) {
    for (let i = -R; i <= R; i++) {
      if (Math.hypot(i, j) > R) continue;
      const gore = Math.floor(((Math.atan2(j, i) + Math.PI) / (2 * Math.PI)) * 8) % 2;
      const lit = i + j < -1;
      const c = pair[gore];
      s.px(right(s, d, i), y + j, lit ? shade(c, 0.1) : Math.hypot(i, j) > R - 1 ? shade(c, -0.15) : c);
    }
  }
  s.px(d, y, RU.white);
}

function terrace(s: Strip, y0: number, len: number, d0: number): void {
  const p = s.pal;
  // cement, cotto or whitewashed: neighbouring terraces never read as one grey slab
  const kind = Math.floor(hash2(y0, d0, 27) * 3);
  const base = [p.terrace, mix(p.roof, p.terrace, 0.45), shade(p.terrace, 0.28)][kind];
  const joint = kind === 0 ? TERRACE_JOINT : shade(base, -0.16);
  const cell = kind === 1 ? 6 : 12;
  for (let y = y0; y < y0 + len; y++) {
    for (let d = d0; d < STRIP_W; d++) {
      const j = (d - d0) % cell === 0 || (y - y0) % cell === 0 || hash2(d, y, 6) < 0.05;
      const stain = hash2(Math.floor(d / 7), Math.floor(y / 7), 23) < 0.18;
      s.px(d, y, j ? joint : stain ? shade(base, -0.06) : base);
    }
  }
  const lip = shade(base, 0.15);
  s.rect(d0, y0, 2, len, lip); // parapet on the street side
  s.rect(STRIP_W - 2, y0, 2, len, lip); // and on the far side
  s.rect(d0, y0, STRIP_W - d0, 1, shade(p.roofShade, -0.3));
  // pots along the street-side parapet
  for (let y = y0 + 3; y + 3 < y0 + len; y += 5) {
    const h = hash2(y, d0, 24);
    if (h > 0.55) continue;
    s.rect(d0 + 2, y + 2, 3, 1, POT);
    s.rect(d0 + 2, y, 3, 2, LEAF);
    s.px(d0 + 3, y, LEAF_LIGHT);
    s.px(d0 + 2, y + 1, LEAF_LIGHT);
    if (h < 0.25) s.px(d0 + 3, y + 1, FLOWERS[Math.floor(hash2(y, 1, 25) * FLOWERS.length)]);
  }
  for (let y = y0 + 6; y + 8 < y0 + len; y += TANK_STEP) {
    const d = d0 + 8 + Math.floor(hash2(y, d0, 2) * 20);
    s.rect(d, y, 6, 6, RU.whiteShade); // water tank
    s.rect(d, y, 6, 1, RU.white);
    s.rect(d + 5, y, 1, 6, RU.rim);
    if (hash2(y, 3, 9) < 0.6) {
      for (let j = 0; j < 9; j++) s.px(d + 10 + j, y + 2, RU.rim); // washing line
      for (const [j, c] of [[1, '#e04848'], [3, '#f0f0e8'], [6, '#4a8ad8']] as const) s.rect(d + 11 + j, y + 3, 2, 2, c);
    }
  }
  const h = (i: number): number => hash2(y0, d0 + i, 26);
  if (len >= 28 && h(0) < 0.55) {
    parasol(s, Math.min(STRIP_W - 7, d0 + 38 + Math.floor(h(1) * 12)), y0 + TANK_STEP, PARASOLS[Math.floor(h(2) * PARASOLS.length)], base);
  }
  if (h(3) < 0.4) {
    const d = STRIP_W - 12;
    s.rect(d, y0 + 3, 8, 2, RU.whiteShade); // solar water heater: tank and panel
    s.rect(d, y0 + 5, 8, 5, '#2a4a7a');
    for (let i = 0; i < 8; i += 3) s.rect(d + i, y0 + 5, 1, 5, '#4a6a9a');
  }
  if (h(4) < 0.4 && len >= 24) {
    const y = y0 + len - 6;
    s.rect(d0 + 5, y, 3, 3, '#dcdcd4'); // satellite dish
    s.px(d0 + 6, y + 1, '#8a8a84');
  }
}
