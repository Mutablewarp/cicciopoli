/**
 * The PIOGGIA DI PATATINE super: a giant Ciccio's fries box (white paper, bordeaux band with the
 * CICCIO'S wordmark and the black-and-white checker of the real packaging) jiggling on a puffy cartoon
 * cloud, overflowing and tossing fries over its rim (frame 240x100 world units, 4 frames; the core centres
 * it on cloudY and the rain comes out from under the front puffs), plus the falling handful of fries.
 */
import { INK } from '../draw/canvas';
import { FX_COL, HERO_COL } from './config';
import { blobs, ink, type Blob } from './shapes';

type Ctx = CanvasRenderingContext2D;

/** The box in its own drawing units, then where (bottom-centre) and how big it sits in the frame. */
const BOX = { cx: 84, top: 14, bottom: 52, topHalf: 23, bottomHalf: 18, dip: 24 } as const;
const BOX_AT = { x: 120, y: 85, scale: 1.55 } as const;
/** Per-frame [lift, tilt] of the box: it hops on the cloud while it pours. */
const JIGGLE = [[0, 0], [-2.6, 0.035], [0.6, -0.02], [-1.6, -0.035]] as const;
/** Fries flying over the rim at once, each a quarter cycle apart. */
const TOSSED = 4;
/** The falling bunch: [x, top, angle, length] back to front; the front one leads at y ~32 (centre 30). */
const FRY_BUNCH = [[6.5, 9, 0.12, 21], [11.5, 6, 0.04, 22], [17.5, 10, -0.1, 21], [12.5, 12, 0, 20]] as const;

function puffs(y: number, x0: number, x1: number, step: number, r: number, f: number, seed: number): Blob[] {
  const out: Blob[] = [];
  for (let x = x0, i = 0; x <= x1; x += step, i++) {
    const rr = r * (i % 2 ? 0.85 : 1) + 0.8 * Math.sin(f * 2.1 + i + seed);
    out.push({ e: [x, y + (i % 2 ? 2 : 0), rr * 1.15, rr] });
  }
  return out;
}

