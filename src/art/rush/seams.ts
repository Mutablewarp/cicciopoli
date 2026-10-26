/**
 * v9 caps (BRIEF §8 "### v9" point 2, zoneKey(zone, 'capL' | 'capR'), 16x256, seamless vertically): the
 * clean edge between a side strip and the dimmed filler beyond it, so a wide view never shows a straight
 * cut between two textures. Column e = 0 touches the strip (capL: its right column, capR: its left
 * one), e = 15 the filler; rows line up with the strips' 256-row period (all tiles are locked to the road).
 * centro: a cobbled back street with parked cars and a garden wall under bougainvillea; stadio left: the
 * stadium's perimeter wall, its service road and a ragged hedge into the Favorita; stadio right: a gravel
 * avenue under pines along the park's edge (the building's shadow where the palazzo stands); mare left:
 * the open sea with a line of swimming-area buoys; mare right: the Terrasini back alley, a whitewashed
 * wall under bougainvillea, lemon pots and a cat asleep on the wall.
 */
import { Raster, hash2 } from '../hills/raster';
import { shade } from '../pixel';
import type { RushZone } from './keys';
import { seaAt } from './mare';
import { CENTRO_LOOK, type RoofLook } from './rooftops';
import { TERRASINI_LOOK } from './town';

export const CAP_W = 16;
export const CAP_H = 256;
/** strip rows of the stadio right strip's palazzo (./stadio stadioSide: y 96, len 80) */
const STADIO_BLOCK = { y: 96, len: 80 } as const;
const CARS = ['#7a3a34', '#3a4a6a', '#b8b4a8', '#4a5a3a', '#8a7a4a', '#5a3a5a'] as const;

class Cap {
  readonly r = new Raster(CAP_W, CAP_H);

  constructor(readonly side: 'L' | 'R') {}

  px(e: number, y: number, c: string | null): void {
    if (e < 0 || e >= CAP_W) return;
    this.r.set(this.side === 'L' ? CAP_W - 1 - e : e, ((y % CAP_H) + CAP_H) % CAP_H, c);
  }

  rect(e: number, y: number, ew: number, h: number, c: string): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < ew; i++) this.px(e + i, y + j, c);
  }

  /** darkens the opaque pixel at (e, y) */
  dim(e: number, y: number, t: number): void {
    const x = this.side === 'L' ? CAP_W - 1 - e : e;
    const yy = ((y % CAP_H) + CAP_H) % CAP_H;
    const c = this.r.get(x, yy);
    if (c === 0) return;
    const hex = `#${(c & 0xffffff).toString(16).padStart(6, '0')}`;
    this.r.set(x, yy, shade(hex, -t));
  }
}

/** A parked car seen from above, nose up: body, windscreen, roof, rear window. */
function car(c: Cap, e: number, y: number, body: string): void {
  c.rect(e, y, 5, 9, body);
  c.rect(e, y, 5, 1, shade(body, 0.2));
  c.rect(e + 1, y + 2, 3, 1, '#2a3440');
  c.rect(e + 1, y + 3, 3, 3, shade(body, 0.12));
  c.rect(e + 1, y + 6, 3, 1, '#2a3440');
  for (let j = 1; j < 10; j++) c.px(e + 5, y + j, '#26242a'); // its shadow
}

/** Bougainvillea spilling over the wall at e0..e0+2: magenta clusters, darker underneath, a few on the street. */
function bloom(c: Cap, k: RoofLook, e0: number, seed: number): void {
  for (let y = 0; y < CAP_H; y++) {
    const patch = hash2(Math.floor(y / 12), 0, seed) < 0.55;
    if (!patch) continue;
    for (let e = e0 - 2; e < e0 + 3; e++) {
      const h = hash2(e, y, seed + 1);
      if (h < 0.35 + (e < e0 ? 0.35 : 0)) continue;
      c.px(e, y, h > 0.85 ? k.bloomLight : h > 0.6 ? k.bloom : k.bloomDark);
    }
  }
}

/**
 * Back street: the strip's roof eave, a narrow pavement, cobbles, the kerb, a garden wall (top lit)
 * under bougainvillea; parked cars and a manhole; the shadow of whatever stands to the top-left.
 */
function backStreet(side: 'L' | 'R', k: RoofLook, seed: number): Cap {
  const c = new Cap(side);
  for (let y = 0; y < CAP_H; y++) {
    c.px(0, y, k.parapet);
    for (let e = 1; e < 3; e++) c.px(e, y, y % 6 === 0 ? k.parapetShade : k.kerb);
    for (let e = 3; e < 12; e++) c.px(e, y, hash2(e, y, seed) < 0.16 ? k.streetLight : (e + y) % 7 === 0 ? k.alley : k.street);
    c.px(12, y, k.kerb);
    c.px(13, y, y % 8 === 0 ? k.limeJoint : k.lime);
    c.px(14, y, k.lime);
    c.px(15, y, k.limeJoint);
  }
  for (let n = 0; n < 4; n++) {
    const y = n * 64 + 8 + Math.floor(hash2(n, 1, seed) * 40);
    if (hash2(n, 2, seed) < 0.75) car(c, 5, y, CARS[Math.floor(hash2(n, 3, seed) * CARS.length)]);
    c.rect(7, y + 30, 2, 2, k.alley); // manhole
  }
  bloom(c, k, 13, seed + 7);
  // light from the top-left: the right strip's roofs shade the near pavement, the wall shades the left cap's street
  for (let y = 0; y < CAP_H; y++) for (const e of side === 'R' ? [1, 2, 3] : [10, 11, 12]) c.dim(e, y, 0.22);
  return c;
}

