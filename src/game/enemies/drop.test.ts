import { describe, expect, it } from 'vitest';
import { dropToGround } from './Enemy';

// ground from y = 208 down; a one-tile ledge (y 160) for x < 100
const world = { isSolidAt: (x: number, y: number): boolean => y >= 208 || (x < 100 && y >= 160 && y < 176) };

describe('dropToGround', () => {
  it('finds the ground under a walker killed mid-hop', () => {
    expect(dropToGround(world, 300, 172, 64)).toBe(36);
    expect(dropToGround(world, 300, 189.5, 64)).toBeCloseTo(18.5);
  });

  it('is 0 when already standing', () => {
    expect(dropToGround(world, 300, 208, 64)).toBe(0);
    expect(dropToGround(world, 50, 160, 64)).toBe(0);
  });

  it('lands on the first surface below, a ledge before the ground', () => {
    expect(dropToGround(world, 50, 130, 64)).toBe(30);
  });

  it('stays put over a pit or past the search depth', () => {
    expect(dropToGround({ isSolidAt: () => false }, 300, 172, 64)).toBe(0);
    expect(dropToGround(world, 300, 100, 64)).toBe(0);
  });
});
