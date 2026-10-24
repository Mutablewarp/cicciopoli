import { describe, expect, it } from 'vitest';
import { RUSH_DENSITY, RUSH_FAIR, RUSH_KINDS, RUSH_ROAD, RUSH_SPEED, RUSH_TRUCK } from '../../../config/rush';
import { CELL, CHANGE_CELLS, SafeTable, staysFair, type Block } from './validator';
import type { Lane } from './types';

/** lane blocked on cells [a, b] of d, known from cell v */
const blk = (lane: Lane, a: number, b: number, v: number, owner = 1): Block => ({
  lane,
  from: a * CELL,
  to: b * CELL,
  vis: v * CELL,
  owner,
});

describe('validator', () => {
  it('a lane change takes the time of the slowest standard change at top speed', () => {
    expect(CHANGE_CELLS * CELL).toBeGreaterThanOrEqual(0.25 * 180 + CELL);
  });

  it('SafeTable: a blocked lane is unsafe, the way around is found', () => {
    const t = new SafeTable([blk(1, 40, 50, 0)], 0);
    expect(t.safe(1, 45)).toBe(false);
    expect(t.safe(1, 40 - CHANGE_CELLS)).toBe(true); // can still dodge
    expect(t.safe(1, 39)).toBe(false); // too late to leave
    expect(t.safe(0, 39)).toBe(true);
    expect(t.changeOk(1, 0, 40 - CHANGE_CELLS)).toBe(true);
    expect(t.changeOk(1, 3, 0)).toBe(false);
    expect(t.free(1, 0, 40)).toBe(true);
    expect(t.free(1, 0, 41)).toBe(false);
  });

  it('rejects a wall over all three lanes', () => {
    const wall = [blk(0, 100, 110, 80), blk(1, 100, 110, 80), blk(2, 100, 110, 80)];
    expect(staysFair([], wall)).toBe(false);
    expect(staysFair([], wall.slice(0, 2))).toBe(true);
  });

  it('rejects a wall on lanes 0-1 revealed too late to reach lane 2 (also from a change under way)', () => {
    const at = (v: number): Block[] => [blk(0, 100, 110, v), blk(1, 100, 110, v)];
    expect(staysFair([], at(90))).toBe(false);
    // two changes fit, but a player landing in lane 0 from a change begun just before would be doomed
    expect(staysFair([], at(100 - 2 * CHANGE_CELLS))).toBe(false);
    expect(staysFair([], at(100 - 3 * CHANGE_CELLS))).toBe(true);
  });

  it('a new row may not doom a lane a player could already be committed to', () => {
    // lane 0 closed far ahead: fine alone, but lane 1 is busy right where the player must cross
    const existing = [blk(1, 60, 100, 20)];
    expect(staysFair(existing, [blk(0, 90, 120, 75), blk(2, 90, 120, 75)])).toBe(false);
    expect(staysFair(existing, [blk(0, 90, 120, 40)])).toBe(true);
  });
});

describe('road geometry', () => {
  it('the camera window gives every obstacle its warning and hides the spawn line', () => {
    const top = Math.max(...Object.values(RUSH_SPEED.base));
    for (const k of Object.values(RUSH_KINDS)) {
      const reach = (k.h - 2 * k.inset + RUSH_TRUCK.hitH) / 2 / (1 - k.rate);
      const seenAt = (1 - k.rate) * (reach + (RUSH_FAIR.warnMs / 1000) * top) - k.h / 2;
      expect(seenAt).toBeLessThanOrEqual(RUSH_ROAD.viewAheadPx.min);
      expect(RUSH_ROAD.spawnAheadPx - k.h / 2).toBeGreaterThanOrEqual(RUSH_ROAD.viewAheadPx.max);
      expect(RUSH_ROAD.planAheadPx * (1 - k.rate)).toBeGreaterThanOrEqual(RUSH_ROAD.spawnAheadPx);
    }
    expect(RUSH_ROAD.reopenPx + Math.min(...Object.values(RUSH_DENSITY.gapPx).map((g) => g[0]))).toBeGreaterThanOrEqual(
      RUSH_ROAD.spawnAheadPx / (1 - Math.max(...Object.values(RUSH_KINDS).map((k) => k.rate))),
    );
  });
});
