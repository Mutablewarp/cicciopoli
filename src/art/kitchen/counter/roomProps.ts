/**
 * Props of the Sperlinga dining room, placed in the perspective box of ./roomKit: the black iron
 * pergola (posts, edge bars, the big arches on the brick walls, ring motifs), the greenery (pothos,
 * philodendron and monstera leaves, trailing vines, leafy mounds), the dark planters, the black tables
 * with their little candle lights and the black shell chairs. Background props get dark-hue outlines
 * (iron black, deep leaf green), never ink. All placement is seeded so the art is identical on every
 * build; leaves further back are drawn smaller and a tone darker.
 */
import { Mask } from '../../hills/mask';
import { Raster, hash2 } from '../../hills/raster';
import { rng } from '../../pixel';
import { lineR, rectR } from '../../rampage/draw';
import { KC } from './palette';
import { type Box, on, proj, walls } from './roomKit';

type Pt = readonly [number, number];

export function fillPoly(r: Raster, pts: readonly Pt[], col: string): void {
  const m = new Mask(r.w, r.h);
  m.poly(pts, 1);
  for (let i = 0; i < m.v.length; i++) if (m.v[i] === 1) r.set(i % r.w, Math.floor(i / r.w), col);
}

/** 1-px ellipse outline (iron ring motif). */
export function ring(r: Raster, cx: number, cy: number, rx: number, ry: number, col: string = KC.iron): void {
  const n = Math.ceil(Math.max(rx, ry) * 7);
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    r.set(Math.round(cx + Math.cos(t) * rx), Math.round(cy + Math.sin(t) * ry), col);
  }
}

/** Iron bar between two points, 2 px thick when `thick`. */
export function bar(r: Raster, a: Pt, c: Pt, thick: boolean): void {
  lineR(r, Math.round(a[0]), Math.round(a[1]), Math.round(c[0]), Math.round(c[1]), KC.iron);
  if (thick) lineR(r, Math.round(a[0]) + 1, Math.round(a[1]), Math.round(c[0]) + 1, Math.round(c[1]), KC.iron);
}

export function post(r: Raster, x: number, y0: number, y1: number): void {
  rectR(r, x, y0, 2, y1 - y0, KC.iron);
  rectR(r, x, y0, 1, y1 - y0, KC.ironHi);
}

/** A curve on a side wall: world points (D, Y) projected and joined. */
function wallCurve(r: Raster, b: Box, side: -1 | 1, pts: readonly Pt[]): void {
  const X = side < 0 ? walls(b).xl : walls(b).xr;
  const sp = pts.map(([d, y]) => proj(b, X, y, d / b.f));
  for (let i = 1; i < sp.length; i++) bar(r, sp[i - 1], sp[i], pts[i][0] / b.f < 1.3);
}

/** The big iron arch on a brick wall, from depth d0 to d1, its crown `rise` over the floor line. */
export function wallArch(r: Raster, b: Box, side: -1 | 1, d0: number, d1: number, rise: number): void {
  const yf = walls(b).yf;
  const pts: Pt[] = [];
  for (let i = 0; i <= 24; i++) {
    const u = i / 24;
    pts.push([d0 + (d1 - d0) * u, yf - rise * Math.sin(Math.PI * u) ** 0.7]);
  }
  wallCurve(r, b, side, pts);
}

/** Iron rings along a side wall just under the ceiling (the pergola's top frieze). */
export function wallRings(r: Raster, b: Box, side: -1 | 1, d0: number, d1: number, n: number): void {
  const w = walls(b);
  const X = side < 0 ? w.xl : w.xr;
  for (let i = 0; i < n; i++) {
    const d = d0 + ((i + 0.5) * (d1 - d0)) / n;
    const rad = (d1 - d0) / n / 2;
    const pts: Pt[] = [];
    for (let k = 0; k <= 16; k++) {
      const t = (k / 16) * Math.PI * 2;
      pts.push([d + Math.cos(t) * rad, w.yc + rad * 0.9 + Math.sin(t) * rad * 0.8]);
    }
    wallCurve(r, b, side, pts);
  }
  const top = (d: number): Pt => proj(b, X, w.yc + 1, d / b.f);
  bar(r, top(d0), top(d1), true);
}

