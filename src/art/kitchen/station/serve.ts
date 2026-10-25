/**
 * Serving side of the kitchen: the black fast-food tray (TRAY geometry: burger, cone, side and drink
 * stand on its anchors) with raised rims, hand-hold slots, the cream paper liner printed with rows of
 * "CICCIO'S" (ref/level7_wrap_tray.jpg) and the subtle dashed outline of each part where it goes, and
 * the VASSOIO name plate on its front; the chilled drinks rack (SHELF geometry: black steel, frosty glass back, 4 places) and the steel pedal
 * bin (26x30: 0 closed, 1 lid open).
 */
import { Mask } from '../../hills/mask';
import { Raster, gridR, hash2, outlineRaster } from '../../hills/raster';
import { bayer } from '../../pixel';
import { rectR } from '../../rampage/draw';
import { SHELF, TRAY } from '../keys';
import { ST } from './colors';
import { bevel, brandPrint, edgeTone, namePlate, roundCorners } from './draw';

/** Tray rows: back rim top, front rim (things stand on its back row), front face; side rim width. */
const TRAY_TOP = 2;
const LIP_Y = 37;
const SIDE_RIM = 5;
/** Floor starts under the back rim (3 rows) and its shadowed inner wall (2 rows). */
const TRAY_FLOOR_Y = TRAY_TOP + 5;
/** Hand-hold slot rows in each side rim. */
const SLOT = { y: 15, h: 13 } as const;
const TRAY_PARTS = ['burger', 'cone', 'side', 'drink'] as const;
type TrayPart = (typeof TRAY_PARTS)[number];
/** Paper liner on the floor, its "CICCIO'S" print rows: first row, pitch, gap between words, row shift. */
const LINER = { x: 8, y: 8, w: 104, h: 28 } as const;
const LINER_PRINT = { y0: LINER.y + 2, pitch: 9, gap: 8, shift: 17 } as const;
/** Last liner row of the printed place outlines. */
const PRINT_Y = 33;
/** Dashed outline printed on the liner for each place, about the size of what stands there: the
 * wrapped burger's dome, the two paper boats (fries, starter), the can. */
const boat = (cx: number) => (m: Mask): void => m.poly([[cx - 10, PRINT_Y - 14], [cx + 10, PRINT_Y - 14], [cx + 8, PRINT_Y], [cx - 8, PRINT_Y]], 1);
const PRINT: Readonly<Record<TrayPart, (m: Mask) => void>> = {
  burger: (m) => m.ellipse(TRAY.burger.x, PRINT_Y, 15, 17, 1),
  cone: boat(TRAY.cone.x),
  side: boat(TRAY.side.x),
  drink: (m) => m.rect(TRAY.drink.x - 3, 15, 6, PRINT_Y - 14, 1),
};

function handSlot(r: Raster, x: number): void {
  rectR(r, x, SLOT.y, 3, SLOT.h, ST.blackEdge);
  for (const y of [SLOT.y, SLOT.y + SLOT.h - 1]) {
    r.set(x, y, ST.black); // rounded ends
    r.set(x + 2, y, ST.black);
  }
  rectR(r, x, SLOT.y + SLOT.h, 3, 1, ST.blackLight); // the lit lip under the hole
}

function paperLiner(r: Raster): void {
  const { x, y, w, h } = LINER;
  rectR(r, x, y, w, h, ST.paper);
  const { y0, pitch, gap, shift } = LINER_PRINT;
  brandPrint(r, (px, py) => px > x && px < x + w - 1 && py > y && py < y + h - 1, () => ST.paperPrint, y0, pitch, gap, shift);
  rectR(r, x, y + h - 1, w, 1, ST.paperShade); // paper edge in shade
  rectR(r, x + w - 1, y, 1, h, ST.paperShade);
  rectR(r, x + 1, y + h, w, 1, ST.blackEdge); // the paper casts a thin shadow on the floor
  rectR(r, x + w, y + 1, 1, h, ST.blackEdge);
}

/** Where a part goes: its outline printed dashed on the liner (covered once the part is served). */
function printOutline(r: Raster, part: TrayPart): void {
  const m = new Mask(TRAY.w, TRAY.h);
  PRINT[part](m);
  const inside = (x: number, y: number): boolean => y <= PRINT_Y && m.get(x, y) === 1;
  for (let y = 0; y <= PRINT_Y; y++) {
    for (let x = 0; x < TRAY.w; x++) {
      const edge = inside(x, y) && !(inside(x - 1, y) && inside(x + 1, y) && inside(x, y - 1) && inside(x, y + 1));
      if (edge && (x + y) % 3 !== 2) r.set(x, y, ST.paperMark);
    }
  }
}

