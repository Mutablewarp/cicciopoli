/**
 * Vector letter shapes for the "CICCIO'S INVADERS" wordmark (ref/invaders_title.png): bold
 * condensed sans, round counters, flat terminals. A glyph is a point-in-shape test in glyph
 * space (u across, v down 0..1 = cap height); title.ts warps the lines and rasterises them
 * on the pixel grid, so the lettering is identical on every device (no system fonts).
 */

export type Shape = (u: number, v: number) => boolean;
export type Pt = readonly [number, number];

export interface Glyph {
  /** advance width in cap heights */
  w: number;
  inside: Shape;
}

const rect =
  (x0: number, y0: number, x1: number, y1: number): Shape =>
  (u, v) =>
    u >= x0 && u <= x1 && v >= y0 && v <= y1;

/** Even-odd polygon fill. */
function poly(pts: readonly Pt[]): Shape {
  return (u, v) => {
    let hit = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i];
      const [xj, yj] = pts[j];
      if (yi > v !== yj > v && u < ((xj - xi) * (v - yi)) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  };
}

const union =
  (...s: Shape[]): Shape =>
  (u, v) =>
    s.some((f) => f(u, v));
const minus =
  (a: Shape, ...cut: Shape[]): Shape =>
  (u, v) =>
    a(u, v) && !cut.some((f) => f(u, v));

/** Rectangle with a corner radius on the left (rl) and right (rr) pair of corners. */
function rrect(x0: number, y0: number, x1: number, y1: number, rl: number, rr: number): Shape {
  const half = Math.min((x1 - x0) / 2, (y1 - y0) / 2);
  const l = Math.min(rl, half);
  const r = Math.min(rr, half);
  const inCorner = (u: number, v: number, cx: number, cy: number, rad: number): boolean => (u - cx) ** 2 + (v - cy) ** 2 <= rad * rad;
  return (u, v) => {
    if (u < x0 || u > x1 || v < y0 || v > y1) return false;
    if (u < x0 + l) {
      if (v < y0 + l) return inCorner(u, v, x0 + l, y0 + l, l);
      if (v > y1 - l) return inCorner(u, v, x0 + l, y1 - l, l);
    } else if (u > x1 - r) {
      if (v < y0 + r) return inCorner(u, v, x1 - r, y0 + r, r);
      if (v > y1 - r) return inCorner(u, v, x1 - r, y1 - r, r);
    }
    return true;
  };
}

/** Points on an ellipse arc (degrees, y down) used as a stroke centre line. */
function arc(cx: number, cy: number, rx: number, ry: number, from: number, to: number): Pt[] {
  const n = Math.max(2, Math.ceil(Math.abs(to - from) / 8));
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = ((from + ((to - from) * i) / n) * Math.PI) / 180;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] as const;
  });
}

/** Thick line through the points (union of capsules of radius r). */
function stroke(pts: readonly Pt[], r: number): Shape {
  return (u, v) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[i + 1];
      const dx = bx - ax;
      const dy = by - ay;
      const k = Math.max(0, Math.min(1, ((u - ax) * dx + (v - ay) * dy) / (dx * dx + dy * dy)));
      if ((u - ax - dx * k) ** 2 + (v - ay - dy * k) ** 2 <= r * r) return true;
    }
    return false;
  };
}

export type Font = Readonly<Record<string, Glyph>>;

/** Builds the glyph set. t = vertical stem width, tv = horizontal bar height (cap heights). */
export function makeFont(t: number, tv: number): Font {
  /** closed bowl or counter: a stadium whose ends are half circles */
  const round = (w: number): Shape => rrect(0, 0, w, 1, 0.31, 0.31);
  const counter = (w: number): Shape => rrect(t, tv, w - t, 1 - tv, 0.1, 0.1);

  const ow = 0.62;
  const O: Shape = minus(round(ow), counter(ow));
  const C: Shape = minus(O, rect(ow * 0.5, 0.31, ow + 1, 0.69));

  const dw = 0.62;
  const D: Shape = minus(rrect(0, 0, dw, 1, 0, 0.34), rrect(t, tv, dw - t * 0.95, 1 - tv, 0, 0.12));

  const rw = 0.63;
  const bowl = 0.62;
  const R: Shape = union(
    minus(rrect(0, 0, rw, bowl, 0, 0.3), rrect(t, tv, rw - t * 0.95, bowl - tv * 0.95, 0, 0.1)),
    rect(0, 0, t, 1),
    poly([[rw * 0.3, bowl - 0.12], [rw * 0.3 + t * 1.15, bowl - 0.12], [rw, 1], [rw - t * 1.3, 1]]),
  );

  // diagonals are a touch lighter than the stems so the counters of N, V and A stay open
  const nw = 0.74;
  const N: Shape = union(
    rect(0, 0, t, 1),
    rect(nw - t, 0, nw, 1),
    poly([[0, 0], [t * 0.95, 0], [nw, 1], [nw - t * 0.95, 1]]),
  );

  const vw = 0.76;
  const tip = 0.075;
  const V: Shape = union(
    poly([[0, 0], [t, 0], [vw / 2 + tip, 1], [vw / 2 - tip, 1]]),
    poly([[vw, 0], [vw - t, 0], [vw / 2 - tip, 1], [vw / 2 + tip, 1]]),
  );

  const aw = 0.76;
  const foot = t * 0.92;
  const A: Shape = union(
    poly([[aw / 2 - tip * 0.9, 0], [aw / 2 + tip * 0.9, 0], [foot, 1], [0, 1]]),
    poly([[aw / 2 - tip * 0.9, 0], [aw / 2 + tip * 0.9, 0], [aw, 1], [aw - foot, 1]]),
    rect(0.12, 0.6, aw - 0.12, 0.6 + tv * 0.8),
  );

  const ew = 0.5;
  const E: Shape = union(rect(0, 0, t, 1), rect(0, 0, ew, tv), rect(0, 0.5 - tv / 2, ew * 0.88, 0.5 + tv / 2), rect(0, 1 - tv, ew, 1));

  const sw = 0.6;
  const rx = sw / 2 - t / 2;
  const top = 0.27;
  const ry = top - tv / 2;
  const cx = sw / 2;
  // two bowls joined by a slightly diagonal spine
  const S: Shape = stroke(
    [...arc(cx, top, rx, ry, -22, -246), ...arc(cx, 1 - top, rx, ry, -66, 158)],
    t / 2,
  );

  const apostrophe: Shape = poly([[0.01, 0.03], [0.06, 0], [0.22, 0], [0.27, 0.04], [0.27, 0.3], [0.16, 0.56], [0.03, 0.6], [0.1, 0.34], [0.01, 0.28]]);

  return {
    C: { w: ow, inside: C },
    O: { w: ow, inside: O },
    I: { w: t + 0.01, inside: rect(0, 0, t + 0.01, 1) },
    D: { w: dw, inside: D },
    R: { w: rw, inside: R },
    N: { w: nw, inside: N },
    V: { w: vw, inside: V },
    A: { w: aw, inside: A },
    E: { w: ew, inside: E },
    S: { w: sw, inside: S },
    "'": { w: 0.27, inside: apostrophe },
  };
}
