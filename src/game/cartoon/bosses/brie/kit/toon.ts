/**
 * Rubber-hose style helpers shared by the BOSS-A lane (Monsieur Brie, Pancetta lo Skater): pie-cut eyes,
 * white four-finger gloves, hose limbs, smooth blobs, watercolour washes and paper grain. Everything
 * draws in world units on a context already scaled by k (see draw/canvas.ts).
 */
import { INK, LINE } from '../../../draw/canvas';
import { rng } from './paths';

export const TAU = Math.PI * 2;
const GLOVE = '#fbf6ea';
const GLOVE_SHADE = '#d8cfbd';
const EYE_WHITE = '#fffaf0';

export type Pt = readonly [number, number];
export type GlovePose = 'open' | 'fist' | 'point' | 'peace';

function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Blend two #rrggbb colours (t = 0 → a, 1 → b). */
function mix(a: string, b: string, t: number): string {
  const x = hex(a);
  const y = hex(b);
  const c = x.map((v, i) => Math.round(v + ((y[i] ?? 0) - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Lighten (amt > 0) or darken (amt < 0) a colour. */
export function shade(c: string, amt: number): string {
  return amt >= 0 ? mix(c, '#ffffff', amt) : mix(c, '#1c1511', -amt);
}

/** Closed (or open) smooth path through points (Catmull-Rom as cubic beziers). */
export function smooth(ctx: CanvasRenderingContext2D, pts: readonly Pt[], closed = true): void {
  const n = pts.length;
  const at = (i: number): Pt => (closed ? (pts[(i + n) % n] as Pt) : (pts[Math.max(0, Math.min(n - 1, i))] as Pt));
  ctx.beginPath();
  ctx.moveTo(at(0)[0], at(0)[1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
  if (closed) ctx.closePath();
}

/** Stroke the current path in ink. */
export function ink(ctx: CanvasRenderingContext2D, width = LINE): void {
  ctx.strokeStyle = INK;
  ctx.lineWidth = width;
  ctx.stroke();
}

export function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
}

/** Rounded rectangle path (no ctx.roundRect: older iOS). */
export function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** A soft glossy highlight (top-left light). */
export function shine(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = -0.5, alpha = 0.75): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ellipse(ctx, x, y, rx, ry, rot);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.restore();
}

/**
 * Pie-cut eye: white oval, big black pupil with the classic wedge notch. look = -1..1 per axis,
 * lid = 0 (open) .. 1 (shut) drawn in `lidColor`, angry tilts the lid line.
 */
export function pieEye(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  look: { x: number; y: number },
  lid = 0,
  lidColor = EYE_WHITE,
  angry = 0,
): void {
  ellipse(ctx, x, y, rx, ry);
  ctx.fillStyle = EYE_WHITE;
  ctx.fill();
  ctx.save();
  ellipse(ctx, x, y, rx, ry);
  ctx.clip();
  const px = x + look.x * rx * 0.36;
  const py = y + look.y * ry * 0.3 + ry * 0.08;
  const prx = rx * 0.56;
  const pry = ry * 0.66;
  ellipse(ctx, px, py, prx, pry);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(px + prx * 0.08, py - pry * 0.1);
  ctx.arc(px + prx * 0.08, py - pry * 0.1, Math.max(prx, pry) * 1.2, -1.3, -0.62);
  ctx.closePath();
  ctx.fillStyle = EYE_WHITE;
  ctx.fill();
  if (lid > 0 || angry !== 0) {
    const ly = y - ry + ry * 2 * Math.min(1, lid);
    ctx.beginPath();
    ctx.moveTo(x - rx - 2, y - ry - 2);
    ctx.lineTo(x + rx + 2, y - ry - 2);
    ctx.lineTo(x + rx + 2, ly - angry * ry * 0.5);
    ctx.lineTo(x - rx - 2, ly + angry * ry * 0.5);
    ctx.closePath();
    ctx.fillStyle = lidColor;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - rx - 2, ly + angry * ry * 0.5);
    ctx.lineTo(x + rx + 2, ly - angry * ry * 0.5);
    ink(ctx, LINE * 0.9);
  }
  ctx.restore();
  ellipse(ctx, x, y, rx, ry);
  ink(ctx, LINE * 0.9);
}

/** Dizzy spiral eye (knockout). */
export function spiralEye(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, turn = 0): void {
  ellipse(ctx, x, y, r, r * 1.1);
  ctx.fillStyle = EYE_WHITE;
  ctx.fill();
  ink(ctx, LINE * 0.9);
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const a = turn + (i / 40) * TAU * 2.2;
    const rr = (i / 40) * r * 0.85;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr * 1.1;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ink(ctx, LINE * 0.7);
}

/** Rubber-hose limb: an ink-edged tube along a quadratic curve. */
export function hose(ctx: CanvasRenderingContext2D, a: Pt, c: Pt, b: Pt, w: number, fill: string): void {
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.quadraticCurveTo(c[0], c[1], b[0], b[1]);
  ctx.strokeStyle = INK;
  ctx.lineWidth = w + LINE * 2;
  ctx.stroke();
  ctx.strokeStyle = fill;
  ctx.lineWidth = w;
  ctx.stroke();
}

function finger(ctx: CanvasRenderingContext2D, len: number, w: number, rot: number): void {
  ctx.save();
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(0, -w / 2);
  ctx.lineTo(-len, -w / 2);
  ctx.arc(-len, 0, w / 2, -Math.PI / 2, Math.PI / 2, true);
  ctx.lineTo(0, w / 2);
  ctx.closePath();
  ctx.fillStyle = GLOVE;
  ctx.fill();
  ink(ctx, LINE * 0.8);
  ctx.restore();
}

/**
 * White four-finger cartoon glove at (x, y) (palm centre), size s (1 ≈ 16 units long), rotated so the
 * fingers point along `rot` + π (rot = 0 → fingers point left, the wrist cuff is to the right).
 */
export function glove(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, rot: number, pose: GlovePose): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  // cuff
  ctx.beginPath();
  ctx.moveTo(5, -6);
  ctx.quadraticCurveTo(13, -9, 14, -1);
  ctx.quadraticCurveTo(13, 8, 5, 6);
  ctx.closePath();
  ctx.fillStyle = GLOVE;
  ctx.fill();
  ink(ctx, LINE * 0.8);
  if (pose === 'open') {
    for (const a of [-0.55, -0.18, 0.18]) finger(ctx, 9, 4.4, a);
    finger(ctx, 7, 4.2, 0.95);
  } else if (pose === 'point') finger(ctx, 11, 4.4, -0.05);
  else if (pose === 'peace') {
    finger(ctx, 11, 4.2, -0.32);
    finger(ctx, 11, 4.2, 0.12);
  }
  ellipse(ctx, 0, 0, 7.5, 7);
  ctx.fillStyle = GLOVE;
  ctx.fill();
  ink(ctx, LINE * 0.85);
  ctx.save();
  ctx.globalAlpha = 0.6;
  ellipse(ctx, 1.5, 2.5, 5, 3.5, 0.3);
  ctx.fillStyle = GLOVE_SHADE;
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  if (pose === 'fist' || pose === 'point' || pose === 'peace') {
    for (const fy of pose === 'fist' ? [-3, 0, 3] : [1.5, 4]) {
      ctx.moveTo(-6, fy);
      ctx.lineTo(-2, fy);
    }
  } else {
    for (const fx of [-1.5, 1, 3.5]) {
      ctx.moveTo(fx, -3);
      ctx.lineTo(fx + 0.5, 2);
    }
  }
  ink(ctx, LINE * 0.6);
  ctx.restore();
}

/** Ground contact shadow (soft ellipse). */
export function contactShadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, alpha = 0.22): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ellipse(ctx, x, y, rx, rx * 0.18);
  ctx.fillStyle = '#3a2412';
  ctx.fill();
  ctx.restore();
}

