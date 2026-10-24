/**
 * Side-strip drawing kit (128 wide, seamless vertically). Everything is drawn in "street space":
 * d = distance from the road edge (0..127), y = along the road (wraps at the strip height), so the same lot
 * code builds the left strip (road on its right) and the mirrored right strip. Buildings use the
 * top-down street projection of the level: the façade facing the road lies between the sidewalk
 * and the roof (ground floor near the road), the roof terrace beyond it.
 * Text and logos are drawn upright in screen space (they never mirror).
 */
import { Raster, hash2 } from '../hills/raster';
import { mix, shade } from '../pixel';
import { RU, type ZonePal } from './colors';
import { drawText, textWidth } from './font';
import type { RushZone } from './keys';
import { FACE_L, faceColours } from './lettering';

export const STRIP_W = 128;
export const STRIP_H = 256;
/**
 * Height of the centro and mare left strips: each carries its landmark (the Politeama; the coastal
 * tower and the port) once per period, so taller than any view plus the landmark: never twice on screen.
 */
export const SIDE_L_H = 1024;
/** The 12 px kerb + sidewalk band next to the road. */
export const WALK_D = 12;

export class Strip {
  readonly r: Raster;

  constructor(readonly side: 'L' | 'R', readonly pal: ZonePal, readonly h = STRIP_H) {
    this.r = new Raster(STRIP_W, h);
  }

  x(d: number): number {
    return this.side === 'L' ? STRIP_W - 1 - d : d;
  }

  px(d: number, y: number, c: string): void {
    if (d < 0 || d >= STRIP_W) return;
    this.r.set(this.x(d), ((y % this.h) + this.h) % this.h, c);
  }

  rect(d: number, y: number, dw: number, h: number, c: string): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < dw; i++) this.px(d + i, y + j, c);
  }

  /** Screen-space pixel at (x, y) with y wrapping (for upright text and logos). */
  screen(x: number, y: number, c: string): void {
    this.r.set(x, ((y % this.h) + this.h) % this.h, c);
  }

  /** Screen x of the left edge of a box of width w whose near (road-side) edge is at distance d. */
  boxX(d: number, w: number): number {
    return this.side === 'L' ? STRIP_W - d - w : d;
  }
}

/** Kerb stones next to the road and the paved sidewalk (joints every 8 px). */
export function sidewalk(s: Strip, kerb = s.pal.kerb): void {
  const p = s.pal;
  for (let y = 0; y < s.h; y++) {
    for (let d = 0; d < WALK_D; d++) {
      let c: string = d < 2 ? kerb : d === 2 ? p.kerbShade : (y % 8 === 0 || (d - 3) % 9 === 8) ? p.walkLine : hash2(d, y, 4) < 0.08 ? p.walkShade : p.walk;
      if (d < 2 && y % 16 === 0) c = p.kerbShade;
      if (d === 0) c = shade(kerb, -0.15);
      s.px(d, y, c);
    }
  }
}

/** Paved piazza / promenade band between the sidewalk and the buildings. */
export function paving(s: Strip, d0: number, d1: number, y0: number, len: number, base: string): void {
  for (let y = y0; y < y0 + len; y++) {
    for (let d = d0; d < d1; d++) {
      const joint = (y - y0) % 6 === 0 || (d - d0 + ((Math.floor((y - y0) / 6) % 2) * 3)) % 6 === 0;
      s.px(d, y, joint ? shade(base, -0.18) : hash2(d, y, 8) < 0.06 ? shade(base, 0.06) : base);
    }
  }
}

export interface Facade {
  y: number;
  len: number;
  colour: string;
  floors: number;
  /** shutters colour (green Palermo persiane), null = bare windows */
  shutter: string | null;
  balcony: boolean;
  /** awning colour over the shop at street level, null = plain ground floor */
  awning: string | null;
  roof: 'terrace' | 'tiles';
}

export const FACADE_D = 22;
const TERRACE_JOINT = '#55524c';
const FLOOR = 10;

