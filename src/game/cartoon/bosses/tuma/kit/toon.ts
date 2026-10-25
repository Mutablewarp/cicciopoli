/**
 * Rubber-hose drawing kit of the BOSS-B lane (DON TUMA, HAPPY BOX): pie-cut eyes, white gloves, hose
 * limbs, glossy shoes, watercolour washes. Pure canvas 2D in world units (draw/canvas.ts pre-scales by k).
 */
import { INK, LINE, inked } from '../../../draw/canvas';

export type Ctx = CanvasRenderingContext2D;
export const WHITE = '#fffaf0';
const TAU = Math.PI * 2;

/** Seeded 0..1 (mulberry32): the art is deterministic. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function ell(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
}

/** Rounded capsule path between two points (radius r). Does not begin a path. */
export function capsule(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, r: number): void {
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.arc(x2, y2, r, a - Math.PI / 2, a + Math.PI / 2);
  ctx.arc(x1, y1, r, a + Math.PI / 2, a + (3 * Math.PI) / 2);
  ctx.closePath();
}

/** Several shapes sharing one ink silhouette: every outline first, then every fill on top. */
export function merged(ctx: Ctx, paths: readonly ((c: Ctx) => void)[], fill: string, w = LINE): void {
  ctx.strokeStyle = INK;
  ctx.lineWidth = w * 2;
  for (const p of paths) {
    ctx.beginPath();
    p(ctx);
    ctx.stroke();
  }
  ctx.fillStyle = fill;
  for (const p of paths) {
    ctx.beginPath();
    p(ctx);
    ctx.fill();
  }
}

/** Pie-cut eye: white oval, black pupil with the wedge cut out. look -1..1; lid 0..1 closes from the top. */
export function pieEye(ctx: Ctx, x: number, y: number, rx: number, ry: number, lx: number, ly: number, lid = 0, lidColor = WHITE): void {
  ell(ctx, x, y, rx, ry);
  inked(ctx, WHITE, LINE * 0.8);
  ctx.save();
  ell(ctx, x, y, rx - 0.4, ry - 0.4);
  ctx.clip();
  const px = x + lx * rx * 0.38;
  const py = y + ly * ry * 0.3;
  const pr = rx * 0.56;
  const pry = ry * 0.64;
  ell(ctx, px, py, pr, pry);
  ctx.fillStyle = INK;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(px + pr * 0.15, py - pry * 0.1);
  ctx.arc(px + pr * 0.15, py - pry * 0.1, pry * 1.1, -1.35, -0.55);
  ctx.closePath();
  ctx.fillStyle = WHITE;
  ctx.fill();
  if (lid > 0) {
    ctx.fillStyle = lidColor;
    ctx.fillRect(x - rx - 1, y - ry - 1, rx * 2 + 2, (ry * 2 + 1) * lid);
    ctx.beginPath();
    ctx.moveTo(x - rx, y - ry + ry * 2 * lid);
    ctx.lineTo(x + rx, y - ry + ry * 2 * lid);
    ctx.strokeStyle = INK;
    ctx.lineWidth = LINE * 0.9;
    ctx.stroke();
  }
  ctx.restore();
  ell(ctx, x, y, rx, ry);
  ctx.strokeStyle = INK;
  ctx.lineWidth = LINE * 0.8;
  ctx.stroke();
}

/** Closed eye: a happy arc (up) or a sleepy one (down). */
export function shutEye(ctx: Ctx, x: number, y: number, rx: number, happy: boolean): void {
  ctx.beginPath();
  if (happy) ctx.arc(x, y + rx * 0.4, rx, Math.PI * 1.15, Math.PI * 1.85);
  else ctx.arc(x, y - rx * 0.5, rx, Math.PI * 0.15, Math.PI * 0.85);
  ctx.strokeStyle = INK;
  ctx.lineWidth = LINE * 1.1;
  ctx.stroke();
}

