/**
 * LaneController: the truck moves one lane per press with an eased slide. No double moves:
 * a press during a change is queued once and starts the moment the truck settles.
 */
import { RUSH_ROAD } from '../../../config/rush';
import type { Lane, LaneDir } from './types';

/** Lane centre, px from the road's left edge. */
export function laneX(lane: number): number {
  return (lane + 0.5) * RUSH_ROAD.laneW;
}

const smooth = (u: number): number => u * u * (3 - 2 * u);

export class LaneController {
  lane: Lane;
  target: Lane;
  private t = 0;
  private dur = 1;
  private queued: LaneDir = 0;

  /** `durationMs` is asked whenever a change starts (driver, grip, sauce, sprint) */
  constructor(
    private readonly durationMs: () => number,
    start: Lane = 1,
  ) {
    this.lane = start;
    this.target = start;
  }

  get changing(): boolean {
    return this.lane !== this.target;
  }

  /** Centre x now. */
  get x(): number {
    if (!this.changing) return laneX(this.lane);
    return laneX(this.lane) + (laneX(this.target) - laneX(this.lane)) * smooth(Math.min(1, this.t / this.dur));
  }

  get lean(): LaneDir {
    return this.changing ? (this.target > this.lane ? 1 : -1) : 0;
  }

  press(dir: LaneDir): 'start' | 'queued' | 'blocked' | 'ignored' {
    if (dir === 0) return 'ignored';
    const next = this.target + dir;
    if (next < 0 || next >= RUSH_ROAD.lanes) return 'blocked';
    if (this.changing) {
      if (this.queued !== 0) return 'ignored';
      this.queued = dir;
      return 'queued';
    }
    this.target = next as Lane;
    this.t = 0;
    this.dur = Math.max(1, this.durationMs());
    return 'start';
  }

  /** Advances the slide; true when the truck settled in its new lane this step. */
  update(dtMs: number): boolean {
    if (!this.changing) return false;
    this.t += dtMs;
    if (this.t < this.dur) return false;
    this.lane = this.target;
    const q = this.queued;
    this.queued = 0;
    this.press(q);
    return true;
  }
}
