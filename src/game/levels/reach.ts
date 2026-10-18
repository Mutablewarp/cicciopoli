/**
 * Level validation (pure, used by unit tests): replays the real motor on a tiny
 * box-vs-grid physics model to prove the goal is reachable from the spawn, and checks
 * the geometry rules (pit width, clearance under platforms for the grown Brie hero).
 */
import { TILE } from '../../art/keys';
import type { MoveParams } from '../../config/tuning';
import { createMotor, type MotorInput, NO_INPUT, stepPlatformer } from '../player/motor';
import { solidEntityCells } from './parse';
import type { Cell, ParsedLevel } from './types';

export const DT = 1 / 60;
const EPS = 0.001;

export interface Grid {
  cols: number;
  rows: number;
  solid(col: number, row: number): boolean;
  plat(col: number, row: number): boolean;
}

/** `smashSolid`: level 5 bricks / crates / barrels still standing (false = already smashed). */
export function makeGrid(level: ParsedLevel, smashSolid = false): Grid {
  const extra = solidEntityCells(level, smashSolid);
  const at = (col: number, row: number): string => {
    if (col < 0 || col >= level.cols) return 'block'; // world bounds act as walls
    if (row < 0 || row >= level.rows) return 'air';
    return extra.has(`${col},${row}`) ? 'block' : level.terrain[row][col];
  };
  return {
    cols: level.cols,
    rows: level.rows,
    solid: (c, r) => {
      const t = at(c, r);
      return t === 'ground' || t === 'block';
    },
    plat: (c, r) => at(c, r) === 'plat',
  };
}

export interface Box {
  x: number;
  bottom: number;
  w: number;
  h: number;
}

function colsOf(b: Box): [number, number] {
  return [Math.floor((b.x - b.w / 2) / TILE), Math.floor((b.x + b.w / 2 - EPS) / TILE)];
}

function hitsSolid(g: Grid, b: Box): boolean {
  const [c0, c1] = colsOf(b);
  const r0 = Math.floor((b.bottom - b.h) / TILE);
  const r1 = Math.floor((b.bottom - EPS) / TILE);
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) if (g.solid(c, r)) return true;
  return false;
}

/** True if something walkable is directly under the feet. */
export function supported(g: Grid, b: Box): boolean {
  if (Math.abs(b.bottom / TILE - Math.round(b.bottom / TILE)) > EPS) return false;
  const row = Math.round(b.bottom / TILE);
  const [c0, c1] = colsOf(b);
  for (let c = c0; c <= c1; c++) if (g.solid(c, row) || g.plat(c, row)) return true;
  return false;
}

export function moveX(g: Grid, b: Box, vx: number): boolean {
  b.x += vx * DT;
  if (!hitsSolid(g, b)) return false;
  if (vx > 0) b.x = Math.floor((b.x + b.w / 2) / TILE) * TILE - b.w / 2;
  else b.x = Math.ceil((b.x - b.w / 2) / TILE) * TILE + b.w / 2;
  return true;
}

/** Returns 'land', 'bonk' or null. Moves < 1 tile per step, so one boundary at most. */
export function moveY(g: Grid, b: Box, vy: number): 'land' | 'bonk' | null {
  const prevBottom = b.bottom;
  b.bottom += vy * DT;
  const [c0, c1] = colsOf(b);
  if (vy > 0) {
    const top = Math.floor(b.bottom / TILE) * TILE;
    if (prevBottom > top + EPS || b.bottom <= top) return null;
    const row = top / TILE;
    for (let c = c0; c <= c1; c++) {
      if (g.solid(c, row) || g.plat(c, row)) {
        b.bottom = top;
        return 'land';
      }
    }
    return null;
  }
  const prevTop = prevBottom - b.h;
  const newTop = b.bottom - b.h;
  const edgeY = Math.ceil(newTop / TILE) * TILE;
  if (edgeY > prevTop + EPS || newTop >= edgeY) return null;
  const row = edgeY / TILE - 1;
  for (let c = c0; c <= c1; c++) {
    if (g.solid(c, row)) {
      b.bottom = edgeY + b.h;
      return 'bonk';
    }
  }
  return null;
}

export interface JumpPlan {
  dir: -1 | 0 | 1;
  /** start already at run speed */
  running: boolean;
  /** steps the direction is held (then released) */
  axisSteps: number;
  jump: boolean;
}

