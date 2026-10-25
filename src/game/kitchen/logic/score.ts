/** Points of an order (real price x stars, speed, PERFETTO cooks, 5-star combo), shift stars, results rows. */
import { KITCHEN_SCORE, KITCHEN_STARS } from '../../../config/kitchen';
import type { Rating } from './rating';
import { BREAKDOWN_TEXT, TIP_TEXT } from './strings';
import type { KitchenPoints, KitchenShiftSummary } from './types';

/** Multiplier of a 5-star order that makes a streak of `streak` 5-star orders in a row: x1, x1.5, x2 … */
export function comboFor(streak: number): number {
  const S = KITCHEN_SCORE;
  return Math.min(S.comboMax, 1 + S.comboStep * Math.max(0, streak - 1));
}

export interface OrderScore extends KitchenPoints {
  readonly total: number;
  readonly tipCents: number;
}

/** `streak` = 5-star orders in a row including this one (0 when this one is not 5 stars). */
export function scoreOrder(r: Rating, priceCents: number, patience: number, streak: number): OrderScore {
  const S = KITCHEN_SCORE;
  const orders = Math.round((priceCents * S.pointsPerCent * r.stars) / 5);
  const speed = r.stars >= S.speedMinStars ? Math.round(Math.max(0, Math.min(1, patience)) * S.speedMax) : 0;
  const perfect = r.perfect * S.perfectCook;
  const combo = r.stars === 5 ? Math.round((orders + speed + perfect) * (comboFor(streak) - 1)) : 0;
  let tipCents = 0;
  if (r.stars === 5 && patience >= S.bigTipPatience) tipCents = S.bigTipCents;
  else if (r.stars >= 4 && patience >= S.tipPatience) tipCents = S.tipCents;
  return { orders, speed, perfect, combo, total: orders + speed + perfect + combo, tipCents };
}

/** Average rating of the served customers, 0 when nobody was served. */
export function averageStars(ratings: readonly number[]): number {
  return ratings.length === 0 ? 0 : ratings.reduce((a, b) => a + b, 0) / ratings.length;
}

/**
 * 1 = at least 3 customers served with 3+ stars · 2 = all served, average >= 3.5 ·
 * 3 = all served, average >= 4.5, nobody left angry (BRIEF §9).
 */
export function shiftStars(s: Pick<KitchenShiftSummary, 'completed' | 'served' | 'total' | 'ratings' | 'angry'>): 0 | 1 | 2 | 3 {
  const K = KITCHEN_STARS;
  const all = s.completed && s.served === s.total;
  const avg = averageStars(s.ratings);
  if (all && s.angry === 0 && avg >= K.threeAvg) return 3;
  if (all && avg >= K.twoAvg) return 2;
  return s.ratings.filter((r) => r >= K.oneMinRating).length >= K.oneServed ? 1 : 0;
}

/** Results rows (their sum is the score); the combo row only when earned. */
export function breakdown(p: Readonly<KitchenPoints>): { label: string; points: number }[] {
  const keys: (keyof KitchenPoints)[] = ['orders', 'speed', 'perfect', 'combo'];
  return keys.filter((k) => k !== 'combo' || p.combo > 0).map((k) => ({ label: BREAKDOWN_TEXT[k], points: p[k] }));
}

/** One encouraging tip for the next shift (a 3-star shift gets praise, never a correction; then a near-record). `prevBest` = record before this shift. */
export function tipFor(s: KitchenShiftSummary, prevBest: number): string {
  const gap = prevBest - s.score;
  if (s.golden) return TIP_TEXT.golden;
  if (s.completed && gap > 0 && gap <= KITCHEN_SCORE.recordTipGap) return TIP_TEXT.record(gap);
  if (s.angry > 0) return TIP_TEXT.angry;
  if (s.rawOrders > 0) return TIP_TEXT.raw;
  if (s.wrongOrders > 0) return TIP_TEXT.wrong;
  if (s.menuErrors > 0) return TIP_TEXT.menu;
  if (s.overOrders > 0) return TIP_TEXT.over;
  if (s.slowOrders > 0 || s.points.combo > 0) return TIP_TEXT.slow;
  return TIP_TEXT.combo;
}
