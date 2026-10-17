/**
 * Flight validation for lava levels (pure, used by unit tests). Replays the real FlightMode
 * on the same box-vs-grid model as reach.ts with a simple pilot: steer toward a target x,
 * climbing while the feet are below a cruise altitude (gliding otherwise); once over the
 * target let go of the direction and dive onto it.
 */
import { TILE } from '../../art/keys';
import type { FlightParams, MoveParams } from '../../config/tuning';
import { stepFlight } from '../player/flight';
import { createMotor } from '../player/motor';
import { type BodySize, type Box, DT, type Grid, moveX, moveY, standable, standCell, supported } from './reach';
import type { Cell, ParsedLevel } from './types';

export interface Island {
  left: number;
  right: number;
}

/** Maximal runs of columns that contain ground or blocks (one-way ledges do not count). */
export function islands(level: ParsedLevel): Island[] {
  const out: Island[] = [];
  let start = -1;
  for (let c = 0; c <= level.cols; c++) {
    const solid = c < level.cols && level.terrain.some((line) => line[c] === 'ground' || line[c] === 'block');
    if (solid && start < 0) start = c;
    if (!solid && start >= 0) {
      out.push({ left: start, right: c - 1 });
      start = -1;
    }
  }
  return out;
}

export interface FlightPlan {
  dir: -1 | 1;
  /** feet y the pilot climbs to before gliding */
  cruiseY: number;
  /** world x where the pilot stops steering and dives */
  stopX: number;
}

/** Takes off from a standing box and flies the plan; returns where it lands or null (lava / timeout). */
export function fly(g: Grid, start: Box, plan: FlightPlan, f: FlightParams, p: MoveParams, burnY: number, maxSteps = 1200): Box | null {
  const b: Box = { ...start };
  const s = createMotor();
  let onGround = true;
  let airborne = false;
  for (let i = 0; i < maxSteps; i++) {
    const over = plan.dir * (b.x - plan.stopX) >= 0;
    const axis: -1 | 0 | 1 = over ? 0 : plan.dir;
    const inp = { axis, jumpPressed: i === 0, jumpHeld: !over && b.bottom > plan.cruiseY, downHeld: over };
    stepFlight(s, inp, onGround, DT, f, p);
    s.vy = Math.max(s.vy, (f.ceilingY - (b.bottom - b.h)) / DT); // same ceiling rule as Player
    if (moveX(g, b, s.vx)) s.vx = 0;
    const hit = moveY(g, b, s.vy);
    if (hit === 'bonk') s.vy = 0;
    onGround = hit === 'land' || (s.vy >= 0 && supported(g, b));
    if (onGround) s.vy = 0;
    else airborne = true;
    if (onGround && airborne) return b;
    if (b.bottom > burnY) return null;
  }
  return null;
}

const CRUISE_ROWS = [3, 6, 9, 12];
/** farthest landing target the pilot aims at, tiles */
const RANGE = 32;

/** Centre x of every run of standable cells (island tops, ledges, block tops). */
function landingTargets(g: Grid, h: number): number[] {
  const xs: number[] = [];
  for (let r = 0; r < g.rows; r++) {
    let start = -1;
    for (let c = 0; c <= g.cols; c++) {
      const ok = c < g.cols && standable(g, c, r, h);
      if (ok && start < 0) start = c;
      if (!ok && start >= 0) {
        xs.push(((start + c) / 2) * TILE);
        start = -1;
      }
    }
  }
  return xs;
}

/** Breadth-first search over standing cells for a hero with wings. */
export function reachableByFlight(g: Grid, from: Cell, f: FlightParams, p: MoveParams, body: BodySize, burnY: number): Set<string> {
  const seen = new Set<string>();
  const queue: Cell[] = [];
  const push = (c: Cell): void => {
    const k = `${c.col},${c.row}`;
    if (seen.has(k)) return;
    seen.add(k);
    queue.push(c);
  };
  push(from);
  const targets = landingTargets(g, body.h);
  while (queue.length > 0) {
    const cur = queue.shift() as Cell;
    for (const dc of [-1, 1]) {
      if (standable(g, cur.col + dc, cur.row, body.h)) push({ col: cur.col + dc, row: cur.row });
    }
    const start: Box = { x: cur.col * TILE + TILE / 2, bottom: cur.row * TILE, w: body.w, h: body.h };
    for (const stopX of targets) {
      const dx = stopX - start.x;
      if (Math.abs(dx) < TILE || Math.abs(dx) > RANGE * TILE) continue;
      for (const row of CRUISE_ROWS) {
        const end = fly(g, start, { dir: dx < 0 ? -1 : 1, cruiseY: row * TILE, stopX }, f, p, burnY);
        if (end) push(standCell(g, end));
      }
    }
  }
  return seen;
}
