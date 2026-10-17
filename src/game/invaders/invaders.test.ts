import { describe, expect, it } from 'vitest';
import { pickChain } from './chain';
import { FIELD } from './config';
import { extentOf, nextMarch, stepInterval, type March } from './formation';
import { computeFraming } from './framing';
import { ShieldMask } from './shieldMask';

const RULES = { stepX: 2, drop: 6, minX: 4, maxX: 220 };

describe('formation march', () => {
  const m: March = { ox: 40, oy: 50, dir: 1, frame: 0 };

  it('steps sideways and toggles the march frame', () => {
    const r = nextMarch(m, { left: 30, right: 150 }, RULES);
    expect(r.dropped).toBe(false);
    expect(r.march).toEqual({ ox: 42, oy: 50, dir: 1, frame: 1 });
  });

  it('drops a row and reverses at the right edge', () => {
    const r = nextMarch(m, { left: 100, right: 219 }, RULES);
    expect(r.dropped).toBe(true);
    expect(r.march).toEqual({ ox: 40, oy: 56, dir: -1, frame: 1 });
  });

  it('drops and reverses at the left edge', () => {
    const r = nextMarch({ ...m, dir: -1 }, { left: 5, right: 120 }, RULES);
    expect(r.dropped).toBe(true);
    expect(r.march.dir).toBe(1);
    expect(r.march.ox).toBe(40);
  });

  it('speeds up as the formation thins out', () => {
    expect(stepInterval(40, 40, 420, 70)).toBe(420);
    expect(stepInterval(20, 40, 420, 70)).toBeLessThan(420);
    expect(stepInterval(20, 40, 420, 70)).toBeGreaterThan(stepInterval(5, 40, 420, 70));
    expect(stepInterval(1, 40, 420, 70)).toBe(70);
  });

  it('measures the alive extent', () => {
    expect(extentOf([])).toBeNull();
    expect(extentOf([{ x: 50, halfW: 6 }, { x: 90, halfW: 7 }])).toEqual({ left: 44, right: 97 });
  });
});

describe('lightning chain', () => {
  const grid = [
    { id: 1, x: 100, y: 60 },
    { id: 2, x: 120, y: 60 },
    { id: 3, x: 100, y: 77 },
    { id: 4, x: 140, y: 60 },
    { id: 5, x: 30, y: 60 },
  ];

  it('strikes the lowest target above the jet first, then the nearest neighbours', () => {
    const order = pickChain(102, 240, grid, 3, 46);
    expect(order[0]).toBe(3);
    expect(order).toHaveLength(4);
    expect(new Set(order).size).toBe(4);
    expect(order).not.toContain(5);
  });

  it('stops chaining when nothing is within the radius', () => {
    expect(pickChain(30, 240, grid, 3, 15)).toEqual([5]);
  });

  it('returns nothing when no target is above the origin', () => {
    expect(pickChain(100, 50, grid, 3, 46)).toEqual([]);
  });
});

describe('shield mask', () => {
  const full = (): ShieldMask => new ShieldMask(10, 6, new Array(60).fill(255));

  it('finds the first solid pixel from the top or from the bottom', () => {
    const s = full();
    expect(s.hit(3, -2, 2, 4, true)).toEqual([3, 0]);
    expect(s.hit(3, 4, 2, 6, false)).toEqual([3, 5]);
    expect(s.hit(20, 0, 2, 2, true)).toBeNull();
  });

  it('erodes a ragged hole and reports every cleared pixel', () => {
    const s = full();
    const cleared = s.blast(5, 3, 2, () => 0.5);
    expect(cleared.length).toBeGreaterThan(8);
    expect(s.at(5, 3)).toBe(false);
    expect(s.at(0, 0)).toBe(true);
    expect(s.count()).toBe(60 - cleared.length);
    // a second blast on the same spot only clears what is left
    expect(s.blast(5, 3, 1, () => 0.5)).toHaveLength(0);
  });

  it('clears rectangles (invaders ploughing through)', () => {
    const s = full();
    expect(s.clearRect(-2, -2, 4, 4)).toHaveLength(4);
    expect(s.hit(0, 0, 2, 2, true)).toBeNull();
  });
});

describe('framing', () => {
  it('uses an integer zoom on a portrait phone and fits the field width', () => {
    const f = computeFraming({ cssW: 390, cssH: 520, dpr: 3, insetTop: 0, insetBottom: 0 });
    expect(Number.isInteger(f.zoom)).toBe(true);
    expect(FIELD.w * f.zoom).toBeLessThanOrEqual(390 * 3);
    expect(f.centerX).toBe(FIELD.w / 2);
  });

  it('keeps the play band under the HUD and clear of the corner controls in landscape', () => {
    const v = { cssW: 844, cssH: 390, dpr: 3, insetTop: 52, insetBottom: 91 };
    const f = computeFraming(v);
    const toCss = (worldY: number): number => ((worldY - f.centerY) * f.zoom + (v.cssH * v.dpr) / 2) / v.dpr;
    const fieldCssW = (FIELD.w * f.zoom) / v.dpr;
    expect(toCss(18)).toBeGreaterThanOrEqual(52 - 0.5);
    expect(toCss(288)).toBeLessThanOrEqual(390);
    // centred and at most half the width: the d-pad (left) and buttons (right) never cover it
    expect(fieldCssW).toBeLessThanOrEqual(844 / 2);
    expect(fieldCssW).toBeGreaterThan(240);
  });

  it('falls back to the bottom inset when the field would reach the corners', () => {
    const v = { cssW: 600, cssH: 520, dpr: 2, insetTop: 52, insetBottom: 120 };
    const f = computeFraming(v);
    const toCss = (worldY: number): number => ((worldY - f.centerY) * f.zoom + (v.cssH * v.dpr) / 2) / v.dpr;
    expect(toCss(288)).toBeLessThanOrEqual(520 - 120 + 0.5);
  });

  it('prefers integer zoom on low-DPR desktops', () => {
    expect(computeFraming({ cssW: 1280, cssH: 720, dpr: 1, insetTop: 64, insetBottom: 0 }).zoom).toBe(2);
  });
});
