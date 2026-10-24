/** Mutable state of one run and the speed / zone rules derived from it (driven by run.ts). */
import { RUSH_ZONES, type RushZone } from '../../../art/rush/keys';
import { RUSH_DRIVERS, RUSH_FAIR, RUSH_POWERS, RUSH_RUN, RUSH_SEED, RUSH_SPEED, RUSH_TRUCK, type DriverSpec } from '../../../config/rush';
import { Booster } from './booster';
import { Deliveries } from './deliveries';
import { LaneController } from './lanes';
import { PickupSchedule, Powers } from './powerups';
import { streamRng, type Rng } from './rng';
import { ScoreBook } from './score';
import { TrafficManager } from './traffic';
import type { RushOptions } from './types';

/** Zone index at a run time. */
export function zoneIndexAt(timeMs: number): number {
  const starts = RUSH_RUN.zoneStartMs;
  let i = 0;
  while (i + 1 < starts.length && timeMs >= starts[i + 1]) i++;
  return i;
}

const smooth = (u: number): number => u * u * (3 - 2 * u);
const ease = (v: number, target: number, dtMs: number, tauMs: number): number => v + (target - v) * (1 - Math.exp(-dtMs / tauMs));

export class RunState {
  phase: 'play' | 'over' = 'play';
  endReason: 'time' | 'crash' | null = null;
  timeMs = 0;
  /** road driven, px */
  d = 0;
  speed: number = RUSH_SPEED.base.centro;
  /** last zone announced (-1 = none yet) */
  zoneIndex = -1;
  braking = false;
  brakeMul = 1;
  sprintMul = 1;
  hearts: number = RUSH_RUN.hearts;
  invulnMs = 0;
  /** after a hit: invulnerable until the truck is back in a lane the validator vouches for */
  recovering = false;
  recoverMs = 0;
  slipMs = 0;
  /** time since the last hit (the PROPULSORE crate wants a clean streak) */
  cleanMs = 0;
  collisions = 0;
  readonly zoneHit = RUSH_ZONES.map(() => false);
  hintIndex = 0;
  readonly driver: DriverSpec;
  readonly lanes: LaneController;
  readonly traffic: TrafficManager;
  readonly deliveries: Deliveries;
  readonly powers = new Powers();
  readonly schedule: PickupSchedule;
  readonly booster = new Booster();
  readonly score = new ScoreBook();
  /** pickup lanes / nugget lines */
  readonly pickRng: Rng;

  constructor(readonly options: RushOptions) {
    this.driver = RUSH_DRIVERS[options.driver];
    this.lanes = new LaneController(() => this.changeMs());
    this.traffic = new TrafficManager(streamRng(options.seed, RUSH_SEED.traffic), RUSH_FAIR.warnMs + this.driver.warnBonusMs);
    this.pickRng = streamRng(options.seed, RUSH_SEED.pickups);
    this.schedule = new PickupSchedule(this.pickRng);
    this.deliveries = new Deliveries(streamRng(options.seed, RUSH_SEED.orders), this.driver.hitFreshMul);
    if (options.hints) this.traffic.keepClear(this.lanes.lane, 0, (RUSH_RUN.firstRunClearMs / 1000) * RUSH_SPEED.base.centro);
  }

  get zone(): RushZone {
    return RUSH_ZONES[Math.max(0, zoneIndexAt(this.timeMs))];
  }

  get invulnerable(): boolean {
    return this.invulnMs > 0 || this.recovering;
  }

  /**
   * After a hit the truck may sit where no fair player could be (inside traffic): it stays
   * invulnerable past hitInvulnMs until it is settled in a lane with a way through, or recoverMaxMs.
   */
  updateRecovery(dtMs: number): void {
    if (!this.recovering) return;
    this.recoverMs += dtMs;
    if (this.invulnMs > 0) return;
    const back = !this.lanes.changing && this.traffic.safeAt(this.lanes.lane, this.d);
    if (back || this.recoverMs >= RUSH_RUN.recoverMaxMs) this.recovering = false;
  }

  /** Zone base speed now, blended over zoneBlendMs after a zone change. */
  get base(): number {
    const z = zoneIndexAt(this.timeMs);
    const to = RUSH_SPEED.base[RUSH_ZONES[z]];
    if (z === 0) return to;
    const from = RUSH_SPEED.base[RUSH_ZONES[z - 1]];
    const u = Math.min(1, (this.timeMs - RUSH_RUN.zoneStartMs[z]) / RUSH_SPEED.zoneBlendMs);
    return from + (to - from) * smooth(u);
  }

  /** Zone the truck will be in when it has driven to d (at base speed). */
  zoneAt(d: number): RushZone {
    const t = this.timeMs + ((d - this.d) / Math.max(1, this.base)) * 1000;
    return RUSH_ZONES[zoneIndexAt(t)];
  }

  /**
   * Lane change time now: driver, CHEDDAR GRIP, sauce slip. Divided by the sprint factor so a
   * change always costs the same road (the validator's assumption).
   */
  changeMs(): number {
    const grip = this.powers.grip;
    const slip = this.slipMs > 0 && !grip ? RUSH_TRUCK.slipMul : 1;
    return (this.driver.changeMs * (grip ? RUSH_POWERS.gripMul : 1) * slip) / this.sprintMul;
  }

  /** Brake / sprint easing and the resulting speed. */
  updateSpeed(dtMs: number): void {
    const S = RUSH_SPEED;
    this.brakeMul = ease(this.brakeMul, this.braking ? S.brakeMul : 1, dtMs, this.braking ? S.brakeInTauMs : S.brakeOutTauMs);
    this.sprintMul = ease(this.sprintMul, this.powers.sprint ? RUSH_POWERS.sprintMul : 1, dtMs, RUSH_POWERS.sprintTauMs);
    this.speed = this.base * this.brakeMul * this.sprintMul;
  }
}
