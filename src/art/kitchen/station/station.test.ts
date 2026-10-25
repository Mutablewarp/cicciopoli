import { describe, expect, it } from 'vitest';
import { Raster, packColor } from '../../hills/raster';
import { drawText, textWidth } from '../../rush/font';
import { ST } from './colors';
import { brandPrint } from './draw';
import { buildFryer } from './fryer';
import { buildSmoke } from './fx';
import { buildGriddle } from './griddle';
import { buildTray } from './serve';
import { buildWorktop } from './surfaces';
import { buildPaper, buildWrap } from './ware';

const count = (r: Raster, color: string): number => r.px.reduce((n, c) => n + (c === packColor(color) ? 1 : 0), 0);
const goldPx = (r: Raster): number => count(r, ST.goldLight);

/** Gold pixels of `text` drawn alone: a name plate shows exactly these when it is whole and unclipped. */
function textPx(text: string): number {
  const r = new Raster(64, 5);
  drawText(r, text, 0, 0, ST.goldLight);
  return goldPx(r);
}

describe('station name plates', () => {
  it.each([
    ['PIASTRA', buildGriddle],
    ['FRIGGITRICE', buildFryer],
    ['VASSOIO', buildTray],
  ] as const)('%s is printed in full on its station', (text, build) => {
    expect(goldPx(build())).toBe(textPx(text));
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
