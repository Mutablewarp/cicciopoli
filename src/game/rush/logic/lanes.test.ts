import { describe, expect, it } from 'vitest';
import { LaneController, laneX } from './lanes';

const run = (c: LaneController, ms: number): void => {
  for (let t = 0; t < ms; t += 10) c.update(10);
};

describe('LaneController', () => {
  it('moves one lane per press with an eased slide and settles on time', () => {
    const c = new LaneController(() => 200);
    expect(c.press(1)).toBe('start');
    expect(c.changing).toBe(true);
    expect(c.lean).toBe(1);
    c.update(100);
    expect(c.x).toBeCloseTo((laneX(1) + laneX(2)) / 2, 5);
    expect(c.update(99)).toBe(false);
    expect(c.update(1)).toBe(true);
    expect(c.lane).toBe(2);
    expect(c.x).toBe(laneX(2));
    expect(c.lean).toBe(0);
  });

  it('stays inside the road', () => {
    const c = new LaneController(() => 200, 0);
    expect(c.press(-1)).toBe('blocked');
    expect(c.lane).toBe(0);
    c.press(1);
    run(c, 200);
    c.press(1);
    run(c, 200);
    expect(c.lane).toBe(2);
    expect(c.press(1)).toBe('blocked');
  });

  it('queues a second press once, never a double move, and rejects a queued move past the kerb', () => {
    const c = new LaneController(() => 250, 0);
    expect(c.press(1)).toBe('start');
    expect(c.press(1)).toBe('queued');
    expect(c.press(1)).toBe('ignored');
    expect(c.target).toBe(1);
    run(c, 250);
    expect(c.lane).toBe(1);
    expect(c.target).toBe(2);
    run(c, 250);
    expect(c.lane).toBe(2);
    expect(c.changing).toBe(false);
    c.press(-1);
    expect(c.press(-1)).toBe('queued');
    run(c, 600);
    expect(c.lane).toBe(0);
    const d = new LaneController(() => 250, 1);
    d.press(1);
    expect(d.press(1)).toBe('blocked');
  });

  it('asks the duration at every change start (grip / slip / driver)', () => {
    let ms = 400;
    const c = new LaneController(() => ms);
    c.press(1);
    ms = 100;
    run(c, 300);
    expect(c.changing).toBe(true);
    run(c, 100);
    expect(c.changing).toBe(false);
    c.press(-1);
    run(c, 100);
    expect(c.lane).toBe(1);
  });
});
