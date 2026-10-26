/**
 * v9 FRIES TRAILS (BRIEF §8 v9 point 3): lines of 5-8 fries laid just above the view on a route the
 * validator vouches for, a few per zone. A route = runs of >= 2 fries in one lane joined by one-lane
 * shifts (one fry halfway between the two lanes, picked from either). Checked on the SafeTable of
 * everything planned (hand-off windows included), like the oracle bot sees it:
 * - a fry in a lane: settled in that lane is safe on every cell where the fry can be picked;
 * - a shift: both lanes free from the fry before it to slackPx past the fry after it, and landing in
 *   the new lane safe anywhere in there, so following the line is a comfortable move, never a
 *   last-moment dodge (lane-change time = CHANGE_CELLS; braking only makes it cheaper on d).
 * Only where the truck can still get to the first fry from where it is now, ending a lane change +
 * slackPx before any traffic still to be planned could touch the truck (TrafficManager.horizon: no
 * trap at the end of the line), never while a delivery zone is up or due (Deliveries.zoneSoon).
 * Picking every fry of a line = CATENA.
 */
import { RUSH_ROAD, RUSH_TRAILS } from '../../../config/rush';
import { PICK_REACH } from './entity';
import { laneX } from './lanes';
import { pickWeighted, randInt, randRange, type Rng } from './rng';
import type { TrafficManager } from './traffic';
import type { Lane } from './types';
import { CELL, CHANGE_CELLS, LANE_IDS, SafeTable, cellOf } from './validator';

/** One fry of a route: in `lane`, or halfway from `lane` to `to` (a shift). */
interface Spot {
  readonly lane: Lane;
  readonly to: Lane | null;
}

interface Route {
  readonly spots: readonly Spot[];
  readonly shifts: number;
}

const spotX = (s: Spot): number => (s.to === null ? laneX(s.lane) : (laneX(s.lane) + laneX(s.to)) / 2);

/** Every route of n fries (memoised). */
const ROUTES = new Map<number, Route[]>();
function routes(n: number): Route[] {
  const known = ROUTES.get(n);
  if (known) return known;
  const out: Route[] = [];
  const grow = (spots: Spot[], lane: Lane, run: number, shifts: number): void => {
    if (spots.length === n) {
      if (run >= 2) out.push({ spots, shifts });
      return;
    }
    grow([...spots, { lane, to: null }], lane, run + 1, shifts);
    if (run < 2 || shifts >= RUSH_TRAILS.maxShifts) return;
    for (const to of [lane - 1, lane + 1]) if (to >= 0 && to <= 2) grow([...spots, { lane, to: to as Lane }], to as Lane, 0, shifts + 1);
  };
  for (const l of LANE_IDS) grow([], l, 0, 0);
  ROUTES.set(n, out);
  return out;
}

/** The route, its first fry meeting the truck at d0, keeps the truck safe all the way (see the file header). */
function safeRoute(t: SafeTable, r: Route, d0: number): boolean {
  const at = (i: number): number => d0 + i * RUSH_TRAILS.gapPx;
  return r.spots.every((s, i) => {
    if (s.to === null) {
      for (let c = cellOf(at(i) - PICK_REACH); c <= cellOf(at(i) + PICK_REACH); c++) if (!t.safe(s.lane, c)) return false;
      return true;
    }
    const a = cellOf(at(i - 1) - PICK_REACH);
    const z = cellOf(at(i + 1) + PICK_REACH + RUSH_TRAILS.slackPx);
    if (!t.free(s.lane, a, z + 1) || !t.free(s.to, a, z + 1)) return false;
    for (let c = a + CHANGE_CELLS; c <= z; c++) if (!t.safe(s.to, c)) return false;
    return true;
  });
}

