import { describe, expect, it } from 'vitest';
import { TILE } from '../../art/keys';
import { HULK, type MoveParams } from '../../config/tuning';
import { overlaps } from '../combat/club';
import { inBlast, punchBox, stackAbove } from '../brawl/rules';
import { LEVEL5 } from './level5';
import { parseLevel } from './parse';
import { clearanceIssues, makeGrid, pitWidths, reachableCells } from './reach';
import type { EntitySpawn, ParsedLevel } from './types';

/** Weaker-than-real hero: if the level works with this, the real jump has margin. */
const DEGRADED: MoveParams = { ...HULK.move, jumpV0: HULK.move.jumpV0 * 0.95, runMax: HULK.move.runMax * 0.9 };
const BODY = { w: HULK.bodyW, h: HULK.bodyH };
const level = parseLevel(LEVEL5);
const spawn = { col: level.spawn.col, row: level.spawn.row + 1 };
const GROUND_ROW = 13;

const smash = (l: ParsedLevel): EntitySpawn[] => l.entities.filter((e) => e.spec.type === 'smash');

/** A wall = bricks side by side on the same rows: [leftCol, rightCol, locked]. */
function walls(l: ParsedLevel): { left: number; right: number; locked: boolean }[] {
  const cols = new Map<number, boolean>();
  for (const e of smash(l)) {
    if (e.spec.type === 'smash' && e.spec.kind === 'brick') cols.set(e.col, e.spec.locked === true);
  }
  const out: { left: number; right: number; locked: boolean }[] = [];
  for (const c of [...cols.keys()].sort((a, b) => a - b)) {
    const last = out[out.length - 1];
    if (last && last.right === c - 1 && last.locked === cols.get(c)) last.right = c;
    else out.push({ left: c, right: c, locked: cols.get(c) === true });
  }
  return out;
}

/** Highest column the hero can stand on, with props gone (`smashed`) or with the given walls removed. */
function farthestCol(l: ParsedLevel, smashSolid: boolean): number {
  const seen = reachableCells(makeGrid(l, smashSolid), spawn, DEGRADED, BODY);
  return Math.max(...[...seen].map((k) => Number(k.split(',')[0])));
}

describe('level 5 layout', () => {
  it('is about 200 x 16 tiles on the rampage theme with the rage hero and 2 hints', () => {
    expect(level.rows).toBe(16);
    expect(level.cols).toBeGreaterThanOrEqual(190);
    expect(level.cols).toBeLessThanOrEqual(240);
    expect(LEVEL5.theme).toBe('rampage');
    expect(LEVEL5.hero).toBe('hulk');
    expect(LEVEL5.hints).toHaveLength(2);
    expect(level.terrain[GROUND_ROW][level.spawn.col]).toBe('ground');
  });

  it('has the enemies, a mid-level checkpoint, the arena and the goal after the gate', () => {
    const kinds = level.entities.flatMap((e) => (e.spec.type === 'enemy' ? [e.spec.kind] : []));
    for (const k of ['pickle', 'chili', 'armor', 'brute']) expect(kinds).toContain(k);
    expect(kinds.filter((k) => k === 'megaburger')).toHaveLength(1);
    const cps = level.entities.filter((e) => e.spec.type === 'checkpoint').map((e) => e.col / level.cols);
    expect(cps.length).toBeGreaterThanOrEqual(2);
    expect(cps.some((c) => c > 0.35 && c < 0.6)).toBe(true);
    const arena = level.entities.find((e) => e.spec.type === 'arena');
    const boss = level.entities.find((e) => e.spec.type === 'enemy' && e.spec.kind === 'megaburger');
    const gate = walls(level).filter((w) => w.locked);
    expect(arena && boss && gate).toBeTruthy();
    expect(arena?.col).toBeLessThan(boss?.col ?? 0);
    expect(boss?.col).toBeLessThan(gate[0].left);
    expect(gate[0].right).toBeLessThan(level.goal.col);
    // a boss arena wider than a landscape phone view (31.6 tiles)
    expect((gate[0].left - (arena?.col ?? 0))).toBeGreaterThanOrEqual(32);
  });

  it('props and enemies stand on the ground or on another prop, never in mid-air', () => {
    const solidAt = (c: number, r: number): boolean =>
      level.terrain[r]?.[c] === 'ground' || level.terrain[r]?.[c] === 'plat' || smash(level).some((e) => e.col === c && e.row === r);
    for (const e of level.entities) {
      if (e.spec.type !== 'smash' && e.spec.type !== 'enemy') continue;
      expect(solidAt(e.col, e.row + 1), `${e.spec.type} at ${e.col},${e.row}`).toBe(true);
    }
  });

  it('keeps at least 64 px of clearance wherever the hero can walk under something', () => {
    expect(clearanceIssues(level, 64)).toEqual([]);
  });
});

