/**
 * The dining room behind the customer, portrait (200x356) and landscape (356x200), drawn for the stage
 * (180x320 / 320x180) centred with overscan; the beam covers the top band, the counter top the bottom
 * ~56 stage px. Composed after the owner's POV photo (ref/level7_pov_order.png): seen from behind the
 * counter, the black iron pergola of Ciccio's Sperlinga opens in one-point perspective, warm ring lights
 * hanging under its concrete ceiling, terracotta brick side walls with big iron arches and the orange
 * neon script on the right, lush pothos and monstera spilling from dark planters, black tables with
 * candle lights down the dark-tiled aisle to the garden door, white tiles with blue grout in front.
 * Both framed like the photo: the street window left of the pergola and, on the right, the plaster
 * wall with the CICCIOPOLY poster, the small menu board and a table (portrait: a narrower pergola, so
 * they fit). The aisle behind the customer stays calm. Brick pillars at the raster's edges continue
 * into the room fill (buildRoomFill).
 */
import { Raster, hash2 } from '../../hills/raster';
import { rectR } from '../../rampage/draw';
import { KC } from './palette';
import { type Box, type Rect, type RingLight, farRect, farWall, on, paintBox, proj, ringLights, walls } from './roomKit';
import { type LeafSize, bar, bush, chair, leaf, planter, post, ring, stem, table, vine, wallArch, wallRings } from './roomProps';
import { brickFront, menuBoard, pictureLight, plasterWall, poster, streetWindow, wallNeon } from './roomSigns';

interface Street {
  window: Rect;
  wall: Rect;
  wainscot: number;
  poster: Rect;
  board: Rect;
  /** the table in front of the wall: X, z, half width, height (world px) */
  table: readonly [number, number, number, number];
}

interface Layout {
  w: number;
  h: number;
  box: Box;
  rings: readonly RingLight[];
  hang: number;
  door: Rect;
  /** planters along both walls: width and height (world px), back end depth z */
  planter: readonly [number, number, number];
  /** iron arch on each brick wall: from / to depth D, crown over the floor line */
  arch: readonly [number, number, number];
  /** aisle tables, mirrored on both sides: |X|, z, half width, height */
  tables: readonly (readonly [number, number, number, number])[];
  /** neon script on the right wall: depth D from / to, world Y from / to */
  neon: readonly [number, number, number, number];
  /** width of the brick pillars at the raster's edges */
  edge: number;
  /** pothos hanging from the pergola's front bar: x, length */
  vines: readonly (readonly [number, number])[];
  street: Street;
}

const TALL: Layout = {
  w: 200, h: 356,
  box: { vx: 100, vy: 150, x0: 50, x1: 150, top: 30, floor: 250, k: 0.34, f: 230 },
  rings: [[-26, 300, 20], [26, 300, 20], [0, 437, 26], [0, 586, 18]],
  hang: 14,
  door: { x: 89, y: 128, w: 22, h: 56 },
  planter: [28, 46, 1.6],
  arch: [250, 480, 176],
  tables: [[26, 1.75, 12, 32], [26, 2.35, 12, 32]],
  neon: [232, 340, -104, -28],
  edge: 6,
  vines: [[52, 70], [60, 40], [72, 24], [86, 14], [114, 14], [126, 22]],
  street: {
    window: { x: 9, y: 36, w: 34, h: 168 },
    wall: { x: 152, y: 0, w: 42, h: 250 },
    wainscot: 210,
    poster: { x: 153, y: 64, w: 40, h: 50 },
    board: { x: 164, y: 124, w: 20, h: 26 },
    table: [74, 1, 14, 24],
  },
};

const WIDE: Layout = {
  w: 356, h: 200,
  box: { vx: 178, vy: 68, x0: 76, x1: 280, top: 16, floor: 118, k: 0.36, f: 260 },
  rings: [[-50, 325, 34], [50, 325, 34], [0, 455, 34], [0, 624, 24]],
  hang: 8,
  door: { x: 168, y: 60, w: 20, h: 26 },
  planter: [38, 26, 1.55],
  arch: [280, 520, 92],
  tables: [[46, 1.7, 18, 20], [46, 2.25, 18, 20]],
  neon: [300, 470, -46, -22],
  edge: 6,
  vines: [[82, 44], [96, 26], [112, 14], [244, 14], [262, 34], [276, 52]],
  street: {
    window: { x: 9, y: 4, w: 60, h: 92 },
    wall: { x: 282, y: 0, w: 68, h: 118 },
    wainscot: 94,
    poster: { x: 287, y: 37, w: 40, h: 50 },
    board: { x: 331, y: 46, w: 18, h: 26 },
    table: [148, 1, 20, 24],
  },
};

