/**
 * The counter props of the owner's POV photo (ref/level7_pov_order.png, bottom right), standing on the
 * steel counter top (56x44, transparent, the base on the bottom rows): a stack of dark plates and, in
 * front of it, the brushed-steel cup full of black straws. Light from the top-left, ink outlines like
 * the till next to them.
 */
import { Raster, hash2, outlineRaster } from '../../hills/raster';
import { bayer, mix } from '../../pixel';
import { lineR } from '../../rampage/draw';
import { KC } from './palette';

const W = 56;
const H = 44;
const on = (x: number, y: number, t: number): boolean => t > bayer(x, y);
/** Colour `t` (0-1) of the way along `ramp`, dithered between its two nearest steps (dither threshold
 * row `ty`: the pixel row, or a coarser one for vertical brushed streaks). */
function ramped(ramp: readonly string[], t: number, x: number, ty: number): string {
  const u = Math.max(0, Math.min(1, t)) * (ramp.length - 1);
  const k = Math.min(ramp.length - 2, Math.floor(u));
  return on(x, ty, u - k) ? ramp[k + 1] : ramp[k];
}
/** Half height of an ellipse of radii rx, ry at dx from its centre. */
const half = (dx: number, rx: number, ry: number): number => Math.round(ry * Math.sqrt(Math.max(0, 1 - (dx / rx) ** 2)));

/** dark glazed plates: body, rim, lit rim, the warm glint of the room's lights on the far left */
const PLATE = [KC.blackLight, KC.blackHi, mix(KC.blackHi, KC.steelShade, 0.45), mix(KC.steelShade, KC.bulbWarm, 0.3)] as const;
const STACK = { cx: 15, rx: 12, ry: 3, count: 9, top: 22 } as const;

/** Nine dark plates stacked a little behind the cup: each shows a lit rim row and a dark underside row. */
function plates(): Raster {
  const r = new Raster(W, H);
  const { cx, rx, ry, count, top } = STACK;
  for (let i = count - 1; i >= 0; i--) {
    const cy = top + 2 * i;
    if (i === 0) {
      // the top plate seen from above: a wide rim (lit towards the top-left), the step down, the well
      for (let dx = -rx; dx <= rx; dx++) {
        const e = half(dx, rx, ry + 1);
        for (let y = cy - 2 - e; y <= cy - 2 + e; y++) {
          const d = Math.hypot(dx / rx, (y - cy + 2) / (ry + 1));
          const lit = dx < 0 && y < cy - 1;
          r.set(cx + dx, y, d <= 0.5 ? PLATE[0] : d <= 0.68 ? KC.black : lit ? PLATE[2] : PLATE[1]);
        }
      }
      for (const [gx, gy] of [[-7, -5], [-6, -5], [-9, -4]] as const) r.set(cx + gx, cy + gy, PLATE[3]);
    }
    for (let dx = -rx; dx <= rx; dx++) {
      const e = half(dx, rx, ry);
      const x = cx + dx;
      for (let y = cy; y < cy + e - 1; y++) r.set(x, y, PLATE[0]);
      const lit = (rx - dx) / (2 * rx);
      r.set(x, cy + e - 1, ramped(PLATE, 0.3 + 0.6 * lit * lit, x, cy + e - 1));
      if (Math.abs(dx) < rx) r.set(x, cy + e, KC.black); // the rims stick out past the bodies
    }
  }
  outlineRaster(r, KC.ink);
  return r;
}

/** brushed steel, dark to bright */
const STEEL = [KC.steelDark, KC.steelShade, KC.steel, KC.steelLight, KC.steelHi, KC.white] as const;
const CUP = { cx: 40, rx: 10, rimY: 16, ry: 2, baseY: 40 } as const;

/** Brightness (0-1) of the cup at u (0 left edge - 1 right edge) and depth v (0 rim - 1 base): lit from
 * the top-left, a bright vertical highlight a third in, the edges turning away into shade. */
function cupLight(u: number, v: number, x: number): number {
  const spec = 0.42 * Math.exp(-(((u - 0.3) / 0.1) ** 2));
  const edge = u < 0.08 ? 0.22 : u > 0.9 ? 0.12 : 0;
  const grain = (hash2(x, 0, 5) - 0.5) * 0.14; // brushed: faint vertical streaks
  return 0.66 - 0.42 * u + spec - edge - 0.16 * v + grain;
}

/** The brushed-steel cup with its rolled lip and a fan of black straws coming out of its dark mouth. */
function cup(): Raster {
  const r = new Raster(W, H);
  const { cx, rx, rimY, ry, baseY } = CUP;
  // dark mouth and the far half of the lip
  for (let dx = -rx; dx <= rx; dx++) {
    const e = half(dx, rx, ry);
    for (let y = rimY - e; y <= rimY + e; y++) r.set(cx + dx, y, KC.ink);
    r.set(cx + dx, rimY - e, dx < 0 ? KC.steelLight : KC.steelShade);
  }
  // straws, fanning out a little, the ones on the left catching the light
  const straws = 12;
  for (let s = 0; s < straws; s++) {
    const x0 = cx - 8 + (s * 16) / (straws - 1);
    const lean = (x0 - cx) * 0.3;
    const top = 1 + Math.floor(hash2(s, 3, 11) * 6);
    const lit = s < 3;
    const col = lit ? KC.blackHi : s % 2 ? KC.black : KC.blackLight;
    lineR(r, x0, rimY, x0 + lean, top, col);
    r.set(Math.round(x0 + lean), top, lit ? KC.steelShade : KC.blackHi); // open end
  }
  // body: rolled lip, the shadow under it, brushed steel, the darker rounded base
  for (let dx = -rx; dx <= rx; dx++) {
    const x = cx + dx;
    const u = (dx + rx) / (2 * rx);
    const e = half(dx, rx, ry);
    const bottom = baseY + half(dx, rx, 2);
    for (let y = rimY + e + 1; y <= bottom; y++) {
      const v = (y - rimY) / (bottom - rimY);
      let c = ramped(STEEL, cupLight(u, v, x) - (y >= bottom - 1 ? 0.25 : 0), x, Math.floor(y / 3));
      if (u > 0.7 && u < 0.84) c = mix(c, KC.bulbWarm, 0.22); // the warm room mirrored on the right
      r.set(x, y, c);
    }
    r.set(x, rimY + e, u < 0.55 ? KC.white : u < 0.85 ? KC.steelHi : KC.steelLight);
    r.set(x, rimY + e + 1, ramped(STEEL, cupLight(u, 0, x) - 0.3, x, rimY + e + 1));
    r.set(x, bottom, u < 0.4 ? KC.steelShade : KC.steelDark);
  }
  outlineRaster(r, KC.ink);
  return r;
}

/** Plates behind, the cup in front of them (its ink outline separates the two). */
export function buildCounterProps(): Raster {
  const r = plates();
  r.blit(cup(), 0, 0);
  return r;
}
