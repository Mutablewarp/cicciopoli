/**
 * Drawing kit of the food lane: every piece of food is a material mask lit from the top-left
 * (hills/mask paintMask), detailed, outlined in its own dark hue and stacked back to front; the
 * outer silhouette of a finished frame is then inked. Deterministic: hash2 / seeded rng only.
 */
import { Mask, paintMask, type Tone } from '../../hills/mask';
import { Raster, hash2, outlineRaster, packColor } from '../../hills/raster';
import { bayer, mix } from '../../pixel';
import { KITCHEN, SHEET_SPEC } from '../keys';
import { INK, WHITE } from './palette';

export type Pt = readonly [number, number];

/** Size of a pan's contents (KITCHEN.binFill / binSide / binBun frames, drawn at BIN.fillX / fillY). */
export const PAN = { w: SHEET_SPEC[KITCHEN.binFill][0], h: SHEET_SPEC[KITCHEN.binFill][1] } as const;

/** `n` frames of w x h, frame i drawn by draw(r, i). */
export function frames(n: number, w: number, h: number, draw: (r: Raster, i: number) => void): Raster[] {
  return Array.from({ length: n }, (_, i) => {
    const r = new Raster(w, h);
    draw(r, i);
    return r;
  });
}

export interface PieceOpts {
  /** paints extra detail on the lit piece before it is outlined */
  detail?: (p: Raster, m: Mask) => void;
  /** outline colour (default INK) */
  line?: string;
  shadeDepth?: number;
  lightDepth?: number;
}

/** One food piece: `shape` fills a mask (id 1), painted with `tone`, detailed, outlined, stacked on `r`. */
export function piece(r: Raster, tone: Tone, shape: (m: Mask) => void, opts: PieceOpts = {}): Mask {
  const m = new Mask(r.w, r.h);
  shape(m);
  const p = new Raster(r.w, r.h);
  paintMask(m, p, { 1: tone }, { shadeDepth: opts.shadeDepth ?? 1, lightDepth: opts.lightDepth ?? 1 });
  opts.detail?.(p, m);
  outlineRaster(p, opts.line ?? INK);
  r.blit(p, 0, 0);
  return m;
}

/** True for mask pixels whose 4 neighbours are inside the mask too. */
export function inner(m: Mask, x: number, y: number): boolean {
  return m.get(x, y) !== 0 && m.get(x - 1, y) !== 0 && m.get(x + 1, y) !== 0 && m.get(x, y - 1) !== 0 && m.get(x, y + 1) !== 0;
}

/** Scatters `color` over the inner mask pixels with probability `p` (position hash, deterministic). */
export function specks(r: Raster, m: Mask, color: string, p: number, seed: number): void {
  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) if (inner(m, x, y) && hash2(x, y, seed) < p) r.set(x, y, color);
  }
}

/** Ragged edge: grows / bites single border pixels of the mask (hash, deterministic), e.g. breadcrumb crusts. */
export function roughen(m: Mask, seed: number, grow: number, bite: number): void {
  const src = Uint8Array.from(m.v);
  const at = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < m.w && y < m.h && src[y * m.w + x] !== 0;
  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) {
      const near = at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1);
      const rim = at(x, y) && !(at(x - 1, y) && at(x + 1, y) && at(x, y - 1) && at(x, y + 1));
      if (!at(x, y) && near && hash2(x, y, seed) < grow) m.set(x, y, 1);
      else if (rim && hash2(x, y, seed + 1) < bite) m.set(x, y, 0);
    }
  }
}

/** Fills a tapered capsule from A (radius ra) to B (radius rb) into the mask (chillies, drumsticks, fries). */
export function capsuleMask(m: Mask, ax: number, ay: number, bx: number, by: number, ra: number, rb: number, id = 1): void {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) {
      const t = Math.max(0, Math.min(1, ((x + 0.5 - ax) * dx + (y + 0.5 - ay) * dy) / len2));
      const rad = ra + (rb - ra) * t;
      if ((x + 0.5 - ax - dx * t) ** 2 + (y + 0.5 - ay - dy * t) ** 2 <= rad * rad) m.set(x, y, id);
    }
  }
}

/** Sets pixels only where `r` is already opaque (specular glints, veins, seeds). */
export function dots(r: Raster, pts: readonly Pt[], color: string = WHITE): void {
  for (const [x, y] of pts) if (r.get(x, y) !== 0) r.set(x, y, color);
}

/**
 * Lambert light of the point (x, y) on an ellipsoid of centre (cx, cy) and radii rx, ry, the light
 * coming from the top-left towards the viewer: about -0.6 (bottom-right rim) .. 1 (top-left glint).
 */
