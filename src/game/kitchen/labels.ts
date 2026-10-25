/**
 * Crisp pixel text of level 7, drawn in art pixels with the 3x5 font of the rush pack (plus the
 * glyphs it lacks: digits, J, W, X, Q, + - , € : ?): the label tape under every pan, bottle and
 * drink ("CHEDDAR", "SALSA" / "CICCIO'S"), the cues on the stations ("GIRA!", "OK!") and
 * the floating texts ("PERFETTO!", "+14,90 €"). Textures are built once per text and style.
 */
import type Phaser from 'phaser';
import type { DrinkId } from '../../art/kitchen/keys';
import { FONT_H, drawText, textWidth } from '../../art/rush/font';
import { Raster, outlineRaster } from '../../art/hills/raster';
import { DRINK_NAME } from '../../config/kitchenMenu';
import { LABEL } from './config';
import { binLabel } from './logic/order';
import type { BinId } from './logic/types';

const EXTRA: Readonly<Record<string, readonly string[]>> = {
  J: ['..#', '..#', '..#', '#.#', '.#.'],
  W: ['#...#', '#...#', '#.#.#', '##.##', '#...#'],
  X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  Q: ['.#.', '#.#', '#.#', '##.', '.##'],
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '1': ['.#', '##', '.#', '.#', '.#'],
  '2': ['##.', '..#', '.#.', '#..', '###'],
  '3': ['##.', '..#', '.#.', '..#', '##.'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '##.', '..#', '##.'],
  '6': ['.##', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '.#.', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '##.'],
  '+': ['...', '.#.', '###', '.#.', '...'],
  '-': ['..', '..', '##', '..', '..'],
  ',': ['.', '.', '.', '#', '#'],
  ':': ['.', '#', '.', '#', '.'],
  '?': ['##.', '..#', '.#.', '...', '.#.'],
  '€': ['.##', '###', '#..', '###', '.##'],
};

/** Bin labels whose words would not fit a line: the ticket's words, broken at a syllable (CIPOLLA CARAMELLATA and the
 * GREEN NUGGETS VEGGIE would need a third line: cut). */
const SHORT: Partial<Record<BinId, string>> = {
  polloPastellato: 'POLLO PA- STELLATO',
  cipollaCaramellata: 'CIPOLLA CARAMELL.',
  pere: 'PERE CARA- MELLATE',
  peperoncino: 'PEPE- RONCINO',
  gorgonzola: 'GORGON- ZOLA',
  fichi: 'CONFETTU- RA DI FICHI',
  greenNuggets: 'GREEN NUGGETS',
};

const LINE_GAP = 1;

function glyphW(ch: string): number {
  return EXTRA[ch]?.[0].length ?? textWidth(ch);
}

/** Width of one line in art px. */
export function lineWidth(text: string): number {
  let w = 0;
  for (const ch of text) w += glyphW(ch) + 1;
  return Math.max(0, w - 1);
}

/** Every character can be drawn (tests; unknown ones are skipped at runtime). */
export function canDraw(text: string): boolean {
  return [...text].every((ch) => glyphW(ch) > 0);
}

/** Greedy word wrap into lines of at most `max` px (a longer single word stays on its own line). */
export function wrap(text: string, max: number = LABEL.maxW): string[] {
  const lines: string[] = [];
  for (const word of text.split(' ').filter(Boolean)) {
    const last = lines[lines.length - 1];
    if (last !== undefined && lineWidth(`${last} ${word}`) <= max) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}

/** Label tape of a pan / bottle: "CHEDDAR", sauces without "SALSA", the bun pan = CHIUDI. */
export function binLines(id: BinId | 'bun'): string[] {
  if (id === 'bun') return ['CHIUDI'];
  const name = SHORT[id] ?? binLabel(id);
  return wrap(name.startsWith('SALSA ') ? name.slice(6) : name);
}

/** Drink label without the can size: "COCA COLA" / "ZERO". */
export function drinkLines(id: DrinkId): string[] {
  return wrap(DRINK_NAME[id].replace(/ \d+CL$/, ''));
}

function drawLine(r: Raster, text: string, x: number, y: number, color: string): void {
  let cx = x;
  for (const ch of text) {
    const g = EXTRA[ch];
    if (g) g.forEach((row, j) => [...row].forEach((c, i) => c === '#' && r.set(cx + i, y + j, color)));
    else if (textWidth(ch) > 0) drawText(r, ch, cx, y, color);
    cx += glyphW(ch) + 1;
  }
}

export type LabelStyle = 'tape' | 'float' | 'plate';

const DARK = '#1c1a20';

/**
 * Raster of centred lines: tape = text on a dark rounded tape, float = coloured text with an ink
 * outline, plate = coloured text on a roomier dark plate rimmed in the text colour (money at the
 * counter: readable over any background).
 */
function labelRaster(lines: readonly string[], style: LabelStyle, color: string, minW: number): Raster {
  const textH = lines.length * (FONT_H + LINE_GAP) - LINE_GAP;
  const pad = style === 'plate' ? 3 : 1;
  const textW = Math.max(1, minW - 2 * pad, ...lines.map(lineWidth));
  const r = new Raster(textW + 2 * pad, textH + 2 * pad);
  if (style !== 'float') {
    for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) r.set(x, y, DARK);
    if (style === 'plate') {
      for (let x = 1; x < r.w - 1; x++) [0, r.h - 1].forEach((y) => r.set(x, y, color));
      for (let y = 1; y < r.h - 1; y++) [0, r.w - 1].forEach((x) => r.set(x, y, color));
    }
    for (const [x, y] of [[0, 0], [r.w - 1, 0], [0, r.h - 1], [r.w - 1, r.h - 1]]) r.set(x, y, null);
  }
  lines.forEach((line, i) => drawLine(r, line, pad + Math.floor((textW - lineWidth(line)) / 2), pad + i * (FONT_H + LINE_GAP), color));
  if (style === 'float') outlineRaster(r, '#1a0f0a');
  return r;
}

/** Texture key of these lines in this style (at least `minW` px wide: fixed-size badges), registered on first use. */
export function labelTexture(scene: Phaser.Scene, lines: readonly string[], style: LabelStyle, color: string, minW = 0): string {
  const key = `kitchen-txt-${style}-${color}-${minW}-${lines.join('|')}`;
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, labelRaster(lines, style, color, minW).toCanvas());
  return key;
}
