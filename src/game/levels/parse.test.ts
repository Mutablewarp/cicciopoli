import { describe, expect, it } from 'vitest';
import { T } from '../../art/keys';
import { autotile, cellHash, EMPTY } from './autotile';
import { LEVEL1 } from './level1';
import { joinChunks, parseLevel } from './parse';
import type { LevelDef, Terrain } from './types';

function def(rows: string[]): LevelDef {
  return { id: 1, name: 'test', theme: 'hills', chunks: [rows] };
}

function terrainOf(rows: string[]): Terrain[][] {
  return rows.map((r) => [...r].map((ch): Terrain => (ch === '#' ? 'ground' : ch === '=' ? 'plat' : ch === 'X' ? 'block' : 'air')));
}

describe('parseLevel', () => {
  it('joins chunks and extracts entities', () => {
    const lvl = parseLevel({
      id: 1,
      name: 't',
      theme: 'hills',
      chunks: [
        ['S.o', '###'],
        ['?G', '##'],
      ],
    });
    expect(lvl.cols).toBe(5);
    expect(lvl.rows).toBe(2);
    expect(lvl.spawn).toEqual({ col: 0, row: 0 });
    expect(lvl.goal).toEqual({ col: 4, row: 0 });
    expect(lvl.entities.map((e) => e.spec.type)).toEqual(['spawn', 'pickup', 'qblock', 'goal']);
    expect(lvl.terrain[0][2]).toBe('air');
  });

  it('rejects ragged chunks, unknown chars and missing markers', () => {
    expect(() => joinChunks([['...', '..']])).toThrow(/width/);
    expect(() => parseLevel(def(['S.G', '#%#']))).toThrow(/unknown map char/);
    expect(() => parseLevel(def(['..G', '###']))).toThrow(/spawn/);
  });

  it('accepts level-specific legend entries', () => {
    const lvl = parseLevel({ ...def(['SZG', '###']), legend: { Z: { entity: { type: 'enemy', kind: 'bat' } } } });
    expect(lvl.entities[1].spec).toEqual({ type: 'enemy', kind: 'bat' });
  });

  it('level 1 is 16 rows x ~240 columns with the ground surface on row 13', () => {
    const lvl = parseLevel(LEVEL1);
    expect(lvl.rows).toBe(16);
    expect(lvl.cols).toBeGreaterThanOrEqual(220);
    expect(lvl.cols).toBeLessThanOrEqual(260);
    expect(lvl.terrain[13][lvl.spawn.col]).toBe('ground');
    expect(lvl.spawn.row).toBe(12);
  });
});

describe('autotile', () => {
  it('picks TOP / FILL / DEEP rows and L / M / R / SINGLE edges', () => {
    const t = terrainOf(['.....#', '.###.#', '.###.#', '.###.#']);
    const m = autotile(t);
    expect(m[0][0]).toBe(EMPTY);
    expect(m[1][1]).toBe(T.GROUND_TOP_L);
    expect([T.GROUND_TOP_M, T.GROUND_TOP_M_ALT]).toContain(m[1][2]);
    expect(m[1][3]).toBe(T.GROUND_TOP_R);
    expect(m[2][1]).toBe(T.GROUND_FILL_L);
    expect([T.GROUND_FILL_M, T.GROUND_FILL_M_ALT]).toContain(m[2][2]);
    expect(m[3][2]).toBe(T.GROUND_FILL_DEEP);
    expect(m[3][3]).toBe(T.GROUND_FILL_R);
    expect(m[0][5]).toBe(T.GROUND_TOP_L); // map edge continues the edge column
    expect(m[1][5]).toBe(T.GROUND_FILL_L);
  });

  it('a raised mound keeps the lit fill under it (no dark box below its rim)', () => {
    const m = autotile(terrainOf(['...........', '....###....', '###########', '###########', '###########']));
    expect([T.GROUND_FILL_M, T.GROUND_FILL_M_ALT]).toContain(m[3][5]);
    expect([T.GROUND_FILL_M, T.GROUND_FILL_M_ALT]).toContain(m[3][0]);
    expect(m[4][5]).toBe(T.GROUND_FILL_DEEP);
  });

  it('single-column ground and platforms', () => {
    const m = autotile(terrainOf(['.#.=...===.X', '.#..........']));
    expect(m[0][1]).toBe(T.GROUND_TOP_SINGLE);
    expect(m[1][1]).toBe(T.GROUND_FILL_SINGLE);
    expect(m[0][3]).toBe(T.PLAT_SINGLE);
    expect(m[0][7]).toBe(T.PLAT_L);
    expect(m[0][8]).toBe(T.PLAT_M);
    expect(m[0][9]).toBe(T.PLAT_R);
    expect(m[0][11]).toBe(T.BLOCK);
  });

  it('ALT variants are deterministic and occasional', () => {
    let alt = 0;
    for (let c = 0; c < 400; c++) if (cellHash(c, 13) < 22) alt++;
    expect(alt).toBeGreaterThan(40);
    expect(alt).toBeLessThan(140);
    expect(cellHash(17, 13)).toBe(cellHash(17, 13));
    const a = autotile(parseLevel(LEVEL1).terrain);
    const b = autotile(parseLevel(LEVEL1).terrain);
    expect(a).toEqual(b);
  });
});
