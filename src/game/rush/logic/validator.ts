/**
 * Fairness VALIDATOR of the generated road (BRIEF §8). Everything lives on "d", the distance
 * the truck has driven: traffic moves a fixed fraction of the truck's travel, so the lane
 * occupancy below is exact whatever the player does with FRENA (braking only makes lane
 * changes cheaper in road terms) and POPCORN SPRINT (it shortens the change by the same factor).
 *
 * The road is a grid of CELL px per lane. A Block says "this lane is unsafe for the truck
 * while d is in [from, to]" and "a player can know it from d = vis" (it is on screen
 * warnMs before contact, minus the reaction time). A lane change takes CHANGE_CELLS cells and
 * needs both lanes free meanwhile; a second change may follow right after (no double moves).
 *
 * staysFair(): a player in a state that is safe given what is on screen must never be doomed by
 * what appears next. Checked at every reveal: every state safe before it (settled, or landing
 * from a change already under way) must still be safe after it. By induction a player who
 * reacts to the screen always has a way through, and so does the oracle bot of the tests.
 */
import { RUSH_FAIR, RUSH_POWERS, RUSH_SPEED, RUSH_TRUCK } from '../../../config/rush';
import type { Lane } from './types';

export interface Block {
  readonly lane: Lane;
  readonly from: number;
  readonly to: number;
  readonly vis: number;
  /** id of the entity that causes it (delivery zones: their own id, for the hand-off window) */
  readonly owner: number;
}

export const CELL = RUSH_FAIR.cellPx;
export const LANE_IDS: readonly Lane[] = [0, 1, 2];

const TOP_BASE = Math.max(...Object.values(RUSH_SPEED.base));
/** cells of the slowest standard change at the top base speed, +1: it may start anywhere in a cell */
export const CHANGE_CELLS = Math.ceil((RUSH_TRUCK.changeMs * TOP_BASE) / 1000 / CELL) + 1;

export function cellOf(d: number): number {
  return Math.floor(d / CELL);
}

/** Road between "the player can know it" and contact: warning at base speed minus reaction at sprint speed. */
export function revealLeadPx(base: number): number {
  return ((RUSH_FAIR.warnMs - RUSH_FAIR.reactMs * RUSH_POWERS.sprintMul) / 1000) * base;
}

/** Safe settled states over a window of cells, from the blocks accepted by `use`. */
export class SafeTable {
  /** cells >= end are free and safe */
  readonly end: number;
  private readonly pre: Int32Array[] = [];
  private readonly ok: Uint8Array[] = [];

  constructor(
    blocks: readonly Block[],
    readonly start: number,
    use: (b: Block) => boolean = () => true,
  ) {
    let end = start + 1;
    for (const b of blocks) if (use(b)) end = Math.max(end, cellOf(b.to) + 1);
    this.end = end;
    const n = end - start;
    const hit = LANE_IDS.map(() => new Uint8Array(n));
    for (const b of blocks) {
      if (!use(b)) continue;
      const a = Math.max(start, cellOf(b.from));
      const z = cellOf(b.to);
      for (let c = a; c <= z; c++) hit[b.lane][c - start] = 1;
    }
    for (const l of LANE_IDS) {
      const pre = new Int32Array(n + 1);
      for (let i = 0; i < n; i++) pre[i + 1] = pre[i] + hit[l][i];
      this.pre.push(pre);
      this.ok.push(new Uint8Array(n));
    }
    for (let i = n - 1; i >= 0; i--) {
      const c = start + i;
      for (const l of LANE_IDS) this.ok[l][i] = hit[l][i] === 0 && (this.safe(l, c + 1) || this.canChange(l, c)) ? 1 : 0;
    }
  }

  /** No blocked cell of `lane` in [a, b). Cells outside the window count as free. */
  free(lane: number, a: number, b: number): boolean {
    const lo = Math.max(a, this.start) - this.start;
    const hi = Math.min(b, this.end) - this.start;
    return hi <= lo || this.pre[lane][hi] === this.pre[lane][lo];
  }

  /** Settled in `lane` at `cell` there is a way through everything this table knows. */
  safe(lane: number, cell: number): boolean {
    if (cell >= this.end) return true;
    return cell >= this.start && this.ok[lane][cell - this.start] === 1;
  }

  /** Starting a change from `lane` at `cell` towards `to` lands safely. */
  changeOk(lane: number, to: number, cell: number): boolean {
    if (to < 0 || to > 2) return false;
    const z = cell + CHANGE_CELLS;
    return this.free(lane, cell, z) && this.free(to, cell, z) && this.safe(to, z);
  }

  private canChange(lane: number, cell: number): boolean {
    return this.changeOk(lane, lane - 1, cell) || this.changeOk(lane, lane + 1, cell);
  }
}

/** Is the road still fair once `added` joins `existing`? (see the file header) */
export function staysFair(existing: readonly Block[], added: readonly Block[]): boolean {
  if (added.length === 0) return true;
  let first = Infinity;
  for (const b of added) first = Math.min(first, cellOf(b.vis));
  return firstUnfair(existing.concat(added), first) === null;
}

/** First reveal cell >= fromCell that dooms a state safe just before it; null = fair. */
export function firstUnfair(blocks: readonly Block[], fromCell: number): number | null {
  const reveals = [...new Set(blocks.map((b) => cellOf(b.vis)).filter((c) => c >= fromCell))].sort((a, b) => a - b);
  if (reveals.length === 0) return null;
  let before = new SafeTable(blocks, reveals[0] - CHANGE_CELLS, (b) => cellOf(b.vis) < reveals[0]);
  for (const r of reveals) {
    const after = new SafeTable(blocks, r - CHANGE_CELLS, (b) => cellOf(b.vis) <= r);
    if (!keepsSafe(before, after, r)) return r;
    before = after;
  }
  return null;
}

function keepsSafe(before: SafeTable, after: SafeTable, r: number): boolean {
  for (const l of LANE_IDS) if (before.safe(l, r) && !after.safe(l, r)) return false;
  // a change already under way at r lands in (r, r + CHANGE_CELLS)
  for (let q = r + 1; q < r + CHANGE_CELLS; q++) {
    for (const m of LANE_IDS) {
      if (!before.safe(m, q) || after.safe(m, q)) continue;
      const from = q - CHANGE_CELLS;
      const arrives = [m - 1, m + 1].some((l) => l >= 0 && l <= 2 && after.free(l, from, q) && after.free(m, from, q));
      if (arrives) return false;
    }
  }
  return true;
}

/** Any block of `lane` overlapping [from, to]. */
export function laneBusy(blocks: readonly Block[], lane: Lane, from: number, to: number): boolean {
  return blocks.some((b) => b.lane === lane && b.to >= from && b.from <= to);
}