const HEDGE = '#2e4a26';
const HEDGE_LIT = '#3e5e30';
const GRASS = '#3e4e2e';
const GRASS_LIGHT = '#4a5a34';
const GRAVEL = '#b0a07c';
const GRAVEL_DARK = '#9a8a68';
const PINE = '#2e5a2c';

/** The stadium roof's gutter, its perimeter wall, the service road with parked cars, a ragged hedge into the park. */
function stadiumEdge(): Cap {
  const c = new Cap('L');
  for (let y = 0; y < CAP_H; y++) {
    c.px(0, y, '#5a5862');
    for (let e = 1; e < 4; e++) c.px(e, y, y % 8 === 0 ? '#86888f' : e === 1 ? '#a8aab0' : '#9a9ca3');
    for (let e = 4; e < 10; e++) c.px(e, y, hash2(e, y, 81) < 0.1 ? '#5e5e64' : '#4e4e54');
    c.px(10, y, '#8a8890');
    for (let e = 11; e < CAP_W; e++) {
      const h = hash2(e, y, 82);
      const ragged = e >= 14 && hash2(Math.floor(y / 3), e, 83) < (e === 15 ? 0.6 : 0.3);
      c.px(e, y, ragged ? null : h < 0.3 ? HEDGE_LIT : HEDGE);
    }
    if (hash2(Math.floor(y / 2), 9, 84) < 0.5) c.px(9, y, '#3a3a40'); // the hedge's shadow on the road
  }
  for (let n = 0; n < 5; n++) {
    const y = n * 51 + Math.floor(hash2(n, 1, 85) * 30);
    if (hash2(n, 2, 85) < 0.7) car(c, 4, y, CARS[Math.floor(hash2(n, 3, 85) * CARS.length)]);
  }
  return c;
}

/** Round pine crown, lit top-left (screen), its shadow to the bottom-right. */
function crown(c: Cap, e0: number, y0: number, rad: number): void {
  for (let j = -rad; j <= rad + 1; j++) {
    for (let i = -rad; i <= rad + 1; i++) {
      const q = (i * i + j * j) / (rad * rad);
      const sq = ((i - 1) ** 2 + (j - 1) ** 2) / (rad * rad);
      if (q > 1 && sq <= 1) c.dim(e0 + i, y0 + j, 0.25);
      if (q > 1 || (q > 0.8 && hash2(i + e0, j + y0, 3) < 0.4)) continue;
      const lit = (c.side === 'L' ? i : -i) + j < -rad / 2;
      c.px(e0 + i, y0 + j, lit ? shade(PINE, 0.18) : q > 0.55 && hash2(i, j, 5) < 0.5 ? shade(PINE, -0.22) : PINE);
    }
  }
}

/** The Favorita's edge beyond the right strip: grass, a gravel avenue along it, pines; the palazzo's shadow. */
function parkEdge(): Cap {
  const c = new Cap('R');
  for (let y = 0; y < CAP_H; y++) {
    for (let e = 0; e < CAP_W; e++) {
      const ragged = e === 15 && hash2(y, e, 86) < 0.3;
      c.px(e, y, ragged ? null : hash2(e, y, 13) < 0.2 ? GRASS_LIGHT : GRASS);
    }
    for (let e = 4; e < 8; e++) c.px(e, y, hash2(e, y, 87) < 0.15 ? GRAVEL_DARK : GRAVEL);
  }
  const { y: by, len } = STADIO_BLOCK;
  for (let y = by; y < by + len + 2; y++) for (let e = 0; e < 3; e++) c.dim(e, y, 0.3);
  for (let y = 6; y < CAP_H; y += 18 + Math.floor(hash2(y, 0, 88) * 8)) crown(c, 11 + Math.floor(hash2(y, 1, 88) * 2), y, 4);
  return c;
}

/** The open sea beyond the cliffs, a rope of red and white buoys marking the swimming area. */
function buoys(): Cap {
  const c = new Cap('L');
  for (let y = 0; y < CAP_H; y++) for (let e = 0; e < CAP_W; e++) c.px(e, y, seaAt(e + 128, y, true));
  for (let y = 0; y < CAP_H; y += 2) c.px(7, y, '#b8a888');
  for (let n = 0; n < CAP_H / 16; n++) {
    const y = n * 16 + 4;
    const body = n % 2 === 0 ? '#e04030' : '#f0ece0';
    c.rect(6, y, 3, 3, body);
    c.px(6, y, shade(body, 0.25));
    c.px(8, y + 2, shade(body, -0.35));
    c.px(9, y + 3, '#f0f0e8'); // a ripple of foam behind it
    c.px(5, y + 3, '#f0f0e8');
  }
  return c;
}

/** The Terrasini back street, plus lemon pots by the wall and a cat asleep on it. */
function terrasiniAlley(): Cap {
  const k = TERRASINI_LOOK;
  const c = backStreet('R', k, 89);
  for (const y of [38, 150, 214]) {
    c.rect(10, y, 2, 2, '#b4683c'); // terracotta pot
    c.px(10, y - 1, k.leafLight);
    c.px(11, y - 1, k.orange);
    c.px(10, y - 2, k.leaf);
  }
  const y = 100;
  c.rect(13, y, 2, 4, '#e09040'); // the cat, curled up on the wall
  c.px(13, y, '#f0b060');
  c.px(14, y + 3, '#b06a28');
  c.px(13, y + 4, '#b06a28');
  return c;
}

export function buildCap(zone: RushZone, side: 'L' | 'R'): Raster {
  if (zone === 'centro') return backStreet(side, CENTRO_LOOK, side === 'L' ? 90 : 91).r;
  if (zone === 'stadio') return (side === 'L' ? stadiumEdge() : parkEdge()).r;
  return (side === 'L' ? buoys() : terrasiniAlley()).r;
}
