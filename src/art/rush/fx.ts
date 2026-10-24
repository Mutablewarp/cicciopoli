/**
 * Power-up FX: the golden nugget shield bubble round the truck (48x72 x 4), the melted cheddar
 * trail under it (40x24 x 4), chicken pop corn bits (6x6 x 4), the radar marks (40x16: 0 red danger
 * chevrons, 1 green safe arrows), the booster flame pointing down (12x24 x 4), a speed streak (2x24).
 */
import { Mask, paintMask } from '../hills/mask';
import { Raster, outlineRaster } from '../hills/raster';
import { rectR } from '../rampage/draw';
import { RU } from './colors';
import { flameDown } from './truckFly';

/** Golden ring round the truck with eight nugget beads that turn with the frame + sparkles. */
export function buildShield(): Raster[] {
  return [0, 1, 2, 3].map((f) => {
    const r = new Raster(48, 72);
    const cx = 23.5;
    const cy = 35.5;
    for (let y = 0; y < 72; y++) {
      for (let x = 0; x < 48; x++) {
        const d = Math.hypot((x - cx) / 22, (y - cy) / 34);
        if (d > 1 || d < 0.9) {
          if (d < 0.9 && d > 0.84 && (x + y + f) % 4 === 0) r.set(x, y, RU.goldShade); // inner shimmer
          continue;
        }
        const lit = x < cx && y < cy;
        r.set(x, y, d > 0.96 ? (lit ? RU.goldLight : RU.gold) : lit ? RU.gold : RU.goldShade);
      }
    }
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + (f / 4) * (Math.PI / 4);
      const bx = Math.round(cx + Math.cos(a) * 21);
      const by = Math.round(cy + Math.sin(a) * 33);
      rectR(r, bx - 2, by - 1, 4, 3, RU.gold);
      rectR(r, bx - 1, by - 2, 2, 5, RU.gold);
      r.set(bx - 1, by - 1, RU.goldLight);
      r.set(bx + 1, by + 1, RU.goldDark);
    }
    const sx = [10, 38, 30, 14][f];
    const sy = [8, 20, 62, 50][f];
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] as const) r.set(sx + dx, sy + dy, dx === 0 && dy === 0 ? RU.white : RU.goldLight);
    return r;
  });
}

/** Two lanes of melted cheddar under the tyres, drips sliding down with the frame (seamless loop). */
export function buildGrip(): Raster[] {
  return [0, 1, 2, 3].map((f) => {
    const r = new Raster(40, 24);
    for (const tx of [6, 28]) {
      for (let y = 0; y < 24; y++) {
        const w = 6 + ((y + f * 6) % 12 < 6 ? 0 : 1);
        rectR(r, tx - (w === 7 ? 1 : 0), y, w, 1, RU.cheddar);
        r.set(tx, y, RU.cheddarLight);
        r.set(tx + 5, y, RU.cheddarShade);
      }
      for (let k = 0; k < 2; k++) {
        const y = (k * 12 + f * 6) % 24;
        rectR(r, tx + 2, y, 2, 3, RU.cheddarLight); // glossy blob riding the stream
        r.set(tx + 2, y, RU.white);
      }
    }
    return r;
  });
}

export function buildPopcorn(): Raster[] {
  const shapes = [
    [[3, 3, 2, 2]], [[2, 3, 2, 2], [4, 3, 1, 1]], [[3, 2, 2, 2], [2, 4, 1, 1]], [[2, 2, 2, 2], [3, 3, 2, 2]],
  ] as const;
  return shapes.map((parts, f) => {
    const m = new Mask(6, 6);
    for (const [x, y, rx, ry] of parts) m.ellipse(x, y, rx, ry, 1);
    const r = new Raster(6, 6);
    paintMask(m, r, { 1: { light: RU.goldLight, base: RU.gold, shade: RU.goldShade } }, { shadeDepth: 1 });
    r.set(2 + (f % 2), 2, RU.white);
    outlineRaster(r, RU.goldDark);
    return r;
  });
}

function chevron(r: Raster, cx: number, y: number, up: boolean, fill: string, edge: string): void {
  for (let j = 0; j < 7; j++) {
    const row = up ? 6 - j : j;
    rectR(r, cx - 6 + row, y + j, 3, 1, fill);
    rectR(r, cx + 4 - row, y + j, 3, 1, fill);
    r.set(cx - 6 + row, y + j, edge);
    r.set(cx + 6 - row, y + j, edge);
  }
}

export function buildRadar(): Raster[] {
  const danger = new Raster(40, 16);
  for (const cx of [8, 20, 32]) chevron(danger, cx, 4, false, RU.danger, RU.dangerShade);
  const safe = new Raster(40, 16);
  for (const cx of [10, 30]) chevron(safe, cx, 2, true, RU.green, RU.greenShade);
  rectR(safe, 19, 4, 3, 10, RU.green);
  chevron(safe, 20, 1, true, RU.greenLight, RU.green);
  for (const r of [danger, safe]) outlineRaster(r, RU.ink);
  return [danger, safe];
}

export function buildFlame(): Raster[] {
  return [0, 1, 2, 3].map((f) => {
    const r = new Raster(12, 24);
    flameDown(r, 6, 0, 9, [21, 24, 19, 23][f], f);
    return r;
  });
}

export function buildSpeedLine(): Raster {
  const r = new Raster(2, 24);
  for (let y = 0; y < 24; y++) {
    const edge = Math.min(y, 23 - y);
    if (edge < 3 && y % 2 === 1) continue;
    r.set(0, y, edge < 5 ? RU.whiteShade : RU.white);
    if (edge >= 5) r.set(1, y, RU.whiteShade);
  }
  return r;
}
