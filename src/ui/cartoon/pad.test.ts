import { describe, expect, it } from 'vitest';
import { PAD, type PadRead, readPad } from './pad';

/** Feeds a finger path through readPad like the pad does (each read is the next prev). */
function trace(points: ReadonlyArray<[number, number]>): PadRead[] {
  let prev: PadRead | null = null;
  return points.map(([dx, dy]) => (prev = readPad(dx, dy, prev)));
}

describe('aim pad (◀ ▶ pill + ▲ cap)', () => {
  it('on the pill a direction is always held, by the side of the finger', () => {
    expect(readPad(-40, 0, null)).toEqual({ x: -1, up: false });
    expect(readPad(40, 10, null)).toEqual({ x: 1, up: false });
    expect(readPad(0, 0, null).x).not.toBe(0);
  });

  it('the middle dead zone keeps the previous direction (no jitter at the seam)', () => {
    const r = trace([[-40, 0], [PAD.dead - 1, 0], [PAD.dead + 1, 0]]);
    expect(r.map((p) => p.x)).toEqual([-1, -1, 1]);
  });

  it('above the pill aims up: straight over the cap, diagonal beside it', () => {
    expect(readPad(0, -PAD.up - 10, null)).toEqual({ x: 0, up: true });
    expect(readPad(PAD.cap + 8, -PAD.up - 10, null)).toEqual({ x: 1, up: true });
    expect(readPad(-PAD.cap - 8, -PAD.up - 10, null)).toEqual({ x: -1, up: true });
  });

  it('run then slide the thumb up: keeps running and aims diagonally without lifting', () => {
    const r = trace([[50, 0], [50, -PAD.up - 4], [50, 0]]);
    expect(r).toEqual([{ x: 1, up: false }, { x: 1, up: true }, { x: 1, up: false }]);
  });

  it('aim-up has hysteresis: a thumb resting on the line does not flicker', () => {
    const r = trace([[0, -PAD.up - 2], [0, -PAD.up + PAD.upHyst - 2], [0, -PAD.up + PAD.upHyst + 2]]);
    expect(r.map((p) => p.up)).toEqual([true, true, false]);
  });
});