describe('level 5 reachability', () => {
  it('the goal is reachable from the spawn once the props are smashed (weaker-than-real hero)', () => {
    const seen = reachableCells(makeGrid(level, false), spawn, DEGRADED, BODY);
    const near = [...seen].some((k) => {
      const [c, r] = k.split(',').map(Number);
      return r === level.goal.row + 1 && Math.abs(c - level.goal.col) <= 1;
    });
    expect(near).toBe(true);
  });

  it('pits are at most 6 tiles wide and every pit wider than 4 has a steel plate to land on', () => {
    expect(Math.max(...pitWidths(level))).toBeLessThanOrEqual(6);
    let start = -1;
    for (let c = 0; c <= level.cols; c++) {
      const floor = c < level.cols && level.terrain.some((line) => line[c] === 'ground');
      if (!floor && start < 0) start = c;
      if (floor && start >= 0) {
        if (c - start > 4) {
          const plate = level.terrain.some((line) => line.slice(start, c).includes('plat'));
          expect(plate, `pit ${start}..${c - 1}`).toBe(true);
        }
        start = -1;
      }
    }
  });
});

describe('level 5 wall gating', () => {
  const brickWalls = walls(level).filter((w) => !w.locked);

  it('there are tall brick walls and a locked gate', () => {
    expect(brickWalls.length).toBeGreaterThanOrEqual(4);
    expect(walls(level).some((w) => w.locked)).toBe(true);
  });

  it('with every prop standing, the hero cannot get past the first wall (they really block)', () => {
    expect(farthestCol(level, true)).toBeLessThan(brickWalls[0].left);
  });

  it('each wall stops the hero until it is smashed, and leaves room to stand and hit it', () => {
    for (const [k, w] of walls(level).entries()) {
      // everything before this wall is smashed, this wall and everything after it stands
      const rest: ParsedLevel = {
        ...level,
        entities: level.entities.filter((e) => e.spec.type !== 'smash' || e.col > w.right || (e.col >= w.left && e.col <= w.right)),
      };
      const far = farthestCol(rest, true);
      expect(far, `wall ${k}`).toBeLessThan(w.left);
      expect(far, `room before wall ${k}`).toBeGreaterThanOrEqual(w.left - 3);
    }
  });

  it('every wall is at most 2 bricks thick and 8 tall on solid ground, with 3 flat tiles on its arrival side', () => {
    for (const w of walls(level)) {
      expect(w.right - w.left + 1).toBeLessThanOrEqual(2);
      const rows = smash(level).filter((e) => e.col === w.left).map((e) => e.row).sort((a, b) => a - b);
      expect(rows[rows.length - 1]).toBe(GROUND_ROW - 1);
      expect(rows.length).toBe(8);
      for (let c = w.left - 3; c < w.left; c++) expect(level.terrain[GROUND_ROW][c], `arrival of wall at ${w.left}`).toBe('ground');
    }
  });

  it('standing at a wall, both a punch and a slam reach the 4 rows the hero needs to squeeze through', () => {
    const body = { x: 0, feet: GROUND_ROW * TILE };
    for (const w of brickWalls) {
      const edge = w.left * TILE;
      const heroX = edge - BODY.w / 2;
      const box = punchBox({ left: heroX - BODY.w / 2, right: heroX + BODY.w / 2, centerY: body.feet - BODY.h / 2, facing: 1 });
      for (let row = GROUND_ROW - 4; row < GROUND_ROW; row++) {
        for (let c = w.left; c <= w.right; c++) {
          const brick = { left: c * TILE, right: (c + 1) * TILE, top: row * TILE, bottom: (row + 1) * TILE };
          expect(overlaps(box, brick), `punch ${c},${row}`).toBe(true);
          expect(inBlast(heroX, body.feet, brick), `slam ${c},${row}`).toBe(true);
        }
      }
    }
  });

  it('the opening a wall needs (4 rows) is taller than the hero body', () => {
    expect(4 * TILE).toBeGreaterThan(HULK.bodyH);
  });

  it('smashing the 4 reachable rows leaves nothing floating: the bricks above crumble with them', () => {
    const bricks = smash(level).flatMap((e) => (e.spec.type === 'smash' && e.spec.kind === 'brick' && e.spec.locked !== true ? [{ col: e.col, row: e.row }] : []));
    for (const w of brickWalls) {
      for (let c = w.left; c <= w.right; c++) {
        const column = bricks.filter((b) => b.col === c);
        const reachable = column.filter((b) => b.row >= GROUND_ROW - 4);
        const hanging = stackAbove(column, c, GROUND_ROW - 4);
        expect(reachable.length + hanging.length, `column ${c}`).toBe(column.length);
      }
    }
  });
});
