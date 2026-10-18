/**
 * The official Ciccio's logo as the label printed on the big centre tray of the board: white face
 * and outlined wordmark, black hair and glasses. The bitmap comes from scripts/logo-bits.mjs at
 * 2 px per world pixel, so the label is drawn at half size (LOGO_LABEL in keys.ts).
 */
import { ctxOf, makeCanvas, mix } from '../pixel';
import { LOGO_BITS, LOGO_LEVELS } from './logoBits';
import { MZ } from './palette';

/** Hex digit -> colour: 0-7 white level over the bare label, 8-f over black ink. */
function ramp(): string[] {
  const level = (base: string, i: number): string => mix(base, MZ.labelWhite, i / (LOGO_LEVELS - 1));
  return [MZ.labelPlate, MZ.labelInk].flatMap((base) => Array.from({ length: LOGO_LEVELS }, (_, i) => level(base, i)));
}

export function buildLogoLabel(): HTMLCanvasElement {
  const colours = ramp();
  const c = makeCanvas(LOGO_BITS[0].length, LOGO_BITS.length);
  const ctx = ctxOf(c);
  LOGO_BITS.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      ctx.fillStyle = colours[parseInt(row[x], 16)];
      ctx.fillRect(x, y, 1, 1);
    }
  });
  return c;
}
