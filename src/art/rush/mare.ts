/**
 * Zone 3 LUNGOMARE TERRASINI at sunset. Left (SIDE_L_H rows): the promenade parapet, ochre cliffs,
 * the coastal watch tower on its headland and the small fishing port with a pier and the gozzi boats
 * (each once), sandy coves, rocks off the coast and the sea glittering orange. Right: pastel houses
 * warmed by the sunset, palms, lit lamps and the new Ciccio's Terrasini storefront with its
 * PROSSIMA APERTURA banner (the last delivery goes there: the customer waits at its lit door, the
 * blade sign hangs just past them). Filler: the sunset sea (the old town beyond the houses lives in
 * ./town).
 */
import { Raster, hash2 } from '../hills/raster';
import { RU, ZONE_PAL } from './colors';
import { textWidth } from './font';
import { FACADE_D, SIDE_L_H, STOREFRONT, STRIP_H, STRIP_W, Strip, ciccios, facade, lamp, palm, paving, sidewalk, signText } from './street';

const SEA = '#2a3466';
const SEA_DEEP = '#222a58';
const GLINT = '#f0905a';
const GLINT_HOT = '#ffd0a0';
const ROCK = '#a8744e';
const ROCK_LIGHT = '#c8925e';
const ROCK_SHADE = '#7a5038';
const SAND = '#d8b080';
const SEA_FILL = 256;
/**
 * Strip row of the last hand-off (RUSH_DELIVERY.shop.doorRow in src/config/rush.ts): the game puts
 * the waving customer 6 px above it, 24 px tall, so the door is centred there and the sign below.
 */
export const TERRASINI_DOOR_ROW = 124;
const CUSTOMER_ROW = TERRASINI_DOOR_ROW - 6;
/** the blade sign of ./street ciccios() */
const SIGN_H = 28;

/** Sea pixel with sunset glints: short wave dashes on an 8-row rhythm, so it wraps at any multiple of 64. */
function seaAt(d: number, y: number, deep: boolean): string {
  const h = hash2(d, y, 37);
  const wave = (y + Math.floor(d / 8) * 3) % 8 === 0 && hash2(Math.floor(d / 4), Math.floor(y / 8), 2) < 0.3;
  if (wave) return h < 0.4 ? GLINT_HOT : GLINT;
  return h < 0.05 ? '#4a4a7a' : deep ? SEA_DEEP : SEA;
}

/** Sandy coves of the left strip: [first row, length]. */
const COVES: readonly (readonly [number, number])[] = [[196, 40], [452, 52], [760, 36]];
/** Rocks off the coast: [distance, row, radius]. */
const ROCK_SIDES = 7;
const SCOGLI: readonly (readonly [number, number, number])[] = [[70, 300, 3], [98, 368, 4], [64, 590, 3], [104, 850, 4], [82, 940, 3]];
/** A gozzo at anchor off the cove, away from the port. */
const ANCHORED = { d: 62, y: 676 } as const;
const LAMP_STEP_L = 64;

/** The cliff edge distance at row y of an h-row strip: wavy, periodic over it, with a headland for the tower. */
function cliffEdge(y: number, h: number): number {
  const t = (y / h) * Math.PI * 2;
  const base = 30 + Math.round(4 * Math.sin(t * 12) + 3 * Math.sin(t * 20) + 5 * Math.sin(t * 2 + 1));
  const head = y >= 14 && y < 66 ? Math.round(24 * Math.sin(((y - 14) / 52) * Math.PI)) : 0;
  return base + head;
}

