/** End of a run: records progress + best score, builds the results screen data. */
import type { RushResultInfo, SaveStore } from '../../../contracts';
import type { RushProgress } from './progress';
import { avgFresh, breakdown, recordEligible, starsFor, tipFor } from './score';
import { shareText } from './strings';
import type { RushRunSummary } from './types';

/**
 * Call once when the run fired 'end'. Only a run that reached 0 s with a delivery counts: the level
 * best goes through SaveStore.recordWin(6, …), a daily run also sets the day's own best (shown instead).
 */
export function settleRun(s: RushRunSummary, progress: RushProgress, save: SaveStore, today: Date): RushResultInfo {
  const outcome = progress.recordRun(s, today);
  const savedBest = save.data.best[6] ?? 0;
  const eligible = recordEligible(s);
  const record = eligible ? save.recordWin(6, s.score) : false;
  const prevBest = s.daily ? (outcome.prevDailyBest ?? 0) : savedBest;
  const newBest = eligible && (s.daily ? s.score > prevBest : record);
  return {
    completed: s.completed,
    daily: s.daily,
    score: s.score,
    best: s.daily ? (newBest ? s.score : prevBest) : (save.data.best[6] ?? 0),
    newBest,
    stars: starsFor(s),
    breakdown: breakdown(s.points),
    delivered: s.delivered,
    avgFresh: avgFresh(s),
    collisions: s.collisions,
    bestCombo: s.bestCombo,
    tip: tipFor(s, prevBest),
    newAchievements: outcome.newAchievements,
    ...(outcome.unlockedDrivers.length > 0 ? { unlockedDriver: outcome.unlockedDrivers.join(' + ') } : {}),
    shareText: shareText(s.score),
  };
}
