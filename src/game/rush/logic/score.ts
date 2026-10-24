/** Score of a run: clean passes x combo, deliveries + freshness, clean zones, stars, tips. */
import { RUSH_SCORE, RUSH_STARS } from '../../../config/rush';
import { BREAKDOWN_TEXT, TIP_TEXT } from './strings';
import type { RushPoints, RushRunSummary } from './types';

/** Multiplier after `streak` clean passes in a row: x1, +0.25 every 4, capped at x3. */
export function comboFor(streak: number): number {
  const S = RUSH_SCORE;
  return Math.min(S.comboMax, 1 + S.comboStep * Math.floor(streak / S.comboEvery));
}

/** Hand-off points: base, freshness bonus 0..500, sky bonus. */
export function deliveryPoints(fresh: number, sky: boolean): { base: number; fresh: number; sky: number } {
  return {
    base: RUSH_SCORE.delivery,
    fresh: Math.round((Math.max(0, Math.min(100, fresh)) / 100) * RUSH_SCORE.freshMax),
    sky: sky ? RUSH_SCORE.sky : 0,
  };
}

export class ScoreBook {
  readonly points: RushPoints = { deliveries: 0, fresh: 0, sky: 0, passes: 0, zones: 0, pickups: 0 };
  streak = 0;
  bestCombo = 1;

  get total(): number {
    const p = this.points;
    return p.deliveries + p.fresh + p.sky + p.passes + p.zones + p.pickups;
  }

  get combo(): number {
    return comboFor(this.streak);
  }

  /** A clean pass: points at the current combo; `up` = the combo just grew. */
  pass(): { points: number; up: boolean } {
    const points = Math.round(RUSH_SCORE.pass * this.combo);
    this.points.passes += points;
    const before = this.combo;
    this.streak++;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    return { points, up: this.combo > before };
  }

  add(source: keyof RushPoints, n: number): void {
    this.points[source] += n;
  }
}

export function avgFresh(s: Pick<RushRunSummary, 'fresh'>): number {
  return s.fresh.length === 0 ? 0 : Math.round(s.fresh.reduce((a, b) => a + b, 0) / s.fresh.length);
}

/** 1 = a delivery · 2 = two deliveries and 2500 points · 3 = all three, fresh avg >= 80, no hits. */
export function starsFor(s: RushRunSummary): 0 | 1 | 2 | 3 {
  if (s.delivered >= 3 && s.collisions === 0 && avgFresh(s) >= RUSH_STARS.threeFresh) return 3;
  if (s.delivered >= RUSH_STARS.twoDeliveries && s.score >= RUSH_STARS.twoScore) return 2;
  return s.delivered >= 1 ? 1 : 0;
}

/** Results rows (their sum is the score); the sky row only when earned. */
export function breakdown(p: Readonly<RushPoints>): { label: string; points: number }[] {
  const keys: (keyof RushPoints)[] = ['deliveries', 'fresh', 'sky', 'passes', 'zones', 'pickups'];
  return keys.filter((k) => k !== 'sky' || p.sky > 0).map((k) => ({ label: BREAKDOWN_TEXT[k], points: p[k] }));
}

/** A run counts for the record and the day's best only when it reached 0 s with a delivery (BRIEF §8). */
export function recordEligible(s: Pick<RushRunSummary, 'reachedEnd' | 'delivered'>): boolean {
  return s.reachedEnd && s.delivered >= 1;
}

/** One encouraging tip for the next run. `prevBest` = record before this run. */
export function tipFor(s: RushRunSummary, prevBest: number): string {
  const gap = prevBest - s.score;
  const eligible = recordEligible(s);
  if (eligible && gap > 0 && gap <= 500) return TIP_TEXT.record(gap);
  if (!eligible && prevBest > 0 && gap < 0) return TIP_TEXT.recordRule;
  if (s.delivered === 0) return TIP_TEXT.deliver;
  if (!s.reachedEnd) return TIP_TEXT.brake;
  if (s.delivered < 3) return TIP_TEXT.deliver;
  if (s.collisions === 1) return TIP_TEXT.oneHit;
  if (s.collisions > 1) return TIP_TEXT.brake;
  if (avgFresh(s) < RUSH_STARS.threeFresh) return TIP_TEXT.fresh;
  if (s.bestCombo < RUSH_SCORE.comboMax) return TIP_TEXT.combo;
  return s.daily ? TIP_TEXT.perfectDaily : TIP_TEXT.perfect;
}
