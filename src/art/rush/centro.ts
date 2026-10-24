/**
 * Zone 1 PALERMO CENTRO (Politeama / Via Libertà, daylight). Left (SIDE_L_H rows): the Teatro
 * Politeama once (colonnade, triumphal arch with the bronze quadriga, the great round roof), then
 * varied liberty palazzi and a villa. Right: Via Libertà with its ficus trees, a newspaper kiosk, a
 * liberty villa in its garden and the Ciccio's La Lumia storefront. The wide-view filler (Palermo
 * rooftops) is built in ./town from the ./rooftops blocks.
 */
import { hash2, Raster } from '../hills/raster';
import { shade } from '../pixel';
import { RU, ZONE_PAL } from './colors';
import { FACADE_D, type RowLook, SIDE_L_H, STOREFRONT, STRIP_W, Strip, ciccios, facade, lamp, palazzi, paving, roof, sidewalk, tree } from './street';

const GREEN_SHUTTER = '#3c7a4a';
const STONE = '#c4b284';
const BRONZE = '#3e5e4e';
/** Via Libertà palazzi beyond the theatre: liberty ochres, pinks and creams. */
const LIBERTA: RowLook = {
  walls: ['#ead8b0', '#e4b0a0', '#dcb468', '#e6d6b8', '#d8c0a0', '#e0c890', '#f0d8c0', '#c8a888'],
  shutters: [GREEN_SHUTTER, GREEN_SHUTTER, '#6a4a2e', '#4a5a6a'],
  awnings: ['#b8402e', '#2e6a4a', '#3a5aa0', '#a83a6a', '#c46a20', '#5a4a3a'],
};
/** Rows of the left strip: the Politeama once, a liberty villa, palazzi everywhere else. */
const POLITEAMA = { y: 32, len: 112 } as const;
const VILLA_L = { y: 520, len: 56 } as const;
const TREE_STEP = 72;

function politeama(s: Strip, y0: number, len: number): void {
  paving(s, 12, FACADE_D, y0, len, '#b0a690');
  const top = 60;
  s.rect(FACADE_D, y0, top - FACADE_D, len, STONE);
  s.rect(FACADE_D, y0, 3, len, '#c4c0b4'); // steps
  s.rect(FACADE_D + 1, y0, 1, len, '#9c988e');
  for (let y = y0 + 2; y < y0 + len - 2; y += 6) {
    s.rect(FACADE_D + 4, y + 2, 44 - 4 - 8, 4, shade(STONE, -0.45)); // deep loggia between the columns
    s.rect(FACADE_D + 4, y, 30, 2, '#ddd0a8'); // column catching the light
  }
  const mid = y0 + Math.floor(len / 2);
  s.rect(FACADE_D + 3, mid - 10, 30, 20, STONE); // triumphal arch
  s.rect(FACADE_D + 3, mid - 6, 24, 12, '#2a2420');
  s.rect(FACADE_D + 27, mid - 4, 2, 8, '#2a2420'); // round top of the arch
  s.rect(FACADE_D + 36, y0, 4, len, shade(STONE, -0.2)); // entablature
  s.rect(top - 2, y0, 2, len, '#f4ecd0');
  roof(s, y0, len, top, 'terrace');
  // the great round roof of the theatre
  const cy = mid;
  for (let y = -40; y <= 40; y++) {
    for (let d = -34; d <= 34; d++) {
      const q = (d / 34) ** 2 + (y / 40) ** 2;
      if (q > 1) continue;
      const rib = Math.abs(Math.atan2(y, d) * 6) % 1 < 0.12;
      const lit = d + y < -20;
      s.px(top + 32 + d, cy + y, q > 0.9 ? '#5a6a70' : rib ? '#6a7e86' : lit ? '#a2b4ba' : '#869aa2');
    }
  }
  s.rect(top + 30, cy - 2, 5, 5, '#c4c0b4'); // lantern
  // bronze quadriga over the arch and the two riders at the corners
  s.rect(top - 2, mid - 6, 8, 12, BRONZE);
  for (const dy of [-5, -2, 1, 4]) {
    s.rect(top + 5, mid + dy, 6, 2, BRONZE);
    s.px(top + 11, mid + dy, shade(BRONZE, 0.3));
  }
  s.px(top + 1, mid - 1, shade(BRONZE, 0.4));
  for (const y of [y0 + 6, y0 + len - 10]) {
    s.rect(top - 1, y, 5, 4, BRONZE);
    s.px(top, y, shade(BRONZE, 0.4));
  }
}

