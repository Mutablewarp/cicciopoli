/**
 * DON TUMA props and projectiles (vector): lemons, oranges, the PINK blood orange (parryable), honey
 * drops and bottle, splats, the sun beam and its warning, the deck chair that turns into jaws.
 */
import { INK, LINE, inked } from '../../draw/canvas';
import { type Ctx, WHITE, ell, pieEye, sparkle, splatDrawer } from './kit/toon';
import { TUMA_CFG } from './config';

export type Citrus = 'lemon' | 'orange' | 'blood';
const CITRUS: Record<Citrus, readonly [string, string]> = {
  lemon: ['#f7dc3c', '#d9a91c'],
  orange: ['#f59a2a', '#d06a14'],
  blood: ['#ff8cc0', '#e0508c'],
};
export const WOOD = '#c99258';

export function citrus(ctx: Ctx, x: number, y: number, r: number, kind: Citrus): void {
  const [base, dark] = CITRUS[kind];
  const lemon = kind === 'lemon';
  ctx.beginPath();
  if (lemon) {
    ctx.ellipse(x, y, r * 1.18, r * 0.92, 0, 0, Math.PI * 2);
    ctx.moveTo(x + r * 1.15 + 3, y);
    ctx.arc(x + r * 1.15, y, 3, 0, Math.PI * 2);
  } else ctx.arc(x, y, r, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, 1, x, y, r * 1.2);
  g.addColorStop(0, '#fffbe0');
  g.addColorStop(0.35, base);
  g.addColorStop(1, dark);
  inked(ctx, g, LINE * 0.8);
  ctx.beginPath();
  ctx.moveTo(x - r * 0.1, y - r * 0.85);
  ctx.quadraticCurveTo(x - r * 0.9, y - r * 1.6, x - r * 1.2, y - r * 1.0);
  ctx.quadraticCurveTo(x - r * 0.6, y - r * 0.7, x - r * 0.1, y - r * 0.85);
  inked(ctx, '#5c9a3a', LINE * 0.6);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ell(ctx, x - r * 0.38, y - r * 0.38, r * 0.22, r * 0.14, -0.6);
  ctx.fill();
  if (kind === 'blood') sparkle(ctx, x + r * 0.7, y - r * 0.8, r * 0.55, WHITE);
}

export function honeyBottle(ctx: Ctx, x: number, y: number): void {
  ctx.beginPath();
  ctx.moveTo(x - 9, y + 20);
  ctx.bezierCurveTo(x - 12, y + 4, x - 8, y - 6, x - 4, y - 8);
  ctx.lineTo(x + 4, y - 8);
  ctx.bezierCurveTo(x + 8, y - 6, x + 12, y + 4, x + 9, y + 20);
  ctx.closePath();
  inked(ctx, '#e8a12c', LINE * 0.9);
  ctx.fillStyle = '#fff1c8';
  ctx.fillRect(x - 7, y + 4, 14, 7);
  ctx.beginPath();
  ctx.moveTo(x - 3, y - 8);
  ctx.lineTo(x, y - 18);
  ctx.lineTo(x + 3, y - 8);
  ctx.closePath();
  inked(ctx, '#d23c2c', LINE * 0.8);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ell(ctx, x - 5, y + 12, 1.6, 5);
  ctx.fill();
}

/** Angry steam puffs (local coords around x, y). */
export function steam(ctx: Ctx, x: number, y: number, s: number): void {
  for (const [dx, dy, r] of [[0, 0, 7], [9, -8, 6], [2, -16, 5]] as const) {
    ell(ctx, x + dx * s, y + dy * s, r * s, r * s * 0.85);
    inked(ctx, WHITE, LINE * 0.7);
  }
}

