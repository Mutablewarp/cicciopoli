/**
 * PROPULSORE easter egg: once per run, in zone 3, a rocket-booster crate appears while the
 * player has driven clean for a while (retried until untilMs). Grabbing it = 5 s of flight
 * (longer while a delivery zone is still ahead: it is handed over from the sky): invulnerable,
 * nuggets in the air, then a safe landing.
 */
import { RUSH_BOOSTER } from '../../../config/rush';

export class Booster {
  /** the crate was put on the road (once per run) */
  placed = false;
  flying = false;
  /** the PROPULSORE was used this run (secret achievement) */
  flew = false;
  leftMs = 0;
  private nextTryMs: number = RUSH_BOOSTER.fromMs;

  /** Time to put the crate on the road? Consumes the try: call placed() if it found a lane. */
  wantsCrate(timeMs: number, cleanMs: number): boolean {
    if (this.placed || timeMs < this.nextTryMs || timeMs > RUSH_BOOSTER.untilMs) return false;
    this.nextTryMs = timeMs + RUSH_BOOSTER.retryMs;
    return cleanMs >= RUSH_BOOSTER.cleanMs;
  }

  start(): void {
    this.flying = true;
    this.flew = true;
    this.leftMs = RUSH_BOOSTER.flightMs;
  }

  /** 0..1 flight progress, 0 on the ground. */
  get progress(): number {
    return this.flying ? 1 - this.leftMs / RUSH_BOOSTER.flightMs : 0;
  }

  /** True on the step the truck lands. `hold`: a delivery zone is open ahead, the descent waits for its hand-off. */
  update(dtMs: number, hold = false): boolean {
    if (!this.flying) return false;
    const floor = hold && this.leftMs >= RUSH_BOOSTER.holdLeftMs ? RUSH_BOOSTER.holdLeftMs : 0;
    this.leftMs = Math.max(floor, this.leftMs - dtMs);
    if (this.leftMs > 0) return false;
    this.flying = false;
    this.leftMs = 0;
    return true;
  }
}
