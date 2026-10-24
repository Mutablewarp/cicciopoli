/**
 * 'rush-truck-side' 160x80: the Ciccio's burger truck from the side, facing RIGHT, the rear door
 * turned a little towards us (ref/truck_photo.png, ref/truck_top.png, ref/truck_cartoon.png).
 * Sprinter cab, matte-black box with chrome trim, two red checkered bands, the "Ciccio's" script
 * + burger, THE BURGER TRUCK, PALERMO, SICILY!, and on the rear door the face logo, a tiny
 * decorative square (not a code) and SEGUICI!. drawTruckSide() is shared with the flying and
 * the orbit art.
 */
import { Mask, paintMask, type Tone } from '../hills/mask';
import { Raster, outlineRaster } from '../hills/raster';
import { lineR, rectR } from '../rampage/draw';
import { RU } from './colors';
import { drawText, textWidth } from './font';
import { BURGER_L, FACE_L, SIDE_SCRIPT, face, vinyl } from './lettering';
import { checker } from './truckTop';

export const SIDE_W = 160;
export const SIDE_H = 80;

/** Box side panel and the rear door (oblique: its far edge sits 3 px higher). */
const BOX = { x0: 30, x1: 118, y0: 6, y1: 62 };
const DOOR = { x0: 3, x1: 29, rise: 3 };
const WHEELS = [54, 134] as const;
const WHEEL_Y = 69;

export interface SideOpts {
  /** 'open' leaves the driver window empty for the astronaut (orbit art) */
  window: 'glass' | 'open';
  /** leaves out the 3x5 lettering (the climbing frames stamp it after pitching the truck) */
  bare?: boolean;
}

const BODY: Tone = { light: RU.bodyLight, base: RU.body, shade: RU.bodyShade, dark: RU.bodyDark };
const DOOR_TONE: Tone = { light: RU.body, base: RU.bodyShade, shade: RU.bodyDark };

function wheel(r: Raster, cx: number, cy: number): void {
  const m = new Mask(24, 24);
  m.ellipse(12, 12, 9, 9, 1);
  m.ellipse(12, 12, 5, 5, 2);
  paintMask(m, r, { 1: { light: RU.tyreLight, base: RU.tyre, shade: RU.tyre }, 2: { light: RU.rimLight, base: RU.rim, shade: RU.chromeShade } }, { ox: cx - 12, oy: cy - 12 });
  rectR(r, cx - 1, cy - 1, 3, 3, RU.tyreLight);
  r.set(cx, cy, RU.rimLight);
  for (const [dx, dy] of [[0, -3], [3, 0], [0, 3], [-3, 0]] as const) r.set(cx + dx, cy + dy, RU.tyreLight);
}

/** Rear door: the far edge rises, so the panel reads as turned towards the camera. */
function door(r: Raster): void {
  const { x0, x1, rise } = DOOR;
  const m = new Mask(SIDE_W, SIDE_H);
  m.poly([[x0, BOX.y0 + rise], [x1 + 1, BOX.y0], [x1 + 1, BOX.y1 + 1], [x0, BOX.y1 - rise + 1]], 1);
  paintMask(m, r, { 1: DOOR_TONE }, { shadeDepth: 1 });
  lineR(r, x0, BOX.y0 + rise, x1, BOX.y0, RU.chrome);
  lineR(r, x0, BOX.y0 + rise, x0, BOX.y1 - rise, RU.chromeShade);
  face(r, FACE_L, 10, 11, RU.body);
  // decorative square (deliberately not a code); SEGUICI! is part of lettering()
  rectR(r, 14, 31, 5, 5, RU.vinyl);
  rectR(r, 15, 32, 3, 3, RU.bodyShade);
  r.set(16, 33, RU.vinyl);
  // light clusters + the bumper
  for (const x of [x0 + 1, x1 - 3]) {
    rectR(r, x, 47, 3, 6, RU.check);
    rectR(r, x, 47, 3, 1, RU.checkLight);
    rectR(r, x, 53, 3, 1, RU.plate);
  }
  rectR(r, x0 - 1, BOX.y1 - 1, x1 - x0 + 2, 3, RU.tyreLight);
  rectR(r, x0 - 1, BOX.y1 - 1, x1 - x0 + 2, 1, RU.rim);
}

function box(r: Raster): void {
  const { x0, x1, y0, y1 } = BOX;
  const m = new Mask(SIDE_W, SIDE_H);
  m.rect(x0, y0 + 3, x1 - x0 + 1, y1 - y0 - 2, 1);
  m.rect(x0, y0, x1 - x0 - 3, 4, 1);
  m.ellipse(x1 - 4, y0 + 4, 4, 4, 1); // rounded front-top corner like the real box
  m.ellipse(WHEELS[0], WHEEL_Y, 12, 12, 0); // rear wheel arch
  paintMask(m, r, { 1: BODY }, { shadeDepth: 1 });
  lineR(r, x0, y0, x1 - 4, y0, RU.chrome); // chrome trim
  lineR(r, x1 - 4, y0, x1, y0 + 4, RU.chrome);
  lineR(r, x1, y0 + 4, x1, y1 - 2, RU.chromeShade);
  lineR(r, x0, y0, x0, y1, RU.chrome);
  // two red checkered bands (two staggered rows of squares, as on the truck)
  checker(r, x0 + 2, 10, x1 - x0 - 4, 6, 0, 3);
  checker(r, x0 + 2, 46, x1 - x0 - 4, 6, 1, 3);
  vinyl(r, SIDE_SCRIPT, 45, 18);
  vinyl(r, BURGER_L, 88, 18);
}