/**
 * Watercolour wash: a translucent fill of the path made by `shape`, pigment blooms inside it and a
 * darker pooled edge. `b` bounds the blooms.
 */
export function wash(
  ctx: CanvasRenderingContext2D,
  shape: () => void,
  color: string,
  b: { x: number; y: number; w: number; h: number },
  seed: number,
  edge = 0.45,
): void {
  const r = rng(seed);
  ctx.save();
  shape();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.clip();
  const blooms = Math.max(4, Math.round((b.w * b.h) / 1800));
  for (let i = 0; i < blooms; i++) {
    ctx.globalAlpha = 0.06 + r() * 0.1;
    ctx.fillStyle = r() < 0.5 ? shade(color, -0.22) : shade(color, 0.3);
    ellipse(ctx, b.x + r() * b.w, b.y + r() * b.h, 6 + r() * b.w * 0.18, 4 + r() * b.h * 0.18, r() * 3);
    ctx.fill();
  }
  ctx.restore();
  if (edge > 0) {
    ctx.save();
    shape();
    ctx.globalAlpha = edge;
    ctx.strokeStyle = shade(color, -0.3);
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.restore();
  }
}

/** Puffy cartoon cloud (soft blue-grey outline, cream body, shaded belly). */
export function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number): void {
  const r = rng(seed);
  const puffs: [number, number, number][] = [];
  const n = 5 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const rr = h * (0.32 + 0.3 * Math.sin(Math.PI * t) + r() * 0.08);
    // the end puffs sit inside the box, so a cloud texture never shows a cut edge
    puffs.push([x + h * 0.42 + t * (w - h * 0.84), y + h * 0.62 - rr * 0.55, rr]);
  }
  const outline = (): void => {
    ctx.beginPath();
    for (const [px, py, pr] of puffs) {
      ctx.moveTo(px + pr, py);
      ctx.arc(px, py, pr, 0, TAU);
    }
    ctx.moveTo(x + w, y + h * 0.66);
    ctx.ellipse(x + w / 2, y + h * 0.66, w / 2, h * 0.2, 0, 0, TAU);
  };
  ctx.save();
  outline();
  ctx.strokeStyle = '#8fa4b5';
  ctx.lineWidth = 2.4;
  ctx.stroke();
  outline();
  ctx.fillStyle = '#fbf3e1';
  ctx.fill();
  ctx.clip();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#c9d3dc';
  ctx.fillRect(x - h, y + h * 0.58, w + h * 2, h);
  ctx.restore();
}