export function ballLight(x: number, y: number, cx: number, cy: number, rx: number, ry: number): number {
  const u = (x + 0.5 - cx) / rx;
  const v = (y + 0.5 - cy) / ry;
  const nz = Math.sqrt(Math.max(0, 1 - u * u - v * v));
  return -0.55 * u - 0.6 * v + 0.58 * nz;
}

/**
 * Colour of `ramp` (dark -> light) at level t in 0..1; between two steps an ordered dither over the
 * middle `spread` of the gap (0 = hard bands, 1 = full dither) keeps glossy surfaces smooth.
 */
export function rampAt(ramp: readonly string[], t: number, x: number, y: number, spread = 0.4): string {
  const f = Math.max(0, Math.min(1, t)) * (ramp.length - 1);
  const i = Math.floor(f);
  return i + 1 < ramp.length && f - i > 0.5 + (bayer(x, y) - 0.5) * spread ? ramp[i + 1] : ramp[i];
}

/** Outline colour for soft food (cheese, sauce, jam): its shade sunk towards the ink. */
export const softLine = (tone: Tone): string => mix(tone.shade, INK, 0.6);

/** Recolours every opaque pixel touching transparency (4-neighbourhood) with INK: the outer silhouette. */
export function inkEdge(r: Raster, color: string = INK): void {
  const ink = packColor(color);
  const src = r.px.slice();
  const clear = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < r.w && y < r.h && src[y * r.w + x] === 0;
  for (let y = 0; y < r.h; y++) {
    for (let x = 0; x < r.w; x++) {
      if (src[y * r.w + x] === 0) continue;
      if (clear(x - 1, y) || clear(x + 1, y) || clear(x, y - 1) || clear(x, y + 1)) r.px[y * r.w + x] = ink;
    }
  }
}

/** Jittered staggered grid of spots over x0..x1 / y0..y1, `sx` x `sy` px apart, back row first (front pieces overlap). */
export function scatter(sx: number, sy: number, seed: number, x0 = 3, y0 = 3, x1 = PAN.w - 4, y1 = PAN.h - 4): Pt[] {
  const pts: Pt[] = [];
  for (let y = y0, row = 0; y <= y1; y += sy, row++) {
    for (let x = x0 + (row & 1 ? sx >> 1 : 0); x <= x1; x += sx) {
      pts.push([x + Math.round((hash2(x, y, seed) - 0.5) * 2), y + Math.round((hash2(y, x, seed) - 0.5) * 2)]);
    }
  }
  return pts;
}

/**
 * The heap under the pieces: the whole pan floor covered in `tone` one step darker (the shadowed gaps
 * between the pieces, crumbs of `fleck`), so the pan reads full to the brim and every piece pops.
 */
export function bed(r: Raster, tone: Tone, seed: number, fleck?: string): void {
  const deep = { light: tone.base, base: tone.shade, shade: tone.dark ?? mix(tone.shade, INK, 0.4) };
  piece(r, deep, (m) => m.rect(1, 1, r.w - 2, r.h - 2, 1), { detail: fleck ? (p, m) => specks(p, m, fleck, 0.2, seed) : undefined });
}

/** Trims a pan frame to the pan floor (1-px clear border, cut corners) and inks the silhouette against the steel. */
export function panClip(r: Raster): Raster {
  for (let y = 0; y < r.h; y++) {
    for (let x = 0; x < r.w; x++) {
      const dx = Math.min(x, r.w - 1 - x);
      const dy = Math.min(y, r.h - 1 - y);
      if (dx === 0 || dy === 0 || dx + dy < 3) r.set(x, y, null);
    }
  }
  inkEdge(r);
  return r;
}

/** Recolours every opaque pixel of `r` matching `from` (packed) via `to` — palette swaps for cook states. */
export function recolor(r: Raster, swap: ReadonlyMap<number, string>): void {
  r.map((c) => {
    const to = swap.get(c);
    return to === undefined ? c : packColor(to);
  });
}

/** Map from every tone colour of `a` to the matching colour of `b` (light, base, shade, dark). */
export function toneSwap(pairs: readonly (readonly [Tone, Tone])[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const [a, b] of pairs) {
    map.set(packColor(a.light), b.light);
    map.set(packColor(a.base), b.base);
    map.set(packColor(a.shade), b.shade);
    if (a.dark) map.set(packColor(a.dark), b.dark ?? b.shade);
  }
  return map;
}

/** Shade step 0 (dark rim) .. 3 (highlight) of column u in 0..1 across a cylinder lit from the left (cans, cups, bottles). */
export function cylLevel(u: number): number {
  if (u < 0.12 || (u >= 0.42 && u < 0.72)) return 2;
  if (u < 0.42) return 3;
  return u < 0.88 ? 1 : 0;
}
