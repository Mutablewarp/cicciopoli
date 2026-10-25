/**
 * Rows of "CICCIO'S" printed all over a sheet of paper, like Ciccio's wraps and tray liners: every
 * other row turned upside down, rows staggered, the whole print at a slight angle. printRows() is
 * the pure layout (unit-tested); printSheet() strokes it inside the caller's clip.
 */
import { WORD_W, drawWord } from './letters';

export interface PrintSpec {
  /** cap height of the letters (art px) */
  letterH: number;
  /** distance between two rows' baselines, in letter heights */
  rowPitch: number;
  /** blank between two words of a row, in letter heights */
  wordGap: number;
  /** angle of the rows (radians) */
  angle: number;
  /** 0..1: shifts the rows along / across their direction (each paper panel prints its own phase) */
  phase: number;
}

export interface WordAt {
  /** centre of the word, in the sheet's coordinates */
  x: number;
  y: number;
  /** total turn of the word: the rows' angle, + PI on the upside-down rows */
  angle: number;
  /** row index (odd rows are upside down) */
  row: number;
}

/**
 * Words covering the rectangle (0, 0, w, h): rows along `spec.angle`, every other row upside down
 * and shifted by half a word. Words reaching into the rectangle only partly are kept (the clip cuts them).
 */
export function printRows(w: number, h: number, spec: PrintSpec): WordAt[] {
  const pitchY = spec.letterH * spec.rowPitch;
  const pitchX = spec.letterH * (WORD_W + spec.wordGap);
  const reach = Math.hypot(w, h) / 2;
  const rows = Math.ceil(reach / pitchY) + 1;
  const cols = Math.ceil(reach / pitchX) + 1;
  const cos = Math.cos(spec.angle);
  const sin = Math.sin(spec.angle);
  const out: WordAt[] = [];
  for (let r = -rows; r <= rows; r++) {
    const odd = (r & 1) === 1;
    const v = (r + spec.phase) * pitchY;
    for (let c = -cols; c <= cols; c++) {
      const u = (c + spec.phase + (odd ? 0.5 : 0)) * pitchX;
      const x = w / 2 + u * cos - v * sin;
      const y = h / 2 + u * sin + v * cos;
      const pad = pitchX / 2;
      if (x < -pad || x > w + pad || y < -pad || y > h + pad) continue;
      out.push({ x, y, angle: spec.angle + (odd ? Math.PI : 0), row: r });
    }
  }
  return out;
}

/** Strokes the print over (0, 0, w, h) in `ink` (the caller clips to the paper's shape). */
export function printSheet(ctx: CanvasRenderingContext2D, w: number, h: number, spec: PrintSpec, ink: string): void {
  ctx.save();
  ctx.strokeStyle = ink;
  for (const p of printRows(w, h, spec)) drawWord(ctx, p.x, p.y, spec.letterH, p.angle);
  ctx.restore();
}
