import { describe, expect, it } from 'vitest';
import {
  FRIGHT_MS,
  ModeTimer,
  MODE_SCHEDULE,
  SCATTER,
  chaseTarget,
  chooseRandom,
  chooseToward,
  exits,
  frightFlashWhite,
  ghostEatPoints,
  targetFor,
} from './ai';
import { CENTRE_SPOT, COLS, HOLE_SPOT, HOUSE, MAZE, MAZE_ROWS, MAZE_W, ROWS, START, TUNNEL_ROW, centerOf, parseMaze, tileOf } from './layout';
import { CORNER_PX, stepGhost, stepPlayer, tryTurn, type Mover } from './movement';

const open = MAZE.open;

describe('maze layout', () => {
  it('is 28x31, mirror-symmetric, with ~240 nuggets and 4 provola sticks near the corners', () => {
    expect(MAZE.cols).toBe(COLS);
    expect(MAZE.rows).toBe(ROWS);
    for (const row of MAZE_ROWS) expect([...row].reverse().join('')).toBe(row);
    expect(MAZE.dots.length).toBeGreaterThanOrEqual(230);
    expect(MAZE.dots.length).toBeLessThanOrEqual(250);
    expect(MAZE.powers).toHaveLength(4);
    for (const p of MAZE.powers) {
      expect(Math.min(p.c, COLS - 1 - p.c)).toBeLessThanOrEqual(2);
      expect(Math.min(p.r, ROWS - 1 - p.r)).toBeLessThanOrEqual(5);
    }
  });

  it('has corridors one tile wide, no dead ends and one connected network', () => {
    const cells: [number, number][] = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (open(c, r)) cells.push([c, r]);
    for (const [c, r] of cells) {
      expect(open(c + 1, r) && open(c, r + 1) && open(c + 1, r + 1), `2x2 open at ${c},${r}`).toBe(false);
      const n = [open(c + 1, r), open(c - 1, r), open(c, r + 1), open(c, r - 1)].filter(Boolean).length;
      expect(n, `dead end at ${c},${r}`).toBeGreaterThanOrEqual(2);
    }
    const seen = new Set<string>();
    const stack: [number, number][] = [cells[0]];
    while (stack.length) {
      const [c, r] = stack.pop() as [number, number];
      const k = `${c},${r}`;
      if (seen.has(k) || !open(c, r)) continue;
      seen.add(k);
      stack.push([(c + 1) % COLS, r], [(c + COLS - 1) % COLS, r], [c, r + 1], [c, r - 1]);
    }
    expect(seen.size).toBe(cells.length);
  });

  it('treats out-of-board cells as walls except along the wrapping tunnel row', () => {
    expect(open(-1, TUNNEL_ROW)).toBe(true);
    expect(open(COLS, TUNNEL_ROW)).toBe(true);
    expect(open(-1, 1)).toBe(false);
    expect(MAZE.cell(13, 12)).toBe('door');
    expect(MAZE.cell(13, 14)).toBe('house');
    expect(open(13, 12)).toBe(false);
  });

  it('puts every spawn and the centre spot on corridors or inside the house', () => {
    expect(open(tileOf(START.ciccio.x - 1), tileOf(START.ciccio.y))).toBe(true);
    expect(open(tileOf(START.ciccio.x), tileOf(START.ciccio.y))).toBe(true);
    expect(open(tileOf(CENTRE_SPOT.x), tileOf(CENTRE_SPOT.y))).toBe(true);
    expect(open(tileOf(HOLE_SPOT.x - 1), tileOf(HOLE_SPOT.y)) && open(tileOf(HOLE_SPOT.x), tileOf(HOLE_SPOT.y))).toBe(true);
    expect(open(tileOf(HOUSE.doorX), tileOf(HOUSE.exitY))).toBe(true);
    for (const k of ['chili', 'demon', 'burger'] as const) expect(MAZE.cell(tileOf(START[k].x), tileOf(START[k].y))).toBe('house');
  });

  it('rejects malformed rows', () => {
    expect(() => parseMaze(['##', '#'])).toThrow();
    expect(() => parseMaze(['#x'])).toThrow();
  });
});

function mover(c: number, r: number, dir: Mover['dir'], moving = true): Mover {
  return { x: centerOf(c), y: centerOf(r), dir, moving };
}

describe('player movement', () => {
  it('stops exactly on the tile centre in front of a wall', () => {
    const m = mover(1, 1, 'up'); // wall above row 1
    stepPlayer(m, 3, open);
    expect(m.y).toBe(centerOf(1));
    expect(m.moving).toBe(false);
  });

  it('buffers a turn until the side opening, then pre-turns within the corner window', () => {
    // row 1 runs right from col 1; first opening downward is col 5
    const m = mover(2, 1, 'right');
    expect(tryTurn(m, 'down', open)).toBe(false); // wall below col 2
    let turned = false;
    for (let i = 0; i < 40 && !turned; i++) {
      turned = tryTurn(m, 'down', open);
      if (!turned) stepPlayer(m, 1, open);
    }
    expect(turned).toBe(true);
    expect(tileOf(m.x)).toBe(5);
    expect(m.x).toBeLessThan(centerOf(5)); // turned before reaching the centre
    expect(centerOf(5) - m.x).toBeLessThanOrEqual(CORNER_PX);
    stepPlayer(m, 2, open);
    stepPlayer(m, 2, open);
    expect(m.x).toBe(centerOf(5)); // cross axis re-centred while moving down
    expect(m.y).toBeGreaterThan(centerOf(1));
  });

  it('reverses instantly in mid-corridor', () => {
    const m = mover(3, 1, 'right');
    stepPlayer(m, 2, open);
    expect(tryTurn(m, 'left', open)).toBe(true);
    stepPlayer(m, 1, open);
    expect(m.x).toBe(centerOf(3) + 1);
  });

  it('wraps through the side tunnel', () => {
    const m = mover(0, TUNNEL_ROW, 'left');
    stepPlayer(m, 6, open);
    expect(m.x).toBeCloseTo(MAZE_W - 2);
    expect(m.moving).toBe(true);
    const n = mover(COLS - 1, TUNNEL_ROW, 'right');
    stepPlayer(n, 6, open);
    expect(n.x).toBeCloseTo(2);
  });
});

