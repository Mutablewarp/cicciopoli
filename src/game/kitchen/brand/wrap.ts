/**
 * The wrapped burger like the real one (ref/level7_wrap_tray.jpg): a crumpled KRAFT paper parcel
 * printed with rows of dark-grey "CICCIO'S", the rows cut by the folds (every paper panel prints at
 * its own angle / phase), warm tan paper broken in straight creases and facets, a slanted crumpled
 * front flap. Four frames of 44x32 art px, same as KITCHEN.wrap:
 * 0 the burger on the open paper, 1 the front and the sides fold up, 2 the top flap comes down,
 * 3 the parcel. The burger in frames 0-2 is the pixel-art layer sheet (KITCHEN.layer), hard pixels.
 */
import { KITCHEN, LAYER, LAYER_H, layerFrame, type LayerKind } from '../../../art/kitchen/keys';
import { contactShadow, drawPixels, polyPath, smoothPath, type PixelPick, type Pt } from './kit';
import { printSheet, type PrintSpec } from './print';

export const WRAP_W = 44;
export const WRAP_H = 32;

const KRAFT = {
  light: '#f4dcbf',
  base: '#dfbf9c',
  shade: '#b38c66',
  rim: 'rgba(104,70,38,0.14)',
  edge: 'rgba(98,68,38,0.45)',
  ink: 'rgba(56,50,46,0.88)',
  fold: 'rgba(100,70,40,0.3)',
  under: 'rgba(84,56,30,0.4)',
  wrinkle: 'rgba(104,74,44,0.1)',
  crest: 'rgba(255,246,228,0.38)',
  lit: 'rgba(255,246,228,0.24)',
  dim: 'rgba(104,72,42,0.14)',
} as const;

/** The burger shown in the paper (pixel art, scaled to fit the parcel). */
const BURGER: readonly LayerKind[] = ['bunBottom', 'manzo', 'cheddar', 'bunTop'];
const BURGER_AT = { x: 22, base: 29.6, scale: 0.75 } as const;

const PRINT = { letterH: 2.7, rowPitch: 2.55, wordGap: 1.3 } as const;
const spec = (angle: number, phase: number): PrintSpec => ({ ...PRINT, angle, phase });

/** One frame of the fold: the paper behind the burger, the folds in front of it, the creases. */
interface FoldFrame {
  /** outline of the sheet behind the burger (frame 3: the whole parcel) */
  back: readonly Pt[];
  /** top flap folded down from the back (closed outline), drawn over the burger */
  cap?: readonly Pt[];
  /** side flaps (left; the right one is mirrored), drawn over the burger */
  side?: readonly Pt[];
  /** wavy top edge of the front flap (left to right); the flap fills down to the bottom */
  front: readonly Pt[];
  burger: boolean;
  /** crease lines (open polylines: crumpled paper breaks in straight facets) */
  creases: readonly (readonly Pt[])[];
  /** crumpled planes of the paper, lit (towards the top-left light) or turned away */
  facets?: readonly { pts: readonly Pt[]; lit: boolean }[];
}

