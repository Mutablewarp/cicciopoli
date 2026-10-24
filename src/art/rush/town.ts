/**
 * The old-town fillers beyond the side strips in wide views, 256x256 and seamless both ways: a 4x4
 * grid of 64 px blocks (streets along each block's right and bottom edges), every block with its
 * own lot plan and roofs picked by hash, so no grid of identical blocks shows. Built with the
 * ./rooftops primitives: 'rush-fill-centro' and 'rush-fillR-centro' = two districts of old Palermo,
 * each with the hand-made block with the majolica church once and a bell tower once; 'rush-fillR-mare' = the Terrasini old town behind the
 * seafront houses in sunset colours, the bell tower of the Chiesa Madre once (the left filler stays
 * the sea). Lots: whitewashed, cotto and cement terraces with tanks and washing, gabled and hipped
 * tile roofs, bougainvillea over the walls, piazzette with palms, walled citrus gardens. Muted on
 * purpose: they sit behind the road and the game dims them further.
 */
import { Raster, hash2 } from '../hills/raster';
import { tint } from '../rampage/draw';
import { ZONE_PAL } from './colors';
import { CENTRO_LOOK, type Box, type RoofLook, fill, gable, hipped, laundry, orangeTree, palermoBlock, set, shadows, tank, terrace } from './rooftops';

const N = 64;
/** where the streets along a block's right and bottom edges begin */
const STREET = 56;
/** blocks per side of a filler tile */
const GRID = 4;
/** share of blocks merged with the next one across their right / bottom street (no regular grid) */
const MERGE = 0.3;
const P = ZONE_PAL.mare;
const T: RoofLook = {
  ...CENTRO_LOOK,
  roof: P.roof,
  roofLight: P.roofLight,
  roofShade: P.roofShade,
  street: '#5e4e4a',
  streetLight: '#685652',
  kerb: '#7a6660',
  shadow: '#3e2e2e',
  cotto: '#9a6048',
  cottoJoint: '#80503c',
  cement: '#867870',
  cementJoint: '#74685e',
  parapet: '#c8ae96',
  parapetShade: '#7a6258',
  hut: '#c8b098',
  hutShade: '#9a8270',
  tank: '#d0c8c0',
  tankLight: '#ece4dc',
  yard: '#a08a78',
  leaf: '#3a5c2c',
  leafLight: '#55803a',
  orange: '#ecd448', // lemons
  grass: '#4a6234',
  lime: '#d8d0c4',
  limeJoint: '#bcb2a4',
  bloom: '#c4387e',
  bloomLight: '#e05a9c',
  bloomDark: '#8a2458',
};
const DUSK = '#4a3036';
const HAZE_MARE = 0.2;
const GLOW = 0.08;
/** atmospheric perspective: the Palermo roofs keep less contrast than the side strips */
const HAZE_CENTRO = 0.22;
/**
 * Seed and cells of the 4x4 grid ([bell tower, hand-made Palermo block or -1]) per filler. The two
 * Palermo fillers are different districts: side by side at the same height they never mirror.
 */
const CENTRO = { L: { seed: 2, cells: [11, 1] }, R: { seed: 3, cells: [4, 14] } } as const;
const MARE = { seed: 1, cells: [6, -1] } as const;

type Lot = 'lime' | 'cotto' | 'cement' | 'hipped' | 'gable' | 'palm' | 'garden' | 'tower';

/** A block's street plan: the vicoli, the lots between them, the lot the bell tower fits. */
interface Plan {
  readonly alleys: readonly Box[];
  readonly lots: readonly Box[];
  readonly tower: number;
}

const PLANS: readonly Plan[] = [
  {
    alleys: [[22, 0, 2, 56], [0, 18, 22, 2]],
    lots: [[0, 0, 22, 18], [24, 0, 32, 14], [24, 16, 14, 16], [40, 16, 14, 14], [0, 20, 22, 36], [24, 34, 14, 22], [40, 34, 16, 22]],
    tower: 3,
  },
  {
    alleys: [[34, 0, 2, 56], [36, 30, 20, 2]],
    lots: [[0, 0, 15, 22], [17, 0, 17, 22], [0, 24, 34, 14], [0, 40, 20, 16], [22, 40, 12, 16], [36, 0, 20, 28], [36, 34, 20, 22]],
    tower: 4,
  },
  {
    alleys: [[0, 26, 56, 2], [30, 0, 2, 26]],
    lots: [[0, 0, 30, 12], [0, 14, 14, 12], [16, 14, 14, 12], [32, 0, 24, 26], [0, 28, 18, 28], [20, 28, 16, 14], [20, 44, 16, 12], [38, 28, 18, 28]],
    tower: 5,
  },
];