/** Simulates one action from a standing position; returns where it lands (or null = pit). */
export function simulate(g: Grid, start: Box, plan: JumpPlan, p: MoveParams, maxSteps = 300): Box | null {
  const b: Box = { ...start };
  const s = createMotor();
  s.vx = plan.running ? plan.dir * p.runMax : 0;
  let onGround = true;
  let airborne = false;
  for (let i = 0; i < maxSteps; i++) {
    const inp: MotorInput = {
      ...NO_INPUT,
      axis: i < plan.axisSteps ? plan.dir : 0,
      jumpPressed: plan.jump && i === 0,
      jumpHeld: plan.jump,
    };
    stepPlatformer(s, inp, onGround, DT, p);
    if (moveX(g, b, s.vx)) s.vx = 0;
    const hit = moveY(g, b, s.vy);
    if (hit === 'bonk') s.vy = 0;
    onGround = hit === 'land' || (s.vy >= 0 && supported(g, b));
    if (onGround) s.vy = 0;
    else airborne = true;
    if (onGround && airborne) return b;
    if (b.bottom - b.h > g.rows * TILE) return null;
  }
  return null;
}

const PLANS: JumpPlan[] = (() => {
  const out: JumpPlan[] = [{ dir: 0, running: false, axisSteps: 0, jump: true }];
  for (const dir of [-1, 1] as const) {
    for (const running of [false, true]) {
      for (const axisSteps of [6, 14, 22, 30, 999]) out.push({ dir, running, axisSteps, jump: true });
    }
    out.push({ dir, running: true, axisSteps: 999, jump: false });
  }
  return out;
})();

function headroom(g: Grid, col: number, row: number, h: number): boolean {
  for (let k = 1; k <= Math.ceil(h / TILE); k++) if (g.solid(col, row - k)) return false;
  return true;
}

export function standable(g: Grid, col: number, row: number, h: number): boolean {
  return (g.solid(col, row) || g.plat(col, row)) && headroom(g, col, row, h);
}

/** Standing cell (column under the box centre, nudged onto the supporting tile). */
export function standCell(g: Grid, b: Box): Cell {
  const row = Math.round(b.bottom / TILE);
  const col = Math.floor(b.x / TILE);
  if (g.solid(col, row) || g.plat(col, row)) return { col, row };
  const [c0, c1] = colsOf(b);
  return { col: g.solid(c0, row) || g.plat(c0, row) ? c0 : c1, row };
}

export interface BodySize {
  w: number;
  h: number;
}

/** Breadth-first search over standing cells; `row` is the surface tile row under the feet. */
export function reachableCells(g: Grid, spawn: Cell, p: MoveParams, body: BodySize): Set<string> {
  const seen = new Set<string>();
  const queue: Cell[] = [];
  const push = (c: Cell): void => {
    const k = `${c.col},${c.row}`;
    if (seen.has(k)) return;
    seen.add(k);
    queue.push(c);
  };
  push(spawn);
  while (queue.length > 0) {
    const cur = queue.shift() as Cell;
    for (const dc of [-1, 1]) {
      if (standable(g, cur.col + dc, cur.row, body.h)) push({ col: cur.col + dc, row: cur.row });
    }
    const start: Box = { x: cur.col * TILE + TILE / 2, bottom: cur.row * TILE, w: body.w, h: body.h };
    for (const plan of PLANS) {
      const end = simulate(g, start, plan, p);
      if (end) push(standCell(g, end));
    }
  }
  return seen;
}

/** Pits: maximal runs of columns with no ground/block anywhere. Returns their widths. */
export function pitWidths(level: ParsedLevel): number[] {
  const out: number[] = [];
  let run = 0;
  for (let c = 0; c < level.cols; c++) {
    const hasFloor = level.terrain.some((line) => line[c] === 'ground' || line[c] === 'block');
    if (hasFloor) {
      if (run > 0) out.push(run);
      run = 0;
    } else run++;
  }
  if (run > 0) out.push(run);
  return out;
}

export interface ClearanceIssue {
  col: number;
  surfaceRow: number;
  gapPx: number;
}

/**
 * Wherever the hero can stand, the nearest thing overhead must be either absent or at
 * least `minPx` above the feet, so Brie-sized Ciccio never jams under a platform.
 */
export function clearanceIssues(level: ParsedLevel, minPx: number): ClearanceIssue[] {
  const g = makeGrid(level);
  const issues: ClearanceIssue[] = [];
  for (let c = 0; c < level.cols; c++) {
    for (let r = 1; r < level.rows; r++) {
      const surface = g.solid(c, r) || g.plat(c, r);
      if (!surface || g.solid(c, r - 1) || g.plat(c, r - 1)) continue;
      let q = r - 1;
      while (q >= 0 && !g.solid(c, q) && !g.plat(c, q)) q--;
      if (q < 0) continue;
      const gapPx = (r - q - 1) * TILE;
      if (gapPx < minPx) issues.push({ col: c, surfaceRow: r, gapPx });
    }
  }
  return issues;
}