/** Dizzy spiral eye. */
export function spiralEye(ctx: Ctx, x: number, y: number, r: number, turn: number): void {
  ell(ctx, x, y, r, r * 1.15);
  inked(ctx, WHITE, LINE * 0.8);
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const a = turn + i * 0.42;
    const rr = (r * 0.85 * i) / 40;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 1.1);
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = LINE * 0.7;
  ctx.stroke();
}

export type GlovePose = 'open' | 'fist' | 'point' | 'grip';

/** White four-finger cartoon glove. (x, y) = wrist, rot = direction of the hand (0 = right), s = size. */
export function glove(ctx: Ctx, x: number, y: number, s: number, rot: number, pose: GlovePose, mirror = false): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  if (mirror) ctx.scale(1, -1);
  const parts: ((c: Ctx) => void)[] = [];
  const cx = s * 1.05;
  if (pose === 'open') {
    for (const a of [-0.55, -0.12, 0.32]) parts.push((c) => capsule(c, cx, 0, cx + Math.cos(a) * s * 1.35, Math.sin(a) * s * 1.35, s * 0.33));
  } else if (pose === 'point') {
    parts.push((c) => capsule(c, cx, -s * 0.15, cx + s * 1.5, -s * 0.2, s * 0.3));
  }
  parts.push((c) => capsule(c, cx * 0.9, -s * 0.2, cx + s * 0.25, -s * 1.15, s * 0.3));
  parts.push((c) => c.ellipse(cx, 0, s * 0.95, s * 0.85, 0, 0, TAU));
  parts.push((c) => c.ellipse(s * 0.1, 0, s * 0.42, s * 0.72, 0, 0, TAU));
  merged(ctx, parts, WHITE, LINE * 0.75);
  ctx.strokeStyle = INK;
  ctx.lineWidth = LINE * 0.6;
  ctx.beginPath();
  ctx.moveTo(s * 0.32, -s * 0.6);
  ctx.lineTo(s * 0.32, s * 0.6);
  if (pose === 'fist' || pose === 'grip' || pose === 'point') {
    const n = pose === 'point' ? 2 : 3;
    for (let i = 0; i < n; i++) {
      const yy = s * (0.05 + i * 0.28);
      ctx.moveTo(cx + s * 0.35, yy);
      ctx.lineTo(cx + s * 0.85, yy);
    }
  } else {
    for (let i = 0; i < 3; i++) {
      ctx.moveTo(cx - s * 0.25 + i * s * 0.22, -s * 0.25);
      ctx.lineTo(cx - s * 0.25 + i * s * 0.22, s * 0.2);
    }
  }
  ctx.stroke();
  ctx.restore();
}

/** Rubber-hose limb along a smooth curve through `pts` (quadratic midpoints), width w. */
export function hose(ctx: Ctx, pts: readonly (readonly [number, number])[], w: number, fill: string): void {
  const path = (): void => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2;
      const my = (pts[i][1] + pts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last[0], last[1]);
  };
  ctx.lineCap = 'round';
  path();
  ctx.strokeStyle = INK;
  ctx.lineWidth = w + LINE * 1.6;
  ctx.stroke();
  path();
  ctx.strokeStyle = fill;
  ctx.lineWidth = w;
  ctx.stroke();
}

/** Big glossy 1930s shoe, toe toward +x (dir = -1 flips it), heel at (x, y) on the ground. */
export function shoe(ctx: Ctx, x: number, y: number, s: number, dir: 1 | -1, color: string, rot = 0): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(-s * 0.6, 0);
  ctx.bezierCurveTo(-s * 0.7, -s * 0.9, s * 0.2, -s * 1.0, s * 0.6, -s * 0.75);
  ctx.bezierCurveTo(s * 1.5, -s * 0.75, s * 1.75, -s * 0.2, s * 1.55, 0);
  ctx.closePath();
  inked(ctx, color);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ell(ctx, s * 0.95, -s * 0.5, s * 0.28, s * 0.12, -0.25);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-s * 0.6, -s * 0.12);
  ctx.lineTo(s * 1.55, -s * 0.12);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = LINE * 0.6;
  ctx.stroke();
  ctx.restore();
}

