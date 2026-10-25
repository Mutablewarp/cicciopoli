/** End of a shift: records progress + best score, builds the results screen data. */
import type { KitchenResultInfo, SaveStore } from '../../../contracts';
import type { KitchenProgress } from './progress';
import { averageStars, breakdown, tipFor } from './score';
import { shareText } from './strings';
import type { KitchenShiftSummary } from './types';

/**
 * Call once on 'shiftEnd'. A shift with at least one customer served counts for the level best
 * (SaveStore.recordWin(7, …), BRIEF §9).
 */
export function settleShift(s: KitchenShiftSummary, progress: KitchenProgress, save: SaveStore): KitchenResultInfo {
  const prevBest = save.data.best[7] ?? 0;
  const newBest = s.served >= 1 ? save.recordWin(7, s.score) : false;
  const newAchievements = progress.recordShift(s);
  return {
    completed: s.completed,
    golden: s.golden,
    score: s.score,
    best: save.data.best[7] ?? 0,
    newBest,
    stars: s.stars,
    breakdown: breakdown(s.points),
    served: s.served,
    total: s.total,
    avgStars: Math.round(averageStars(s.ratings) * 10) / 10,
    takingsCents: s.takingsCents,
    perfectCooks: s.perfectCooks,
    angry: s.angry,
    tip: tipFor(s, prevBest),
    newAchievements,
    shareText: shareText(s.score),
  };
}
