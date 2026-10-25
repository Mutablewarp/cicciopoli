import { describe, expect, it } from 'vitest';
import { KITCHEN, SHEET_SPEC, STARTERS } from '../../../art/kitchen/keys';
import { BOAT_H, BOAT_W } from './boat';
import { WORD_W, wordLayout } from './letters';
import { LINER_H, LINER_W } from './liner';
import { DISC, FACE_H, FACE_W } from './logo';
import { printRows, type PrintSpec } from './print';
import { BRAND_DENSITY, quantizeDensity, sheetLayout } from './sheet';
import { WRAP_H, WRAP_W } from './wrap';

const SPEC: PrintSpec = { letterH: 2.7, rowPitch: 2.55, wordGap: 1.3, angle: -0.22, phase: 0.35 };

describe('CICCIO\'S lettering', () => {
  it('spells CICCIO\'S left to right, condensed', () => {
    const { glyphs, width } = wordLayout();
    expect(glyphs.map((g) => g.glyph).join('')).toBe('CICCIOQS');
    glyphs.slice(1).forEach((g, i) => expect(g.x).toBeGreaterThan(glyphs[i].x));
    expect(width).toBe(WORD_W);
    expect(width).toBeGreaterThan(3);
    expect(width).toBeLessThan(5);
  });
});

describe('print rows', () => {
  const words = printRows(WRAP_W, WRAP_H, SPEC);

  it('alternates upright and upside-down rows', () => {
    for (const w of words) expect(w.angle).toBeCloseTo(SPEC.angle + ((w.row & 1) === 1 ? Math.PI : 0));
    expect(new Set(words.map((w) => w.row & 1)).size).toBe(2);
  });

  it('covers the whole sheet: every point is within half a row pitch of a row line', () => {
    const pitch = SPEC.letterH * SPEC.rowPitch;
    const rows = new Map<number, { x: number; y: number }>();
    for (const w of words) rows.set(w.row, w);
    const n = { x: -Math.sin(SPEC.angle), y: Math.cos(SPEC.angle) }; // across the rows
    for (let y = 0; y <= WRAP_H; y += 2) {
      for (let x = 0; x <= WRAP_W; x += 2) {
        const near = [...rows.values()].some((r) => Math.abs((x - r.x) * n.x + (y - r.y) * n.y) <= pitch / 2 + 1e-6);
        expect(near).toBe(true);
      }
    }
  });

  it('keeps only words that reach the sheet', () => {
    const pad = SPEC.letterH * (WORD_W + SPEC.wordGap);
    for (const w of words) {
      expect(w.x).toBeGreaterThanOrEqual(-pad);
      expect(w.x).toBeLessThanOrEqual(WRAP_W + pad);
      expect(w.y).toBeGreaterThanOrEqual(-pad);
      expect(w.y).toBeLessThanOrEqual(WRAP_H + pad);
    }
  });
});

describe('density and sheets', () => {
  it('quantises the density up to a step, within bounds', () => {
    expect(quantizeDensity(11.2)).toBe(11.5);
    expect(quantizeDensity(12)).toBe(12);
    expect(quantizeDensity(0.2)).toBe(BRAND_DENSITY.min);
    expect(quantizeDensity(100)).toBe(BRAND_DENSITY.max);
    expect(quantizeDensity(Number.NaN)).toBe(BRAND_DENSITY.min);
  });

  it('lays frames in a grid with a gutter, one frame = the whole canvas', () => {
    const one = sheetLayout(LINER_W, LINER_H, 1, 3);
    expect(one).toEqual({ w: LINER_W * 3, h: LINER_H * 3, fw: LINER_W * 3, fh: LINER_H * 3, cells: [{ x: 0, y: 0 }] });
    const four = sheetLayout(WRAP_W, WRAP_H, 4, 2);
    const g = BRAND_DENSITY.gutter;
    expect(four.cells).toEqual([{ x: 0, y: 0 }, { x: 88 + g, y: 0 }, { x: 0, y: 64 + g }, { x: 88 + g, y: 64 + g }]);
    expect([four.w, four.h]).toEqual([176 + g, 128 + g]);
  });

  it('fits the GPU texture limit at the highest density', () => {
    const pieces: [number, number, number][] = [
      [WRAP_W, WRAP_H, 4], [BOAT_W, BOAT_H, STARTERS.length], [DISC, DISC, 2], [FACE_W, FACE_H, 1], [LINER_W, LINER_H, 1],
    ];
    for (const [w, h, n] of pieces) {
      const L = sheetLayout(w, h, n, BRAND_DENSITY.max);
      expect(Math.max(L.w, L.h)).toBeLessThanOrEqual(BRAND_DENSITY.maxTexture);
    }
  });

  it('matches the pixel keys it stands for (same frame size and count)', () => {
    expect(SHEET_SPEC[KITCHEN.wrap].slice(0, 3)).toEqual([WRAP_W, WRAP_H, 4]);
    expect(SHEET_SPEC[KITCHEN.cone].slice(0, 3)).toEqual([BOAT_W, BOAT_H, 2]);
    expect(SHEET_SPEC[KITCHEN.starterBox].slice(0, 3)).toEqual([BOAT_W, BOAT_H, STARTERS.length]);
    expect(SHEET_SPEC[KITCHEN.faceDisc].slice(0, 3)).toEqual([DISC, DISC, 2]);
    expect(FACE_W / FACE_H).toBeCloseTo(358 / 512, 2); // public/brand/ciccio-face-hd.png
  });
});
