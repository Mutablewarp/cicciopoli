import { describe, expect, it } from 'vitest';
import { physicsHz, RefreshMeter } from './frameRate';

const frames = (ms: number, n = 45): number[] => Array.from({ length: n }, (_, i) => ms + (i % 3 === 0 ? 0.4 : -0.2));

describe('physics rate from the display refresh (QA F5)', () => {
  it('snaps common panels and never steps slower than 60 Hz', () => {
    expect(physicsHz(frames(1000 / 60))).toBe(60);
    expect(physicsHz(frames(1000 / 90))).toBe(90);
    expect(physicsHz(frames(1000 / 120))).toBe(120);
    expect(physicsHz(frames(1000 / 30))).toBe(60);
    expect(physicsHz(frames(1000 / 240))).toBe(144);
    expect(physicsHz([])).toBe(60);
  });

  it('ignores hitches: the median frame decides', () => {
    const d = frames(1000 / 120);
    d[3] = 90;
    d[10] = 45;
    expect(physicsHz(d)).toBe(120);
  });

  it('reports a change once per window, after the warm-up', () => {
    const m = new RefreshMeter(60, 10, 5);
    const out: (number | null)[] = [];
    for (let i = 0; i < 25; i++) out.push(m.sample(1000 / 120));
    expect(out.filter((v) => v !== null)).toEqual([120]);
    expect(out.findIndex((v) => v !== null)).toBe(14);
  });
});
