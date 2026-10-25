/**
 * Assembly ware: the steel gastronorm pan (BIN geometry, big like the Good Pizza topping pans of
 * ref/level7_gp_build_toppings.png: thick rolled rim round a deep well; the food lane draws its fill at
 * fillX/fillY over the well), Ciccio's kraft burger paper on the board (PAPER geometry, the stack stands
 * at baseX/baseY; no name plate: the rows under the base are where the bun and the parcel stand, and a
 * label there cut the burger, Good Pizza's board has none either) and the wrap animation
 * (44x32 x4): the kraft paper folds round a burger, frame 3 = the crumpled parcel printed with rows of
 * dark-grey "CICCIO'S" (ref/level7_wrap_tray.jpg; the game draws a high-resolution one over it).
 */
import { Mask, paintMask } from '../../hills/mask';
import { Raster, hash2, outlineRaster } from '../../hills/raster';
import { PAL, shade } from '../../pixel';
import { pathR, rectR } from '../../rampage/draw';
import { BIN, KITCHEN, PAPER, SHEET_SPEC } from '../keys';
import { ST } from './colors';
import { FRAME, brandPrint, brushedRect, edgeTone, roundCorners } from './draw';

/** Size of the pan contents drawn by the food lane (binFill / binSide / binBun frames). */
const [FILL_W, FILL_H] = SHEET_SPEC[KITCHEN.binFill];
/** Rows of the back inner wall and columns of the left inner wall in deep shadow under the rim. */
const WELL_BACK = 3;
const WELL_LEFT = 2;

/** Well pixel (i, j from the fill origin): back and left walls in deep shadow, lit right wall, the
 * floor a step lighter (the food lane's fill covers most of it). */
function wellTone(i: number, j: number): string {
  if (j === 0 || i === 0) return ST.steelEdge;
  if (j < WELL_BACK || i < WELL_LEFT) return ST.steelDark;
  return i === FILL_W - 1 ? ST.steelMid : ST.steelShade;
}

export function buildBin(): Raster {
  const { w, h, fillX, fillY } = BIN;
  const r = new Raster(w, h);
  const lipY = fillY + FILL_H; // front rim, then its outer face
  brushedRect(r, 1, 1, w - 2, h - 2, FRAME, 61);
  rectR(r, 1, 1, w - 2, 1, ST.steelShine); // rolled rim: lit back and left edges, plain steel right edge
  rectR(r, 1, 1, 1, h - 3, ST.steelShine);
  rectR(r, w - 2, 2, 1, h - 3, ST.steel);
  rectR(r, fillX, fillY - 1, FILL_W, 1, ST.steelDark); // the drop from the back rim into the well
  for (let j = 0; j < FILL_H; j++) {
    for (let i = 0; i < FILL_W; i++) r.set(fillX + i, fillY + j, wellTone(i, j));
  }
  rectR(r, 1, lipY, w - 2, 1, ST.steelLight); // front rim catching the light, a glint on its left
  rectR(r, 3, lipY, 7, 1, ST.steelShine);
  rectR(r, 1, lipY + 1, w - 2, 1, ST.steel);
  rectR(r, 1, lipY + 2, w - 2, h - 3 - lipY, ST.steelShade);
  roundCorners(r, 1, 1, w - 2, h - 2);
  outlineRaster(r, ST.ink);
  return r;
}

/** Kraft paper tones by edgeTone: lit rim, base, shaded rim. */
const KRAFT = [ST.kraftLight, ST.kraft, ST.kraftShade] as const;
/** Print rows of the packaging: first row, row pitch, gap between words, shift of each row. */
const PRINT = { y0: 4, pitch: 7, gap: 6, shift: 13 } as const;

/** Rows of "CICCIO'S" on the inner pixels of mask material `id`, in `ink`. */
function printOn(r: Raster, m: Mask, id: number, ink: string): void {
  brandPrint(r, (x, y) => m.get(x, y) === id && edgeTone(m, x, y, id) === 0, () => ink, PRINT.y0, PRINT.pitch, PRINT.gap, PRINT.shift);
}

export function buildPaper(): Raster {
  const { w, h } = PAPER;
  const r = new Raster(w, h);
  const top = 2;
  const bot = h - 4;
  const m = new Mask(w, h);
  for (let y = top; y <= bot; y++) {
    const t = (y - top) / (bot - top);
    m.span(6 - 4 * t, w - 7 + 4 * t, y, 1); // a sheet lying flat, seen in perspective
  }
  for (let y = top; y <= bot; y++) {
    for (let x = 0; x < w; x++) if (m.get(x, y) === 1) r.set(x, y, KRAFT[edgeTone(m, x, y, 1) + 1]);
  }
  rectR(r, 2, bot + 1, w - 4, 1, ST.kraftDeep); // paper thickness on the board
  // the front-right corner curls up a little
  for (const [x, y] of [[w - 4, bot], [w - 5, bot], [w - 4, bot - 1]] as const) r.set(x, y, ST.kraftLight);
  outlineRaster(r, ST.kraftEdge);
  return r;
}

const WW = 44;
const WH = 32;
const CX = 21.5;

const BUN = { light: PAL.bunLight, base: PAL.bun, shade: PAL.bunDark };
const PATTY = { light: shade(PAL.patty, 0.25), base: PAL.patty, shade: shade(PAL.patty, -0.35) };
const CHEESE = { light: PAL.cheeseLight, base: PAL.cheese, shade: PAL.cheeseDark };
const LEAF = { light: shade(PAL.lettuce, 0.3), base: PAL.lettuce, shade: shade(PAL.lettuce, -0.3) };

