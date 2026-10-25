/**
 * Level 7 progress in the game-owned key cicciopoli.kitchen.v1: settings (AIUTI on by default),
 * tutorial flag, achievements, best shift stars, golden award, PERFETTO burgers of all shifts, how many
 * times each burger, starter, drink and regular came in a served order (the next shifts favour the others).
 * Load is tolerant like src/game/save.ts: anything odd falls back to defaults, storage failures
 * are swallowed (the game never blocks on storage).
 */
import type { KitchenSettings, KitchenSetupInfo, RushAchievementCard } from '../../../contracts';
import { KITCHEN_ACHIEVE, KITCHEN_STORE } from '../../../config/kitchen';
import { CUSTOMERS, DRINKS, STARTERS } from '../../../art/kitchen/keys';
import { BURGERS } from '../../../config/kitchenMenu';
import type { KeyValueStore } from '../../rush/logic/progress';
import { ACHIEVEMENT_TEXT, type AchievementId } from './strings';
import type { KitchenOptions, KitchenShiftSummary, SeenId } from './types';

export interface KitchenProgressData {
  settings: KitchenSettings;
  tutorialDone: boolean;
  achievements: AchievementId[];
  bestStars: 0 | 1 | 2 | 3;
  golden: boolean;
  /** PERFETTO burgers served, all shifts together (PIASTRA D'ORO) */
  perfectPatties: number;
  /** burgers, starters, drinks and regulars of the served orders, all shifts together */
  cooked: Partial<Record<SeenId, number>>;
}

const ACHIEVEMENTS = Object.keys(ACHIEVEMENT_TEXT) as AchievementId[];
const SEEN: readonly SeenId[] = [...BURGERS.map((b) => b.id), ...STARTERS, ...DRINKS, ...CUSTOMERS];

export const DEFAULT_KITCHEN_SETTINGS: KitchenSettings = { hints: true, vibration: true, reducedMotion: false, music: true };

function defaults(): KitchenProgressData {
  return { settings: { ...DEFAULT_KITCHEN_SETTINGS }, tutorialDone: false, achievements: [], bestStars: 0, golden: false, perfectPatties: 0, cooked: {} };
}

const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
const isCount = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;

function parse(raw: string | null): KitchenProgressData {
  const out = defaults();
  if (!raw) return out;
  const p = JSON.parse(raw) as Partial<Record<keyof KitchenProgressData, unknown>> | null;
  if (!p || typeof p !== 'object') return out;
  out.achievements = Array.isArray(p.achievements) ? ACHIEVEMENTS.filter((a) => (p.achievements as unknown[]).includes(a)) : [];
  if (p.bestStars === 1 || p.bestStars === 2 || p.bestStars === 3) out.bestStars = p.bestStars;
  out.tutorialDone = p.tutorialDone === true;
  out.golden = p.golden === true;
  if (isCount(p.perfectPatties)) out.perfectPatties = Math.floor(p.perfectPatties);
  const cooked = (p.cooked && typeof p.cooked === 'object' ? p.cooked : {}) as Partial<Record<SeenId, unknown>>;
  for (const id of SEEN) {
    const n = cooked[id];
    if (isCount(n)) out.cooked[id] = Math.floor(n);
  }
  const s = (p.settings && typeof p.settings === 'object' ? p.settings : {}) as Partial<Record<keyof KitchenSettings, unknown>>;
  const D = DEFAULT_KITCHEN_SETTINGS;
  out.settings = {
    hints: isBool(s.hints) ? s.hints : D.hints,
    vibration: isBool(s.vibration) ? s.vibration : D.vibration,
    reducedMotion: isBool(s.reducedMotion) ? s.reducedMotion : D.reducedMotion,
    music: isBool(s.music) ? s.music : D.music,
  };
  return out;
}

export class KitchenProgress {
  readonly data: KitchenProgressData;

  /** `store` = window.localStorage in the game (null or a throwing one: in-memory only). */
  constructor(private readonly store: KeyValueStore | null) {
    let data = defaults();
    try {
      data = parse(store?.getItem(KITCHEN_STORE.key) ?? null);
    } catch {
      /* blocked storage or corrupted JSON: play with defaults */
    }
    this.data = data;
  }

  private persist(): void {
    try {
      this.store?.setItem(KITCHEN_STORE.key, JSON.stringify(this.data));
    } catch {
      /* quota / privacy mode: keep in memory */
    }
  }

  setSettings(s: KitchenSettings): void {
    this.data.settings = { ...s };
    this.persist();
  }

  /** The guided orders are never repeated (call on the 'tutorialDone' event too). */
  markTutorialDone(): void {
    if (this.data.tutorialDone) return;
    this.data.tutorialDone = true;
    this.persist();
  }

  /** Options of the next shift. */
  optionsFor(seed: number): KitchenOptions {
    return { seed: seed >>> 0, tutorial: !this.data.tutorialDone, hints: this.data.settings.hints, cooked: { ...this.data.cooked } };
  }

  /** Stores what a finished shift earned; returns the achievements unlocked now. */
  recordShift(s: KitchenShiftSummary): { name: string; desc: string }[] {
    const d = this.data;
    d.perfectPatties += s.perfectPatties;
    for (const id of s.seen) d.cooked[id] = (d.cooked[id] ?? 0) + 1;
    const earned: Record<AchievementId, boolean> = {
      primo: s.served >= 1,
      piastra: d.perfectPatties >= KITCHEN_ACHIEVE.goldPatties,
      bacon: s.completed && s.bacon > 0 && s.perfectBacon === s.bacon,
      menu: s.menuFive,
      nessuno: s.completed && s.angry === 0,
      golden: s.golden,
    };
    const fresh = ACHIEVEMENTS.filter((a) => earned[a] && !d.achievements.includes(a));
    d.achievements.push(...fresh);
    d.bestStars = Math.max(d.bestStars, s.stars) as 0 | 1 | 2 | 3;
    d.golden ||= s.golden;
    d.tutorialDone ||= s.tutorialDone;
    this.persist();
    return fresh.map((a) => ({ name: ACHIEVEMENT_TEXT[a].name, desc: ACHIEVEMENT_TEXT[a].desc }));
  }

  /** The pre-shift panel. `best` = SaveStore best of level 7. */
  setupInfo(best: number): KitchenSetupInfo {
    const d = this.data;
    const achievements: RushAchievementCard[] = ACHIEVEMENTS.map((id) => ({
      id,
      name: ACHIEVEMENT_TEXT[id].name,
      desc: ACHIEVEMENT_TEXT[id].desc,
      unlocked: d.achievements.includes(id),
    }));
    return { best, bestStars: d.bestStars, golden: d.golden, settings: { ...d.settings }, achievements };
  }
}
