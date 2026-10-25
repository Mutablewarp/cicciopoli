/**
 * Menù packaging, after the real Ciccio's white paper BOATS (ref/level7_wrap_tray.jpg): an open
 * rectangular tray with flared walls seen 3/4 from the front, cream-white paper with a faint light-grey
 * line pattern of golf balls and tees, the food heaped inside and over the rim.
 * KITCHEN.cone (30x22: 0 the empty boat, 1 full of golden fries) and KITCHEN.starterBox (30x22,
 * frame = STARTERS index: nuggets, meatballs, chicken pop corn, green nuggets).
 */
import type { Tone } from '../../hills/mask';
import { Raster, hash2 } from '../../hills/raster';
import { FRY_STATE, STARTERS, type StarterId } from '../keys';
import { lumps, LOOK, type Shape } from './fried';
import { capsuleMask, inkEdge, piece, type Pt } from './kit';
import { C, T, WHITE } from './palette';

const W = 30;
const H = 22;
/** Top opening (far rim y0, near rim y1, x0..x1), the floor's far edge and the bottom of the front wall. */
const RIM = { x0: 1, x1: 28, y0: 5, y1: 13 } as const;
const FLOOR = { x0: 5, x1: 24, y: 10 } as const;
const BOTTOM = { x0: 4, x1: 25, y: 21 } as const;

type Motif = 'ball' | 'tee' | 'club';
const MOTIF: Readonly<Record<Motif, readonly Pt[]>> = {
  ball: [[0, -1], [-1, 0], [1, 0], [0, 1]], // a small ring
  tee: [[-1, -1], [1, -1], [0, 0], [1, 1], [2, 2]], // a leaning tee
  club: [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4], [5, 4], [6, 4]], // shaft and head
};

/** Faint golf line print (balls, tees, clubs) in light grey, only over paper pixels of `p`. */
function golf(p: Raster, motifs: readonly (readonly [Motif, number, number])[], color: string): void {
  for (const [kind, x, y] of motifs) {
    for (const [dx, dy] of MOTIF[kind]) if (p.get(x + dx, y + dy) !== 0) p.set(x + dx, y + dy, color);
  }
}

/** Inside of the boat: back wall (lit), left wall (in shade), right wall (lit) and the floor between the rims. */
function inside(r: Raster): void {
  piece(r, T.boat, (m) => m.rect(RIM.x0, RIM.y0, RIM.x1 - RIM.x0 + 1, RIM.y1 - RIM.y0 + 1, 1), {
    line: T.boat.dark,
    detail: (p) => {
      for (let y = RIM.y0 + 1; y < RIM.y1; y++) {
        const t = Math.min(1, (y - RIM.y0) / (FLOOR.y - RIM.y0));
        const left = Math.round(RIM.x0 + (FLOOR.x0 - RIM.x0) * t);
        const right = Math.round(RIM.x1 - (RIM.x1 - FLOOR.x1) * t);
        for (let x = RIM.x0 + 1; x < RIM.x1; x++) {
          const tone = x < left ? T.boat.shade : x > right ? T.boat.light : y >= FLOOR.y ? T.boat.shade : T.boat.base;
          p.set(x, y, tone);
        }
      }
      golf(p, [['ball', 6, 7], ['club', 10, 6], ['tee', 21, 7], ['ball', 25, 10]], C.golfInside);
    },
  });
}