const LEAVES = {
  s: ['.ab.', 'abbc', 'bbcd', '.cd.'],
  m: ['..ab..', '.abbb.', 'abbbbc', 'abbbcc', '.bccd.', '..cd..'],
  l: ['.ab..ab.', 'abbbabbb', 'abbbbbbc', '.bbbbbc.', '.bbbbcc.', '..bccd..', '...cd...'],
  // monstera: a big round leaf with slits from the edge to the midrib
  x: ['..aabb...', '.ab.bbbc.', 'abbb.bbbc', '.abbbb.c.', 'ab.bbbbcc', '.abbb.bc.', '..bbbccd.', '...ccd...'],
} as const;
export type LeafSize = keyof typeof LEAVES;

/** One leaf; `dim` darkens it a tone (further back), some pothos leaves are variegated. */
export function leaf(r: Raster, x: number, y: number, size: LeafSize, seed: number, flip = false, dim = false): void {
  const rows = LEAVES[size];
  const pale = size !== 'x' && hash2(x, y, seed) < 0.22;
  const pal: Record<string, string> = dim
    ? { a: KC.leaf, b: KC.leafShade, c: KC.leafDark, d: KC.leafDeep }
    : { a: pale ? KC.leafPale : KC.leafLight, b: KC.leaf, c: pale ? KC.leafLight : KC.leafShade, d: KC.leafDark };
  const w = rows[0].length;
  rows.forEach((row, j) => {
    for (let i = 0; i < w; i++) {
      const ch = row[i];
      if (ch !== '.') r.set(x + (flip ? w - 1 - i : i), y + j, pal[ch]);
    }
  });
}

/** A stem rising from (x, y) to `h` px, bending, a big leaf at its tip (monstera / philodendron). */
export function stem(r: Raster, x: number, y: number, h: number, seed: number, size: LeafSize): void {
  const lean = (hash2(seed, 1, 5) - 0.5) * 0.8;
  let tx = x;
  for (let k = 0; k < h; k++) {
    tx = Math.round(x + lean * k * (k / h));
    r.set(tx, y - k, KC.leafShade);
  }
  const w = LEAVES[size][0].length;
  leaf(r, tx - Math.floor(w / 2), y - h - LEAVES[size].length + 2, size, seed, lean < 0);
}

/** Pothos vine hanging from (x, y), `len` px long, swaying, a leaf every few px. */
export function vine(r: Raster, x: number, y: number, len: number, seed: number, size: LeafSize = 's', dim = false): void {
  const phase = hash2(seed, 1, 1) * 6;
  const step = size === 's' ? 4 : 5;
  const lw = LEAVES[size][0].length;
  let side = hash2(seed, 2, 1) < 0.5 ? -1 : 1;
  for (let k = 0; k < len; k++) {
    const vx = Math.round(x + Math.sin(k * 0.16 + phase) * 2);
    r.set(vx, y + k, dim ? KC.leafDeep : KC.leafDark);
    if (k % step === 2) {
      leaf(r, side < 0 ? vx - lw : vx + 1, y + k - 1, size, seed + k, side < 0, dim);
      side = -side;
    }
  }
}

/** Leafy mound filling an ellipse: a dark mass first, then leaves (sizes picked per leaf). */
export function bush(r: Raster, cx: number, cy: number, rx: number, ry: number, seed: number, sizes: readonly LeafSize[], dim = false): void {
  const rnd = rng(seed);
  const n = Math.round((rx * ry) / 6);
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2;
    const d = Math.sqrt(rnd());
    const x = Math.round(cx + Math.cos(a) * rx * d);
    const y = Math.round(cy + Math.sin(a) * ry * d);
    if (i < n / 3) rectR(r, x - 3, y - 2, 6, 5, dim || i % 2 === 0 ? KC.leafDeep : KC.leafDark);
    else {
      const size = sizes[Math.floor(rnd() * sizes.length)];
      leaf(r, x - 3, y - 3, size, seed + i, rnd() < 0.5, dim);
    }
  }
}

