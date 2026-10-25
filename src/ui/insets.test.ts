import { describe, expect, it } from 'vitest';
import { foldInsets } from './insets';

const box = (left: number, top: number, right: number, bottom: number) => ({ left, top, right, bottom });

describe('play insets (level 7 ticket and action button)', () => {
  it('portrait: the ticket covers the top, the hint + button the bottom', () => {
    const host = box(0, 70, 390, 844);
    const v = foldInsets(host, [{ dock: 'top', rect: box(8, 76, 382, 249.4) }, { dock: 'bottom', rect: box(20, 730, 370, 844) }], { t: 0, b: 0 });
    expect(v).toEqual({ t: 180, l: 0, b: 114 });
  });

  it('landscape: the ticket column covers the left, the HUD bar stays the top inset', () => {
    const host = box(0, 0, 844, 390);
    const v = foldInsets(host, [{ dock: 'left', rect: box(8, 56, 252, 300) }, { dock: 'left', rect: box(8, 304, 252.2, 382) }], { t: 48, b: 0 });
    expect(v).toEqual({ t: 48, l: 253, b: 0 });
  });

  it('hidden parts (other levels) cover nothing', () => {
    const v = foldInsets(box(0, 0, 844, 390), [{ dock: 'left', rect: box(0, 0, 0, 0) }], { t: 44, b: 96 });
    expect(v).toEqual({ t: 44, l: 0, b: 96 });
  });
});
