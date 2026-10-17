/** Near stepped hills (cup style, teal stair outline + curly vines) and the bushes strip. */
import { bayer } from '../pixel';
import { HC } from './colors';
import { Mask, paintMask } from './mask';
import { Raster, hash2, outlineRaster, packColor } from './raster';
import { LAYER_W } from './sky';

interface Hill { cx: number; hw: number; h: number; flat: number; back: boolean }

const NEAR_H = 192;

const HILLS_NEAR: readonly Hill[] = [
  { cx: 70, hw: 84, h: 124, flat: 7, back: true },
  { cx: 292, hw: 92, h: 146, flat: 8, back: true },
  { cx: 176, hw: 78, h: 100, flat: 6, back: false },
  { cx: 404, hw: 68, h: 84, flat: 6, back: false },
  { cx: 508, hw: 54, h: 62, flat: 5, back: false },
];

function wrapDist(x: number, cx: number): number {
  const d = Math.abs(x - cx) % LAYER_W;
  return Math.min(d, LAYER_W - d);
}

/** Top y of a hill at column x, or NEAR_H when the column is outside it. */
function hillTop(h: Hill, x: number): number {
  const dx = wrapDist(x, h.cx);
  if (dx > h.hw) return NEAR_H;
  const u = Math.max(0, dx - h.flat) / (h.hw - h.flat);
  return Math.round(NEAR_H - h.h * (1 - Math.pow(u, 1.7)));
}

function paintHill(r: Raster, h: Hill): void {
  const fill: string = h.back ? HC.hillBack : HC.hill;
  const light = h.back ? HC.hillBackLight : HC.hillLight;
  const shade = h.back ? HC.hillBackShade : HC.hillShade;
  const line = packColor(HC.hillLine);
  for (let dx = -h.hw - 1; dx <= h.hw + 1; dx++) {
    const x = h.cx + dx;
    const top = hillTop(h, x);
    if (top >= NEAR_H) continue;
    const side = Math.max(hillTop(h, x - 1), hillTop(h, x + 1));
    for (let y = top; y < NEAR_H; y++) {
      if (y < Math.max(top + 1, side)) { r.set(x, y, line); continue; }
      const inside = (ix: number, iy: number): boolean => iy >= hillTop(h, ix);
      let col = fill;
      if (!inside(x + 1, y) || !inside(x + 2, y) || !inside(x + 1, y - 3)) col = shade;
      else if (!inside(x + 3, y) && hash2(x, y, 7) < 0.5) col = shade;
      else if (!inside(x, y - 2) || !inside(x - 2, y) || !inside(x - 1, y - 1)) col = light;
      r.set(x, y, col);
    }
  }
}

/** Thin curly vine: stepped diagonal ending in a small hook (cup detail). */
function vine(r: Raster, x: number, y: number, dir: 1 | -1, len: number): void {
  const canDraw = (px: number, py: number): boolean => {
    const c = r.get(px, py);
    return c !== 0 && c !== packColor(HC.hillLine);
  };
  const pts: [number, number][] = [];
  for (let t = 0; t <= len; t++) pts.push([x + dir * t, y + Math.round(t * 0.7 + Math.sin(t / 3) * 0.8)]);
  const [ex, ey] = pts[pts.length - 1];
  const curl: [number, number][] = [[1, 1], [1, 2], [0, 3], [-1, 3], [-2, 2], [-2, 1], [-1, 0]];
  for (const [cx, cy] of curl) pts.push([ex + dir * (cx + 1), ey + cy]);
  for (const [px, py] of pts) if (canDraw(px, py)) r.set(px, py, HC.vine);
  // a couple of tiny leaves along the stem
  const [lx, ly] = pts[Math.floor(len / 2)];
  if (canDraw(lx, ly - 1)) r.set(lx, ly - 1, HC.vine);
  if (canDraw(lx - dir, ly - 1)) r.set(lx - dir, ly - 1, HC.vine);
}