/** A plain cheeseburger in side view (what is inside the paper), bottom bun on row 27. */
function burger(r: Raster): void {
  const m = new Mask(WW, WH);
  m.rect(7, 24, 30, 4, 4);
  m.rect(6, 20, 32, 4, 3);
  for (let x = 5; x <= 38; x += 2) m.set(x, 19, 5);
  m.rect(6, 19, 32, 1, 2);
  for (const x of [10, 24, 33]) m.rect(x, 20, 2, 2, 2);
  for (let y = 10; y <= 18; y++) {
    const half = Math.round(15 * Math.sqrt(Math.max(0, 1 - ((18 - y) / 8.5) ** 2)));
    m.span(CX - half, CX + half, y, 1);
  }
  paintMask(m, r, { 1: BUN, 2: CHEESE, 3: PATTY, 4: BUN, 5: LEAF }, { shadeDepth: 1 });
  r.set(13, 12, PAL.creamLight); // brioche shine
  r.set(14, 12, PAL.creamLight);
  r.set(12, 13, PAL.bunLight);
}

/** Paints mask pixels of `id` as kraft paper, lit as a dome when `round` is given. */
function paintPaper(r: Raster, m: Mask, id: number, round?: { cy: number; rx: number; ry: number }): void {
  for (let y = 0; y < WH; y++) {
    for (let x = 0; x < WW; x++) {
      if (m.get(x, y) !== id) continue;
      let tone: number = edgeTone(m, x, y, id);
      if (tone === 0 && round) {
        const s = (x - CX) / round.rx + (y - round.cy) / (round.ry * 2);
        tone = s > 0.55 ? 1 : s < -0.65 ? -1 : 0;
      }
      r.set(x, y, KRAFT[tone + 1]);
    }
  }
}

/** The closed parcel: a dome over the burger with a flat base; `crumpled` roughens the outline of its
 * top (rows above CRUMPLE_Y). */
const PARCEL = { cy: 24, rx: 18, ry: 14 } as const;
const CRUMPLE_Y = 17;
function parcelMask(m: Mask, id: number, crumpled: boolean): void {
  for (let y = PARCEL.cy - PARCEL.ry; y <= WH - 2; y++) {
    const dy = Math.min(0, y - PARCEL.cy) / (PARCEL.ry + 0.5);
    const half = Math.round(PARCEL.rx * Math.sqrt(Math.max(0, 1 - dy * dy)));
    const dent = (k: number): number => (crumpled && y < CRUMPLE_Y && hash2(y, k, 83) < 0.4 ? 1 : 0);
    m.span(CX - half + dent(0), CX + half - dent(1), y, id);
  }
}

/** Folds of the crumpled parcel, between the print rows: the edge of the top flap across the dome (lit
 * lip over a dark fold, curling down at the sides), short wrinkles. */
const FLAP_EDGE = [[3, 26], [7, 24], [36, 24], [40, 26]] as const;
const WRINKLES = [[[9, 17], [12, 16]], [[19, 17], [22, 16]], [[29, 16], [33, 17]]] as const;

function crumple(r: Raster, m: Mask): void {
  const folds = new Raster(WW, WH);
  const edge = (dy: number): [number, number][] => FLAP_EDGE.map(([x, y]) => [x, y + dy]);
  pathR(folds, edge(0), ST.kraftDeep);
  pathR(folds, edge(-1), ST.kraftLight);
  for (const [a, b] of WRINKLES) pathR(folds, [a, b], ST.kraftShade);
  for (let y = 0; y < WH; y++) {
    for (let x = 0; x < WW; x++) if (folds.get(x, y) !== 0 && m.get(x, y) === 1 && edgeTone(m, x, y, 1) === 0) r.set(x, y, folds.get(x, y));
  }
}

function wrapFrame(f: number): Raster {
  const r = new Raster(WW, WH);
  const m = new Mask(WW, WH);
  if (f === 0) {
    m.poly([[2, 25], [41, 25], [44, 31], [0, 31]], 1);
    paintPaper(r, m, 1); // the plain inside of the sheet
    burger(r);
    const ears = new Mask(WW, WH);
    ears.poly([[0, 31], [3, 22], [8, 28]], 2);
    ears.poly([[44, 31], [41, 22], [36, 28]], 2);
    paintPaper(r, ears, 2);
  } else if (f === 1) {
    burger(r);
    m.poly([[0, 31], [44, 31], [42, 25], [2, 25]], 1);
    m.poly([[0, 31], [12, 31], [14, 15], [5, 12]], 2);
    m.poly([[44, 31], [32, 31], [30, 15], [39, 12]], 3);
    for (const id of [1, 2, 3]) paintPaper(r, m, id);
    printOn(r, m, 2, ST.kraftPrint);
    printOn(r, m, 3, ST.kraftPrint);
  } else {
    if (f === 2) burger(r);
    parcelMask(m, 1, f === 3);
    m.poly([[0, 31], [5, 24], [8, 31]], 2);
    m.poly([[44, 31], [39, 24], [36, 31]], 2);
    if (f === 2) m.ellipse(CX, 11, 8, 3, 0); // still open on top: the bun shows
    paintPaper(r, m, 1, PARCEL);
    paintPaper(r, m, 2);
    printOn(r, m, 1, ST.kraftPrint);
    if (f === 2) {
      const flap = new Mask(WW, WH);
      flap.poly([[13, 11], [31, 11], [28, 2], [16, 2]], 1);
      paintPaper(r, flap, 1);
      printOn(r, flap, 1, ST.kraftPrint);
    } else {
      crumple(r, m);
    }
  }
  outlineRaster(r, ST.ink);
  return r;
}

export function buildWrap(): Raster[] {
  return [0, 1, 2, 3].map(wrapFrame);
}
