/**
 * Shared raster helpers of the station pack: brushed-metal grain, bevelled steel plates, the black
 * knob and the white dial, the rows of "CICCIO'S" printed on the packaging and the station name
 * plates (PIASTRA, FRIGGITRICE, VASSOIO).
 */
import type { Mask } from '../../hills/mask';
import { Raster, gridR, hash2 } from '../../hills/raster';
import { rectR } from '../../rampage/draw';
import { drawText, textWidth } from '../../rush/font';
import { ST } from './colors';

export interface Ramp {
  light: string;
  base: string;
  shade: string;
}

/** Top faces of the equipment (lit), their vertical front faces (in shade) and the seasoned iron. */
export const FRAME: Ramp = { light: ST.steelLight, base: ST.steel, shade: ST.steelMid };
export const FACE: Ramp = { light: ST.steel, base: ST.steelMid, shade: ST.steelShade };
export const IRON: Ramp = { light: ST.ironLight, base: ST.iron, shade: ST.ironDark };

/** [cycles per period, amplitude] of the grain waves: long soft streaks, never busy. */
const WAVES = [[1, 0.16], [2, 0.2], [3, 0.24], [5, 0.22], [8, 0.18]] as const;

/**
 * Brushed grain of pixel (x, y), about [-1, 1]: sines along x with per-row phases, periodic in
 * `period` (seamless horizontally when period = raster width; rows are independent, so seamless
 * vertically too).
 */
export function grain(x: number, y: number, period: number, seed: number): number {
  let v = 0;
  for (const [k, a] of WAVES) v += a * Math.sin((2 * Math.PI * k * x) / period + hash2(y, k, seed) * 2 * Math.PI);
  return v;
}

/** Fills a rect with horizontal brushed grain (base, with light / shade streaks past `th`). */
export function brushedRect(r: Raster, x: number, y: number, w: number, h: number, ramp: Ramp, seed: number, th = 0.4): void {
  for (let j = y; j < y + h; j++) {
    for (let i = x; i < x + w; i++) {
      const g = grain(i, j, 64, seed);
      r.set(i, j, g > th ? ramp.light : g < -th ? ramp.shade : ramp.base);
    }
  }
}

/** 1-px bevel: top row and left column lit, bottom row and right column shaded. */
export function bevel(r: Raster, x: number, y: number, w: number, h: number, light: string, dark: string): void {
  rectR(r, x, y, w, 1, light);
  rectR(r, x, y, 1, h, light);
  rectR(r, x, y + h - 1, w, 1, dark);
  rectR(r, x + w - 1, y, 1, h, dark);
}

/** 1-px rectangle outline. */
export function frameRect(r: Raster, x: number, y: number, w: number, h: number, color: string): void {
  bevel(r, x, y, w, h, color, color);
}

/** Clears the four corner pixels of a rect (rounded look once outlined). */
export function roundCorners(r: Raster, x: number, y: number, w: number, h: number): void {
  for (const [cx, cy] of [[x, y], [x + w - 1, y], [x, y + h - 1], [x + w - 1, y + h - 1]] as const) r.set(cx, cy, null);
}

const KNOB = ['..kkk..', '.klwbk.', 'kllwbbk', 'klbwbbk', 'kbbbbsk', '.kbbsk.', '..kkk..'];

/** Black griddle knob (7x7) centred on (cx, cy), white mark pointing up. */
export function knob(r: Raster, cx: number, cy: number): void {
  gridR(r, KNOB, { k: ST.ink, l: ST.blackLight, b: ST.black, s: ST.blackShade, w: ST.steelShine }, cx - 3, cy - 3);
}

const DIAL = [
  '..kkkkk..',
  '.kwwkwwk.',
  'kwkwwwrwk',
  'kwwwwrwwk',
  'kkwwrwwkk',
  'kwwwwwwsk',
  'kwwwwwwsk',
  '.kswwwsk.',
  '..kkkkk..',
];

/** White thermostat dial (9x9) centred on (cx, cy): ticks and a red needle at the hot end. */
export function dial(r: Raster, cx: number, cy: number): void {
  gridR(r, DIAL, { k: ST.ink, w: ST.faceWhite, s: ST.steelLight, r: ST.red }, cx - 4, cy - 4);
}

/** Lighting of mask pixel (x, y) of material `id`: -1 lit top-left rim, 1 shaded bottom-right rim, 0 inside. */
export function edgeTone(m: Mask, x: number, y: number, id: number): -1 | 0 | 1 {
  if (m.get(x + 1, y) !== id || m.get(x, y + 1) !== id) return 1;
  if (m.get(x - 1, y) !== id || m.get(x, y - 1) !== id) return -1;
  return 0;
}

/** The word printed on Ciccio's packaging (ref/level7_wrap_tray.jpg). */
const BRAND = "CICCIO'S";

/**
 * Ciccio's printed paper: "CICCIO'S" repeated along rows `pitch` px apart from row `y0`, `gap` px
 * between words, each row shifted `shift` px from the one above, kept where `inside` holds and
 * coloured by `ink` (words cut at the paper edges, like the real wraps and liners).
 */
export function brandPrint(
  r: Raster, inside: (x: number, y: number) => boolean, ink: (x: number, y: number) => string,
  y0: number, pitch: number, gap: number, shift: number,
): void {
  const stamp = new Raster(r.w, r.h);
  const step = textWidth(BRAND) + gap;
  for (let k = 0, y = y0; y < r.h; k++, y += pitch) {
    for (let x = -step + ((k * shift) % step); x < r.w; x += step) drawText(stamp, BRAND, x, y, ST.ink);
  }
  for (let y = 0; y < r.h; y++) {
    for (let x = 0; x < r.w; x++) if (stamp.get(x, y) !== 0 && inside(x, y)) r.set(x, y, ink(x, y));
  }
}

/** Rows of a station name plate: lit edge, 5 rows of 3x5 capitals, dark edge. */
export const PLATE_H = 7;

/** Black enamel name plate with gold capitals ("PIASTRA"), centred on cx, top row at y: tells a
 * first-time player what each station is. */
export function namePlate(r: Raster, text: string, cx: number, y: number): void {
  const w = textWidth(text) + 4;
  const x = Math.round(cx - w / 2);
  rectR(r, x, y, w, PLATE_H, ST.black);
  bevel(r, x, y, w, PLATE_H, ST.blackLight, ST.blackEdge);
  drawText(r, text, x + 2, y + 1, ST.goldLight);
}
