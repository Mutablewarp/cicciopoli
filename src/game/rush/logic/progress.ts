/**
 * Level 6 progress in the game-owned key cicciopoli.rush.v1: drivers, achievements, daily bests,
 * settings, first-run flag. Load is tolerant like src/game/save.ts: anything odd falls back to
 * defaults, storage failures are swallowed (the game never blocks on storage).
 */
import type { RushAchievementCard, RushDriverId, RushSettings, RushSetupInfo, SwipeSetting } from '../../../contracts';
import { RUSH_DEFAULT_DRIVER, RUSH_FEATS, RUSH_STORE } from '../../../config/rush';
import { dailyKey, dailySeed } from './rng';
import { recordEligible, starsFor } from './score';
import { ACHIEVEMENT_TEXT, DRIVER_TEXT, SECRET_TEXT, dailyLabel, type AchievementId } from './strings';
import type { RushOptions, RushRunSummary } from './types';

/** The bit of localStorage we use (inject a fake in tests). */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface RushProgressData {
  driver: RushDriverId;
  unlocked: RushDriverId[];
  achievements: AchievementId[];
  bestStars: 0 | 1 | 2 | 3;
  /** "YYYY-MM-DD" -> best score of that day's challenge */
  daily: Record<string, number>;
  settings: RushSettings;
  firstRunDone: boolean;
}

export interface RushRunOutcome {
  newAchievements: { name: string; desc: string }[];
  /** names of the drivers this run unlocked */
  unlockedDrivers: string[];
  /** daily runs: the day's best before this run (null = first try today) */
  prevDailyBest: number | null;
}

const DRIVERS: readonly RushDriverId[] = ['riflessi', 'occhio', 'consegne'];
const ACHIEVEMENTS = Object.keys(ACHIEVEMENT_TEXT) as AchievementId[];
const SWIPES: readonly SwipeSetting[] = [false, 'low', 'mid', 'high'];

export const DEFAULT_SETTINGS: RushSettings = { swipe: 'mid', vibration: true, reducedMotion: false, highContrast: false, music: true };

function defaults(): RushProgressData {
  return {
    driver: RUSH_DEFAULT_DRIVER,
    unlocked: [RUSH_DEFAULT_DRIVER],
    achievements: [],
    bestStars: 0,
    daily: {},
    settings: { ...DEFAULT_SETTINGS },
    firstRunDone: false,
  };
}

const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
const isScore = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

function parse(raw: string | null): RushProgressData {
  const out = defaults();
  if (!raw) return out;
  const p = JSON.parse(raw) as Partial<Record<keyof RushProgressData, unknown>>;
  const ids = <T>(v: unknown, all: readonly T[]): T[] => (Array.isArray(v) ? all.filter((x) => v.includes(x)) : []);
  out.unlocked = [...new Set<RushDriverId>([RUSH_DEFAULT_DRIVER, ...ids(p.unlocked, DRIVERS)])];
  if (DRIVERS.includes(p.driver as RushDriverId) && out.unlocked.includes(p.driver as RushDriverId)) out.driver = p.driver as RushDriverId;
  out.achievements = ids(p.achievements, ACHIEVEMENTS);
  if (p.bestStars === 1 || p.bestStars === 2 || p.bestStars === 3) out.bestStars = p.bestStars;
  if (p.daily && typeof p.daily === 'object') {
    for (const [k, v] of Object.entries(p.daily)) if (/^\d{4}-\d{2}-\d{2}$/.test(k) && isScore(v)) out.daily[k] = Math.floor(v);
  }
  const s = (p.settings ?? {}) as Partial<Record<keyof RushSettings, unknown>>;
  out.settings = {
    swipe: SWIPES.includes(s.swipe as SwipeSetting) ? (s.swipe as SwipeSetting) : DEFAULT_SETTINGS.swipe,
    vibration: isBool(s.vibration) ? s.vibration : DEFAULT_SETTINGS.vibration,
    reducedMotion: isBool(s.reducedMotion) ? s.reducedMotion : DEFAULT_SETTINGS.reducedMotion,
    highContrast: isBool(s.highContrast) ? s.highContrast : DEFAULT_SETTINGS.highContrast,
    music: isBool(s.music) ? s.music : DEFAULT_SETTINGS.music,
  };
  out.firstRunDone = p.firstRunDone === true;
  return out;
}