function coast(s: Strip): void {
  for (let y = 0; y < s.h; y++) {
    s.rect(12, y, 3, 1, y % 12 === 0 ? RU.whiteShade : '#e8dcc8'); // promenade parapet
    const edge = cliffEdge(y, s.h);
    for (let d = 15; d < STRIP_W; d++) {
      let c: string;
      if (d < edge) c = d > edge - 3 ? ROCK_SHADE : hash2(d, y, 43) < 0.18 ? ROCK_LIGHT : hash2(d, y, 44) < 0.12 ? ROCK_SHADE : ROCK;
      else if (d < edge + 2) c = RU.white; // surf on the rocks
      else c = seaAt(d, y, d > 90);
      s.px(d, y, c);
    }
  }
  for (const [y0, len] of COVES) {
    for (let y = y0; y < y0 + len; y++) {
      const edge = cliffEdge(y, s.h);
      const w = Math.round(14 * Math.sin(((y - y0) / len) * Math.PI));
      for (let d = edge - 2; d < edge + w; d++) s.px(d, y, hash2(d, y, 9) < 0.1 ? '#c09868' : SAND);
      s.px(edge + w, y, RU.white);
    }
  }
  for (const [d0, y0, rad] of SCOGLI) {
    for (let j = -rad - 3; j <= rad + 3; j++) {
      for (let i = -rad - 3; i <= rad + 3; i++) {
        const q = Math.hypot(i, j);
        const sector = Math.floor(((Math.atan2(j, i) + Math.PI) / (2 * Math.PI)) * ROCK_SIDES);
        const edge = rad - 0.6 + hash2(sector, y0, 51) * 1.6; // jagged, not a ball
        if (q <= edge) s.px(d0 + i, y0 + j, i + j < -1 ? ROCK_LIGHT : i + j > 1 ? ROCK_SHADE : ROCK);
        else if (q <= edge + 1.2) s.px(d0 + i, y0 + j, RU.white); // surf round the rock
      }
    }
  }
}

/** Square stone watch tower on the headland: crenellated top, shadow to the bottom-right. */
function tower(s: Strip): void {
  const d0 = 30;
  const y0 = 28;
  s.rect(d0 + 4, y0 + 4, 22, 22, ROCK_SHADE);
  s.rect(d0, y0, 22, 22, '#d8c8a0');
  s.rect(d0 + 3, y0 + 3, 16, 16, '#b8a47c');
  for (let k = 0; k < 22; k += 4) {
    s.rect(d0 + k, y0, 2, 2, '#f0e4c4');
    s.rect(d0, y0 + k, 2, 2, '#f0e4c4');
    s.rect(d0 + k, y0 + 20, 2, 2, '#a89470');
    s.rect(d0 + 20, y0 + k, 2, 2, '#a89470');
  }
  s.rect(d0 + 9, y0 + 9, 4, 4, '#8a7656'); // the stair hatch
}

function gozzo(s: Strip, d: number, y: number, trim: string): void {
  for (let i = 0; i < 14; i++) {
    const half = i < 3 ? i : i > 10 ? 13 - i : 3;
    for (let j = -half; j <= half; j++) {
      const rim = Math.abs(j) === half;
      s.px(d + i, y + j, rim ? (j < 0 ? RU.white : trim) : i > 3 && i < 11 ? '#a07040' : RU.whiteShade);
    }
  }
  s.rect(d + 6, y - 1, 2, 3, '#7a5030'); // thwart
  s.px(d + 1, y, trim); // the painted eye at the bow
}

function port(s: Strip, y0: number): void {
  const pier = y0 + 26;
  for (let d = 20; d < 100; d++) {
    s.rect(d, pier, 1, 8, (d % 8 === 0) ? '#9c9890' : '#bcb8ae');
    s.px(d, pier, '#d8d4ca');
    s.px(d, pier + 7, '#7c786e');
  }
  for (const d of [36, 56, 76, 96]) s.rect(d, pier + 1, 2, 2, RU.bodyDark); // bollards
  gozzo(s, 40, pier - 6, '#2a6ad0');
  gozzo(s, 60, pier - 7, '#d8342e');
  gozzo(s, 80, pier - 6, '#3fa24e');
  gozzo(s, 46, pier + 14, '#f2c230');
  gozzo(s, 68, pier + 15, '#2a6ad0');
}