/** Projectile sheet (SHOT): lemon, orange, blood orange (PINK), honey drop. 24 x 24 each, centred. */
export function drawShot(ctx: Ctx, f: number): void {
  if (f < 3) {
    citrus(ctx, 12, 13, 7, (['lemon', 'orange', 'blood'] as const)[f]);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(12, 3);
  ctx.bezierCurveTo(14, 9, 19, 12, 19, 16);
  ctx.arc(12, 16, 7, 0, Math.PI);
  ctx.bezierCurveTo(5, 12, 10, 9, 12, 3);
  ctx.closePath();
  const g = ctx.createLinearGradient(6, 4, 18, 22);
  g.addColorStop(0, '#ffd774');
  g.addColorStop(1, '#c97812');
  inked(ctx, g, LINE * 0.8);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ell(ctx, 9.5, 15, 1.6, 3.2, 0.3);
  ctx.fill();
}

/** Splat colours (frame = index * 3 + 0..2): lemon, orange, blood orange, honey. */
export const SPLAT_OF = { lemon: 0, orange: 3, blood: 6, honey: 9 } as const;
export const drawSplat = splatDrawer(['#f7dc3c', '#f59a2a', '#ff8cc0', '#e8a02a']);

/** Sun beam column (frame 0 = warning, 1..2 = full beam). BEAM.w x BEAM.h, bottom on the floor. */
export const BEAM = { w: 72, h: 330 } as const;

/** The warning: exactly the beam's hit width, ink-edged hazard stripes, falling chevrons, a sun glint up top
 * and a dark spot on the floor, so a 25 px hero on a phone reads "the sun hits HERE". */
function beamWarning(ctx: Ctx): void {
  const cx = BEAM.w / 2;
  const hw = TUMA_CFG.beam.w / 2;
  const [l, r, b] = [cx - hw, cx + hw, BEAM.h - 6];
  ctx.save();
  ctx.beginPath();
  ctx.rect(l, 0, r - l, BEAM.h);
  ctx.clip();
  const g = ctx.createLinearGradient(0, 0, 0, BEAM.h);
  g.addColorStop(0, 'rgba(255,214,70,0.15)');
  g.addColorStop(1, 'rgba(255,200,40,0.5)');
  ctx.fillStyle = g;
  ctx.fillRect(l, 0, r - l, BEAM.h);
  ctx.strokeStyle = 'rgba(240,120,20,0.55)';
  ctx.lineWidth = 7;
  for (let y = -20; y < BEAM.h + 40; y += 22) {
    ctx.beginPath();
    ctx.moveTo(l - 4, y + 20);
    ctx.lineTo(r + 4, y - 20);
    ctx.stroke();
  }
  ctx.restore();
  for (const [x, dir] of [
    [l, 1],
    [r, -1],
  ] as const) {
    ctx.lineWidth = 3.4;
    ctx.strokeStyle = INK;
    ctx.setLineDash([12, 6]);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, b);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffe14a';
    ctx.beginPath();
    ctx.moveTo(x + dir * 2.6, 0);
    ctx.lineTo(x + dir * 2.6, b);
    ctx.stroke();
  }
  for (const y of [b - 92, b - 62, b - 32]) {
    ctx.beginPath();
    ctx.moveTo(cx - 13, y - 10);
    ctx.lineTo(cx, y);
    ctx.lineTo(cx + 13, y - 10);
    ctx.lineTo(cx + 13, y - 3);
    ctx.lineTo(cx, y + 7);
    ctx.lineTo(cx - 13, y - 3);
    ctx.closePath();
    inked(ctx, '#ffd23c', 2);
  }
  ell(ctx, cx, b, hw + 6, 7);
  ctx.fillStyle = 'rgba(60,28,8,0.6)';
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = '#ffe14a';
  ctx.setLineDash([6, 4]);
  ctx.stroke();
  ctx.setLineDash([]);
  sparkle(ctx, cx, 64, 15, '#fff6c8');
}

export function drawBeam(ctx: Ctx, f: number): void {
  const cx = BEAM.w / 2;
  if (f === 0) return beamWarning(ctx);
  const g = ctx.createLinearGradient(0, 0, BEAM.w, 0);
  g.addColorStop(0, 'rgba(255,214,90,0)');
  g.addColorStop(0.2, 'rgba(255,214,90,0.75)');
  g.addColorStop(0.5, 'rgba(255,252,230,0.98)');
  g.addColorStop(0.8, 'rgba(255,214,90,0.75)');
  g.addColorStop(1, 'rgba(255,214,90,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, BEAM.w, BEAM.h);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const x = cx - 14 + i * 9 + (f === 2 ? 4 : 0);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (i - 1.5) * 3, BEAM.h);
    ctx.stroke();
  }
  ell(ctx, cx, BEAM.h - 6, 36, 8);
  ctx.fillStyle = 'rgba(255,250,220,0.95)';
  ctx.fill();
}

/** Deck chair (frame 0, sits behind the seated body: same frame as the body sheet). */
export function drawChair(ctx: Ctx): void {
  ctx.lineCap = 'round';
  bar(ctx, 184, 196, 112, 120, 6);
  bar(ctx, 58, 196, 186, 28, 6);
  checkerBand(ctx, [[182, 32], [172, 120], [150, 192], [74, 156]], 26);
  bar(ctx, 62, 156, 84, 152, 7);
  bar(ctx, 172, 24, 192, 28, 7);
}

