/**
 * Oracle autopilot: knows every lane occupancy the validator accepted (hand-off windows
 * included) and only takes moves that keep a way through. Never brakes; follows the FRIES TRAILS
 * when the move is safe. The fairness tests use it to prove every generated road can be driven
 * with zero hits and all deliveries (and the trails picked); the scene may use it as a debug autopilot.
 */
import { laneX } from './lanes';
import type { RushRun } from './run';
import type { Lane, RushEvent, RushInput, RushSnapshot } from './types';
import { CELL, SafeTable, cellOf } from './validator';

const STAY: RushInput = { laneDir: 0, brake: false };
/** the next step may run a little faster than this one (zone blend, sprint easing) */
const SPEED_MARGIN = 1.2;

export class OracleBot {
  private table: SafeTable | null = null;
  private version = -1;

  constructor(private readonly run: RushRun) {}

  /** Input for the next step of `dtMs`. */
  decide(dtMs: number): RushInput {
    const snap = this.run.snapshot;
    const truck = snap.truck;
    if (snap.phase === 'over' || truck.lane !== truck.target) return STAY;
    const traffic = this.run.traffic;
    const cell = cellOf(snap.distance);
    if (!this.table || this.version !== traffic.version) {
      this.table = new SafeTable(traffic.allBlocks, cell);
      this.version = traffic.version;
    }
    const t = this.table;
    const k = Math.ceil((snap.speed * SPEED_MARGIN * dtMs) / 1000 / CELL);
    const l = truck.lane;
    const fry = trailLane(snap);
    const toFry = fry === null || fry === l ? 0 : fry > l ? 1 : -1;
    if (toFry !== 0 && t.changeOk(l, l + toFry, cell)) return { laneDir: toFry, brake: false };
    if (t.free(l, cell, cell + k + 1) && t.safe(l, cell + k)) return STAY;
    for (const dir of [-1, 1] as const) if (t.changeOk(l, l + dir, cell)) return { laneDir: dir, brake: false };
    return STAY;
  }
}

/** Lane of the next trail fry ahead (the ones halfway between two lanes are picked on the way), or null. */
function trailLane(snap: RushSnapshot): Lane | null {
  let next: { lane: Lane; y: number } | null = null;
  for (const e of snap.entities) {
    if (e.kind !== 'fry' || e.y <= 0 || e.x !== laneX(e.lane)) continue;
    if (!next || e.y < next.y) next = e;
  }
  return next ? next.lane : null;
}

/** Plays a whole run on the oracle autopilot; returns every event (fairness tests, debug). */
export function autopilot(run: RushRun, dtMs: number = 1000 / 30): RushEvent[] {
  const bot = new OracleBot(run);
  const events: RushEvent[] = [];
  while (run.snapshot.phase === 'play') events.push(...run.step(dtMs, bot.decide(dtMs)));
  return events;
}