function cloud(ctx: Ctx, list: readonly Blob[]): void {
  blobs(ctx, list, FX_COL.cloud, 1.6);
  ctx.save();
  ctx.beginPath();
  for (const b of list) {
    if (!('e' in b)) continue;
    const [x, y, rx, ry] = b.e;
    ctx.moveTo(x + rx, y);
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  }
  ctx.clip();
  ctx.fillStyle = FX_COL.cloudShade;
  for (const b of list) {
    if (!('e' in b)) continue;
    const [x, y, rx, ry] = b.e;
    ctx.beginPath();
    ctx.ellipse(x + rx * 0.2, y + ry * 0.75, rx * 0.9, ry * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function fry(ctx: Ctx, x: number, y: number, a: number, len: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.beginPath();
  ctx.roundRect(-2.4, 0, 4.8, len, 1.5);
  ink(ctx, FX_COL.fry, 1.3);
  ctx.fillStyle = FX_COL.fryShade;
  ctx.fillRect(0.9, 1.2, 1.3, len - 2);
  ctx.fillStyle = 'rgba(255, 250, 220, 0.85)';
  ctx.fillRect(-1.6, 1.4, 0.9, len * 0.5);
  ctx.restore();
}

function frontPath(ctx: Ctx): void {
  const { cx, top, bottom, topHalf, bottomHalf, dip } = BOX;
  ctx.beginPath();
  ctx.moveTo(cx - topHalf, top);
  ctx.quadraticCurveTo(cx, dip, cx + topHalf, top);
  ctx.lineTo(cx + bottomHalf, bottom);
  ctx.lineTo(cx - bottomHalf, bottom);
  ctx.closePath();
}

function box(ctx: Ctx, f: number): void {
  const { cx, top, bottom, topHalf } = BOX;
  // inside of the back panel
  ctx.beginPath();
  ctx.moveTo(cx - topHalf + 2, top - 3);
  ctx.lineTo(cx + topHalf - 2, top - 3);
  ctx.lineTo(cx + topHalf, top);
  ctx.lineTo(cx - topHalf, top);
  ctx.closePath();
  ink(ctx, FX_COL.paperShade, 1.4);
  for (let i = 0; i < 11; i++) {
    const x = cx - 20 + i * 4;
    const a = ((x - cx) / 84) * 1.2 + 0.06 * Math.sin(f * 2 + i * 1.7);
    fry(ctx, x, 1.5 + ((i * 7) % 5) * 1.2, a, 26);
  }
  frontPath(ctx);
  ctx.fillStyle = FX_COL.paper;
  ctx.fill();
  ctx.save();
  frontPath(ctx);
  ctx.clip();
  ctx.fillStyle = FX_COL.paperShade;
  ctx.fillRect(cx + 9, 0, 30, bottom);
  // checker strip + bordeaux band with the wordmark
  for (let row = 0; row < 2; row++) {
    for (let x = cx - 26, i = 0; x < cx + 26; x += 2.4, i++) {
      ctx.fillStyle = (i + row) % 2 ? INK : FX_COL.paper;
      ctx.fillRect(x, 24.6 + row * 1.5, 2.4, 1.5);
    }
  }
  ctx.fillStyle = FX_COL.bordeaux;
  ctx.fillRect(cx - 26, 27.6, 52, 11);
  ctx.fillStyle = FX_COL.paper;
  ctx.font = '700 8.4px "Arial Narrow", "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText("CICCIO'S", cx, 33.4, 34);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(cx - 26, 27.6);
  ctx.lineTo(cx + 26, 27.6);
  ctx.moveTo(cx - 26, 38.6);
  ctx.lineTo(cx + 26, 38.6);
  ctx.stroke();
  ctx.restore();
  frontPath(ctx);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
}

/** Ink "action ticks" flicking beside the box (the little strokes of the reference drawings). */
function ticks(ctx: Ctx, f: number): void {
  const out = f % 2 ? 2.5 : 0;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + side * (0.62 + i * 0.22);
      ctx.moveTo(BOX_AT.x + Math.cos(a) * 48, 54 + Math.sin(a) * 48);
      ctx.lineTo(BOX_AT.x + Math.cos(a) * (55 + out), 54 + Math.sin(a) * (55 + out));
    }
  }
  ctx.stroke();
}

/** Fries popping out of the box: up over the rim, then down into the cloud, alternating sides. */
function tossed(ctx: Ctx, f: number): void {
  for (let i = 0; i < TOSSED; i++) {
    const t = ((f + i) % 4) / 4 + 0.12;
    const side = i % 2 ? 1 : -1;
    const x = BOX_AT.x + side * (26 + 42 * t);
    const y = 26 - 20 * Math.sin(Math.PI * t) + 12 * t;
    fry(ctx, x, y, side * (0.5 + 2.6 * t), 15);
  }
}

export function drawFriesCloud(ctx: Ctx, f: number): void {
  const [lift, tilt] = JIGGLE[f % JIGGLE.length];
  cloud(ctx, [...puffs(60, 34, 206, 19, 16, f, 0), { e: [80, 50, 16, 13] }, { e: [160, 50, 16, 13] }]);
  ticks(ctx, f);
  ctx.save();
  ctx.translate(BOX_AT.x, BOX_AT.y + lift);
  ctx.rotate(tilt);
  ctx.scale(BOX_AT.scale, BOX_AT.scale);
  ctx.translate(-BOX.cx, -BOX.bottom);
  box(ctx, f);
  ctx.restore();
  tossed(ctx, f);
  cloud(ctx, puffs(81, 18, 222, 17, 14, f, 2));
}

/**
 * A falling handful of four fries under speed streaks (frame 24x60, drawn upright: the core never rotates
 * it). The bunch trails ABOVE the frame centre, so the leading tip touches the boss when the core's hit
 * circle (at the centre) does.
 */
export function drawFry(ctx: Ctx): void {
  ctx.strokeStyle = HERO_COL.speed;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const [x, len] of [[5, 6], [11, 5], [16, 7], [20, 4]] as const) {
    ctx.moveTo(x, 0.5);
    ctx.lineTo(x, 0.5 + len);
  }
  ctx.stroke();
  for (const [x, y, a, len] of FRY_BUNCH) fry(ctx, x, y, a, len);
}