/** Liberty villa set back in its garden behind a railing, with a palm. */
function villa(s: Strip, y0: number, len: number): void {
  for (let y = y0; y < y0 + len; y++) {
    for (let d = 12; d < STRIP_W; d++) s.px(d, y, hash2(d, y, 12) < 0.15 ? '#3e6e34' : '#4a7c3c');
  }
  for (let y = y0; y < y0 + len; y += 3) s.px(13, y, RU.bodyDark); // railing
  s.rect(12, y0, 1, len, RU.bodyLight);
  facade(s, { y: y0 + 10, len: len - 20, colour: '#e8c0a8', floors: 2, shutter: GREEN_SHUTTER, balcony: true, awning: null, roof: 'tiles' });
  for (let y = y0 + 10; y < y0 + len - 10; y++) s.rect(FACADE_D - 8, y, 8, 1, '#b8a888'); // gravel path
  tree(s, 70, y0 + 6, 6, '#3a6e30');
  s.rect(FACADE_D - 8, y0, 8, 10, '#4a7c3c');
  s.rect(FACADE_D - 8, y0 + len - 10, 8, 10, '#4a7c3c');
}

function kiosk(s: Strip, y: number): void {
  s.rect(14, y, 8, 14, '#2e6e46');
  s.rect(14, y, 8, 1, '#4a9a66');
  s.rect(13, y + 2, 1, 10, '#f2c230'); // magazines on display
  s.rect(13, y + 4, 1, 2, '#e04848');
}

/** `shop` false: the plain strip, the La Lumia storefront left out (the game draws it once). */
export function centroSide(side: 'L' | 'R', shop = true): Raster {
  const s = new Strip(side, ZONE_PAL.centro, side === 'L' ? SIDE_L_H : undefined);
  sidewalk(s);
  if (side === 'L') {
    const end = POLITEAMA.y + POLITEAMA.len;
    paving(s, 12, FACADE_D, 0, s.h, '#9a9282');
    facade(s, { y: 0, len: POLITEAMA.y, colour: '#ead8b0', floors: 3, shutter: GREEN_SHUTTER, balcony: true, awning: '#b8402e', roof: 'terrace' });
    politeama(s, POLITEAMA.y, POLITEAMA.len);
    palazzi(s, end, VILLA_L.y, 1, LIBERTA);
    villa(s, VILLA_L.y, VILLA_L.len);
    palazzi(s, VILLA_L.y + VILLA_L.len, s.h, 2, LIBERTA);
    tree(s, 16, 8, 6, '#3a6e30');
    for (let y = end + 16; y < s.h - 24; y += TREE_STEP) tree(s, 16, y + Math.floor(hash2(y, 1, 7) * 24), 6, '#3a6e30');
  } else {
    paving(s, 12, FACADE_D, 0, s.h, '#9a9282');
    facade(s, { y: 0, len: 64, colour: '#e6d6b8', floors: 3, shutter: GREEN_SHUTTER, balcony: true, awning: null, roof: 'terrace' });
    if (shop) ciccios(s, STOREFRONT.centro.y, STOREFRONT.centro.len);
    facade(s, { y: 64, len: 56, colour: '#d8c0a0', floors: 4, shutter: GREEN_SHUTTER, balcony: true, awning: '#a83a6a', roof: 'terrace' });
    villa(s, 120, 56);
    facade(s, { y: 176, len: 80, colour: '#e0c890', floors: 3, shutter: GREEN_SHUTTER, balcony: true, awning: '#c46a20', roof: 'tiles' });
    kiosk(s, 196);
    for (const y of [86, 236]) tree(s, 16, y, 6, '#3a6e30');
  }
  for (let y = 16; y < s.h; y += 64) lamp(s, y, false);
  return s.r;
}
