/**
 * "CICCIO'S / INVADERS" wordmark (ref/invaders_title.png): bold condensed white lettering, the
 * first letters of INVADERS leaning hard and the line fanning into a gentle wave, "CICCIO'S"
 * smaller and upright on top. Flat white with a thin navy edge and a faint deep-blue halo so it
 * pops on the starfield without filling the counters of A, D, O and R. The vector glyphs
 * (./lettering.ts) are sampled 3x3 per pixel and thresholded, so every letter is crisp and
 * distinct at 1 art pixel per world unit.
 */
import { Buf, sheetOf } from './buf';
import { makeFont, type Font, type Glyph } from './lettering';

interface Line {
  text: string;
  font: Font;
  /** cap height (px) and gap between letters (px) */
  h: number;
  gap: number;
  /** extra px after a letter pair (V and A leave a hole between them) */
  kern?: Readonly<Record<string, number>>;
  /** shear (px of shift per px of height, + = leaning right) at 0..1 along the line */
  lean: (n: number) => number;
  /** top edge drop and bottom edge rise (px) at 0..1 along the line: the wave */
  drop: (n: number) => number;
  rise: (n: number) => number;
}

const INK = '#07102e';
const GLOW = '#1a2a86';
const PAD = 5;
const LINE_GAP = 3;
const SAMPLES = 3;
/** room for the lean of INVADERS: the first letter overhangs to the left, the last one slightly to the right */
const LEAN_MARGIN = 10;

const BIG: Line = {
  text: 'INVADERS',
  font: makeFont(0.215, 0.205),
  h: 33,
  gap: 1.7,
  kern: { VA: -3.2 },
  lean: (n) => 0.05 + 0.25 * (1 - n) ** 2.5 + 0.1 * n ** 4,
  drop: (n) => 6 * n ** 0.8,
  rise: (n) => 5 * (1 - (2 * n - 1) ** 2),
};

const SMALL: Line = {
  text: "CICCIO'S",
  font: makeFont(0.225, 0.21),
  h: 23,
  gap: 2.4,
  lean: () => 0,
  drop: (n) => 2.2 * n,
  rise: (n) => 1.6 * (1 - (2 * n - 1) ** 2),
};

interface Slot {
  x: number;
  w: number;
  g: Glyph;
}

function slotsOf(line: Line): { slots: Slot[]; width: number } {
  const slots: Slot[] = [];
  let x = 0;
  [...line.text].forEach((ch, i) => {
    const g = line.font[ch];
    slots.push({ x, w: g.w * line.h, g });
    x += g.w * line.h + line.gap + (line.kern?.[ch + (line.text[i + 1] ?? '')] ?? 0);
  });
  return { slots, width: x - line.gap };
}

/** Fills the line into `fill` with its top-left at (ox, oy): warp, then 3x3 coverage > 50%. */
function rasterLine(fill: Buf, line: Line, ox: number, oy: number): void {
  const { slots, width } = slotsOf(line);
  const reach = Math.ceil(line.h * 0.4);
  const x0 = Math.floor(ox - reach);
  const x1 = Math.ceil(ox + width + reach);
  for (let y = oy; y < oy + line.h; y++) {
    for (let x = x0; x <= x1; x++) {
      let cover = 0;
      for (let j = 0; j < SAMPLES; j++) {
        for (let i = 0; i < SAMPLES; i++) {
          const sx = x + (i + 0.5) / SAMPLES;
          const sy = y + (j + 0.5) / SAMPLES;
          const rx = sx - ox;
          const n = Math.max(0, Math.min(1, rx / width));
          const top = oy + line.drop(n);
          const v = (sy - top) / (oy + line.h - line.rise(n) - top);
          if (v < 0 || v > 1) continue;
          const fx = rx - line.lean(n) * (0.5 - v) * line.h;
          const slot = slots.find((s) => fx >= s.x && fx < s.x + s.w);
          if (slot && slot.g.inside((fx - slot.x) / line.h, v)) cover++;
        }
      }
      if (cover * 2 > SAMPLES * SAMPLES) fill.set(x, y, '#ffffff');
    }
  }
}

/** Cool shade on the lowest row of every letter (light from above) and the glow rings. */
function finish(fill: Buf): Buf {
  const { w, h } = fill;
  const out = new Buf(w, h);
  const solid = (x: number, y: number): boolean => fill.alpha(x, y) > 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!solid(x, y)) continue;
      out.set(x, y, solid(x, y + 1) ? '#ffffff' : '#c6d6f8');
    }
  }
  const edge = new Buf(w, h);
  edge.stamp(out, 0, 0);
  edge.outline(INK);
  const ring = new Buf(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (edge.alpha(x, y) > 0) continue;
      let d = 9;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) if (edge.alpha(x + dx, y + dy) > 0) d = Math.min(d, Math.hypot(dx, dy));
      }
      if (d <= 1.5) ring.set(x, y, GLOW, 0.75);
      else if (d <= 2.2) ring.set(x, y, GLOW, 0.3);
    }
  }
  ring.stamp(edge, 0, 0);
  return ring;
}

interface Layout {
  w: number;
  h: number;
  smallX: number;
  bigX: number;
  bigY: number;
}

function layout(): Layout {
  const w = Math.ceil(slotsOf(BIG).width + LEAN_MARGIN + PAD * 2);
  const centre = (width: number): number => Math.round((w - width) / 2);
  return {
    w,
    h: PAD * 2 + SMALL.h + LINE_GAP + BIG.h,
    smallX: centre(slotsOf(SMALL).width),
    bigX: centre(slotsOf(BIG).width) + 2,
    bigY: PAD + SMALL.h + LINE_GAP,
  };
}

const L = layout();

/** Wordmark canvas size in px. */
export const TITLE_SIZE = { w: L.w, h: L.h } as const;

/** Where the two glints twinkle, in px from the wordmark centre: the end of "CICCIO'S" and the first I. */
export const TITLE_GLINTS: readonly (readonly [number, number])[] = [
  [L.smallX + slotsOf(SMALL).width + 1 - L.w / 2, PAD + 1 - L.h / 2],
  [L.bigX + 7 - L.w / 2, L.bigY + 1 - L.h / 2],
];

/** Wordmark canvas (about 190 x 70), shown 1:1 in the playfield. */
export function buildTitle(): HTMLCanvasElement {
  const fill = new Buf(L.w, L.h);
  rasterLine(fill, SMALL, L.smallX, PAD);
  rasterLine(fill, BIG, L.bigX, L.bigY);
  return finish(fill).toCanvas();
}

export const GLINT_SIZE = 13;

/** Four-point star twinkle, 13x13 x 4 frames: small, medium, long arms, medium. */
export function buildGlint(): HTMLCanvasElement {
  const arms = [2, 4, 6, 4];
  return sheetOf(4, GLINT_SIZE, GLINT_SIZE, (b, i) => {
    const c = 6;
    const a = arms[i];
    for (let k = 1; k <= a; k++) {
      const col = k <= a / 2 ? '#ffffff' : '#9fd8ff';
      for (const [dx, dy] of [[k, 0], [-k, 0], [0, k], [0, -k]]) b.set(c + dx, c + dy, col);
    }
    b.set(c, c, '#ffffff');
    if (i === 2) for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) b.set(c + dx, c + dy, '#ffffff');
  });
}
