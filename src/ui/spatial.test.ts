import { describe, expect, it } from 'vitest';
import { verticalTarget, type Box } from './spatial';

const box = (left: number, right: number, top: number): Box => ({ left, right, top });
const down = (boxes: Box[]): number[] => boxes.map((_, i) => verticalTarget(boxes, i, 1));
const up = (boxes: Box[]): number[] => boxes.map((_, i) => verticalTarget(boxes, i, -1));

/** Title cards, landscape: 1 2 3 / 4 and the wide card 5 under columns 2-3. */
const LANDSCAPE = [box(0, 100, 0), box(110, 210, 0), box(220, 320, 0), box(0, 100, 80), box(110, 320, 80)];
/** Title cards, portrait: 1 2 / 3 4 / the wide card 5 across both columns. */
const PORTRAIT = [box(0, 100, 0), box(110, 210, 0), box(0, 100, 80), box(110, 210, 80), box(0, 210, 160)];

describe('verticalTarget', () => {
  it('3-column landscape: down reaches the wide card from columns 2 and 3, and wraps from the last row', () => {
    expect(down(LANDSCAPE)).toEqual([3, 4, 4, 0, 1]);
  });

  it('3-column landscape: up from the top row wraps to the card below the same column', () => {
    expect(up(LANDSCAPE)).toEqual([3, 4, 4, 0, 1]);
  });

  it('portrait: down from either card of row 2 lands on the wide card, which wraps to the first of row 1', () => {
    expect(down(PORTRAIT)).toEqual([2, 3, 4, 4, 0]);
  });

  it('portrait: up from the first row wraps to the wide card, and the wide card goes up to card 3', () => {
    expect(up(PORTRAIT)).toEqual([4, 4, 0, 1, 2]);
  });

  it('a single column steps to the neighbour and wraps', () => {
    const stack = [box(0, 100, 0), box(0, 100, 50), box(0, 100, 100)];
    expect(down(stack)).toEqual([1, 2, 0]);
    expect(up(stack)).toEqual([2, 0, 1]);
  });

  it('ignores sub-row jitter in the tops', () => {
    const jitter = [box(0, 100, 0), box(110, 210, 1), box(0, 100, 80), box(110, 210, 79)];
    expect(down(jitter)).toEqual([2, 3, 0, 1]);
  });

  it('returns -1 for one row of items or an unknown start, so the caller steps by one', () => {
    const row = [box(0, 100, 0), box(110, 210, 0)];
    expect(verticalTarget(row, 0, 1)).toBe(-1);
    expect(verticalTarget(row, 1, -1)).toBe(-1);
    expect(verticalTarget([], 0, 1)).toBe(-1);
  });
});