const FRAMES: readonly FoldFrame[] = [
  {
    back: [[2, 30.8], [1.2, 18], [2.6, 9.4], [9, 6.6], [22, 5.8], [35, 6.6], [41.4, 9.4], [42.8, 18], [42, 30.8], [32, 31.2], [22, 31.3], [12, 31.2]],
    front: [[0.6, 27.4], [12, 26.4], [24, 27], [36, 26.2], [43.4, 26.8]],
    burger: true,
    creases: [[[4, 12], [5.5, 20], [5, 28]], [[40, 12], [38.6, 20], [39.2, 28]]],
  },
  {
    back: [[3, 30.8], [2.2, 17], [4, 8], [10, 4.8], [22, 4.2], [34, 4.8], [40, 8], [41.8, 17], [41, 30.8], [32, 31.2], [22, 31.3], [12, 31.2]],
    side: [[2.4, 31.2], [2.2, 15], [5.4, 12.8], [11, 22], [11.6, 31.2]],
    front: [[1.6, 22.4], [11, 20.8], [22, 21.6], [33, 20.4], [42.4, 21.6]],
    burger: true,
    creases: [[[14, 30], [17, 25.5], [21, 23.8]], [[30, 30], [27.5, 25.5], [24, 23.6]]],
  },
  {
    back: [[4.2, 30.6], [3, 16], [4.8, 7], [10.6, 3.6], [22, 3], [33.4, 3.6], [39.2, 7], [41, 16], [39.8, 30.6], [31, 31.1], [22, 31.2], [13, 31.1]],
    // the flap reaches down under the front flap: no gap, the burger is hidden (opaque paper)
    cap: [[3, 18], [4.6, 6.8], [10.6, 3.4], [22, 2.8], [33.4, 3.4], [39.6, 6.8], [41.2, 18], [40.6, 21.8], [33, 22.6], [22, 21.6], [11, 22.8], [3.4, 21.8]],
    side: [[3, 31.2], [2.8, 16], [6, 14.4], [11, 22.4], [11.4, 31.2]],
    front: [[2.2, 19.6], [11, 18.2], [22, 19], [33, 17.8], [41.8, 19]],
    burger: true,
    creases: [[[8.5, 9], [12, 7], [16, 6.4]], [[35.5, 9.4], [32, 7.2], [28, 6.6]], [[14, 17.6], [18, 12.6], [23, 10.8]], [[16, 29.6], [20, 26], [24, 25]]],
    facets: [
      { pts: [[4.4, 8.4], [10.6, 3.8], [18, 3.2], [18, 12.6], [14, 17.6], [3.6, 17]], lit: true },
      { pts: [[30, 3.4], [37.6, 5.8], [40.6, 12], [40.4, 17.4], [33, 17.8], [28, 10.4]], lit: false },
      { pts: [[3, 22], [11, 18.6], [12, 24.6], [11.6, 30.6], [4.4, 30.4]], lit: false },
    ],
  },
  {
    // the parcel as in the photo: a lumpy dome, the top folded over the right shoulder, the front
    // flap pushed up on a slant with a crumpled edge, the paper broken in facets
    back: [[6.4, 30.5], [4, 26.6], [3.1, 20], [3.5, 13.4], [5.9, 8], [10.2, 4.6], [15.6, 3.1], [19.4, 2.9], [22.6, 2.3], [28.8, 2.8], [33.8, 4.6], [37.8, 7.6], [40.3, 12.4], [41, 18.8], [40.5, 25.4], [38.2, 30], [31, 31.1], [22, 31.3], [13, 31.1]],
    cap: [[20.6, 1.6], [29, 2.4], [34.6, 4.4], [38.8, 8], [41.4, 13], [41.6, 16.6], [37.6, 14.4], [33.8, 12.8], [30.2, 10.4], [26.8, 7.6], [23.4, 5.2]],
    front: [[1.4, 22.6], [5.2, 21.2], [7, 21.9], [11.4, 19.9], [13.6, 20.3], [16, 19], [19.8, 19.4], [23.4, 17.2], [25.2, 17.9], [29.6, 16.3], [32.2, 16.6], [35.4, 14.9], [38.8, 15.6], [42.8, 13.8]],
    burger: false,
    creases: [
      [[11.4, 20.2], [9.6, 24.4], [8.2, 29.4]],
      [[23.4, 17.6], [21.4, 22.6], [19.2, 28]],
      [[29.6, 16.6], [31.2, 21.4], [30.4, 28.6]],
      [[34.2, 28.8], [36.4, 25.2], [39.4, 23.4]],
      [[6, 9], [12.2, 10.8], [16.8, 9.6]],
      [[15.6, 3.4], [16.8, 9.6], [21.2, 11.8]],
      [[5.4, 11.6], [6.8, 15.6], [6, 20.6]],
      [[30.4, 6.6], [33.6, 9.8], [38, 11.6]],
    ],
    facets: [
      { pts: [[5.8, 9], [10.4, 4.8], [15.6, 3.4], [16.8, 9.6], [12.2, 10.8]], lit: true },
      { pts: [[3, 14], [5.8, 9], [12.2, 10.8], [6.8, 15.6], [6, 21]], lit: false },
      { pts: [[16.8, 9.6], [21.2, 11.8], [27.2, 8], [23.4, 5.2]], lit: false },
      { pts: [[11.4, 20.2], [16, 19.2], [19.8, 19.6], [21.4, 22.6], [9.6, 24.4]], lit: true },
      { pts: [[23.4, 17.6], [29.6, 16.6], [31.2, 21.4], [21.4, 22.6]], lit: false },
      { pts: [[31.2, 21.4], [35.4, 15.2], [41.4, 14.4], [41, 26], [30.4, 28.6]], lit: false },
      { pts: [[1.6, 25.6], [9.6, 24.4], [8.2, 29.4], [4.6, 30.6]], lit: true },
    ],
  },
];

/** Vertical kraft gradient (lit from the top-left) over the current path, then the print and the shading. */
function fillPaper(ctx: CanvasRenderingContext2D, angle: number, phase: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, WRAP_H);
  g.addColorStop(0, KRAFT.light);
  g.addColorStop(0.45, KRAFT.base);
  g.addColorStop(1, KRAFT.shade);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WRAP_W, WRAP_H);
  printSheet(ctx, WRAP_W, WRAP_H, spec(angle, phase), KRAFT.ink);
  const hi = ctx.createRadialGradient(12, 6, 1, 12, 6, 26);
  hi.addColorStop(0, 'rgba(255,250,238,0.30)');
  hi.addColorStop(1, 'rgba(255,250,238,0)');
  ctx.fillStyle = hi;
  ctx.fillRect(0, 0, WRAP_W, WRAP_H);
}