/** Ordinary lots, drawn by hash (roofs twice as likely as piazzette and gardens). */
const POOL: readonly Lot[] = ['lime', 'cotto', 'cement', 'hipped', 'gable', 'hipped', 'gable', 'cotto', 'palm', 'garden'];
const ROOFED = new Set<Lot>(['lime', 'cotto', 'cement', 'hipped', 'gable']);

/** Which of a block's two streets are built over (the block runs on into the next one). */
interface Merge {
  readonly right: boolean;
  readonly bottom: boolean;
}

/** A lot or vicolo reaching a street that is built over runs on to the block edge. */
const grow = ([x, y, w, h]: Box, m: Merge): Box => [x, y, w + (m.right && x + w === STREET ? N - STREET : 0), h + (m.bottom && y + h === STREET ? N - STREET : 0)];

/** Cobbled ground, the kerbs of the streets on the right and bottom edges, the vicoli. */
function ground(r: Raster, k: RoofLook, alleys: readonly Box[], m: Merge): void {
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) set(r, x, y, hash2(x, y, 41) < 0.14 ? k.streetLight : k.street);
  if (!m.bottom) fill(r, [0, N - 1, N, 1], k.kerb);
  if (!m.right) fill(r, [N - 1, 0, 1, N], k.kerb);
  for (const a of alleys) fill(r, grow(a, m), k.alley);
}

/** Top-down palm: nine fronds with leaflets round the crown, their shadow to the bottom-right. */
function palm(r: Raster, cx: number, cy: number, k: RoofLook): void {
  const fronds = (draw: (x: number, y: number, i: number) => void): void => {
    for (let a = 0; a < 9; a++) {
      const ang = (a / 9) * Math.PI * 2 + 0.2;
      const [dx, dy] = [Math.cos(ang), Math.sin(ang)];
      for (let i = 1; i < 8; i++) {
        draw(Math.round(cx + dx * i), Math.round(cy + dy * i), i);
        if (i % 2 === 1 && i > 1) {
          draw(Math.round(cx + dx * i - dy), Math.round(cy + dy * i + dx), i + 1);
          draw(Math.round(cx + dx * i + dy), Math.round(cy + dy * i - dx), i + 1);
        }
      }
    }
  };
  fronds((x, y) => set(r, x + 2, y + 2, k.shadow));
  fronds((x, y, i) => set(r, x, y, i < 4 ? k.leafLight : i < 7 ? k.leaf : k.frondTip));
  fill(r, [cx - 1, cy - 1, 2, 2], '#7a5430');
  set(r, cx - 1, cy - 1, '#a07040');
}

/** Bougainvillea spilling over a parapet (magenta clusters, darker underneath). */
function bougainvillea(r: Raster, [x0, y0, w, h]: Box, k: RoofLook): void {
  for (let i = 0; i < w; i++) {
    if (hash2(x0 + i, y0, 47) < 0.25) continue;
    set(r, x0 + i, y0, i % 3 === 0 ? k.bloomLight : k.bloom);
    if (hash2(i, y0, 48) < 0.5) set(r, x0 + i, y0 + 1, k.bloomDark);
  }
  for (let j = 0; j < h; j++) {
    if (hash2(x0, y0 + j, 49) < 0.3) continue;
    set(r, x0, y0 + j, j % 3 === 0 ? k.bloomLight : k.bloom);
  }
}

/** A bell tower: a tall stone base (long shadow), the pyramid roof, the cross. */
function bellTower(r: Raster, [x0, y0, w, h]: Box, k: RoofLook): void {
  fill(r, [x0 + 4, y0 + 4, w, h], k.shadow);
  terrace(r, [x0, y0, w, h], k.parapet, k.hutShade, k);
  hipped(r, [x0 + 2, y0 + 2, w - 4, h - 4], k);
  const c = x0 + Math.floor(w / 2) - 1;
  const m = y0 + Math.floor(h / 2) - 1;
  fill(r, [c, m - 2, 1, 5], k.tankLight);
  fill(r, [c - 1, m - 1, 3, 1], k.tankLight);
}

/** Walled citrus garden. */
function garden(r: Raster, box: Box, k: RoofLook): void {
  const [x0, y0, w, h] = box;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(r, x0 + i, y0 + j, hash2(x0 + i, y0 + j, 46) < 0.18 ? k.leaf : k.grass);
  fill(r, [x0, y0, w, 1], k.parapet);
  fill(r, [x0, y0, 1, h], k.parapet);
  fill(r, [x0, y0 + h - 1, w, 1], k.parapetShade);
  fill(r, [x0 + w - 1, y0, 1, h], k.parapetShade);
  orangeTree(r, x0 + 7, y0 + 7, k);
  if (h >= 20) orangeTree(r, x0 + 9, y0 + 16, k);
}