/** Red banner on two poles, upright so it reads from the road: PROSSIMA / APERTURA. */
function banner(s: Strip, y: number): void {
  const w = textWidth('APERTURA') + 6;
  const x = s.boxX(FACADE_D + 14, w);
  for (let j = 0; j < 15; j++) for (let i = 0; i < w; i++) s.screen(x + i, y + j, j === 0 || j === 14 ? RU.checkDark : (i === 0 || i === w - 1) ? RU.bodyDark : RU.check);
  signText(s, 'PROSSIMA', x + Math.floor((w - textWidth('PROSSIMA')) / 2), y + 2, RU.vinyl);
  signText(s, 'APERTURA', x + 3, y + 8, RU.flameYellow);
}

/** The glass shop door behind the customer: white frame, warm light inside, black mullion + handles. */
function door(s: Strip, y: number): void {
  s.rect(FACADE_D - 1, y - 7, 11, 15, RU.vinyl);
  s.rect(FACADE_D, y - 6, 9, 13, RU.amber);
  s.rect(FACADE_D + 1, y - 5, 7, 8, RU.amberHot);
  s.rect(FACADE_D + 4, y - 6, 1, 13, RU.bodyDark);
  s.rect(FACADE_D + 3, y - 1, 3, 3, RU.bodyDark);
}

/** `shop` false: the plain strip, the Ciccio's Terrasini storefront left out (the game draws it once). */
export function mareSide(side: 'L' | 'R', shop = true): Raster {
  const s = new Strip(side, ZONE_PAL.mare, side === 'L' ? SIDE_L_H : undefined);
  sidewalk(s);
  if (side === 'L') {
    coast(s);
    tower(s);
    port(s, 96);
    gozzo(s, ANCHORED.d, ANCHORED.y, '#d8342e');
    for (let y = 8; y < s.h; y += LAMP_STEP_L) lamp(s, y, true);
    return s.r;
  }
  const { y: shopY, len: shopLen } = STOREFRONT.mare;
  const signY = shopY + shopLen - SIGN_H;
  paving(s, 12, FACADE_D, 0, STRIP_H, '#a88a76');
  facade(s, { y: 0, len: 40, colour: '#f0b0a0', floors: 2, shutter: '#3a7a8a', balcony: true, awning: null, roof: 'tiles' });
  facade(s, { y: 40, len: 48, colour: '#f2d088', floors: 2, shutter: '#3a7a8a', balcony: false, awning: '#2a6ad0', roof: 'tiles' });
  facade(s, { y: 88, len: 72, colour: '#f4ece0', floors: 2, shutter: null, balcony: true, awning: null, roof: 'terrace' });
  if (shop) {
    ciccios(s, shopY, shopLen, signY);
    door(s, CUSTOMER_ROW);
    banner(s, shopY + 4);
  }
  facade(s, { y: 160, len: 48, colour: '#e8a8c0', floors: 2, shutter: '#3a7a8a', balcony: true, awning: '#d8642e', roof: 'tiles' });
  facade(s, { y: 208, len: 48, colour: '#f0c890', floors: 2, shutter: '#6a4a2e', balcony: false, awning: null, roof: 'terrace' });
  for (const y of [20, 60, 176, 228]) palm(s, 17, y);
  // the blade sign hangs where a lamp would stand
  for (let y = 8; y < STRIP_H; y += 48) if (!shop || y < signY - 1 || y > signY + SIGN_H) lamp(s, y, true);
  return s.r;
}

/** 256x256 seamless sunset sea (the wave rhythm repeats every 64 px, the glints do not). */
export function mareFill(): Raster {
  const r = new Raster(SEA_FILL, SEA_FILL);
  for (let y = 0; y < SEA_FILL; y++) for (let x = 0; x < SEA_FILL; x++) r.set(x, y, seaAt(x, y, true));
  return r;
}
