/** ?debug=1 automation hooks for level 4: window.__game = { state, eatAll, power, win, hurt, place }. */
import { centerOf } from './layout';
import type { MazeRun } from './run';

export interface MazeDebugState {
  phase: string;
  x: number;
  y: number;
  tile: { c: number; r: number };
  dir: string;
  moving: boolean;
  hearts: number;
  score: number;
  timeMs: number;
  dotsLeft: number;
  frightMs: number;
  ghosts: { name: string; x: number; y: number; state: string; frightened: boolean }[];
}

export interface MazeDebugApi {
  state(): MazeDebugState;
  /** eat every nugget + stick (the hole opens after the flash) */
  eatAll(): void;
  /** as if a provola stick was eaten */
  power(): void;
  /** clear the board if needed and drop Ciccio into the hole */
  win(): void;
  /** a ghost catches Ciccio */
  hurt(): void;
  /** put Ciccio on a tile centre */
  place(c: number, r: number): void;
}

type DebugWindow = { __game?: MazeDebugApi };

export function debugEnabled(): boolean {
  return new URLSearchParams(window.location.search).has('debug');
}

export function installMazeDebug(run: MazeRun): void {
  if (!debugEnabled()) return;
  const api: MazeDebugApi = {
    state: () => ({
      phase: run.phase,
      x: Math.round(run.ciccio.m.x * 10) / 10,
      y: Math.round(run.ciccio.m.y * 10) / 10,
      tile: run.ciccio.tile,
      dir: run.ciccio.m.dir,
      moving: run.ciccio.m.moving,
      hearts: run.hearts,
      score: run.score,
      timeMs: Math.round(run.timeMs),
      dotsLeft: run.board.remaining,
      frightMs: Math.round(run.frightMs),
      ghosts: run.ghosts.map((g) => ({ name: g.name, x: Math.round(g.m.x), y: Math.round(g.m.y), state: g.state, frightened: g.frightened })),
    }),
    eatAll: () => run.eatAll(),
    power: () => run.startFright(),
    win: () => {
      if (run.phase === 'play') run.eatAll();
      if (run.phase === 'cleared') run.openHole();
      run.win();
    },
    hurt: () => run.die(),
    place: (c, r) => Object.assign(run.ciccio.m, { x: centerOf(c), y: centerOf(r), moving: true }),
  };
  (window as unknown as DebugWindow).__game = api;
}

export function uninstallMazeDebug(): void {
  delete (window as unknown as DebugWindow).__game;
}