export class RushProgress {
  readonly data: RushProgressData;

  /** `store` = window.localStorage in the game (null or a throwing one: in-memory only). */
  constructor(private readonly store: KeyValueStore | null) {
    let data = defaults();
    try {
      data = parse(store?.getItem(RUSH_STORE.key) ?? null);
    } catch {
      /* blocked storage or corrupted JSON: play with defaults */
    }
    this.data = data;
  }

  private persist(): void {
    try {
      this.store?.setItem(RUSH_STORE.key, JSON.stringify(this.data));
    } catch {
      /* quota / privacy mode: keep in memory */
    }
  }

  setDriver(id: RushDriverId): void {
    if (!this.data.unlocked.includes(id)) return;
    this.data.driver = id;
    this.persist();
  }

  setSettings(s: RushSettings): void {
    this.data.settings = { ...s };
    this.persist();
  }

  markFirstRunDone(): void {
    this.data.firstRunDone = true;
    this.persist();
  }

  /** Options of the next run: the daily challenge uses today's seed and the standard driver. */
  optionsFor(daily: boolean, today: Date, randomSeed: number): RushOptions {
    return {
      seed: daily ? dailySeed(today) : randomSeed >>> 0,
      driver: daily ? RUSH_DEFAULT_DRIVER : this.data.driver,
      daily,
      hints: !this.data.firstRunDone,
    };
  }

  /** Stores what a finished run earned. */
  recordRun(s: RushRunSummary, today: Date): RushRunOutcome {
    const d = this.data;
    const earned: Record<AchievementId, boolean> = {
      prima: s.delivered >= 1,
      zero: s.reachedEnd && s.collisions === 0,
      re: s.completed,
      tris: s.perfect >= 3,
      maestro: s.bestCombo >= 3,
      pelo: s.nearMisses >= RUSH_FEATS.nearMisses,
      catena: s.chains >= RUSH_FEATS.chains,
      febbre: s.fevers >= RUSH_FEATS.fevers,
      vola: s.flew,
    };
    const fresh = ACHIEVEMENTS.filter((a) => earned[a] && !d.achievements.includes(a));
    d.achievements.push(...fresh);
    const unlock: RushDriverId[] = [];
    if (s.delivered >= 1) unlock.push('occhio');
    if (s.completed) unlock.push('consegne');
    const newDrivers = unlock.filter((id) => !d.unlocked.includes(id));
    d.unlocked.push(...newDrivers);
    d.bestStars = Math.max(d.bestStars, starsFor(s)) as 0 | 1 | 2 | 3;
    const key = dailyKey(today);
    const prevDailyBest = s.daily ? (d.daily[key] ?? null) : null;
    if (s.daily && recordEligible(s)) d.daily[key] = Math.max(prevDailyBest ?? 0, s.score);
    d.daily = Object.fromEntries(Object.entries(d.daily).sort(([a], [b]) => b.localeCompare(a)).slice(0, RUSH_STORE.dailyKeep));
    this.persist();
    return {
      newAchievements: fresh.map((a) => ({ name: ACHIEVEMENT_TEXT[a].name, desc: ACHIEVEMENT_TEXT[a].desc })),
      unlockedDrivers: newDrivers.map((id) => DRIVER_TEXT[id].name),
      prevDailyBest,
    };
  }

  /** The pre-run panel. `best` = SaveStore best of level 6. */
  setupInfo(best: number, today: Date): RushSetupInfo {
    const d = this.data;
    const achievements: RushAchievementCard[] = ACHIEVEMENTS.map((id) => {
      const unlocked = d.achievements.includes(id);
      const t = ACHIEVEMENT_TEXT[id].secret && !unlocked ? SECRET_TEXT : ACHIEVEMENT_TEXT[id];
      return { id, name: t.name, desc: t.desc, unlocked };
    });
    return {
      best,
      bestStars: d.bestStars,
      drivers: DRIVERS.map((id) => {
        const locked = !d.unlocked.includes(id);
        return { id, name: DRIVER_TEXT[id].name, ability: DRIVER_TEXT[id].ability, locked, ...(locked ? { unlockHint: DRIVER_TEXT[id].unlockHint } : {}) };
      }),
      selected: d.driver,
      daily: { label: dailyLabel(today), best: d.daily[dailyKey(today)] ?? null },
      settings: { ...d.settings },
      achievements,
    };
  }
}
