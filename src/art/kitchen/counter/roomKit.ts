/**
 * The Sperlinga dining room as a one-point perspective box, as in the owner's POV photo
 * (ref/level7_pov_order.png): the iron pergola's front frame (posts x0 / x1, top bar, the floor line at
 * the posts), its warm concrete ceiling with cross beams and thin RING LIGHTS, the terracotta brick
 * side walls, the plaster far wall with the garden door, the dark tiles of the aisle and, in front of
 * the pergola, the white tiles with blue grout. Every pixel is a ray from the eye: the nearest plane
 * it hits gives the surface and the depth; seams and grout are 1-px lines where the world tile index
 * changes between neighbours, so they converge cleanly at any size.
 *
 * World units: X across and Y down are front-plane px from the vanishing point, Z the depth
 * (1 = the pergola's front frame, 1 / k = the far wall); D = Z * f is the depth in the same px as X.
 */
import { Raster, hash2 } from '../../hills/raster';
import { bayer, mix } from '../../pixel';
import { KC } from './palette';

export interface Box {
  vx: number;
  vy: number;
  x0: number;
  x1: number;
  top: number;
  floor: number;
  /** far frame = vanishing point + (front frame - vanishing point) * k */
  k: number;
  /** focal length (px) */
  f: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A thin warm ring light hanging under the ceiling: centre X, centre depth D, radius (world px). */
export type RingLight = readonly [number, number, number];

export type Surface = 'ceiling' | 'floor' | 'left' | 'right' | 'far';

export const on = (x: number, y: number, t: number): boolean => t > bayer(x, y);

export const walls = (b: Box): { xl: number; xr: number; yc: number; yf: number; zFar: number } => ({
  xl: b.x0 - b.vx, xr: b.x1 - b.vx, yc: b.top - b.vy, yf: b.floor - b.vy, zFar: 1 / b.k,
});

/** Screen point of the world point (X, Y, Z). */
export const proj = (b: Box, X: number, Y: number, Z: number): [number, number] => [b.vx + X / Z, b.vy + Y / Z];

/** Far frame (the back of the pergola, around the far wall) in screen px. */
export function farRect(b: Box): Rect {
  const x = b.vx + (b.x0 - b.vx) * b.k;
  const y = b.vy + (b.top - b.vy) * b.k;
  return { x, y, w: (b.x1 - b.x0) * b.k, h: (b.floor - b.top) * b.k };
}

/** Surface seen through the pixel centre and its depth Z. Side walls exist only between the posts. */
export function hit(b: Box, x: number, y: number): [Surface, number] {
  const w = walls(b);
  const dx = x + 0.5 - b.vx;
  const dy = y + 0.5 - b.vy;
  let best: [Surface, number] = ['far', w.zFar];
  const take = (s: Surface, z: number): void => {
    if (z > 0 && z < best[1]) best = [s, z];
  };
  if (dy < 0) take('ceiling', w.yc / dy);
  if (dy > 0) take('floor', w.yf / dy);
  const inside = x >= b.x0 && x < b.x1;
  if (inside && dx < 0) take('left', w.xl / dx);
  if (inside && dx > 0) take('right', w.xr / dx);
  return best;
}

/** Tile index of a surface point: [column, row] in world tiles of the surface's pattern. */
function cell(b: Box, s: Surface, x: number, y: number, z: number): [number, number] {
  const X = (x + 0.5 - b.vx) * z;
  const Y = (y + 0.5 - b.vy) * z;
  const D = z * b.f;
  if (s === 'ceiling') return [0, Math.floor(D / 34)];
  if (s === 'floor') return z < 1 ? [Math.floor(X / 9), Math.floor(D / 9)] : [Math.floor(X / 12), Math.floor(D / 6)];
  if (s === 'far') return [0, 0];
  const course = Math.floor(Y / 4);
  return [Math.floor((D + (course % 2) * 9) / 18), course];
}

function colour(b: Box, s: Surface, x: number, y: number, z: number, seam: boolean): string {
  const D = z * b.f;
  if (s === 'ceiling') {
    // a cross beam every 34 px of depth: dark underside, lit front edge
    if (seam) return KC.ceilingDark;
    if (D % 34 < 4) return D % 34 < 1.5 ? KC.ceilingLight : KC.ceilingShade;
    return on(x, y, 0.25 + Math.min(0.5, (z - 1) * 0.3)) ? KC.ceilingShade : KC.ceiling;
  }
  if (s === 'floor') {
    if (z < 1) {
      const near = Math.min(1, (1 - z) * 4);
      if (seam) return near > 0.3 ? KC.grout : mix(KC.grout, KC.tileShade, 0.5);
      return on(x, y, near * 0.8 + 0.1) ? KC.tile : KC.tileShade;
    }
    if (seam) return KC.aisleGrout;
    return hash2(...cell(b, s, x, y, z), 5) < 0.3 ? KC.aisleLight : KC.aisle;
  }
  if (s === 'far') return KC.plaster;
  // terracotta brick, a notch darker towards the back and down near the planters
  const [col, course] = cell(b, s, x, y, z);
  if (seam) return hash2(x, y, 3) < 0.3 ? KC.mortarShade : KC.mortar;
  const tone = hash2(col, course, s === 'left' ? 6 : 7);
  let c: string = tone < 0.22 ? KC.brickShade : tone > 0.82 ? KC.brickLight : KC.brick;
  const dim = (z - 1) * 0.35 + Math.max(0, ((y + 0.5 - b.vy) * z) / walls(b).yf) * 0.25;
  if (on(x, y, dim)) c = c === KC.brickLight ? KC.brick : c === KC.brick ? KC.brickShade : KC.brickDark;
  return c;
}

/** Ceiling, walls, floors and far wall of the whole raster. */
export function paintBox(r: Raster, b: Box): void {
  for (let y = 0; y < r.h; y++) {
    for (let x = 0; x < r.w; x++) {
      const [s, z] = hit(b, x, y);
      const here = cell(b, s, x, y, z);
      const seamWith = (nx: number, ny: number): boolean => {
        const [ns, nz] = hit(b, nx, ny);
        if (ns !== s) return false;
        const there = cell(b, ns, nx, ny, nz);
        return there[0] !== here[0] || there[1] !== here[1];
      };
      r.set(x, y, colour(b, s, x, y, z, s !== 'far' && (seamWith(x + 1, y) || seamWith(x, y + 1))));
    }
  }
}

/** Plaster far wall (darker around the door) and the glass garden door with daylight and greenery. */
export function farWall(r: Raster, b: Box, door: Rect): void {
  const f = farRect(b);
  const cx = door.x + door.w / 2;
  for (let y = Math.ceil(f.y); y < f.y + f.h; y++) {
    for (let x = Math.ceil(f.x); x < f.x + f.w; x++) {
      const t = Math.abs(x - cx) / (f.w / 2);
      const n = hash2(x, y, 11);
      r.set(x, y, n > 0.95 ? KC.plasterDark : on(x, y, 0.75 - t * 0.5) ? KC.plasterShade : KC.plaster);
    }
  }
  const a = door;
  for (let y = a.y - 2; y < a.y + a.h; y++) for (let x = a.x - 2; x < a.x + a.w + 2; x++) r.set(x, y, KC.doorFrame);
  for (let y = a.y; y < a.y + a.h; y++) {
    const t = (y - a.y) / a.h;
    for (let x = a.x; x < a.x + a.w; x++) {
      // daylight kept a step dimmer than the room's whites, so it never pulls the eye off the customer
      let c: string = on(x, y, t * 1.2) ? KC.glassShade : KC.glass;
      const bush = Math.sin(x * 0.9) * 2 + a.y + a.h * 0.4 + Math.sin(x * 0.31) * 3;
      if (y > bush) c = on(x, y, 0.45) ? KC.daylightGreen : mix(KC.daylightGreen, KC.leaf, 0.45);
      if (y > a.y + a.h * 0.86) c = on(x, y, 0.5) ? KC.glassShade : KC.facadeShade;
      r.set(x, y, c);
    }
  }
  const mid = Math.floor(a.x + a.w / 2);
  for (let y = a.y; y < a.y + a.h; y++) r.set(mid, y, KC.doorFrame);
  for (let k = 0; k < 5; k++) r.set(a.x + 1 + k, a.y + 2 + k, KC.glassLight); // glint
}

/**
 * Ring lights: 1-px warm lines on their plane `hang` px under the ceiling, a dithered glow around
 * them and a warm pool on the ceiling inside them. Hidden behind the side walls they would pass.
 */
export function ringLights(r: Raster, b: Box, rings: readonly RingLight[], hang: number): void {
  const w = walls(b);
  const plane = w.yc + hang;
  const dist = (x: number, y: number): number[] => {
    const dy = y + 0.5 - b.vy;
    if (dy >= 0) return rings.map(() => 1e9);
    const z = plane / dy;
    const X = (x + 0.5 - b.vx) * z;
    return rings.map(([cx, cd, rad]) => Math.hypot(X - cx, z * b.f - cd) - rad);
  };
  for (let y = 0; y < r.h; y++) {
    if (y + 0.5 >= b.vy) break;
    for (let x = 0; x < r.w; x++) {
      const z = plane / (y + 0.5 - b.vy);
      const [s, zs] = hit(b, x, y);
      if (z < 1 || z > zs) continue;
      const d = dist(x, y);
      const dr = dist(x + 1, y);
      const dd = dist(x, y + 1);
      const line = d.some((v, i) => Math.sign(v) !== Math.sign(dr[i]) || Math.sign(v) !== Math.sign(dd[i]));
      const near = d.reduce((m, v) => (Math.abs(v) < Math.abs(m) ? v : m), 1e9);
      if (line) r.set(x, y, KC.ring);
      else if (Math.abs(near) < 6 && on(x, y, 0.55 - Math.abs(near) / 11)) r.set(x, y, near < 0 ? KC.bulb : KC.ringDim);
      else if (s === 'ceiling' && d.some((v) => v < 0) && on(x, y, 0.3)) r.set(x, y, KC.ceilingLight);
    }
  }
}