/** A paper panel: clipped to `outline` (closed smooth curve), filled, printed, edge-shaded and outlined. */
function panel(ctx: CanvasRenderingContext2D, outline: (c: CanvasRenderingContext2D) => void, angle: number, phase: number): void {
  ctx.save();
  ctx.beginPath();
  outline(ctx);
  ctx.clip();
  fillPaper(ctx, angle, phase);
  ctx.beginPath();
  outline(ctx);
  ctx.strokeStyle = KRAFT.rim;
  ctx.lineWidth = 2; // half of it inside the clip: the paper darkens towards its rim
  ctx.stroke();
  ctx.restore();
  ctx.beginPath();
  outline(ctx);
  ctx.strokeStyle = KRAFT.edge;
  ctx.lineWidth = 0.3;
  ctx.stroke();
}

/** Front flap: the region under the crumpled `edge`, down past the bottom of the frame. */
function frontOutline(edge: readonly Pt[]): (c: CanvasRenderingContext2D) => void {
  const first = edge[0];
  const last = edge[edge.length - 1];
  return (c) => {
    polyPath(c, edge, false);
    c.lineTo(last[0] - 0.6, WRAP_H - 1.2);
    c.quadraticCurveTo(WRAP_W / 2, WRAP_H - 0.4, first[0] + 0.6, WRAP_H - 1.2);
    c.closePath();
  };
}

/** The fold line: a soft shadow on the paper above it, a lit crest on the edge itself. */
function foldEdge(ctx: CanvasRenderingContext2D, edge: readonly Pt[], dy: number): void {
  ctx.save();
  ctx.translate(0, dy);
  ctx.beginPath();
  polyPath(ctx, edge, false);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = KRAFT.under;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.restore();
}

/** A crumple: a wide faint shadow, a thin fold line, a lit crest beside it. */
function crease(ctx: CanvasRenderingContext2D, line: readonly Pt[]): void {
  ctx.beginPath();
  polyPath(ctx, line, false);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = KRAFT.wrinkle;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.strokeStyle = KRAFT.fold;
  ctx.lineWidth = 0.22;
  ctx.stroke();
  ctx.save();
  ctx.translate(-0.25, -0.25);
  ctx.beginPath();
  polyPath(ctx, line, false);
  ctx.strokeStyle = KRAFT.crest;
  ctx.lineWidth = 0.28;
  ctx.stroke();
  ctx.restore();
}

function burger(ctx: CanvasRenderingContext2D, pick: PixelPick): void {
  const { x, base, scale: s } = BURGER_AT;
  let y = base;
  for (const kind of BURGER) {
    const f = pick(KITCHEN.layer, layerFrame(kind));
    if (f) drawPixels(ctx, f, x - LAYER.cx * s, y - LAYER.baseRow * s, s);
    y -= LAYER_H[kind] * s;
  }
}

/** Paints wrap frame `i` (0..3) at the context's origin, in art px. */
export function paintWrap(ctx: CanvasRenderingContext2D, i: number, pick: PixelPick): void {
  const f = FRAMES[i];
  contactShadow(ctx, WRAP_W / 2, WRAP_H - 1.4, f.burger ? 20 : 18, 1.6, 0.4);
  const back = (c: CanvasRenderingContext2D): void => smoothPath(c, f.back, true);
  panel(ctx, back, -0.22, 0);
  if (f.burger) burger(ctx, pick);
  ctx.save();
  if (!f.burger) {
    // the parcel: the folds lie on the paper, keep them inside its outline
    ctx.beginPath();
    back(ctx);
    ctx.clip();
  }
  if (f.cap) {
    const cap = f.cap;
    panel(ctx, (c) => smoothPath(c, cap, true), -0.42, 0.35);
  }
  if (f.side) {
    const side = f.side;
    const mirror = side.map(([x, y]): Pt => [WRAP_W - x, y]);
    panel(ctx, (c) => smoothPath(c, side, true), 0.9, 0.2);
    panel(ctx, (c) => smoothPath(c, mirror, true), -0.9, 0.7);
  }
  foldEdge(ctx, f.front, -0.5);
  panel(ctx, frontOutline(f.front), 0.12, 0.55);
  for (const facet of f.facets ?? []) {
    ctx.beginPath();
    polyPath(ctx, facet.pts);
    ctx.fillStyle = facet.lit ? KRAFT.lit : KRAFT.dim;
    ctx.fill();
  }
  ctx.beginPath();
  polyPath(ctx, f.front, false);
  ctx.strokeStyle = KRAFT.crest;
  ctx.lineWidth = 0.45;
  ctx.stroke();
  for (const c of f.creases) crease(ctx, c);
  ctx.restore();
}