/** Small warm pendant light hanging from the far frame. */
function pendant(r: Raster, x: number, y: number): void {
  rectR(r, x, y, 1, 5, KC.iron);
  for (let dy = -2; dy <= 4; dy++) for (let dx = -3; dx <= 3; dx++) {
    if (on(x + dx, y + 6 + dy, 0.5 - Math.hypot(dx, dy) / 7)) r.set(x + dx, y + 6 + dy, KC.bulbGlow);
  }
  rectR(r, x - 1, y + 5, 3, 2, KC.bulb);
  r.set(x, y + 6, KC.bulbCore);
}

/** Pothos trailing from the frieze down the brick, growing up the arch. */
function wallGreen(r: Raster, b: Box, side: -1 | 1, seed: number, skip: readonly [number, number]): void {
  const w = walls(b);
  const X = side < 0 ? w.xl : w.xr;
  for (let i = 0; i < 7; i++) {
    const z = 1.06 + i * 0.24 + hash2(i, side, seed) * 0.08;
    if (z > w.zFar - 0.1) break;
    if (z * b.f > skip[0] - 20 && z * b.f < skip[1] + 10) continue;
    const [x, y] = proj(b, X - side * 2, w.yc + 2, z);
    const len = Math.round(((w.yf - w.yc) * (0.12 + hash2(i, 2, seed) * 0.3)) / z);
    vine(r, Math.round(x), Math.round(y), len, seed + i * 7, z < 1.35 ? 'm' : 's', z > 1.7);
  }
}

/** The planter of one side with its greenery: mounds on top, monstera rising, pothos over the front. */
function planterGreen(r: Raster, l: Layout, side: -1 | 1, seed: number): void {
  const b = l.box;
  const w = walls(b);
  const [pw, ph, z1] = l.planter;
  const out = side < 0 ? w.xl : w.xr;
  const midX = out - (side * pw) / 2;
  const top = w.yf - ph;
  // climbing greenery on the wall behind the planter, back to front
  for (let z = z1; z >= 1; z -= 0.15) {
    const [x, y] = proj(b, out - side * 8, top - ph * 0.55, z);
    bush(r, x, y, 10 / z, (ph * 0.55) / z, seed + Math.round(z * 100), z < 1.3 ? ['m', 'l', 'x'] : ['s', 'm'], z > 1.4);
  }
  planter(r, b, side, pw, ph, z1);
  for (let z = z1 - 0.05; z >= 1; z -= 0.14) {
    const [x, y] = proj(b, midX, top - 6, z);
    const sizes: readonly LeafSize[] = z < 1.2 ? ['l', 'x', 'x', 'm'] : z < 1.4 ? ['m', 'l'] : ['s', 'm'];
    bush(r, x, y, (pw * 0.6) / z, 11 / z, seed + 50 + Math.round(z * 100), sizes, z > 1.45);
    // monstera and philodendron on stems rising out of the mound
    for (let k = 0; k < 2; k++) {
      const [sx, sy] = proj(b, out - side * pw * (0.2 + 0.6 * hash2(k, Math.round(z * 10), seed)), top - 4, z);
      stem(r, Math.round(sx), Math.round(sy), Math.round((10 + hash2(k, 7, seed) * 18) / z), seed + k * 13 + Math.round(z * 40), z < 1.3 ? 'x' : 'l');
    }
  }
  // pothos spilling over the front face and down the inner face
  const [fx0, fy] = proj(b, Math.min(out, out - side * pw), top, 1);
  const [fx1] = proj(b, Math.max(out, out - side * pw), top, 1);
  for (let x = Math.round(fx0) + 2; x < fx1 - 2; x += 7) {
    vine(r, x, Math.round(fy) - 1, Math.round(ph * (0.35 + hash2(x, 3, seed) * 0.5)), seed + x, 'm');
  }
  for (let z = 1.08; z < z1; z += 0.16) {
    const [x, y] = proj(b, out - side * pw, top, z);
    vine(r, Math.round(x), Math.round(y), Math.round((ph * (0.3 + hash2(Math.round(z * 50), 4, seed) * 0.4)) / z), seed + 90 + Math.round(z * 30), 's', z > 1.3);
  }
}

function street(r: Raster, b: Box, s: Street): void {
  // the street window over a low planter, left of the pergola
  rectR(r, 0, 0, b.x0 - 2, b.floor, KC.plaster);
  streetWindow(r, s.window);
  const sill = s.window.y + s.window.h + 3;
  rectR(r, s.window.x, sill + 3, s.window.w, b.floor - sill - 3, KC.planter);
  rectR(r, s.window.x, sill + 3, s.window.w, 1, KC.planterLight);
  bush(r, s.window.x + s.window.w / 2, sill + 2, s.window.w / 2, 5, 610, ['m', 's', 'l']);
  for (let x = s.window.x + 3; x < s.window.x + s.window.w; x += 8) vine(r, x, sill + 3, 6 + Math.round(hash2(x, 1, 61) * 10), 620 + x, 's');
  // the plaster wall right of the pergola: menu board, a table (the poster comes last, over the vines)
  plasterWall(r, s.wall, s.wainscot);
  menuBoard(r, s.board);
  const [X, z, hw, ht] = s.table;
  chair(r, b, X - hw - 6, z, 1);
  table(r, b, X, z, hw, ht, true);
}