/** Soft watercolour wash: many translucent blots inside a box (seeded). */
export function wash(ctx: Ctx, r: () => number, x: number, y: number, w: number, h: number, color: string, n: number, alpha: number): void {
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = alpha * (0.4 + r() * 0.6);
    ell(ctx, x + r() * w, y + r() * h, 6 + r() * w * 0.16, 3 + r() * h * 0.14, (r() - 0.5) * 0.5);
    ctx.fill();
  }
  ctx.restore();
}

/** Paper fibres / pigment specks over a whole layer. */
export function specks(ctx: Ctx, r: () => number, w: number, h: number, n: number): void {
  ctx.save();
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = r() < 0.5 ? 'rgba(60,40,20,0.10)' : 'rgba(255,250,235,0.14)';
    ctx.fillRect(r() * w, r() * h, 0.6 + r() * 1.4, 0.6 + r() * 0.8);
  }
  ctx.restore();
}

/** Five-point cartoon star. */
export function star(ctx: Ctx, x: number, y: number, r: number, fill: string, rot = 0): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot - Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  inked(ctx, fill, LINE * 0.7);
}

/** Four-point telegraph sparkle. */
export function sparkle(ctx: Ctx, x: number, y: number, r: number, fill: string): void {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const rr = i % 2 ? r * 0.22 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  inked(ctx, fill, LINE * 0.6);
}

/** Bold outlined lettering (system fonts only: no network at runtime). */
export function letters(ctx: Ctx, text: string, x: number, y: number, size: number, fill: string, rot = 0, stroke = INK): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.font = `900 ${size}px "Arial Black", "Helvetica Neue", Impact, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(LINE, size * 0.16);
  ctx.strokeText(text, 0, 0);
  ctx.fillStyle = fill;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

/** Soft ground shadow. */
export function shadow(ctx: Ctx, x: number, y: number, rx: number, ry: number, a = 0.28): void {
  ctx.save();
  ctx.fillStyle = `rgba(40,25,15,${a})`;
  ell(ctx, x, y, rx, ry);
  ctx.fill();
  ctx.restore();
}

/** Telegraph sparkle sheet (GLINT, 2 frames). */
export const GLINT = { w: 28, h: 28 } as const;
export function drawGlint(ctx: Ctx, f: number): void {
  sparkle(ctx, 14, 14, f ? 13 : 9, f ? WHITE : '#fff2a0');
}

/** Dust puff sheet (DUST, 3 frames). */
export const DUST = { w: 40, h: 24 } as const;
export function drawDust(ctx: Ctx, f: number): void {
  ctx.globalAlpha = 1 - f * 0.3;
  for (const [x, y, r] of [[12, 16, 7], [22, 12, 8], [31, 16, 6]] as const) {
    ell(ctx, x + (x - 20) * f * 0.3, y - f * 2, r * (0.8 + f * 0.25), r * 0.8 * (0.8 + f * 0.25));
    inked(ctx, '#efe0c4', LINE * 0.6);
  }
  ctx.globalAlpha = 1;
}

/** Splat sheet (SPLAT): colours x 3 frames each (frame = colour index * 3 + 0..2). */
export const SPLAT = { w: 40, h: 16 } as const;
export function splatDrawer(colors: readonly string[]): (ctx: Ctx, frame: number) => void {
  return (ctx, frame) => {
    const color = colors[Math.floor(frame / 3)];
    const f = frame % 3;
    const s = 0.6 + f * 0.25;
    ctx.globalAlpha = 1 - f * 0.25;
    ell(ctx, 20, 13, 13 * s, 3.2 * s);
    inked(ctx, color, LINE * 0.6);
    for (let i = 0; i < 5; i++) {
      const a = Math.PI + (i + 0.5) * (Math.PI / 5);
      ell(ctx, 20 + Math.cos(a) * 14 * s, 11 + Math.sin(a) * 9 * s, 2.2, 2.2);
      inked(ctx, color, LINE * 0.5);
    }
    ctx.globalAlpha = 1;
  };
}
