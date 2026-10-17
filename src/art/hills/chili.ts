/**
 * Peperoncino (chili) 24x24, faces LEFT. 0-1 idle bounce, 2 crouch (telegraph),
 * 3 airborne (stretched), 4 squashed.
 */
import { Mask, paintMask, type Tone } from './mask';
import { Raster, gridR, outlineRaster } from './raster';

const RED: Tone = { light: '#ff6448', base: '#e42a1c', shade: '#aa160e', dark: '#7c0c08' };
const CAP: Tone = { light: '#7cd040', base: '#3fa428', shade: '#287a1c' };
const LINE = '#2a0806';
const SPEC = '#ffd2c4';

interface Shape {
  /** height of the red body and half width at the shoulders */
  h: number;
  w: number;
  /** bottom y of the curled tip */
  base: number;
  /** horizontal curl of the tip towards the back (right) */
  curl: number;
  squint: boolean;
}

const POSES: readonly Shape[] = [
  { h: 17, w: 4.5, base: 22, curl: 5, squint: false },
  { h: 16, w: 5, base: 22, curl: 5, squint: false },
  { h: 12, w: 5.5, base: 22, curl: 5, squint: true },
  { h: 17, w: 4, base: 21, curl: 4, squint: false },
];

/** Tapered, slightly curved chili body; returns the top y of the body. */
function chiliBody(m: Mask, s: Shape): number {
  const top = s.base - s.h;
  for (let y = top; y <= s.base; y++) {
    const t = (y - top) / s.h;
    const half = Math.max(0, s.w * (1 - Math.pow(t, 2.2)) + (t < 0.15 ? -1 + t * 6 : 0));
    const cx = 11 + s.curl * Math.pow(t, 3);
    m.span(Math.round(cx - half), Math.round(cx + half), y, 1);
  }
  // tip flicks up at the back like a little tail
  const tipX = Math.round(11 + s.curl);
  m.set(tipX + 1, s.base - 1, 1);
  m.set(tipX + 2, s.base - 2, 1);
  return top;
}

function cap(m: Mask, top: number, w: number): void {
  m.ellipse(11, top, w, 2, 2);
  // drooping sepal points
  m.set(11 - w, top + 2, 2);
  m.set(11 - Math.round(w / 3), top + 3, 2);
  m.set(11 + Math.round(w / 2), top + 2, 2);
  m.set(11 + w, top + 2, 2);
  // curly stem
  m.set(12, top - 2, 2);
  m.set(13, top - 3, 2);
  m.set(14, top - 3, 2);
  m.set(15, top - 2, 2);
}

function face(r: Raster, top: number, s: Shape): void {
  // half-lidded sly eyes looking left; one brow cocked for mischief
  const eyes = s.squint
    ? ['kk.kk', 'Pw.Pw', '.....', '..kkk']
    : ['k....', '.k.kk', 'kk.kk', 'Pw.Pw', 'Pw.Pw', '....k', '.kwk.'];
  gridR(r, eyes, { k: LINE, P: '#141414', w: '#fcfcf0' }, 8, top + (s.squint ? 3 : 2));
}

/** Gloss on the lit shoulder plus a streak hugging the left edge of the belly. */
function shine(r: Raster, m: Mask, top: number, s: Shape): void {
  r.set(8, top + 2, SPEC);
  r.set(9, top + 1, SPEC);
  for (let y = top + s.h - 7; y < top + s.h - 4; y++) {
    let x = 0;
    while (x < 24 && m.get(x, y) !== 1) x++;
    if (x < 23 && m.get(x + 2, y) === 1) r.set(x + 1, y, SPEC);
  }
}

function pose(s: Shape): Raster {
  const m = new Mask(24, 24);
  const top = chiliBody(m, s);
  cap(m, top, Math.max(3, s.w - 1));
  const r = new Raster(24, 24);
  paintMask(m, r, { 1: RED, 2: CAP }, { shadeDepth: 2, lightDepth: 1 });
  shine(r, m, top, s);
  face(r, top, s);
  outlineRaster(r, LINE);
  return r;
}

function squashed(): Raster {
  const m = new Mask(24, 24);
  m.ellipse(12, 21, 9, 2, 1);
  m.ellipse(18, 19, 3, 1, 2);
  const r = new Raster(24, 24);
  paintMask(m, r, { 1: RED, 2: CAP }, { shadeDepth: 1 });
  gridR(r, ['k.k.k.k', '.k...k.', 'k.k.k.k'], { k: LINE }, 6, 20);
  outlineRaster(r, LINE);
  return r;
}

export function buildChili(): Raster[] {
  return [...POSES.map(pose), squashed()];
}