/** A terrace with its water tanks, washing on the long ones, a stair hut on the cement ones. */
function flatRoof(r: Raster, box: Box, base: string, joint: string, tankColour: string, k: RoofLook): void {
  const [x0, y0, w, h] = box;
  terrace(r, box, base, joint, k);
  tank(r, x0 + 3, y0 + 3, tankColour, k);
  if (w >= 20) tank(r, x0 + 11, y0 + 3, tankColour, k);
  if (w >= 20 && h >= 14) laundry(r, x0 + 3, y0 + h - 4, Math.min(13, w - 10), k);
  if (base === k.cement && w >= 20) {
    fill(r, [x0 + w - 8, y0 + 3, 6, 6], k.hut); // stair hut
    fill(r, [x0 + w - 8, y0 + 8, 6, 1], k.hutShade);
    fill(r, [x0 + w - 3, y0 + 3, 1, 6], k.hutShade);
  }
}

function lot(r: Raster, box: Box, kind: Lot, k: RoofLook): void {
  const [x0, y0, w, h] = box;
  switch (kind) {
    case 'lime':
      flatRoof(r, box, k.lime, k.limeJoint, k.tankBlue, k); // whitewashed terrace
      bougainvillea(r, [x0 + 1, y0 + h - 2, w - 2, 0], k);
      return;
    case 'cotto':
      return flatRoof(r, box, k.cotto, k.cottoJoint, k.tank, k);
    case 'cement':
      return flatRoof(r, box, k.cement, k.cementJoint, k.tank, k);
    case 'hipped':
      return hipped(r, box, k);
    case 'gable':
      return gable(r, box, k);
    case 'palm':
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(r, x, y, (x + y) % 4 === 0 ? k.cementJoint : k.yard);
      return palm(r, x0 + Math.floor(w / 2), y0 + Math.floor(h / 2), k);
    case 'garden':
      garden(r, box, k);
      return bougainvillea(r, box, k);
    case 'tower':
      return bellTower(r, box, k);
  }
}

function block(k: RoofLook, plan: Plan, lots: readonly Lot[], m: Merge): Raster {
  const r = new Raster(N, N);
  ground(r, k, plan.alleys, m);
  // shadows of the unmerged lots: a grown lot casts none past the block edge (set() wraps)
  shadows(r, plan.lots.filter((_, i) => ROOFED.has(lots[i])), k);
  plan.lots.forEach((box, i) => lot(r, grow(box, m), lots[i], k));
  return r;
}

/**
 * The 4x4 grid: plan, lots and merged streets of each cell by hash of `seed`, the bell tower and
 * the hand-made Palermo block (its streets kept) in their cells.
 */
function oldTown(k: RoofLook, seed: number, [towerCell, heroCell]: readonly [number, number]): Raster {
  const r = new Raster(GRID * N, GRID * N);
  for (let cell = 0; cell < GRID * GRID; cell++) {
    const h = (i: number): number => hash2(cell, i, seed);
    const plan = PLANS[Math.floor(h(0) * PLANS.length)];
    const lots = plan.lots.map((_, i): Lot => (cell === towerCell && i === plan.tower ? 'tower' : POOL[Math.floor(h(i + 1) * POOL.length)]));
    const m: Merge = { right: h(90) < MERGE, bottom: h(91) < MERGE };
    r.blit(cell === heroCell ? palermoBlock() : block(k, plan, lots, m), (cell % GRID) * N, Math.floor(cell / GRID) * N);
  }
  return r;
}

/** Recolours every pixel through `fn`, computed once per distinct colour. */
function recolour(r: Raster, fn: (c: number) => number): Raster {
  const memo = new Map<number, number>();
  r.map((c) => {
    let out = memo.get(c);
    if (out === undefined) memo.set(c, (out = fn(c)));
    return out;
  });
  return r;
}

export function centroFill(side: 'L' | 'R'): Raster {
  const { seed, cells } = CENTRO[side];
  return recolour(oldTown(CENTRO_LOOK, seed, cells), (c) => tint(c, CENTRO_LOOK.street, HAZE_CENTRO));
}

export function terrasiniFill(): Raster {
  // sits back like the other fillers, warmed by the sunset
  return recolour(oldTown(T, MARE.seed, MARE.cells), (c) => tint(tint(c, DUSK, HAZE_MARE), P.tint, GLOW));
}
