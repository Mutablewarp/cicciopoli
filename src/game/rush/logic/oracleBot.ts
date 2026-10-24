/**
 * Oracle autopilot: knows every lane occupancy the validator accepted (hand-off windows
 * included) and only takes moves that keep a way through. Never brakes. The fairness tests use
 * it to prove every generated road can be driven with zero hits and all deliveries; the scene
 * may use it as a debug autopilot.
 */
import type { RushRun } from './run';
import type { RushEvent, RushInput } from './types';
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
    if (t.free(l, cell, cell + k + 1) && t.safe(l, cell + k)) return STAY;
    for (const dir of [-1, 1] as const) if (t.changeOk(l, l + dir, cell)) return { laneDir: dir, brake: false };
    return STAY;
  }
}

/** Plays a whole run on the oracle autopilot; returns every event (fairness tests, debug). */
export function autopilot(run: RushRun, dtMs: number = 1000 / 30): RushEvent[] {
  const bot = new OracleBot(run);
  const events: RushEvent[] = [];
  while (run.snapshot.phase === 'play') events.push(...run.step(dtMs, bot.decide(dtMs)));
  return events;
}