/** One palazzo: shop front, floors of windows with shutters and wrought-iron balconies, cornice, roof. */
export function facade(s: Strip, f: Facade): number {
  const p = s.pal;
  const top = FACADE_D + 10 + f.floors * FLOOR;
  // façades sit a step darker than in daylight so traffic and hazards stay the brightest things
  const wall = shade(mix(f.colour, p.tint, 0.12), -0.22);
  const wallShade = shade(wall, -0.18);
  s.rect(FACADE_D, f.y, top - FACADE_D, f.len, wall);
  s.rect(FACADE_D, f.y, top - FACADE_D, 1, shade(wall, -0.35)); // party walls
  s.rect(FACADE_D, f.y + f.len - 1, top - FACADE_D, 1, wallShade);
  // ground floor: shop windows / doors, the awning shading the sidewalk band
  for (let y = f.y + 3; y + 7 < f.y + f.len; y += 11) {
    s.rect(FACADE_D, y, 7, 7, RU.glassDark);
    s.rect(FACADE_D + 6, y, 1, 7, RU.glass);
    if (f.awning) {
      for (let j = 0; j < 7; j++) s.rect(FACADE_D - 7, y + j, 7, 1, j % 2 === 0 ? f.awning : shade(f.awning, -0.3));
      s.rect(FACADE_D - 7, y, 1, 7, shade(f.awning, -0.45));
    }
  }
  s.rect(FACADE_D + 8, f.y, 2, f.len, wallShade); // string course
  for (let k = 0; k < f.floors; k++) {
    const d = FACADE_D + 10 + k * FLOOR;
    for (let y = f.y + 4; y + 6 < f.y + f.len; y += 11) {
      if (f.balcony) {
        s.rect(d, y - 2, 2, 9, shade(wall, -0.3));
        for (let j = -2; j < 7; j += 2) s.px(d + 2, y + j, RU.bodyDark);
      }
      s.rect(d + 2, y, 6, 5, RU.glassDark);
      s.rect(d + 7, y, 1, 5, shade(wall, 0.15)); // arched lintel catching the light
      if (f.shutter) {
        s.rect(d + 2, y - 2, 6, 2, f.shutter);
        s.rect(d + 2, y + 5, 6, 2, shade(f.shutter, -0.25));
      }
    }
  }
  s.rect(top - 1, f.y, 1, f.len, shade(wall, 0.2)); // cornice
  roof(s, f.y, f.len, top, f.roof);
  return top;
}

/** Colours a run of palazzi draws from. */
export interface RowLook {
  readonly walls: readonly string[];
  readonly shutters: readonly string[];
  readonly awnings: readonly string[];
}

const pick = <T>(list: readonly T[], h: number): T => list[Math.floor(h * list.length)];

/**
 * Palazzi of varied length (32..64, the last one takes the rest), colour, floors, shutters, shops
 * and roofs filling rows y0..y1, picked by hash from `seed`: no two runs of a long strip look alike.
 */
export function palazzi(s: Strip, y0: number, y1: number, seed: number, look: RowLook): void {
  for (let y = y0, k = 0; y < y1; k++) {
    const h = (i: number): number => hash2(k, i, seed);
    let len = 32 + 8 * Math.floor(h(1) * 5);
    if (y1 - y - len < 32) len = y1 - y;
    const shutter = h(4) < 0.8 ? pick(look.shutters, h(5)) : null;
    const awning = h(7) < 0.7 ? pick(look.awnings, h(8)) : null;
    facade(s, { y, len, colour: pick(look.walls, h(2)), floors: 2 + Math.floor(h(3) * 3), shutter, balcony: h(6) < 0.6, awning, roof: h(9) < 0.65 ? 'terrace' : 'tiles' });
    y += len;
  }
}

/** Roof terraces (parapet, water tanks, washing lines) or terracotta tiles, out to the strip edge. */
export function roof(s: Strip, y0: number, len: number, d0: number, kind: 'terrace' | 'tiles'): void {
  const p = s.pal;
  for (let y = y0; y < y0 + len; y++) {
    for (let d = d0; d < STRIP_W; d++) {
      let c: string;
      if (kind === 'tiles') c = (d - d0) % 3 === 0 ? p.roofShade : (y + (d % 6 < 3 ? 0 : 2)) % 4 === 0 ? p.roofShade : p.roof;
      else c = (d - d0) % 12 === 0 || (y - y0) % 12 === 0 ? TERRACE_JOINT : hash2(d, y, 6) < 0.05 ? TERRACE_JOINT : p.terrace;
      s.px(d, y, c);
    }
  }
  s.rect(d0, y0, 2, len, kind === 'tiles' ? p.roofLight : shade(p.terrace, 0.15)); // parapet / ridge
  s.rect(d0, y0, STRIP_W - d0, 1, shade(p.roofShade, -0.3));
  if (kind === 'tiles') return;
  for (let y = y0 + 6; y + 8 < y0 + len; y += 18) {
    const d = d0 + 8 + Math.floor(hash2(y, d0, 2) * 20);
    s.rect(d, y, 6, 6, RU.whiteShade); // water tank
    s.rect(d, y, 6, 1, RU.white);
    s.rect(d + 5, y, 1, 6, RU.rim);
    if (hash2(y, 3, 9) < 0.6) {
      for (let j = 0; j < 9; j++) s.px(d + 10 + j, y + 2, RU.rim); // washing line
      for (const [j, c] of [[1, '#e04848'], [3, '#f0f0e8'], [6, '#4a8ad8']] as const) s.rect(d + 11 + j, y + 3, 2, 2, c);
    }
  }
}