export function buildNear(): HTMLCanvasElement {
  const r = new Raster(LAYER_W, NEAR_H, true);
  for (const h of HILLS_NEAR) if (h.back) paintHill(r, h);
  for (const h of HILLS_NEAR) if (!h.back) paintHill(r, h);
  vine(r, 52, 120, -1, 12);
  vine(r, 160, 132, -1, 12);
  vine(r, 214, 150, 1, 9);
  vine(r, 300, 96, -1, 14);
  vine(r, 330, 150, 1, 10);
  vine(r, 398, 140, -1, 11);
  return r.toCanvas();
}

/* ------------------------------------------------------------------ bushes */

const BUSH_H = 64;
const BUSH = { light: HC.bushLight, base: HC.bush, shade: HC.bushShade };
const BUSH_B = { light: '#3c9040', base: '#2b7636', shade: HC.bushShade };
const TREE = { light: '#3a8c44', base: '#286e38', shade: '#1f5a2e' };
const TRUNK = { light: '#7a5434', base: HC.trunk, shade: '#3e2818' };

function bushClump(m: Mask, x: number, base: number, size: number, seed: number): void {
  const n = 3 + Math.floor(hash2(seed, 1) * 3);
  for (let i = 0; i < n; i++) {
    const rr = Math.round(size * (0.55 + hash2(seed, i + 2) * 0.45));
    const ox = Math.round((i - (n - 1) / 2) * size * 0.75);
    const lift = Math.round(hash2(seed, i + 9) * size * 0.4);
    m.ellipse(x + ox, base - rr - lift + 2, rr + 1, rr, i % 2 === 0 ? 1 : 2);
  }
}

function tree(m: Mask, x: number, base: number, height: number, rad: number): void {
  m.rect(x - 1, base - height + rad, 3, height - rad, 4);
  m.ellipse(x, base - height + rad, rad + 1, rad, 3);
  m.ellipse(x - Math.round(rad * 0.6), base - height + rad + 3, Math.round(rad * 0.6), Math.round(rad * 0.55), 3);
  m.ellipse(x + Math.round(rad * 0.6), base - height + rad + 4, Math.round(rad * 0.55), Math.round(rad * 0.5), 3);
}

export function buildBushes(): HTMLCanvasElement {
  const m = new Mask(LAYER_W, BUSH_H, true);
  const groundY = BUSH_H - 8;
  tree(m, 70, groundY, 44, 10);
  tree(m, 236, groundY, 52, 12);
  tree(m, 262, groundY, 36, 8);
  tree(m, 404, groundY, 46, 11);
  const clumps: [number, number][] = [[24, 9], [110, 11], [160, 8], [200, 10], [300, 12], [350, 8], [440, 10], [492, 9]];
  clumps.forEach(([x, s], i) => bushClump(m, x, groundY, s, i + 3));
  // low hedge of overlapping lumps so the strip never shows a flat (walkable-looking) top
  for (let x = 0; x < LAYER_W; x += 9) {
    const rr = 5 + Math.floor(hash2(x, 5) * 4);
    m.ellipse(x + Math.floor(hash2(x, 6) * 4), groundY - rr + 4, rr + 1, rr, (x / 9) % 2 === 0 ? 2 : 1);
  }
  m.rect(0, groundY + 2, LAYER_W, BUSH_H - groundY - 2, 2);
  const r = new Raster(LAYER_W, BUSH_H, true);
  paintMask(m, r, { 1: BUSH, 2: BUSH_B, 3: TREE, 4: TRUNK }, { shadeDepth: 2, lightDepth: 1, openBottom: true });
  // scattered leaf glints in the lit upper half of each lump
  r.map((c, x, y) => (y < groundY && c === packColor(BUSH.base) && hash2(x, y, 3) < 0.07 ? packColor(BUSH.light) : c));
  outlineRaster(r, HC.bushLine);
  // dissolve the last rows so the strip's bottom never reads as a ledge when seen through a pit
  for (let y = BUSH_H - 6; y < BUSH_H; y++) {
    const t = (y - (BUSH_H - 6) + 1) / 7;
    for (let x = 0; x < LAYER_W; x++) if (bayer(x, y) < t) r.set(x, y, null);
  }
  return r.toCanvas();
}
