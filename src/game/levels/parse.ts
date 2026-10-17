/**
 * ASCII level parser (pure). Default legend shared by every level:
 *
 *   terrain   .  air          #  ground (autotiled)   =  one-way platform   X  solid block
 *   blocks    ?  ? block → fries    B ? block → brie    P ? block → provola goat
 *             T  ? block → thai     H ? block → burger  W ? block → crunchy wings
 *             K  wooden crate (breakable by cheese / club)
 *   pickups   o  fries   h  burger   b  brie   g  provola goat   t  thai   w  crunchy wings
 *   enemies   p  pickle (sottaceto)   c  chili (peperoncino)   a  armoured burger
 *             v  bat   d  demon   s  fire spirit
 *   markers   S  spawn   C  checkpoint   G  goal hole + golf flag
 *   decor     Y  tree   u  bush   f  flower   r  rock   n  arrow sign
 *             j  torch   i  spire   l  chain
 *
 * Entities sit in the cell where their letter is; ground entities use the cell's bottom
 * edge as their feet line, so a letter on the row above the ground stands on it.
 */
import type { Cell, EntitySpawn, Legend, LegendEntry, LevelDef, ParsedLevel, Terrain } from './types';

export const DEFAULT_LEGEND: Legend = {
  '.': { terrain: 'air' },
  '#': { terrain: 'ground' },
  '=': { terrain: 'plat' },
  X: { terrain: 'block' },
  '?': { entity: { type: 'qblock', contents: 'fries' } },
  B: { entity: { type: 'qblock', contents: 'brie' } },
  P: { entity: { type: 'qblock', contents: 'goat' } },
  T: { entity: { type: 'qblock', contents: 'thai' } },
  H: { entity: { type: 'qblock', contents: 'burger' } },
  W: { entity: { type: 'qblock', contents: 'crunchy' } },
  K: { entity: { type: 'crate' } },
  o: { entity: { type: 'pickup', kind: 'fries' } },
  h: { entity: { type: 'pickup', kind: 'burger' } },
  b: { entity: { type: 'pickup', kind: 'brie' } },
  g: { entity: { type: 'pickup', kind: 'goat' } },
  t: { entity: { type: 'pickup', kind: 'thai' } },
  w: { entity: { type: 'pickup', kind: 'crunchy' } },
  p: { entity: { type: 'enemy', kind: 'pickle' } },
  c: { entity: { type: 'enemy', kind: 'chili' } },
  a: { entity: { type: 'enemy', kind: 'armor' } },
  v: { entity: { type: 'enemy', kind: 'bat' } },
  d: { entity: { type: 'enemy', kind: 'demon' } },
  s: { entity: { type: 'enemy', kind: 'spirit' } },
  S: { entity: { type: 'spawn' } },
  C: { entity: { type: 'checkpoint' } },
  G: { entity: { type: 'goal' } },
  Y: { entity: { type: 'decor', kind: 'tree' } },
  u: { entity: { type: 'decor', kind: 'bush' } },
  f: { entity: { type: 'decor', kind: 'flower' } },
  r: { entity: { type: 'decor', kind: 'rock' } },
  n: { entity: { type: 'decor', kind: 'sign' } },
  j: { entity: { type: 'decor', kind: 'torch' } },
  i: { entity: { type: 'decor', kind: 'spire' } },
  l: { entity: { type: 'decor', kind: 'chain' } },
};

/** Joins the chunks side by side into full-width rows, validating their shape. */
export function joinChunks(chunks: readonly (readonly string[])[]): string[] {
  if (chunks.length === 0) throw new Error('level has no chunks');
  const height = chunks[0].length;
  const rows: string[] = Array.from({ length: height }, () => '');
  chunks.forEach((chunk, k) => {
    if (chunk.length !== height) throw new Error(`chunk ${k}: ${chunk.length} rows, expected ${height}`);
    const w = chunk[0].length;
    chunk.forEach((line, r) => {
      if (line.length !== w) throw new Error(`chunk ${k} row ${r}: width ${line.length}, expected ${w}`);
      rows[r] += line;
    });
  });
  return rows;
}

function single(found: Cell[], what: string): Cell {
  if (found.length !== 1) throw new Error(`level needs exactly one ${what}, found ${found.length}`);
  return found[0];
}

export function parseLevel(def: LevelDef): ParsedLevel {
  const legend: Legend = { ...DEFAULT_LEGEND, ...def.legend };
  const lines = joinChunks(def.chunks);
  const rows = lines.length;
  const cols = lines[0].length;
  const terrain: Terrain[][] = [];
  const entities: EntitySpawn[] = [];
  const spawns: Cell[] = [];
  const goals: Cell[] = [];
  for (let row = 0; row < rows; row++) {
    const line: Terrain[] = [];
    for (let col = 0; col < cols; col++) {
      const ch = lines[row][col];
      const entry: LegendEntry | undefined = legend[ch];
      if (!entry) throw new Error(`unknown map char '${ch}' at col ${col}, row ${row}`);
      if ('terrain' in entry) {
        line.push(entry.terrain);
        continue;
      }
      line.push('air');
      if (entry.entity.type === 'spawn') spawns.push({ col, row });
      else if (entry.entity.type === 'goal') goals.push({ col, row });
      entities.push({ spec: entry.entity, col, row });
    }
    terrain.push(line);
  }
  return { cols, rows, terrain, entities, spawn: single(spawns, 'spawn (S)'), goal: single(goals, 'goal (G)') };
}

/** Cells that block movement like terrain: ? blocks and crates are sprites but solid. */
export function solidEntityCells(level: ParsedLevel): Set<string> {
  const out = new Set<string>();
  for (const e of level.entities) {
    if (e.spec.type === 'qblock' || e.spec.type === 'crate') out.add(`${e.col},${e.row}`);
  }
  return out;
}