/** Top-down palm: radial fronds round a dark crown (casts a soft shadow towards the bottom-right). */
export function palm(s: Strip, d: number, y: number, frond = '#3e8a3a'): void {
  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2 + 0.3;
    for (let k = 2; k < 8; k++) {
      const dd = Math.round(d + Math.cos(ang) * k);
      const yy = Math.round(y + Math.sin(ang) * k * 0.9);
      s.px(dd + 1, yy + 2, s.pal.walkShade);
      s.px(dd, yy, k > 5 ? shade(frond, -0.25) : frond);
      if (k % 2 === 0) s.px(dd, yy + 1, shade(frond, 0.2));
    }
  }
  s.rect(d - 1, y - 1, 3, 3, '#6a4a2a');
  s.px(d - 1, y - 1, '#8a6a3a');
}

/** Round tree canopy (ficus / pine) with a lit top-left. */
export function tree(s: Strip, d: number, y: number, rad: number, base: string): void {
  for (let j = -rad; j <= rad; j++) {
    for (let i = -rad; i <= rad; i++) {
      const q = (i * i + j * j) / (rad * rad);
      if (q > 1 || (q > 0.8 && hash2(d + i, y + j, 3) < 0.4)) continue;
      const lit = (s.side === 'L' ? i : -i) + j < -rad / 2;
      const c = lit ? shade(base, 0.18) : q > 0.55 && hash2(i, j, 5) < 0.5 ? shade(base, -0.22) : base;
      s.px(d + i, y + j, c);
    }
  }
}

/** Street lamp seen from above: pole foot on the sidewalk, the head hanging over it (lit = glow). */
export function lamp(s: Strip, y: number, lit: boolean): void {
  s.rect(7, y, 2, 2, RU.bodyDark);
  s.rect(3, y, 4, 1, RU.bodyLight);
  s.rect(1, y - 1, 3, 3, lit ? RU.amberHot : RU.rimLight);
  if (lit) for (const [dd, dy] of [[0, -2], [2, -2], [4, 0], [0, 2], [2, 2]] as const) s.px(dd, y + dy, RU.amber);
}

/**
 * Rows of the Ciccio's storefront in each zone's right strip: the one place where the plain strips
 * ('rush-sideRPlain-*', a palazzo there instead) differ from the strips with the shop.
 */
export const STOREFRONT: Readonly<Record<RushZone, { readonly y: number; readonly len: number }>> = {
  centro: { y: 0, len: 64 },
  stadio: { y: 104, len: 64 },
  mare: { y: 88, len: 72 },
};

/**
 * The Ciccio's storefront: black front with white trim and glazing, black awning, and the blade
 * sign with the face logo + CICCIO'S hanging over the sidewalk, upright so it reads from the road
 * (centred on the shop unless `sy`, its top row, is given).
 */
export function ciccios(s: Strip, y: number, len: number, sy = y + Math.floor(len / 2) - 14): void {
  s.rect(FACADE_D - 1, y, 12, len, RU.bodyShade);
  for (let k = y + 4; k + 8 < y + len; k += 12) {
    s.rect(FACADE_D, k, 8, 9, RU.glass);
    s.rect(FACADE_D, k, 1, 9, RU.amber); // warm light inside
    s.rect(FACADE_D + 4, k, 1, 9, RU.glassLight);
  }
  for (let j = 0; j < len; j++) s.rect(FACADE_D - 7, y + j, 6, 1, j % 6 < 3 ? RU.bodyDark : RU.check);
  s.rect(FACADE_D - 7, y, 1, len, RU.vinyl);
  const w = 27;
  const x = s.boxX(5, w);
  for (let j = 0; j < 28; j++) for (let i = 0; i < w; i++) s.screen(x + i, sy + j, i === 0 || j === 0 || i === w - 1 || j === 27 ? RU.vinyl : RU.bodyDark);
  const fc = faceColours(RU.bodyLight);
  FACE_L.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] !== '.') s.screen(x + 7 + i, sy + 2 + j, fc[row[i]]);
  });
  signText(s, "CICCIO'S", x + Math.floor((w - textWidth("CICCIO'S")) / 2), sy + 21, RU.vinyl);
}

export function signText(s: Strip, text: string, x: number, y: number, c: string): void {
  const tmp = new Raster(textWidth(text), 5);
  drawText(tmp, text, 0, 0, c);
  for (let j = 0; j < 5; j++) for (let i = 0; i < tmp.w; i++) if (tmp.get(i, j) !== 0) s.screen(x + i, y + j, c);
}
