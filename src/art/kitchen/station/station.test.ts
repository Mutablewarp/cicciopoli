import { describe, expect, it } from 'vitest';
import { Raster, packColor } from '../../hills/raster';
import { drawText, textWidth } from '../../rush/font';
import { friesPile } from '../food/fried';
import { PIECE_TOP, buildGriddleItems } from '../food/griddleItems';
import { FRY_ITEM, FRYER, GRIDDLE, GRIDDLE_ITEM } from '../keys';
import { ST } from './colors';
import { brandPrint } from './draw';
import { BASKET_MOUTH, buildFryer } from './fryer';
import { buildSmoke, buildSteam } from './fx';
import { buildGriddle } from './griddle';
import { buildTray } from './serve';
import { buildWorktop } from './surfaces';
import { buildPaper, buildWrap } from './ware';

const count = (r: Raster, color: string): number => r.px.reduce((n, c) => n + (c === packColor(color) ? 1 : 0), 0);
const goldPx = (r: Raster): number => count(r, ST.goldLight);
/** Opaque pixels of the fullest row. */
const widest = (r: Raster): number => Math.max(...Array.from({ length: r.h }, (_, y) => r.px.slice(y * r.w, (y + 1) * r.w).filter((c) => c !== 0).length));

/** Pixels of `text` drawn alone in `color`: a name plate shows exactly these when it is whole and unclipped. */
function textPx(text: string, color: string = ST.goldLight): number {
  const r = new Raster(64, 5);
  drawText(r, text, 0, 0, color);
  return count(r, color);
}

describe('station name plates', () => {
  it.each([
    ['PIASTRA', buildGriddle],
    ['FRIGGITRICE', buildFryer],
    ['VASSOIO', buildTray],
  ] as const)('%s is printed in full on its station', (text, build) => {
    expect(goldPx(build())).toBe(textPx(text));
  });

  it("the griddle wears Ciccio's red badge, CICCIO'S in white", () => {
    expect(count(buildGriddle(), ST.faceWhite)).toBe(textPx("CICCIO'S", ST.faceWhite));
  });

  it("PIASTRA and CICCIO'S sit on the griddle's back splash: never under a GIRA! / OK! cue on the front panel or a lifted basket", () => {
    const g = buildGriddle();
    const letters = [ST.goldLight, ST.faceWhite].map(packColor);
    const rows = Array.from(g.px).flatMap((c, i) => (letters.includes(c) ? [Math.floor(i / g.w)] : []));
    expect(rows.length).toBe(textPx('PIASTRA') + textPx("CICCIO'S", ST.faceWhite));
    expect(Math.max(...rows)).toBeLessThan(GRIDDLE.surface.y);
  });
});

describe('big griddle and fryer (v7)', () => {
  it('every griddle item fits its slot inside the cooking surface', () => {
    const S = GRIDDLE.surface;
    for (const s of GRIDDLE.slots) {
      expect(s.x - GRIDDLE_ITEM.w / 2).toBeGreaterThanOrEqual(S.x);
      expect(s.x + GRIDDLE_ITEM.w / 2).toBeLessThanOrEqual(S.x + S.w);
      expect(s.y - GRIDDLE_ITEM.h / 2).toBeGreaterThanOrEqual(S.y);
      expect(s.y + GRIDDLE_ITEM.h / 2).toBeLessThanOrEqual(S.y + S.h);
    }
  });

  it('every griddle piece leaves the frame rows the cook bar reaches empty (the crust change shows whole)', () => {
    for (const r of buildGriddleItems()) expect(r.px.slice(0, PIECE_TOP * r.w).every((c) => c === 0)).toBe(true);
  });

  it('the basket mouth sits in the oil well and holds a whole fry item across', () => {
    expect(BASKET_MOUTH.w).toBeLessThanOrEqual(FRYER.well.w);
    expect(BASKET_MOUTH.h).toBeLessThanOrEqual(FRYER.well.h);
    expect(FRY_ITEM.w).toBeLessThanOrEqual(BASKET_MOUTH.w - 4);
  });

  it('the steam is a big white cloud on every frame (only steam whites, mostly bright, >= 10 px wide)', () => {
    const steam = new Set([ST.steamHi, ST.steam, ST.steamShade].map(packColor));
    const white = new Set([ST.steamHi, ST.steam].map(packColor));
    for (const f of buildSteam()) {
      const lit = f.px.filter((c) => c !== 0);
      expect(lit.length).toBeGreaterThan(120);
      expect(lit.every((c) => steam.has(c))).toBe(true);
      expect(lit.filter((c) => white.has(c)).length / lit.length).toBeGreaterThan(0.75);
      expect(widest(f)).toBeGreaterThanOrEqual(10);
    }
  });
});