/** Dark planter along a side wall: front face at the frame, top and inner face receding to depth
 * z1; `pw` world px wide, `ph` tall. */
export function planter(r: Raster, b: Box, side: -1 | 1, pw: number, ph: number, z1: number): void {
  const w = walls(b);
  const out = side < 0 ? w.xl : w.xr;
  const inn = out - side * pw;
  const top = w.yf - ph;
  const P = (X: number, Y: number, z: number): Pt => proj(b, X, Y, z);
  fillPoly(r, [P(inn, top, 1), P(inn, w.yf, 1), P(inn, w.yf, z1), P(inn, top, z1)], KC.planterShade);
  fillPoly(r, [P(out, top, 1), P(inn, top, 1), P(inn, top, z1), P(out, top, z1)], KC.planterLight);
  const [ax, ay] = P(Math.min(out, inn), top, 1);
  const [bx, by] = P(Math.max(out, inn), w.yf, 1);
  rectR(r, Math.round(ax), Math.round(ay), Math.round(bx - ax), Math.round(by - ay), KC.planter);
  rectR(r, Math.round(ax), Math.round(ay), Math.round(bx - ax), 1, KC.planterLight);
  rectR(r, Math.round(ax), Math.round(by) - 1, Math.round(bx - ax), 1, KC.planterShade);
}

/** Black table at world (X, z): top `ht` over the floor, `hw` half wide; a candle light on it. */
export function table(r: Raster, b: Box, X: number, z: number, hw: number, ht: number, candle: boolean): void {
  const yf = walls(b).yf;
  const yt = yf - ht;
  const z2 = z + 22 / b.f;
  const P = (x: number, y: number, zz: number): Pt => proj(b, x, y, zz);
  const [lx, ty] = P(X - hw, yt, z);
  const [rx] = P(X + hw, yt, z);
  const [px, fy] = P(X, yf, z + 11 / b.f);
  rectR(r, Math.round(px), Math.round(ty), 1, Math.round(fy - ty), KC.iron);
  rectR(r, Math.round(px) - Math.round(4 / z), Math.round(fy), Math.round(8 / z) + 1, 1, KC.iron);
  fillPoly(r, [P(X - hw, yt, z), P(X + hw, yt, z), P(X + hw, yt, z2), P(X - hw, yt, z2)], KC.blackLight);
  rectR(r, Math.round(lx), Math.round(ty), Math.round(rx - lx), Math.max(1, Math.round(2 / z)), KC.black);
  rectR(r, Math.round(lx), Math.round(ty), Math.round(rx - lx), 1, KC.blackHi);
  if (!candle) return;
  const [cx, cy] = P(X, yt, z + 11 / b.f);
  const x = Math.round(cx);
  const y = Math.round(cy) - 2;
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
    if (Math.hypot(dx, dy) < 3.2 && on(x + dx, y + dy, 0.45 - Math.hypot(dx, dy) / 8)) r.set(x + dx, y + dy, KC.bulbGlow);
  }
  rectR(r, x, y, 1, 2, KC.bulb);
  r.set(x, y, KC.bulbCore);
}

/** Black shell chair at world (X, z) seen from the aisle side: one curved shell (back and seat) away
 * from `face`, two short legs. */
export function chair(r: Raster, b: Box, X: number, z: number, face: -1 | 1): void {
  const yf = walls(b).yf;
  const s = 1 / z;
  const [sx, sy] = proj(b, X, yf - 18, z);
  const [, fy] = proj(b, X, yf, z);
  const bx = Math.round(sx - face * 5 * s);
  const top = Math.round(sy - 12 * s);
  const seat = Math.round(9 * s);
  const t = Math.max(2, Math.round(2.5 * s));
  rectR(r, face > 0 ? bx : bx - t + 1, top, t, Math.round(sy) - top + t, KC.black);
  rectR(r, face > 0 ? bx : bx - seat, Math.round(sy), seat + 1, t, KC.black);
  for (const lx of [bx + face, bx + face * (seat - 1)]) rectR(r, lx, Math.round(sy) + t, 1, Math.max(1, Math.round(fy - sy) - t), KC.iron);
}
