/**
 * The "CICCIO'S" lettering printed on Ciccio's packaging (ref/level7_wrap_tray.jpg): tall, condensed,
 * rounded monoline capitals with wide tracking. Drawn as vector strokes (no web font: identical on
 * every device). Units: cap height = 1, x from the word's left edge, y from its top.
 */

type Glyph = 'C' | 'I' | 'O' | 'Q' | 'S';

/** Glyph advance widths (cap height = 1); Q is the apostrophe. */
const GLYPH_W: Readonly<Record<Glyph, number>> = { C: 0.46, I: 0, O: 0.5, Q: 0.05, S: 0.44 };
const WORD: readonly Glyph[] = ['C', 'I', 'C', 'C', 'I', 'O', 'Q', 'S'];
/** Gap between two glyphs (cap height = 1). */
const TRACK = 0.27;
/** Stroke width (cap height = 1). */
export const LETTER_STROKE = 0.12;

export interface GlyphAt {
  glyph: Glyph;
  x: number;
}

/** Glyph positions of one "CICCIO'S" (cap height 1) and the word's width. */
export function wordLayout(): { glyphs: GlyphAt[]; width: number } {
  let x = 0;
  const glyphs = WORD.map((glyph, i) => {
    if (i > 0) x += TRACK;
    const at = { glyph, x };
    x += GLYPH_W[glyph];
    return at;
  });
  return { glyphs, width: x };
}

const LAYOUT = wordLayout();
/** Width of "CICCIO'S" with cap height 1. */
export const WORD_W = LAYOUT.width;

/** Adds one glyph's strokes (cap height 1, left edge at x) to the current path. */
function traceGlyph(ctx: CanvasRenderingContext2D, g: Glyph, x: number): void {
  const half = GLYPH_W[g] / 2;
  const cx = x + half;
  switch (g) {
    case 'C':
      ctx.moveTo(cx + half * Math.cos(Math.PI * 0.3), 0.5 + 0.5 * Math.sin(Math.PI * 0.3));
      ctx.ellipse(cx, 0.5, half, 0.5, 0, Math.PI * 0.3, Math.PI * 1.7);
      break;
    case 'I':
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1);
      break;
    case 'O':
      ctx.moveTo(cx + half, 0.5);
      ctx.ellipse(cx, 0.5, half, 0.5, 0, 0, Math.PI * 2);
      break;
    case 'Q':
      ctx.moveTo(x + GLYPH_W.Q, 0);
      ctx.lineTo(x, 0.24);
      break;
    case 'S': {
      const top = 0.255;
      const bot = 0.245;
      const a0 = -Math.PI * 0.18;
      ctx.moveTo(cx + half * Math.cos(a0), top + top * Math.sin(a0));
      ctx.ellipse(cx, top, half, top, 0, a0, Math.PI * 0.5, true);
      ctx.ellipse(cx, 1 - bot, half, bot, 0, -Math.PI * 0.5, Math.PI * 0.82);
      break;
    }
  }
}

/**
 * Strokes one "CICCIO'S" centred on (x, y), cap height h, turned by `angle` (radians). The caller sets
 * strokeStyle (and alpha); lineWidth / caps are set here.
 */
export function drawWord(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, angle: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(h, h);
  ctx.translate(-WORD_W / 2, -0.5);
  ctx.beginPath();
  for (const g of LAYOUT.glyphs) traceGlyph(ctx, g.glyph, g.x);
  ctx.lineWidth = LETTER_STROKE;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}