/** The 3x5 lettering [text, x, y] on the door and the box side. */
const LETTERING: readonly (readonly [string, number, number])[] = [
  ['SEGUICI!', DOOR.x1 - textWidth('SEGUICI!'), 39],
  ['THE BURGER TRUCK', 50, 37],
  ['PALERMO', BOX.x0 + 4, 55],
  ['SICILY', 92, 55],
];
/** the '!' after SICILY, painted with a red dot as on the truck */
const BANG = { x: 92 + textWidth('SICILY') + 2, y: 55 };

/**
 * Stamps the lettering glyph by glyph: `at` maps a glyph's top-left. The climbing frames pass the
 * pitch, so each glyph stays upright and whole while the line of text follows the slope.
 */
export function lettering(r: Raster, at: (x: number, y: number) => readonly [number, number] = (x, y) => [x, y]): void {
  for (const [text, x0, y] of LETTERING) {
    let x = x0;
    for (const ch of text) {
      const [gx, gy] = at(x, y);
      drawText(r, ch, gx, gy, RU.vinyl);
      x += textWidth(ch) + 1;
    }
  }
  const [bx, by] = at(BANG.x, BANG.y);
  rectR(r, bx, by, 2, 3, RU.vinyl);
  rectR(r, bx, by + 4, 2, 1, RU.check);
}

function cab(r: Raster, opts: SideOpts): void {
  const m = new Mask(SIDE_W, SIDE_H);
  m.poly([[116, 26], [137, 23], [141, 24], [151, 41], [157, 44], [158, 47], [158, 64], [116, 64]], 1);
  m.ellipse(WHEELS[1], WHEEL_Y, 12, 12, 0); // front wheel arch
  paintMask(m, r, { 1: BODY }, { shadeDepth: 1 });
  // windscreen edge (seen from the side as a thin glass strip) + driver window
  lineR(r, 141, 25, 150, 41, RU.glassLight);
  const win = new Mask(SIDE_W, SIDE_H);
  win.poly([[120, 28], [138, 27], [146, 41], [120, 41]], 1);
  if (opts.window === 'glass') {
    paintMask(win, r, { 1: { light: RU.glassLight, base: RU.glass, shade: RU.glassDark } }, { shadeDepth: 1 });
    lineR(r, 124, 40, 131, 29, RU.glassLight);
    lineR(r, 127, 40, 134, 29, RU.glassLight);
  } else {
    paintMask(win, r, { 1: { light: RU.bodyDark, base: RU.bodyDark, shade: RU.bodyDark } });
  }
  lineR(r, 120, 42, 146, 42, RU.bodyDark); // door line + handle
  lineR(r, 119, 28, 119, 62, RU.bodyDark);
  rectR(r, 122, 46, 4, 1, RU.chromeShade);
  rectR(r, 146, 36, 4, 7, RU.body); // mirror
  rectR(r, 146, 36, 4, 1, RU.bodyLight);
  rectR(r, 151, 45, 6, 3, RU.plate); // headlight + indicator
  r.set(157, 48, RU.amber);
  rectR(r, 150, 58, 9, 6, RU.tyreLight); // bumper
  rectR(r, 150, 58, 9, 1, RU.rim);
  rectR(r, 152, 50, 6, 6, RU.bodyDark); // grille
  for (let y = 51; y < 56; y += 2) rectR(r, 153, y, 5, 1, RU.tyreLight);
}

function chassis(r: Raster): void {
  rectR(r, BOX.x0 + 2, BOX.y1 + 1, 86, 3, RU.tyre);
  rectR(r, 76, BOX.y1 + 1, 20, 4, RU.tyreLight); // fuel tank
  rectR(r, 76, BOX.y1 + 1, 20, 1, RU.rim);
}

/** Draws the whole side-view truck into `r` (no outline). */
export function drawTruckSide(r: Raster, opts: SideOpts): void {
  chassis(r);
  door(r);
  box(r);
  cab(r, opts);
  for (const x of WHEELS) wheel(r, x, WHEEL_Y);
  if (!opts.bare) lettering(r);
}

export function buildTruckSide(): Raster {
  const r = new Raster(SIDE_W, SIDE_H);
  drawTruckSide(r, { window: 'glass' });
  outlineRaster(r, RU.ink);
  return r;
}
