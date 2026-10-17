/**
 * Grid movement for CICCIO-MAN (pure, unit-tested). Actors move along corridor centre
 * lines with sub-tile precision; the x axis wraps through the side tunnel.
 *
 * Player: a buffered direction is taken as soon as it is legal — reversing at any time,
 * turning anywhere inside the tile (pre-turn / post-turn cornering: the old axis is
 * re-centred while moving on the new one, so cutting corners is slightly faster).
 * Ghosts: one decision per tile centre, chosen by the caller.
 */
import type { Dir4 } from '../../contracts';
import { DIRV, OPPOSITE, TILE, centerOf, tileOf, wrapX } from './layout';

export interface Mover {
  x: number;
  y: number;
  dir: Dir4;
  /** false while the player is stopped against a wall */
  moving: boolean;
}

export type OpenFn = (c: number, r: number) => boolean;

/** Max distance from the tile centre at which the player may start a turn (px). */
export const CORNER_PX = 4;

const EPS = 1e-6;

function axisOffset(m: Mover, dir: Dir4): number {
  return DIRV[dir].x !== 0 ? m.x - centerOf(tileOf(m.x)) : m.y - centerOf(tileOf(m.y));
}

/** Applies a wanted direction if it is legal right now. Returns true when the direction changed. */
export function tryTurn(m: Mover, want: Dir4 | null, open: OpenFn): boolean {
  if (!want || (want === m.dir && m.moving)) return false;
  const c = tileOf(m.x);
  const r = tileOf(m.y);
  const v = DIRV[want];
  if (!open(c + v.x, r + v.y)) {
    // reversing inside a corridor is always legal, even before the tile centre
    if (want === OPPOSITE[m.dir] && m.moving) {
      m.dir = want;
      return true;
    }
    return false;
  }
  if (want !== OPPOSITE[m.dir] && want !== m.dir && Math.abs(axisOffset(m, m.dir)) > CORNER_PX) return false;
  m.dir = want;
  m.moving = true;
  return true;
}

/** Moves the player `dist` px: stops on the centre of a tile facing a wall, re-centres the cross axis. */
export function stepPlayer(m: Mover, dist: number, open: OpenFn): void {
  if (!m.moving || dist <= 0) return;
  const v = DIRV[m.dir];
  const c = tileOf(m.x);
  const r = tileOf(m.y);
  const blocked = !open(c + v.x, r + v.y);
  if (v.x !== 0) {
    const cx = centerOf(c);
    let nx = m.x + v.x * dist;
    if (blocked && (nx - cx) * v.x >= 0 && (m.x - cx) * v.x <= EPS) {
      nx = cx;
      m.moving = false;
    }
    m.x = wrapX(nx);
    m.y = approach(m.y, centerOf(r), dist);
  } else {
    const cy = centerOf(r);
    let ny = m.y + v.y * dist;
    if (blocked && (ny - cy) * v.y >= 0 && (m.y - cy) * v.y <= EPS) {
      ny = cy;
      m.moving = false;
    }
    m.y = ny;
    m.x = wrapX(approach(m.x, centerOf(c), dist));
  }
}

function approach(v: number, target: number, step: number): number {
  return v < target ? Math.min(target, v + step) : Math.max(target, v - step);
}

/**
 * Moves a ghost `dist` px along its direction; at every tile centre it reaches, `decide`
 * picks the next direction (the ghost is snapped to the centre first).
 */
export function stepGhost(m: Mover, dist: number, decide: (c: number, r: number, dir: Dir4) => Dir4): void {
  let rem = dist;
  for (let guard = 0; rem > EPS && guard < 8; guard++) {
    const v = DIRV[m.dir];
    const horiz = v.x !== 0;
    const pos = horiz ? m.x : m.y;
    const sgn = horiz ? v.x : v.y;
    const cc = centerOf(tileOf(pos));
    const target = sgn > 0 ? (pos < cc - EPS ? cc : cc + TILE) : pos > cc + EPS ? cc : cc - TILE;
    const d = Math.abs(target - pos);
    if (d > rem) {
      if (horiz) m.x = wrapX(m.x + sgn * rem);
      else m.y += sgn * rem;
      return;
    }
    rem -= d;
    if (horiz) m.x = wrapX(target);
    else m.y = target;
    m.dir = decide(tileOf(m.x), tileOf(m.y), m.dir);
  }
}
