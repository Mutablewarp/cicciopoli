/**
 * v9 upright sign plates of the three Ciccio's storefronts for the SIDE view (shopSignKey(zone), 96x28):
 * the storefront art turns with the camera, this plate stays readable over it. Black plate, white
 * trim and an ink outline, the official face logo, the "Ciccio's" brand script, the shop's name in
 * capitals and a band underneath: the brand's red checkers, or for Terrasini the red PROSSIMA
 * APERTURA band (the new shop where the last order goes).
 */
import { Raster } from '../hills/raster';
import { rectR } from '../rampage/draw';
import { RU } from './colors';
import { drawText, textWidth } from './font';
import type { RushZone } from './keys';
import { FACE_L, SIDE_SCRIPT, face, vinyl } from './lettering';
import { checker } from './truckTop';

export const SIGN_W = 96;
export const SIGN_H = 28;
const NAMES: Readonly<Record<RushZone, string>> = { centro: 'LA LUMIA', stadio: 'STADIO', mare: 'TERRASINI' };
/** rows of the bottom band */
const BAND_Y = 19;
const BAND_H = 7;
const SCRIPT_X = 18;
const NAME_X = 60;

export function buildShopSign(zone: RushZone): Raster {
  const r = new Raster(SIGN_W, SIGN_H);
  rectR(r, 0, 0, SIGN_W, SIGN_H, RU.ink);
  rectR(r, 1, 1, SIGN_W - 2, SIGN_H - 2, RU.vinyl);
  rectR(r, 2, 2, SIGN_W - 4, SIGN_H - 4, RU.bodyDark);
  rectR(r, 2, 2, SIGN_W - 4, 1, RU.bodyLight); // the plate catches the light along its top
  face(r, FACE_L, 3, 2, RU.bodyLight);
  vinyl(r, SIDE_SCRIPT, SCRIPT_X, 2);
  const name = NAMES[zone];
  const nx = NAME_X + Math.floor((SIGN_W - 3 - NAME_X - textWidth(name)) / 2);
  drawText(r, name, nx + 1, 11, RU.ink);
  drawText(r, name, nx, 10, RU.vinyl);
  if (zone === 'mare') {
    rectR(r, 2, BAND_Y, SIGN_W - 4, BAND_H, RU.check);
    rectR(r, 2, BAND_Y, SIGN_W - 4, 1, RU.checkLight);
    rectR(r, 2, BAND_Y + BAND_H - 1, SIGN_W - 4, 1, RU.checkDark);
    const text = 'PROSSIMA APERTURA';
    const x = Math.floor((SIGN_W - textWidth(text)) / 2);
    drawText(r, text, x + 1, BAND_Y + 2, RU.checkDark);
    drawText(r, text, x, BAND_Y + 1, RU.flameYellow);
  } else {
    checker(r, 2, BAND_Y + 1, SIGN_W - 4, 4, 0);
    rectR(r, 2, BAND_Y, SIGN_W - 4, 1, RU.vinylShade);
    rectR(r, 2, BAND_Y + 5, SIGN_W - 4, 1, RU.vinylShade);
  }
  return r;
}