/** Paper grain + faint fibres over a whole layer (watercolour paper). */
export function paperGrain(ctx: CanvasRenderingContext2D, w: number, h: number, seed: number, amount = 1): void {
  const r = rng(seed);
  ctx.save();
  const dots = Math.round(((w * h) / 55) * amount);
  for (let i = 0; i < dots; i++) {
    ctx.globalAlpha = 0.03 + r() * 0.06;
    ctx.fillStyle = r() < 0.6 ? '#5a3a1a' : '#fff6e0';
    ctx.fillRect(r() * w, r() * h, 0.6 + r() * 0.9, 0.6 + r() * 0.9);
  }
  ctx.restore();
}

/** Comic "!" burst drawn as shapes (no font needed): the readable warning above a boss. */
export function alertBurst(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, fill: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * TAU;
    const rr = i % 2 ? 9 : 14;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ink(ctx, 1.8);
  ctx.beginPath();
  ctx.moveTo(-2.4, -8);
  ctx.lineTo(2.4, -8);
  ctx.lineTo(1.2, 3);
  ctx.lineTo(-1.2, 3);
  ctx.closePath();
  ctx.fillStyle = INK;
  ctx.fill();
  ellipse(ctx, 0, 6.5, 1.9, 1.9);
  ctx.fill();
  ctx.restore();
}