describe('fries', () => {
  it.each([[5, 3, 17, false], [4, 4, 21, true]] as const)('%i rows x %i: long whole sticks leaning both ways, all inside the frame', (rows, cols, len, heap) => {
    const pile = friesPile(FRY_ITEM.w, FRY_ITEM.h, rows, cols, len, 7, heap);
    expect(pile.length).toBeGreaterThanOrEqual(12);
    expect(Math.min(...pile.map((f) => f[3]))).toBeGreaterThanOrEqual(12); // >= 3x the 4 px thickness: a stick, not a nugget
    expect(pile.filter((f) => f[2] > 0).length).toBeGreaterThanOrEqual(4); // criss-cross, not parallel rows
    expect(pile.filter((f) => f[2] < 0).length).toBeGreaterThanOrEqual(4);
    for (const [cx, cy, a, l] of pile) {
      for (const [u, v] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const x = cx + (u * l * Math.cos(a)) / 2 - v * 2 * Math.sin(a);
        const y = cy + (u * l * Math.sin(a)) / 2 + v * 2 * Math.cos(a);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(FRY_ITEM.w);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(FRY_ITEM.h);
      }
    }
  });
});

describe('smoke', () => {
  it('is a full plume on every frame of the loop (a burning item reads at any moment)', () => {
    for (const f of buildSmoke()) expect(f.px.filter((c) => c !== 0).length).toBeGreaterThan(120);
  });
});

describe('worktop', () => {
  it('reads as brushed steel: long horizontal streaks, tone changing from row to row (not felt speckle)', () => {
    const r = buildWorktop();
    let across = 0;
    let down = 0;
    for (let y = 0; y < r.h; y++) {
      for (let x = 0; x < r.w; x++) {
        const c = r.get(x, y);
        if (c !== r.get((x + 1) % r.w, y)) across++;
        if (c !== r.get(x, (y + 1) % r.h)) down++;
      }
    }
    expect((r.w * r.h) / across).toBeGreaterThan(14); // mean streak length, art px
    expect(down / across).toBeGreaterThan(6);
  });
});

describe("Ciccio's packaging print", () => {
  it('stamps whole words along a row', () => {
    const r = new Raster(64, 5);
    drawText(r, "CICCIO'S", 0, 0, ST.ink);
    const word = count(r, ST.ink);
    const printed = new Raster(textWidth("CICCIO'S"), 5);
    brandPrint(printed, () => true, () => ST.kraftPrint, 0, 7, 0, 0);
    expect(count(printed, ST.kraftPrint)).toBe(word);
  });

  it('the wrapped burger is kraft printed in dark grey, the tray liner in pale grey', () => {
    expect(count(buildWrap()[3], ST.kraftPrint)).toBeGreaterThan(60);
    expect(count(buildTray(), ST.paperPrint)).toBeGreaterThan(150);
  });

  it('the assembly sheet is plain kraft, no word fragments round the bun and no plate under it (a label there cut the burger)', () => {
    const paper = buildPaper();
    const kraft = new Set([0, ...[ST.kraftLight, ST.kraft, ST.kraftShade, ST.kraftDeep, ST.kraftEdge].map(packColor)]);
    expect(paper.px.every((c) => kraft.has(c))).toBe(true);
  });
});
