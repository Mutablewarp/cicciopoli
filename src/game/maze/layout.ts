/**
 * CICCIO-MAN board: an original symmetric 28x31 maze of 8 px cells (224x248 world px).
 * Pure data + parsing (no Phaser) — shared by the gameplay and by the art pack that
 * pre-renders the walls.
 *
 * Legend: '#' wall · '.' nugget · 'o' provola stick · ' ' empty corridor ·
 *         '-' ghost-house door · '_' ghost-house floor.
 */
import type { Dir4 } from '../../contracts';

export const TILE = 8;
export const COLS = 28;
export const ROWS = 31;
export const MAZE_W = COLS * TILE;
export const MAZE_H = ROWS * TILE;
/** Two side tunnels that wrap around, just above and just below the ghost house. */
export const TUNNEL_ROWS: readonly number[] = [11, 17];

/**
 * Left half; the right half is its mirror image. Ciccio's own board (not the arcade one):
 * the printed logo tray on top, two wrap-around tunnels hugging the ghost house and a
 * side tray between them, stacked flat trays above, a lone side lane below.
 */
const LEFT: readonly string[] = [
  '##############',
  '#.............',
  '#.###.######.#',
  '#o###.######.#',
  '#.###.######.#',
  '#.............',
  '#.#######.####',
  '#.#######.####',
  '#.........####',
  '#.####### ####',
  '#.####### ####',
  '              ',
  '###.#####.###-',
  '###.#####.#___',
  '###.#####.#___',
  '###.#####.#___',
  '###.#####.####',
  '              ',
  '###.##### ####',
  '###.##### ####',
  '#.............',
  '#.###.######.#',
  '#.###.######.#',
  '#.....###.... ',
  '###.#####.####',
  '###.#####.####',
  '#o............',
  '#.####.####.##',
  '#.####.####.##',
  '#.............',
  '##############',
];

export const MAZE_ROWS: readonly string[] = LEFT.map((l) => l + [...l].reverse().join(''));

export type Cell = 'wall' | 'dot' | 'power' | 'empty' | 'door' | 'house';

const CELL_OF: Readonly<Record<string, Cell>> = { '#': 'wall', '.': 'dot', o: 'power', ' ': 'empty', '-': 'door', _: 'house' };

export interface TilePos {
  c: number;
  r: number;
}

export interface MazeGrid {
  readonly cols: number;
  readonly rows: number;
  /** Out-of-board cells are walls, except along the tunnel rows which wrap around. */
  cell(c: number, r: number): Cell;
  /** Corridor cell (player and roaming ghosts). The door and the house are not corridors. */
  open(c: number, r: number): boolean;
  readonly dots: readonly TilePos[];
  readonly powers: readonly TilePos[];
}

export function parseMaze(rows: readonly string[]): MazeGrid {
  const h = rows.length;
  const w = rows[0]?.length ?? 0;
  const cells: Cell[] = [];
  const dots: TilePos[] = [];
  const powers: TilePos[] = [];
  rows.forEach((row, r) => {
    if (row.length !== w) throw new Error(`maze row ${r} has ${row.length} cells, expected ${w}`);
    [...row].forEach((ch, c) => {
      const kind = CELL_OF[ch];
      if (!kind) throw new Error(`maze: unknown cell '${ch}' at ${c},${r}`);
      cells.push(kind);
      if (kind === 'dot') dots.push({ c, r });
      if (kind === 'power') powers.push({ c, r });
    });
  });
  const cell = (c: number, r: number): Cell => {
    if (r < 0 || r >= h) return 'wall';
    if (c < 0 || c >= w) {
      if (!TUNNEL_ROWS.includes(r)) return 'wall';
      c = ((c % w) + w) % w;
    }
    return cells[r * w + c];
  };
  const open = (c: number, r: number): boolean => {
    const k = cell(c, r);
    return k === 'dot' || k === 'power' || k === 'empty';
  };
  return { cols: w, rows: h, cell, open, dots, powers };
}

export const MAZE: MazeGrid = parseMaze(MAZE_ROWS);

/* -------------------------------------------------------------- geometry */

export const tileOf = (v: number): number => Math.floor(v / TILE);
export const centerOf = (t: number): number => t * TILE + TILE / 2;
export const wrapX = (x: number): number => ((x % MAZE_W) + MAZE_W) % MAZE_W;

export const DIRV: Readonly<Record<Dir4, { x: -1 | 0 | 1; y: -1 | 0 | 1 }>> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export const OPPOSITE: Readonly<Record<Dir4, Dir4>> = { up: 'down', down: 'up', left: 'right', right: 'left' };

/** Arcade tie-break order when two exits are equally good. */
export const DIR_ORDER: readonly Dir4[] = ['up', 'left', 'down', 'right'];

/** Ghost house: door between cols 13/14 on row 12, floor rows 13-15 / cols 11-16. */
export const HOUSE = {
  doorX: 112, // x between the two door cells
  exitY: centerOf(11), // corridor right above the door
  floorY: centerOf(14),
  bobTop: centerOf(14) - 4,
  bobBottom: centerOf(14) + 4,
  homeTile: { c: 13, r: 11 },
} as const;

/** Spawn points (world px, sprite centres). */
export const START = {
  ciccio: { x: 112, y: centerOf(23) },
  pickle: { x: HOUSE.doorX, y: HOUSE.exitY },
  chili: { x: HOUSE.doorX, y: HOUSE.floorY },
  demon: { x: HOUSE.doorX - 16, y: HOUSE.floorY },
  burger: { x: HOUSE.doorX + 16, y: HOUSE.floorY },
} as const;

/** Under the house: "PRONTI!" / "VAI IN BUCA!" captions and the bonus food. */
export const CENTRE_SPOT = { x: 112, y: centerOf(17) } as const;
/** The golf hole that opens once every nugget is eaten (centre column, row 20). */
export const HOLE_SPOT = { x: 112, y: centerOf(20) } as const;
