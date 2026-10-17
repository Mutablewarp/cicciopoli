/**
 * Ghost brains (pure, unit-tested): scatter/chase schedule, the four chase personalities
 * and the arcade "pick the exit closest to the target" rule.
 */
import type { Dir4 } from '../../contracts';
import { DIRV, DIR_ORDER, OPPOSITE, type TilePos } from './layout';
import type { OpenFn } from './movement';

export type GhostName = 'pickle' | 'chili' | 'demon' | 'burger';
export const GHOST_NAMES: readonly GhostName[] = ['pickle', 'chili', 'demon', 'burger'];

export type GlobalMode = 'scatter' | 'chase';

/** Scatter corners, just outside the board so ghosts circle the corner blocks. */
export const SCATTER: Readonly<Record<GhostName, TilePos>> = {
  pickle: { c: 25, r: -3 },
  chili: { c: 2, r: -3 },
  demon: { c: 27, r: 31 },
  burger: { c: 0, r: 31 },
};

/** Burger corazzato turns shy inside this many tiles of Ciccio. */
export const SHY_TILES = 8;

export interface ChaseView {
  ciccio: TilePos;
  ciccioDir: Dir4;
  /** pickle (Sottaceto) tile — the demon flanks relative to it */
  pickle: TilePos;
}

/** Chase target of each personality; `self` is the ghost's own tile. */
export function chaseTarget(name: GhostName, self: TilePos, v: ChaseView): TilePos {
  const d = DIRV[v.ciccioDir];
  switch (name) {
    case 'pickle':
      return v.ciccio;
    case 'chili':
      return { c: v.ciccio.c + d.x * 4, r: v.ciccio.r + d.y * 4 };
    case 'demon': {
      const pc = v.ciccio.c + d.x * 2;
      const pr = v.ciccio.r + d.y * 2;
      return { c: pc * 2 - v.pickle.c, r: pr * 2 - v.pickle.r };
    }
    case 'burger': {
      const dc = v.ciccio.c - self.c;
      const dr = v.ciccio.r - self.r;
      return dc * dc + dr * dr > SHY_TILES * SHY_TILES ? v.ciccio : SCATTER.burger;
    }
  }
}

export function targetFor(name: GhostName, mode: GlobalMode, self: TilePos, v: ChaseView): TilePos {
  return mode === 'scatter' ? SCATTER[name] : chaseTarget(name, self, v);
}

/** Legal exits from a tile centre: every open neighbour except going back. */
export function exits(c: number, r: number, dir: Dir4, open: OpenFn): Dir4[] {
  const out = DIR_ORDER.filter((d) => d !== OPPOSITE[dir] && open(c + DIRV[d].x, r + DIRV[d].y));
  return out.length > 0 ? out : [OPPOSITE[dir]];
}

/** Arcade rule: the exit whose next tile is closest (straight line) to the target; ties keep DIR_ORDER. */
export function chooseToward(c: number, r: number, dir: Dir4, target: TilePos, open: OpenFn): Dir4 {
  let best: Dir4 = OPPOSITE[dir];
  let bestD = Infinity;
  for (const d of exits(c, r, dir, open)) {
    const nc = c + DIRV[d].x - target.c;
    const nr = r + DIRV[d].y - target.r;
    const dist = nc * nc + nr * nr;
    if (dist < bestD) {
      bestD = dist;
      best = d;
    }
  }
  return best;
}

export function chooseRandom(c: number, r: number, dir: Dir4, open: OpenFn, rand: () => number): Dir4 {
  const opts = exits(c, r, dir, open);
  return opts[Math.min(opts.length - 1, Math.floor(rand() * opts.length))];
}

/* ------------------------------------------------------- scatter / chase */

/** Level-1 arcade schedule (ms): scatter, chase, scatter, chase, scatter, chase, scatter, chase… */
export const MODE_SCHEDULE: readonly number[] = [7000, 20000, 7000, 20000, 5000, 20000, 5000];

export class ModeTimer {
  private phase = 0;
  private elapsed = 0;

  get mode(): GlobalMode {
    return this.phase % 2 === 0 ? 'scatter' : 'chase';
  }

  /** Advances the clock; returns true when the mode flipped (ghosts must reverse). */
  tick(dtMs: number): boolean {
    if (this.phase >= MODE_SCHEDULE.length) return false;
    this.elapsed += dtMs;
    if (this.elapsed < MODE_SCHEDULE[this.phase]) return false;
    this.elapsed -= MODE_SCHEDULE[this.phase];
    this.phase++;
    return true;
  }

  reset(): void {
    this.phase = 0;
    this.elapsed = 0;
  }
}

/* ------------------------------------------------------------ frightened */

export const FRIGHT_MS = 6000;
/** Ghosts flash white during the last part of the fright. */
export const FRIGHT_FLASH_MS = 2000;
export const GHOST_EAT_POINTS: readonly number[] = [200, 400, 800, 1600];

export function ghostEatPoints(eatenThisPower: number): number {
  return GHOST_EAT_POINTS[Math.min(GHOST_EAT_POINTS.length - 1, eatenThisPower)];
}

/** True while the scared ghost should show the white frame (flashing near the end). */
export function frightFlashWhite(remainingMs: number): boolean {
  return remainingMs > 0 && remainingMs <= FRIGHT_FLASH_MS && Math.floor(remainingMs / 200) % 2 === 0;
}
