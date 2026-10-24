import { describe, expect, it } from 'vitest';
import { TRUCK_LOOK } from './config';
import { liftOf } from './truckView';

describe('flight lift', () => {
  it('starts and ends on the ground, holds at full height in between', () => {
    expect(liftOf(0)).toBe(0);
    expect(liftOf(1)).toBe(0);
    expect(liftOf(0.5)).toBe(1);
    expect(liftOf(TRUCK_LOOK.flyEase / 2)).toBeCloseTo(0.5);
    expect(liftOf(1 - TRUCK_LOOK.flyEase / 2)).toBeCloseTo(0.5);
  });

  it('rises monotonically during the take-off', () => {
    const steps = Array.from({ length: 11 }, (_, i) => liftOf((i / 10) * TRUCK_LOOK.flyEase));
    steps.slice(1).forEach((v, i) => expect(v).toBeGreaterThanOrEqual(steps[i]));
  });
});