export function buildTray(): Raster {
  const { w, h } = TRAY;
  const r = new Raster(w, h);
  const right = w - 1 - SIDE_RIM; // first column of the right rim
  // rims: top faces lit on the back and left edges
  rectR(r, 1, TRAY_TOP, w - 2, LIP_Y - TRAY_TOP, ST.black);
  rectR(r, 1, TRAY_TOP, w - 2, 1, ST.blackLight);
  rectR(r, 1, TRAY_TOP, 1, LIP_Y - TRAY_TOP, ST.blackLight);
  // sunk floor: shadowed back and left inner walls, lit right inner wall
  rectR(r, 1 + SIDE_RIM, TRAY_TOP + 3, right - 1 - SIDE_RIM, LIP_Y - TRAY_TOP - 3, ST.blackShade);
  rectR(r, 1 + SIDE_RIM, TRAY_TOP + 3, right - 1 - SIDE_RIM, TRAY_FLOOR_Y - TRAY_TOP - 3, ST.blackEdge);
  rectR(r, 1 + SIDE_RIM, TRAY_TOP + 3, 1, LIP_Y - TRAY_TOP - 3, ST.blackEdge);
  rectR(r, right - 1, TRAY_FLOOR_Y, 1, LIP_Y - TRAY_FLOOR_Y, ST.blackLight);
  handSlot(r, 2);
  handSlot(r, right + 1);
  paperLiner(r);
  for (const part of TRAY_PARTS) printOutline(r, part);
  // front rim and its face
  rectR(r, 1, LIP_Y, w - 2, 1, ST.black);
  rectR(r, 1, LIP_Y + 1, w - 2, 1, ST.blackLight);
  rectR(r, 1, LIP_Y + 2, w - 2, h - 4 - LIP_Y, ST.blackShade);
  rectR(r, 1, h - 2, w - 2, 1, ST.blackEdge);
  for (const [x, y] of [[2, TRAY_TOP], [3, TRAY_TOP], [2, TRAY_TOP + 1], [9, LIP_Y + 1], [10, LIP_Y + 1]] as const) r.set(x, y, ST.steelLight); // glints
  namePlate(r, 'VASSOIO', w / 2, LIP_Y + 1);
  for (const [cx, cy, dx, dy] of [[1, TRAY_TOP, 1, 1], [w - 2, TRAY_TOP, -1, 1], [1, h - 2, 1, -1], [w - 2, h - 2, -1, -1]] as const) {
    r.set(cx, cy, null); // rounded corners
    r.set(cx + dx, cy, null);
    r.set(cx, cy + dy, null);
  }
  outlineRaster(r, ST.ink);
  return r;
}

const GLASS = { x: 3, y: 3, w: SHELF.w - 6 } as const;
/** First row of the rack floor (the drinks stand on its back half, bottoms at SHELF.slots y). */
const FLOOR_Y = 22;

function glass(r: Raster): void {
  for (let y = GLASS.y; y < FLOOR_Y; y++) {
    for (let x = GLASS.x; x < GLASS.x + GLASS.w; x++) {
      const t = (y - GLASS.y) / (FLOOR_Y - GLASS.y);
      let col: string = t > 0.45 && bayer(x, y) < (t - 0.45) * 1.6 ? ST.frostShade : ST.frost;
      const d = (((x - y * 0.7) % 38) + 38) % 38;
      if (d < 3 || (d > 6 && d < 8)) col = ST.frostLight; // glare streaks
      const corner = Math.min(x - GLASS.x, GLASS.x + GLASS.w - 1 - x) + (FLOOR_Y - 1 - y);
      if (corner < 6 && hash2(x, y, 71) < 0.55) col = ST.ice; // frost creeping from the bottom corners
      r.set(x, y, col);
    }
  }
  rectR(r, GLASS.x, GLASS.y, GLASS.w, 1, ST.coldLed); // cold light bar under the top frame
}

export function buildShelf(): Raster {
  const { w, h, slots } = SHELF;
  const r = new Raster(w, h);
  rectR(r, 1, 1, w - 2, h - 2, ST.black);
  bevel(r, 1, 1, w - 2, h - 2, ST.blackLight, ST.blackShade);
  glass(r);
  for (let k = 1; k < slots.length; k++) {
    const x = Math.round((slots[k - 1].x + slots[k].x) / 2);
    rectR(r, x, GLASS.y + 1, 1, FLOOR_Y - GLASS.y - 1, ST.black); // divider wires between the places
    rectR(r, x - 1, GLASS.y + 1, 1, FLOOR_Y - GLASS.y - 1, ST.blackLight);
  }
  // wire floor: back edge in shadow, grid of black steel with frosty glints
  for (let y = FLOOR_Y; y < FLOOR_Y + 4; y++) {
    for (let x = 3; x < w - 3; x++) {
      const wire = x % 3 === 0 || y === FLOOR_Y + 2;
      r.set(x, y, y === FLOOR_Y ? ST.blackEdge : wire ? ST.blackLight : ST.blackShade);
    }
  }
  for (let x = 4; x < w - 4; x += 9) r.set(x, FLOOR_Y + 2, ST.frostShade);
  rectR(r, 1, FLOOR_Y + 4, w - 2, 1, ST.steelMid); // steel edge of the front lip
  rectR(r, 2, FLOOR_Y + 4, 6, 1, ST.steelLight);
  roundCorners(r, 1, 1, w - 2, h - 2);
  outlineRaster(r, ST.ink);
  return r;
}

