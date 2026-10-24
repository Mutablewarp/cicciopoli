/**
 * Level 6 · CICCIO'S RUSH screen contracts (pre-run panel, results). OWNER: integrator.
 * Re-exported by src/contracts.ts.
 */
import type { SwipeSetting } from './contracts';

export type RushDriverId = 'riflessi' | 'occhio' | 'consegne';

export interface RushDriverCard {
  id: RushDriverId;
  /** "RIFLESSI DA CICCIO" … */
  name: string;
  /** one short Italian sentence */
  ability: string;
  locked: boolean;
  /** how to unlock it, shown while locked */
  unlockHint?: string;
}

export interface RushSettings {
  swipe: SwipeSetting;
  vibration: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  /** music on / off (sound effects follow the global mute) */
  music: boolean;
}

export interface RushAchievementCard {
  id: string;
  name: string;
  desc: string;
  unlocked: boolean;
}

/** Pre-run panel of level 6: driver choice, daily challenge, how to play, settings. */
export interface RushSetupInfo {
  best: number;
  bestStars: 0 | 1 | 2 | 3;
  drivers: RushDriverCard[];
  selected: RushDriverId;
  /** same traffic for everybody today, standard driver */
  daily: { label: string; best: number | null };
  settings: RushSettings;
  achievements: RushAchievementCard[];
}

export interface RushResultInfo {
  /** all three deliveries done */
  completed: boolean;
  daily: boolean;
  score: number;
  best: number;
  newBest: boolean;
  stars: 0 | 1 | 2 | 3;
  /** score breakdown rows, Italian labels */
  breakdown: { label: string; points: number }[];
  delivered: number;
  avgFresh: number;
  collisions: number;
  bestCombo: number;
  /** one encouraging improvement tip */
  tip: string;
  newAchievements: { name: string; desc: string }[];
  /** name of a driver unlocked by this run */
  unlockedDriver?: string;
  /** text for the share button (Web Share API, else copied to the clipboard) */
  shareText: string;
}