function room(l: Layout): Raster {
  const r = new Raster(l.w, l.h);
  const b = l.box;
  const w = walls(b);
  paintBox(r, b);
  farWall(r, b, l.door);
  const f = farRect(b);
  const fx1 = f.x + f.w - 1;
  bar(r, [f.x, f.y], [fx1, f.y], false);
  bar(r, [f.x, f.y], [f.x, f.y + f.h], false);
  bar(r, [fx1, f.y], [fx1, f.y + f.h], false);
  for (const u of [0.22, 0.78]) pendant(r, Math.round(f.x + f.w * u), Math.round(f.y));
  ringLights(r, b, l.rings, l.hang);
  for (const side of [-1, 1] as const) {
    wallArch(r, b, side, l.arch[0], l.arch[1], l.arch[2]);
    wallArch(r, b, side, l.arch[1], w.zFar * b.f, l.arch[2] * 0.8);
  }
  wallGreen(r, b, -1, 700, [0, 0]);
  wallGreen(r, b, 1, 800, [l.neon[0], l.neon[1]]);
  wallNeon(r, b, 1, ...l.neon);
  for (const side of [-1, 1] as const) wallRings(r, b, side, b.f, w.zFar * b.f, 5);
  // the aisle: tables with candles, their chairs on the wall side (the aisle itself stays clear), back to front
  for (const [X, z, hw, ht] of [...l.tables].sort((a, c) => c[1] - a[1])) {
    for (const side of [-1, 1] as const) {
      chair(r, b, side * (X + hw + 7), z + 0.05, side < 0 ? 1 : -1);
      table(r, b, side * X, z, hw, ht, true);
    }
  }
  planterGreen(r, l, -1, 900);
  planterGreen(r, l, 1, 1000);
  street(r, b, l.street);
  brickFront(r, { x: 0, y: 0, w: l.edge, h: b.floor });
  brickFront(r, { x: l.w - l.edge, y: 0, w: l.edge, h: b.floor });
  // the pergola's front bar with its iron circles on the soffit, the posts with pothos climbing them,
  // pothos hanging from the bar
  bar(r, [0, b.top], [l.w - 1, b.top], true);
  for (let x = b.x0 + 10; x < b.x1; x += 24) ring(r, x, b.top - 6, 11, 5);
  // the right post's pothos starts under the neon, so it never hides the script
  const under = Math.round(proj(b, w.xr, l.neon[3], l.neon[0] / b.f)[1]) + 4;
  for (const [x, seed, from] of [[b.x0 - 2, 1100, b.top + 4], [b.x1, 1200, under]] as const) {
    post(r, x, b.top, b.floor + 2);
    vine(r, x + 1, from, Math.round((b.floor - from) * 0.8), seed, 'm');
  }
  for (const x of [1, l.w - 3]) vine(r, x, 0, Math.round(b.floor * 0.9), 1300 + x, 'm');
  l.vines.forEach(([x, len], i) => vine(r, x, b.top + 1, len, 1400 + i * 11, i % 3 === 0 ? 'l' : 'm'));
  // the CICCIOPOLY poster under its light, clear of the pothos on the post and the pillar beside it
  const p = l.street.poster;
  pictureLight(r, p.x + p.w / 2, p.y - 5, 22);
  poster(r, p);
  return r;
}

export const buildRoomTall = (): Raster => room(TALL);
export const buildRoomWide = (): Raster => room(WIDE);

/** 64x64 filler, seamless both ways: the brick of the room's edge pillars, a notch darker, with pothos
 * vines whose sway and leaves repeat every 64 rows, so it runs on endlessly when tiled. */
export function buildRoomFill(): Raster {
  const r = new Raster(64, 64, true);
  brickFront(r, { x: 0, y: 0, w: 64, h: 64 });
  const leaves = new Raster(64, 72, true);
  for (const [x0, phase, seed] of [[10, 0, 300], [36, 2.1, 320], [54, 4.2, 340]] as const) {
    const vx = (y: number): number => x0 + Math.round(Math.sin((y / 64) * Math.PI * 2 + phase) * 2);
    for (let y = 0; y < 64; y++) leaves.set(vx(y), y, KC.leafDark);
    for (let k = 0; k < 8; k++) {
      const y = k * 8 + 2;
      const size: LeafSize = k % 3 === 0 ? 'm' : 's';
      leaf(leaves, k % 2 === 0 ? vx(y) - (size === 'm' ? 6 : 4) : vx(y) + 1, y, size, seed + k, k % 2 === 0, k % 4 === 1);
    }
  }
  for (let y = 0; y < 72; y++) for (let x = 0; x < 64; x++) {
    const c = leaves.get(x, y);
    if (c !== 0) r.set(x, y % 64, c);
  }
  return r;
}