/** Settled in `lane` at cell `from`, the truck can be settled in `to` at cell `at` (staying, one-lane changes, free cells only). */
function reachable(t: SafeTable, lane: Lane, from: number, to: Lane, at: number): boolean {
  if (at < from) return false;
  const reach = LANE_IDS.map(() => new Uint8Array(at - from + 1));
  reach[lane][0] = 1;
  for (let c = from; c < at; c++) {
    for (const l of LANE_IDS) {
      if (!reach[l][c - from]) continue;
      if (t.free(l, c + 1, c + 2)) reach[l][c + 1 - from] = 1;
      const land = c + CHANGE_CELLS;
      if (land > at || !t.free(l, c, land)) continue;
      for (const m of [l - 1, l + 1]) if (m >= 0 && m <= 2 && t.free(m, c, land + 1)) reach[m][land - from] = 1;
    }
  }
  return reach[to][at - from] === 1;
}

/** Where the truck is for the planner: its lane (the target one while changing) from a cell on. */
export interface TruckAt {
  readonly lane: Lane;
  readonly cell: number;
}

export class Trails {
  /** whole lines picked (CATENA) this run */
  chains = 0;
  private nextMs: number = RUSH_TRAILS.firstMs;
  private lastId = 0;
  /** d past the last fry laid: until then the fries trays wait */
  private endD = -Infinity;
  private readonly picked = new Map<number, number>();

  constructor(private readonly rng: Rng) {}

  /** A trail is still ahead of (or under) the truck at d. */
  busy(d: number): boolean {
    return d < this.endD;
  }

  /** Lays a trail meeting the truck from meetD on when one is due; `quiet` = no delivery zone up or due, not flying. */
  update(timeMs: number, d: number, meetD: number, truck: TruckAt, traffic: TrafficManager, quiet: boolean): void {
    if (timeMs < this.nextMs) return;
    const laid = quiet && this.lay(d, meetD, truck, traffic);
    this.nextMs = timeMs + (laid ? randRange(this.rng, RUSH_TRAILS.everyMs) : RUSH_TRAILS.retryMs);
  }

  /** The longest safe route of a random length or shorter, weaving ones preferred; false when none fits. */
  private lay(d: number, meetD: number, truck: TruckAt, traffic: TrafficManager): boolean {
    const T = RUSH_TRAILS;
    const [min, max] = T.count;
    const table = new SafeTable(traffic.allBlocks, cellOf(d));
    const start = LANE_IDS.map((l) => reachable(table, truck.lane, truck.cell, l, cellOf(meetD - PICK_REACH)));
    const clearOf = (r: Route): boolean =>
      r.spots.every((s, i) => !traffic.pickupNear(spotX(s), meetD + i * T.gapPx, T.clearPx, RUSH_ROAD.laneW * 0.75));
    for (let n = min + randInt(this.rng, max - min + 1); n >= min; n--) {
      if (meetD + (n - 1) * T.gapPx + PICK_REACH + T.slackPx + CHANGE_CELLS * CELL > traffic.horizon) continue;
      const ok = routes(n).filter((r) => start[r.spots[0].lane] && safeRoute(table, r, meetD) && clearOf(r));
      if (ok.length === 0) continue;
      const r = pickWeighted(this.rng, ok, (x) => 1 + T.shiftWeight * x.shifts);
      const id = ++this.lastId;
      r.spots.forEach((s, index) =>
        traffic.add({ kind: 'fry', lane: s.lane, meetD: meetD + index * T.gapPx, x: spotX(s), trail: { id, index, of: n } }),
      );
      this.picked.set(id, 0);
      this.endD = meetD + (n - 1) * T.gapPx + PICK_REACH;
      return true;
    }
    return false;
  }

  /** A fry of trail `id` (of fries long) was picked: true when that completes the line (CATENA). */
  pick(id: number, of: number): boolean {
    const n = (this.picked.get(id) ?? 0) + 1;
    this.picked.set(id, n);
    if (n !== of) return false;
    this.chains++;
    return true;
  }
}