/** Front wall: flared trapezoid, rolled white lip on the near rim, the faint golf print. */
function front(r: Raster): void {
  piece(r, T.boat, (m) => m.poly([[0, RIM.y1], [W, RIM.y1], [BOTTOM.x1 + 1, BOTTOM.y + 1], [BOTTOM.x0, BOTTOM.y + 1]], 1), {
    line: T.boat.dark,
    detail: (p, m) => {
      for (let y = RIM.y1; y <= BOTTOM.y; y++) {
        for (let x = 0; x < W; x++) {
          if (!m.get(x, y)) continue;
          if (y === RIM.y1) p.set(x, y, x < 16 ? WHITE : T.boat.light); // the lip catching the light
          else if (!m.get(x - 1, y)) p.set(x, y, T.boat.light);
          else if (!m.get(x + 1, y) || y === BOTTOM.y) p.set(x, y, T.boat.shade);
          else p.set(x, y, T.boat.base);
        }
      }
      golf(p, [['club', 3, 14], ['ball', 12, 16], ['tee', 16, 14], ['ball', 23, 15], ['club', 18, 16], ['tee', 8, 18]], C.golf);
    },
  });
}

/** A low mound of food filling the boat to the rim (the gaps between the pieces). */
function mound(r: Raster, tone: Tone): void {
  const deep: Tone = { light: tone.base, base: tone.shade, shade: tone.dark ?? tone.shade };
  piece(r, deep, (m) => m.ellipse(14, 10, 12, 4, 1), { line: tone.dark ?? tone.shade });
}

/** Golden fries heaped in the boat, standing at every angle, the middle ones tallest: [ax, ay, bx, by]. */
const FRIES: readonly (readonly [number, number, number, number])[] = [
  [3, 7, 6, 14], [6, 2, 8, 14], [9, 5, 10, 14], [11, 0, 12, 14], [14, 3, 14, 14], [16, 0, 16, 14], [19, 4, 18, 14],
  [21, 1, 20, 14], [24, 5, 22, 14], [26, 8, 24, 14], [4, 10, 13, 7], [17, 8, 26, 10],
];

function fries(r: Raster): void {
  mound(r, T.fries);
  for (const [ax, ay, bx, by] of FRIES) {
    piece(r, T.fries, (m) => capsuleMask(m, ax + 0.5, ay + 0.5, bx + 0.5, by + 0.5, 1, 1), {
      line: '#7a4208',
      detail: (p) => {
        if (hash2(ax, ay, 701) < 0.5) p.set(ax, ay, T.fries.shade); // a crisper tip
        for (let y = ay + 1; y < by - 2; y += 3) p.set(Math.round(ax + ((y - ay) * (bx - ax)) / (by - ay)), y, T.fries.light);
      },
    });
  }
}

/** Heap spots inside the boat (back row first, the front row sits on the rim). */
const HEAP: Readonly<Record<StarterId, readonly [Shape, readonly Pt[]]>> = {
  nuggets: ['nugget', [[7, 5], [14, 3], [21, 5], [10, 8], [17, 7], [24, 9], [5, 11], [12, 12], [19, 11], [25, 12]]],
  meatball: ['ball', [[8, 5], [14, 3], [20, 5], [11, 8], [17, 8], [23, 8], [5, 10], [12, 12], [18, 12], [25, 12]]],
  chickenPopCorn: ['bite', [
    [9, 3], [14, 2], [19, 3], [6, 6], [11, 5], [16, 5], [21, 5], [24, 8], [4, 9], [8, 8], [13, 8], [18, 8],
    [22, 10], [6, 12], [10, 11], [15, 11], [19, 12], [25, 12],
  ]],
  greenNuggets: ['nugget', [[7, 5], [14, 3], [21, 5], [10, 8], [17, 7], [24, 9], [5, 11], [12, 12], [19, 11], [25, 12]]],
};

function boat(fill?: (r: Raster) => void): Raster {
  const r = new Raster(W, H);
  inside(r);
  fill?.(r);
  front(r);
  inkEdge(r);
  return r;
}

export function buildCone(): Raster[] {
  return [boat(), boat(fries)];
}

export function buildStarterBox(): Raster[] {
  return STARTERS.map((id) => boat((r) => {
    const [shape, spots] = HEAP[id];
    const tone = LOOK[id][FRY_STATE.perfect];
    mound(r, tone);
    lumps(r, tone, shape, spots, 711 + STARTERS.indexOf(id) * 13);
  }));
}
