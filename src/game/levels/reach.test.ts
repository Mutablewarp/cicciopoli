import { describe, expect, it } from 'vitest';
import { TILE } from '../../art/keys';
import { HERO, MOVE, type MoveParams } from '../../config/tuning';
import { LEVEL1 } from './level1';
import { parseLevel } from './parse';
import { clearanceIssues, makeGrid, pitWidths, reachableCells, simulate } from './reach';

/** Weaker-than-real hero: if the level works with this, the real jump has margin. */
const DEGRADED: MoveParams = { ...MOVE, jumpV0: MOVE.jumpV0 * 0.95, runMax: MOVE.runMax * 0.9 };
const BODY = { w: HERO.bodyW, h: HERO.bodyH };
const level = parseLevel(LEVEL1);
const grid = makeGrid(level);
const spawn = { col: level.spawn.col, row: level.spawn.row + 1 };

describe('jump envelope on a flat test strip', () => {
  const flat = makeGrid(
    parseLevel({
      id: 1,
      name: 'strip',
      theme: 'hills',
      chunks: [['S..................G', '####.....###########', '####.....###########']],
    }),
  );
  it('a running jump clears a 5-tile pit with the degraded hero', () => {
    const end = simulate(flat, { x: 3 * TILE + 8, bottom: TILE, w: 16, h: 34 }, { dir: 1, running: true, axisSteps: 999, jump: true }, DEGRADED);
    expect(end).not.toBeNull();
    expect((end?.x ?? 0) / TILE).toBeGreaterThan(9);
  });
  it('the search rejects a pit wider than the jump', () => {
    const wide = parseLevel({
      id: 1,
      name: 'wide',
      theme: 'hills',
      chunks: [['S...............G', '###.........#####', '###.........#####']],
    });
    const seen = reachableCells(makeGrid(wide), { col: 0, row: 1 }, DEGRADED, BODY);
    expect(seen.has('16,1')).toBe(false);
    expect(seen.has('2,1')).toBe(true);
  });
  it('walking off the edge falls into the pit', () => {
    const end = simulate(flat, { x: 3 * TILE + 8, bottom: TILE, w: 16, h: 34 }, { dir: 1, running: true, axisSteps: 999, jump: false }, DEGRADED);
    expect(end).toBeNull();
  });
});

describe('level 1 geometry', () => {
  it('the goal is reachable from the spawn with a weaker-than-real hero', () => {
    const seen = reachableCells(grid, spawn, DEGRADED, BODY);
    const goalRow = level.goal.row + 1;
    const near = [...seen].some((k) => {
      const [c, r] = k.split(',').map(Number);
      return r === goalRow && Math.abs(c - level.goal.col) <= 1;
    });
    expect(near).toBe(true);
  });

  it('the secret burger platform and every power-up are reachable', () => {
    const seen = reachableCells(grid, spawn, DEGRADED, BODY);
    const standingNear = (col: number, row: number): boolean =>
      [...seen].some((k) => {
        const [c, r] = k.split(',').map(Number);
        return Math.abs(c - col) <= 1 && r - row >= 1 && r - row <= 3;
      });
    for (const e of level.entities) {
      if (e.spec.type === 'pickup' && e.spec.kind === 'burger') expect(standingNear(e.col, e.row)).toBe(true);
    }
    // ? blocks are bumped from below: some standing cell under each must be within a jump.
    for (const e of level.entities) {
      if (e.spec.type !== 'qblock') continue;
      const under = [...seen].some((k) => {
        const [c, r] = k.split(',').map(Number);
        const rise = (r - e.row - 1) * TILE - HERO.bodyH;
        return c === e.col && rise >= 0 && rise < 70;
      });
      expect(under, `? block at ${e.col},${e.row}`).toBe(true);
    }
  });

  it('pits are at most 5 tiles wide', () => {
    expect(Math.max(...pitWidths(level))).toBeLessThanOrEqual(5);
  });

  it('at least 44 px of clearance wherever the hero can walk under something', () => {
    expect(clearanceIssues(level, 44)).toEqual([]);
  });

  it('one-way platforms above walkable ground sit on rows <= 9', () => {
    for (let r = 10; r < 13; r++) {
      for (let c = 0; c < level.cols; c++) {
        if (level.terrain[r][c] !== 'plat') continue;
        const groundBelow = level.terrain.slice(r + 1).some((line) => line[c] === 'ground');
        expect(groundBelow, `platform at ${c},${r}`).toBe(false);
      }
    }
  });
});