describe('ghost movement', () => {
  it('decides once per tile centre and keeps sub-tile progress', () => {
    const g = mover(1, 1, 'right');
    const calls: string[] = [];
    stepGhost(g, 8 * 3 + 2, (c, r, d) => {
      calls.push(`${c},${r}`);
      return d;
    });
    expect(calls).toEqual(['2,1', '3,1', '4,1']);
    expect(g.x).toBe(centerOf(4) + 2);
  });

  it('starts from between two tiles (house exit) and wraps in the tunnel', () => {
    const g: Mover = { x: HOUSE.doorX, y: HOUSE.exitY, dir: 'left', moving: true };
    const seen: number[] = [];
    stepGhost(g, 4, (c, _r, d) => {
      seen.push(c);
      return d;
    });
    expect(seen).toEqual([13]);
    const t = mover(0, TUNNEL_ROW, 'left');
    stepGhost(t, 8, (_c, _r, d) => d);
    expect(t.x).toBe(centerOf(COLS - 1));
  });
});

describe('ghost targeting', () => {
  const view = { ciccio: { c: 10, r: 20 }, ciccioDir: 'up' as const, pickle: { c: 4, r: 26 } };

  it('pickle chases Ciccio, chili ambushes 4 tiles ahead', () => {
    expect(chaseTarget('pickle', { c: 0, r: 0 }, view)).toEqual({ c: 10, r: 20 });
    expect(chaseTarget('chili', { c: 0, r: 0 }, view)).toEqual({ c: 10, r: 16 });
    expect(chaseTarget('chili', { c: 0, r: 0 }, { ...view, ciccioDir: 'left' })).toEqual({ c: 6, r: 20 });
  });

  it('demon doubles the vector from the pickle through 2 tiles ahead of Ciccio', () => {
    // two ahead = (10,18); pickle (4,26) -> (10,18) doubled = (16,10)
    expect(chaseTarget('demon', { c: 0, r: 0 }, view)).toEqual({ c: 16, r: 10 });
  });

  it('burger chases from far away and turns shy within 8 tiles', () => {
    expect(chaseTarget('burger', { c: 10, r: 2 }, view)).toEqual(view.ciccio);
    expect(chaseTarget('burger', { c: 12, r: 22 }, view)).toEqual(SCATTER.burger);
  });

  it('scatter mode always heads for the home corner', () => {
    for (const n of ['pickle', 'chili', 'demon', 'burger'] as const) expect(targetFor(n, 'scatter', { c: 5, r: 5 }, view)).toEqual(SCATTER[n]);
  });

  it('never reverses by choice and breaks ties up > left > down > right', () => {
    // row 5 col 5 is a crossroads; moving right, target straight up
    expect(exits(5, 5, 'right', open)).toEqual(['up', 'down', 'right']);
    expect(chooseToward(5, 5, 'right', { c: 5, r: -10 }, open)).toBe('up');
    expect(chooseToward(5, 5, 'right', { c: 5, r: 5 }, open)).toBe('up'); // tie: up/down/right equal
    expect(chooseToward(5, 5, 'right', { c: 30, r: 5 }, open)).toBe('right');
    const r = chooseRandom(5, 5, 'right', open, () => 0.99);
    expect(r).toBe('right');
  });
});

describe('modes and frightened timing', () => {
  it('follows the scatter/chase schedule and then chases forever', () => {
    const t = new ModeTimer();
    expect(t.mode).toBe('scatter');
    expect(t.tick(MODE_SCHEDULE[0] - 1)).toBe(false);
    expect(t.tick(1)).toBe(true);
    expect(t.mode).toBe('chase');
    for (let i = 1; i < MODE_SCHEDULE.length; i++) t.tick(MODE_SCHEDULE[i]);
    expect(t.mode).toBe('chase');
    expect(t.tick(10 * 60 * 1000)).toBe(false);
    t.reset();
    expect(t.mode).toBe('scatter');
  });

  it('scores 200/400/800/1600 and flashes white only near the end', () => {
    expect([0, 1, 2, 3, 4].map(ghostEatPoints)).toEqual([200, 400, 800, 1600, 1600]);
    expect(frightFlashWhite(FRIGHT_MS)).toBe(false);
    expect(frightFlashWhite(3000)).toBe(false);
    const flashes = new Set<boolean>();
    for (let ms = 2000; ms > 0; ms -= 50) flashes.add(frightFlashWhite(ms));
    expect(flashes).toEqual(new Set([true, false]));
    expect(frightFlashWhite(0)).toBe(false);
  });
});
