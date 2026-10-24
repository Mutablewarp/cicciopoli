/**
 * Power-ups from the Ciccio's menu: one timed power at a time (a new one replaces it), the
 * SCUDO NUGGETS shield may run alongside. Plus the pickup schedule (powers + fries trays).
 */
import { RUSH_POWERS } from '../../../config/rush';
import { pickWeighted, randRange, type Rng } from './rng';
import { POWER_TEXT } from './strings';
import type { PickupKind, PowerId, RushEvent, TimedPower } from './types';

type Emit = (e: RushEvent) => void;

export const POWER_PICKUP: Readonly<Record<PowerId, PickupKind>> = {
  shield: 'nuggets',
  radar: 'waffle',
  sprint: 'popcorn',
  grip: 'cheddar',
};

export function powerOf(kind: PickupKind): PowerId | null {
  const hit = (Object.keys(POWER_PICKUP) as PowerId[]).find((p) => POWER_PICKUP[p] === kind);
  return hit ?? null;
}

export class Powers {
  timed: TimedPower | null = null;
  private timedMs = 0;
  private shieldMs = 0;
  private warned = { timed: false, shield: false };

  get shield(): boolean {
    return this.shieldMs > 0;
  }

  get sprint(): boolean {
    return this.timed === 'sprint';
  }

  get grip(): boolean {
    return this.timed === 'grip';
  }

  get radar(): boolean {
    return this.timed === 'radar';
  }

  /** 0..1 left of the timed power, else of the shield. */
  get left(): number {
    if (this.timed) return this.timedMs / RUSH_POWERS.ms[this.timed];
    return this.shieldMs / RUSH_POWERS.ms.shield;
  }

  start(power: PowerId, emit: Emit): void {
    const ms = RUSH_POWERS.ms[power];
    if (power === 'shield') {
      this.shieldMs = ms;
      this.warned.shield = false;
    } else {
      if (this.timed) emit({ type: 'powerEnd', power: this.timed, reason: 'replaced' });
      this.timed = power;
      this.timedMs = ms;
      this.warned.timed = false;
    }
    emit({ type: 'powerStart', power, ms, title: POWER_TEXT[power].name, sub: POWER_TEXT[power].sub });
  }

  update(dtMs: number, emit: Emit): void {
    const W = RUSH_POWERS.warnMs;
    if (this.timed) {
      this.timedMs -= dtMs;
      if (!this.warned.timed && this.timedMs <= W) {
        this.warned.timed = true;
        emit({ type: 'powerWarn', power: this.timed });
      }
      if (this.timedMs <= 0) {
        emit({ type: 'powerEnd', power: this.timed, reason: 'expired' });
        this.timed = null;
      }
    }
    if (this.shieldMs > 0) {
      this.shieldMs -= dtMs;
      if (!this.warned.shield && this.shieldMs <= W) {
        this.warned.shield = true;
        emit({ type: 'powerWarn', power: 'shield' });
      }
      if (this.shieldMs <= 0) emit({ type: 'powerEnd', power: 'shield', reason: 'expired' });
    }
  }

  /** A hit: true when the shield took it. */
  absorb(emit: Emit): boolean {
    if (this.shieldMs <= 0) return false;
    this.shieldMs = 0;
    emit({ type: 'powerEnd', power: 'shield', reason: 'used' });
    return true;
  }
}

/** When pickups appear; what the next power crate holds. */
export class PickupSchedule {
  nextPowerMs: number = RUSH_POWERS.firstMs;
  nextFriesMs: number = RUSH_POWERS.friesFirstMs;

  constructor(private readonly rng: Rng) {}

  /** Power for a crate now, or null (no second shield, no new timed power while one runs). */
  powerDue(timeMs: number, powers: Powers): PowerId | null {
    if (timeMs < this.nextPowerMs) return null;
    const options = (Object.keys(RUSH_POWERS.weights) as PowerId[]).filter((p) =>
      p === 'shield' ? !powers.shield : powers.timed === null,
    );
    if (options.length === 0) {
      this.nextPowerMs = timeMs + RUSH_POWERS.retryMs;
      return null;
    }
    return pickWeighted(this.rng, options, (p) => RUSH_POWERS.weights[p]);
  }

  /** The crate is on the road (placed) or could not find a lane (retry soon). */
  powerDone(timeMs: number, placed: boolean): void {
    this.nextPowerMs = timeMs + (placed ? randRange(this.rng, RUSH_POWERS.everyMs) : RUSH_POWERS.retryMs);
  }

  friesDue(timeMs: number): boolean {
    return timeMs >= this.nextFriesMs;
  }

  friesDone(timeMs: number, placed: boolean): void {
    this.nextFriesMs = timeMs + (placed ? randRange(this.rng, RUSH_POWERS.friesEveryMs) : RUSH_POWERS.retryMs);
  }
}