/** Pedal bin (taller than wide, so it never reads as a pot): centre column, radius, body rows; the
 * black foot and pedal below. */
const BIN_CX = 13;
const BIN_RX = 8;
const BODY_Y = 10;
const BODY_H = 15;

/** Embossed bin pictogram on the body front, so the bin reads at a glance. */
const BIN_ICON = ['.ddd.', 'ddddd', '.....', '.d.d.', '.d.d.', '.ddd.'];

/** Brushed steel round the cylinder: lit on the left, shaded on the right. */
function cylinderTone(t: number): string {
  return t < 0.1 ? ST.steelLight : t < 0.32 ? ST.steelShine : t < 0.55 ? ST.steel : t < 0.8 ? ST.steelMid : ST.steelShade;
}

function binBody(r: Raster): void {
  for (let j = 0; j < BODY_H; j++) {
    const half = BIN_RX - Math.floor((j * 2) / BODY_H);
    for (let x = BIN_CX - half; x <= BIN_CX + half; x++) r.set(x, BODY_Y + j, cylinderTone((x - (BIN_CX - half)) / (half * 2)));
  }
  for (let j = 0; j < 2; j++) {
    for (let x = BIN_CX - 6; x <= BIN_CX + 6; x++) r.set(x, BODY_Y + BODY_H + j, x < BIN_CX - 3 ? ST.blackLight : x > BIN_CX + 3 ? ST.blackShade : ST.black); // black foot
  }
  rectR(r, BIN_CX - 3, BODY_Y + BODY_H + 2, 7, 1, ST.steelLight); // the pedal sticking out at the front
  rectR(r, BIN_CX - 3, BODY_Y + BODY_H + 3, 7, 1, ST.blackShade);
  gridR(r, BIN_ICON, { d: ST.steelShade }, BIN_CX - 2, BODY_Y + 6);
}

function oval(cy: number, ry: number): Mask {
  const m = new Mask(26, 30);
  m.ellipse(BIN_CX, cy, BIN_RX, ry, 1);
  return m;
}

/** The black bin liner folded over the rim, a 2-px band hugging the front curve of `m` (lid or opening),
 * one corner hanging down: the cue that says "bin" at a glance. */
function liner(r: Raster, m: Mask): void {
  for (let x = BIN_CX - BIN_RX; x <= BIN_CX + BIN_RX; x++) {
    let y = BODY_Y + 5;
    while (y > BODY_Y - 6 && m.get(x, y - 1) !== 1) y--;
    if (y === BODY_Y - 6) continue; // column outside the oval
    r.set(x, y, ST.black);
    r.set(x, y + 1, x % 4 === 0 ? ST.blackLight : ST.blackShade);
    if (x === BIN_CX + 4 || x === BIN_CX + 5) r.set(x, y + 2, ST.blackShade);
  }
}

function lid(r: Raster, m: Mask, cy: number, under: boolean): void {
  for (let y = 0; y < 30; y++) {
    for (let x = 0; x < 26; x++) {
      if (m.get(x, y) !== 1) continue;
      const tone = edgeTone(m, x, y, 1);
      const lit = x - BIN_CX + 3 + (y - cy) * 2 < 0;
      r.set(x, y, under ? (tone === 1 ? ST.steelDark : lit ? ST.steelMid : ST.steelShade) : tone === 1 ? ST.steelShade : tone === -1 || lit ? ST.steelShine : ST.steel);
    }
  }
}

export function buildTrash(): Raster[] {
  const closed = new Raster(26, 30);
  const cover = oval(BODY_Y - 2, 3);
  binBody(closed);
  liner(closed, cover);
  lid(closed, cover, BODY_Y - 2, false);
  rectR(closed, BIN_CX - 2, BODY_Y - 6, 5, 1, ST.steelDark); // lid grip
  closed.set(BIN_CX - 4, BODY_Y - 4, ST.spark); // specular on the dome
  outlineRaster(closed, ST.ink);

  const open = new Raster(26, 30);
  lid(open, oval(6, 5), 6, true); // flipped up behind, we see its underside
  binBody(open);
  const mouth = oval(BODY_Y, 3);
  for (let y = 0; y < 30; y++) {
    for (let x = 0; x < 26; x++) {
      if (mouth.get(x, y) !== 1) continue;
      const rim = edgeTone(mouth, x, y, 1) !== 0;
      open.set(x, y, rim ? ST.blackLight : y < BODY_Y ? ST.black : ST.blackEdge); // black bag: back wall catches light, front deep
    }
  }
  liner(open, mouth);
  for (const [x, y] of [[BIN_CX - 4, BODY_Y - 1], [BIN_CX + 4, BODY_Y]] as const) open.set(x, y, ST.blackLight); // bag folds
  for (const [x, y] of [[BIN_CX + 1, BODY_Y], [BIN_CX + 2, BODY_Y], [BIN_CX + 2, BODY_Y - 1]] as const) open.set(x, y, ST.paper); // a scrap of paper
  outlineRaster(open, ST.ink);
  return [closed, open];
}