function bar(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, w: number): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = INK;
  ctx.lineWidth = w + LINE * 1.6;
  ctx.stroke();
  ctx.strokeStyle = WOOD;
  ctx.lineWidth = w;
  ctx.stroke();
}

/** A red-white checkered band following a cubic bezier (the shirt's checker strip). */
export function checkerBand(ctx: Ctx, p: readonly (readonly [number, number])[], w: number): void {
  const at = (t: number): [number, number] => {
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * u * u * t;
    const c = 3 * u * t * t;
    const d = t * t * t;
    return [a * p[0][0] + b * p[1][0] + c * p[2][0] + d * p[3][0], a * p[0][1] + b * p[1][1] + c * p[2][1] + d * p[3][1]];
  };
  const n = 14;
  ctx.save();
  for (let i = 0; i < n; i++) {
    const [x0, y0] = at(i / n);
    const [x1, y1] = at((i + 1) / n);
    const a = Math.atan2(y1 - y0, x1 - x0);
    const len = Math.hypot(x1 - x0, y1 - y0) + 0.6;
    ctx.save();
    ctx.translate(x0, y0);
    ctx.rotate(a);
    for (let row = 0; row < 2; row++) {
      ctx.fillStyle = (i + row) % 2 ? '#e2483c' : WHITE;
      ctx.fillRect(0, -w / 2 + (row * w) / 2, len, w / 2);
    }
    ctx.restore();
  }
  ctx.restore();
  for (const side of [-1, 1]) {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const [x, y] = at(i / n);
      const [x1, y1] = at(Math.min(1, i / n + 0.01));
      const a = Math.atan2(y1 - y, x1 - x) + Math.PI / 2;
      ctx.lineTo(x + Math.cos(a) * (w / 2) * side, y + Math.sin(a) * (w / 2) * side);
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = LINE;
    ctx.stroke();
  }
}

/**
 * The deck chair come alive: frame 0 open, 1 shut, 2 wide open. Feet on JAWS.footY; the frame reaches as
 * far below the bite box centre as above it, so a hazard placed at the box centre lines up.
 */
export const JAWS = { w: 112, h: 150, footY: 94 } as const;
export function drawJaws(ctx: Ctx, f: number): void {
  const open = [0.5, 0.05, 0.8][f];
  const hx = 100;
  const hy = 72;
  bar(ctx, 34, 80, 44, 94, 5);
  bar(ctx, 86, 80, 76, 94, 5);
  ctx.beginPath();
  ctx.moveTo(24, 76);
  ctx.quadraticCurveTo(56, 86 + open * 4, hx, hy + 4);
  ctx.lineTo(hx, hy - 2);
  ctx.quadraticCurveTo(56, 70 - open * 30, 24, 74 - open * 46);
  ctx.closePath();
  inked(ctx, '#a32820', LINE);
  ctx.save();
  ctx.translate(hx, hy);
  for (const [rot, dir] of [[0, 1], [open * 0.95, -1]] as const) {
    ctx.save();
    ctx.rotate(rot);
    for (let x = -66; x < -6; x += 9) {
      ctx.beginPath();
      ctx.moveTo(x, dir * -3);
      ctx.lineTo(x + 4.5, dir * -13);
      ctx.lineTo(x + 9, dir * -3);
      inked(ctx, WHITE, LINE * 0.6);
    }
    ctx.restore();
  }
  ctx.restore();
  bar(ctx, 22, 78, hx + 2, hy + 4, 7);
  const tx = hx - Math.cos(open * 0.95) * 80;
  const ty = hy - Math.sin(open * 0.95) * 80;
  bar(ctx, tx, ty, hx + 2, hy - 2, 7);
  checkerBand(ctx, [[tx + 6, ty + 2], [tx + 30, ty - 6 + open * 20], [hx - 30, hy - 14], [hx - 4, hy - 6]], 10);
  const ex = hx - Math.cos(open * 0.95) * 30;
  const ey = hy - Math.sin(open * 0.95) * 30 - 12;
  pieEye(ctx, ex - 8, ey, 6, 7.5, -0.9, 0.3, 0.35, '#a32820');
  pieEye(ctx, ex + 6, ey - 2, 5.5, 7, -0.9, 0.3, 0.35, '#a32820');
}

