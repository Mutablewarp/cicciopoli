import { describe, expect, it } from 'vitest';
import { TILE } from '../../art/keys';
import { FLIGHT, HERO, MOVE, type FlightParams, type MoveParams } from '../../config/tuning';
import { INFERNO_THEME } from '../themes';
import { LEVEL2 } from './level2';
import { parseLevel } from './parse';
import { clearanceIssues, makeGrid, reachableCells } from './reach';
import { islands, reachableByFlight } from './reachFlight';

/** Weaker-than-real hero: if the level works with this, the real one has margin. */
const DEGRADED: MoveParams = { ...MOVE, jumpV0: MOVE.jumpV0 * 0.95, runMax: MOVE.runMax * 0.9 };
const SLOW_WINGS: FlightParams = { ...FLIGHT, speedX: FLIGHT.speedX * 0.9, riseVy: FLIGHT.riseVy * 0.9 };
const BODY = { w: HERO.bodyW, h: HERO.bodyH };
const level = parseLevel(LEVEL2);
const grid = makeGrid(level);
const spawn = { col: level.spawn.col, row: level.spawn.row + 1 };
const burnY = level.rows * TILE - (INFERNO_THEME.hazardLine ?? 0);
const isles = islands(level);
const cellsOf = (seen: Set<string>) => [...seen].map((k) => k.split(',').map(Number) as [number, number]);
const inIsland = (seen: Set<string>, i: { left: number; right: number }) => cellsOf(seen).some(([c]) => c >= i.left && c <= i.right);

describe('level 2 layout', () => {
  it('is about 180 x 20 tiles with lava-level islands and the theme it needs', () => {
    expect(level.cols).toBe(180);
    expect(level.rows).toBe(20);
    expect(LEVEL2.theme).toBe('inferno');
    expect(isles.length).toBeGreaterThanOrEqual(5);
  });

  it('puts the crunchy wings at x ~ 200 px, before the first big gap', () => {
    const wings = level.entities.filter((e) => e.spec.type === 'pickup' && e.spec.kind === 'crunchy');
    expect(wings).toHaveLength(1);
    const x = wings[0].col * TILE + TILE / 2;
    expect(Math.abs(x - 200)).toBeLessThanOrEqual(16);
    expect(wings[0].col).toBeLessThan(isles[0].right);
    expect(isles[1].left - isles[0].right - 1).toBeGreaterThanOrEqual(12);
  });

  it('has the brazier checkpoint around x = 1400 px', () => {
    const cps = level.entities.filter((e) => e.spec.type === 'checkpoint');
    expect(cps).toHaveLength(1);
    expect(Math.abs(cps[0].col * TILE + TILE / 2 - 1400)).toBeLessThanOrEqual(48);
  });

  it('keeps every walkable surface above the lava burn line', () => {
    for (const i of isles) {
      const top = level.terrain.findIndex((line) => line.slice(i.left, i.right + 1).some((t) => t === 'ground'));
      expect(top * TILE).toBeLessThan(burnY - 40);
    }
  });

  it('has at least 44 px of clearance wherever the hero can walk under something', () => {
    expect(clearanceIssues(level, 44)).toEqual([]);
  });
});

describe('level 2 reachability', () => {
  it('without wings the wings are reachable but the first big gap is not', () => {
    const seen = reachableCells(grid, spawn, MOVE, BODY);
    const wings = level.entities.find((e) => e.spec.type === 'pickup' && e.spec.kind === 'crunchy');
    expect(wings).toBeDefined();
    const w = wings ?? { col: -9, row: -9 };
    expect(cellsOf(seen).some(([c, r]) => Math.abs(c - w.col) <= 1 && r - w.row >= 1 && r - w.row <= 3)).toBe(true);
    expect(cellsOf(seen).every(([c]) => c <= isles[0].right)).toBe(true);
  });

  it('with wings every island is reachable from the previous one (slower wings)', () => {
    for (let k = 0; k + 1 < isles.length; k++) {
      const edge = isles[k].right;
      const from = k === 0 ? spawn : { col: edge, row: level.terrain.findIndex((line) => line[edge] === 'ground') };
      const seen = reachableByFlight(grid, from, SLOW_WINGS, DEGRADED, BODY, burnY);
      expect(inIsland(seen, isles[k + 1]), `island ${k} -> ${k + 1}`).toBe(true);
    }
  });

  it('with wings the goal and every ? block are reachable from the spawn', () => {
    const seen = reachableByFlight(grid, spawn, SLOW_WINGS, DEGRADED, BODY, burnY);
    const cells = cellsOf(seen);
    expect(cells.some(([c, r]) => r === level.goal.row + 1 && Math.abs(c - level.goal.col) <= 1)).toBe(true);
    for (const e of level.entities) {
      if (e.spec.type !== 'qblock') continue;
      // bumped from below: a standing cell under it within a jump / short climb
      const under = cells.some(([c, r]) => c === e.col && (r - e.row - 1) * TILE - HERO.bodyH >= 0);
      expect(under, `? block at ${e.col},${e.row}`).toBe(true);
    }
  });
});
