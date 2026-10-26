import { describe, expect, it } from 'vitest';
import { pushUp, type Box } from './stack';

const box = (x: number, y: number, w = 100, h = 20): Box => ({ x, y, w, h });

describe('floating label stack', () => {
  it('pushes the labels in the new one\'s column up above it, the lowest first, none overlapping', () => {
    const old = [box(0, 100), box(10, 95), box(0, 40)];
    const lift = pushUp(old, box(0, 100), 2);
    const moved = old.map((o, i) => ({ ...o, y: o.y - lift[i] }));
    expect(moved[0].y).toBe(78); // right above the new one
    expect(moved[1].y).toBe(56); // above that
    expect(moved[2].y).toBe(34); // the one higher up made room too
    expect(lift.every((l) => l >= 0)).toBe(true);
  });

  it('leaves alone the labels beside the column, those below the new one and those already clear', () => {
    expect(pushUp([box(300, 100), box(0, 160), box(0, 20)], box(0, 100), 2)).toEqual([0, 0, 0]);
  });
});
