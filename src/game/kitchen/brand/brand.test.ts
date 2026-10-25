import { describe, expect, it } from 'vitest';
import { KITCHEN, SHEET_SPEC, STARTERS } from '../../../art/kitchen/keys';
import { BOARD, BOAT_H, BOAT_W } from './boat';
import { WORD_W, wordLayout } from './letters';
import { LINER_H, LINER_PAPER, LINER_W } from './liner';
import { DISC, FACE_H, FACE_W } from './logo';
import { printRows, type PrintSpec } from './print';
import { BRAND_DENSITY, quantizeDensity, sheetLayout } from './sheet';
import { KRAFT, WRAP_H, WRAP_W } from './wrap';

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

/** CIE L* of a '#rrggbb' or 'rgba(r,g,b,a)' colour laid over `under` ('#rrggbb'). */
function lstar(color: string, under = '#ffffff'): number {
  const hex = (h: string): number[] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const m = /rgba\((\d+),(\d+),(\d+),([\d.]+)\)/.exec(color.replace(/\s/g, ''));
  const bg = hex(under);
  const rgb = m ? [1, 2, 3].map((i) => Number(m[i]) * Number(m[4]) + bg[i - 1] * (1 - Number(m[4]))) : hex(color);
  const lin = (c: number): number => (c / 255 <= 0.04045 ? c / 255 / 12.92 : ((c / 255 + 0.055) / 1.055) ** 2.4);
  const y = 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
  return y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y;
}

describe('tray contrast (BRIEF v7 point 7)', () => {
  it('the kraft wrap is clearly darker than the pale liner', () => {
    expect(lstar(LINER_PAPER.light)).toBeGreaterThanOrEqual(85);
    expect(lstar(LINER_PAPER.base)).toBeGreaterThanOrEqual(85);
    expect(lstar(KRAFT.base)).toBeLessThanOrEqual(60);
    expect(lstar(KRAFT.light)).toBeLessThanOrEqual(72);
    expect(lstar(LINER_PAPER.base) - lstar(KRAFT.light)).toBeGreaterThanOrEqual(20);
  });

  it('prints the liner lighter (lower contrast) than the wrap', () => {
    const linerPrint = lstar(LINER_PAPER.base) - lstar(LINER_PAPER.ink, LINER_PAPER.base);
    const wrapPrint = lstar(KRAFT.base) - lstar(KRAFT.ink, KRAFT.base);
    expect(lstar(LINER_PAPER.ink, LINER_PAPER.base)).toBeGreaterThanOrEqual(65);
    expect(linerPrint).toBeLessThan(wrapPrint);
  });

  it('makes the boats Ciccio\'s red, the cut rim white', () => {
    for (const c of [BOARD.lit, BOARD.base, BOARD.shade]) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
      expect(r).toBeGreaterThan(2.5 * g);
      expect(r).toBeGreaterThan(2.5 * b);
    }
    expect(lstar(BOARD.cut)).toBeGreaterThanOrEqual(95);
  });
});
