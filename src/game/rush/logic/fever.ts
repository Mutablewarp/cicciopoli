/**
 * v9 CICCIO FEVER: reaching combo x3 lights 6 s of points x2 (RUSH_FEVER). A hit puts it out and the
 * next one needs x3 again; after it ran out, againPasses more clean passes / near misses at x3.
 */
import { RUSH_FEVER, RUSH_SCORE } from '../../../config/rush';
import { RUSH_TEXT, feverSub } from './strings';
import type { RushEvent } from './types';

type Emit = (e: RushEvent) => void;

/** Clean-driving streak at which the combo reaches its cap (x3). */
export const CAP_STREAK = ((RUSH_SCORE.comboMax - 1) / RUSH_SCORE.comboStep) * RUSH_SCORE.comboEvery;

export class Fever {
  leftMs = 0;
  /** fevers lit this run */
  count = 0;
  /** streak that lights the next one */
  private at = CAP_STREAK;

  get on(): boolean {
    return this.leftMs > 0;
  }

  get mul(): number {
    return this.on ? RUSH_FEVER.mul : 1;
  }

  /** 0..1 time left, 0 = off */
  get left(): number {
    return this.leftMs / RUSH_FEVER.ms;
  }

  /** Burns down, or lights when the streak got there. */
  update(dtMs: number, streak: number, emit: Emit): void {
    if (this.on) {
      this.leftMs = Math.max(0, this.leftMs - dtMs);
      if (this.on) return;
      this.at = streak + RUSH_FEVER.againPasses;
      emit({ type: 'feverEnd', reason: 'expired' });
      return;
    }
    if (streak < this.at) return;
    this.leftMs = RUSH_FEVER.ms;
    this.count++;
    emit({ type: 'feverStart', ms: RUSH_FEVER.ms, title: RUSH_TEXT.fever, sub: feverSub(RUSH_FEVER.ms) });
  }

  /** A real hit (not one the shield took): out, the combo starts again from x1. */
  hit(emit: Emit): void {
    this.at = CAP_STREAK;
    if (!this.on) return;
    this.leftMs = 0;
    emit({ type: 'feverEnd', reason: 'hit' });
  }
}
