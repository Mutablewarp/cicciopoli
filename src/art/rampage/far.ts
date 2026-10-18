/**
 * 'rampage-far' 512x160: distant Palermo skyline, flat low-contrast silhouettes with
 * flat roofs, water tanks, a church dome, palms and two tower cranes. Seamless at 512.
 */
import { Mask } from '../hills/mask';
import { Raster, hash2 } from '../hills/raster';
import { RC } from './colors';
import { lineR, rectR } from './draw';
import { LAYER_W } from './sky';

const FAR_H = 160;

interface Row {
  tone: string;
  light: string;
  minH: number;
  maxH: number;
  minW: number;
  maxW: number;
  seed: number;
  lit: number;
}

const BACK: Row = { tone: RC.farBack, light: RC.farBackLight, minH: 74, maxH: 112, minW: 22, maxW: 40, seed: 3, lit: 0.1 };
const FRONT: Row = { tone: RC.farFront, light: RC.farFrontLight, minH: 40, maxH: 82, minW: 16, maxW: 34, seed: 8, lit: 0.18 };

function dome(r: Raster, cx: number, top: number, rad: number, tone: string, light: string): void {
  const m = new Mask(LAYER_W, FAR_H, true);
  m.ellipse(cx, top, rad, rad, 1);
  for (let y = top; y <= top + rad; y++) for (let x = cx - rad; x <= cx + rad; x++) {
    if (m.get(x, y) === 0 || y > top) continue;
    r.set(x, y, x < cx - 1 ? light : tone);
  }
  // drum + spire
  rectR(r, cx - rad + 1, top + 1, 2 * rad - 1, 4, tone);
  lineR(r, cx, top - rad, cx, top - rad - 5, tone);
  r.set(cx - 1, top - rad - 3, tone);
  r.set(cx + 1, top - rad - 3, tone);
}

function roofFeature(r: Raster, spec: Row, x: number, w: number, top: number, i: number): void {
  const pick = hash2(i, 5, spec.seed);
  if (pick < 0.2) {
    rectR(r, x + 3, top - 3, 1, 3, spec.tone);
    rectR(r, x + 7, top - 3, 1, 3, spec.tone);
    rectR(r, x + 2, top - 8, 7, 5, spec.tone);
    rectR(r, x + 2, top - 8, 7, 1, spec.light);
  } else if (pick < 0.4) {
    const hgt = 7 + Math.floor(hash2(i, 6, spec.seed) * 7);
    lineR(r, x + Math.floor(w / 2), top - 1, x + Math.floor(w / 2), top - hgt, spec.tone);
    lineR(r, x + Math.floor(w / 2) - 2, top - hgt + 3, x + Math.floor(w / 2) + 2, top - hgt + 3, spec.tone);
  } else if (pick < 0.58) {
    rectR(r, x + 3, top - 6, Math.max(6, w - 9), 6, spec.tone);
    rectR(r, x + 3, top - 6, Math.max(6, w - 9), 1, spec.light);
  } else if (pick < 0.68 && w >= 24) {
    dome(r, x + Math.floor(w / 2), top - 2, Math.min(9, Math.floor(w / 2) - 3), spec.tone, spec.light);
  } else if (pick < 0.85) {
    rectR(r, x + w - 6, top - 5, 3, 5, spec.tone);
  }
}

function skyline(r: Raster, spec: Row): void {
  let x = 0;
  for (let i = 0; x < LAYER_W; i++) {
    let w = spec.minW + Math.floor(hash2(i, 1, spec.seed) * (spec.maxW - spec.minW + 1));
    if (LAYER_W - x - w < spec.minW) w = LAYER_W - x;
    const h = spec.minH + Math.floor(hash2(i, 2, spec.seed) * (spec.maxH - spec.minH + 1));
    const top = FAR_H - h;
    rectR(r, x, top, w, h, spec.tone);
    rectR(r, x, top, w, 1, spec.light);
    rectR(r, x, top, 1, h, spec.light);
    for (let wy = top + 6; wy < FAR_H - 4; wy += 8) {
      for (let wx = x + 4; wx + 2 < x + w - 2; wx += 6) {
        if (hash2(wx, wy, spec.seed + 9) < spec.lit) rectR(r, wx, wy, 2, 3, RC.farWindow);
      }
    }
    roofFeature(r, spec, x, w, top, i);
    x += w;
  }
}

function palm(r: Raster, x: number, height: number, tone: string): void {
  const lean = 5;
  const topX = x + lean;
  const topY = FAR_H - height;
  for (let t = 0; t <= height; t++) {
    const u = t / height;
    r.set(Math.round(x + lean * u * u), FAR_H - t, tone);
    r.set(Math.round(x + lean * u * u) + 1, FAR_H - t, tone);
  }
  for (const [dx, dy] of [[-12, 3], [-9, -4], [-4, -7], [4, -7], [10, -4], [13, 3], [0, -9]] as const) {
    const n = Math.max(Math.abs(dx), Math.abs(dy));
    for (let k = 0; k <= n; k++) {
      const droop = dx === 0 ? 0 : Math.round((k * k) / (n * 2.2));
      r.set(topX + Math.round((dx * k) / n), topY + Math.round((dy * k) / n) + droop, tone);
    }
  }
}

/** Tower crane: lattice mast, long jib, counter-jib with weight, tie lines, hanging hook. */
function crane(r: Raster, x: number, height: number, tone: string): void {
  const top = FAR_H - height;
  for (let y = top; y < FAR_H; y++) {
    r.set(x, y, tone);
    r.set(x + 2, y, tone);
    if (y % 4 === 0) r.set(x + 1, y, tone);
  }
  rectR(r, x - 14, top, 62, 2, tone);
  rectR(r, x - 14, top + 2, 5, 4, tone);
  lineR(r, x + 1, top - 9, x + 46, top, tone);
  lineR(r, x + 1, top - 9, x - 13, top, tone);
  rectR(r, x, top - 12, 3, 4, tone);
  lineR(r, x + 34, top + 2, x + 34, top + 24, tone);
  rectR(r, x + 33, top + 24, 3, 3, tone);
}

export function buildFar(): Raster {
  const r = new Raster(LAYER_W, FAR_H, true);
  skyline(r, BACK);
  palm(r, 74, 104, RC.farBack);
  palm(r, 318, 112, RC.farBack);
  palm(r, 452, 98, RC.farBack);
  crane(r, 140, 118, RC.farFront);
  crane(r, 392, 104, RC.farBack);
  skyline(r, FRONT);
  return r;
}
