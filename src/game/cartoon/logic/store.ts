/**
 * Level 8 progress in the game-owned key cicciopoli.cartoon.v1: settings, beaten bosses, best grade
 * and best score per boss, golden ticket won. Load is tolerant (anything odd = defaults, storage
 * failures swallowed: the game never blocks on storage). Pure: the store is passed in.
 */
import type { CartoonBossCard, CartoonBossId, CartoonMapInfo, CartoonSettings } from '../../../contracts';
import { CARTOON_STORE } from '../../../config/cartoon';
import { betterGrade } from './rules';

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface CartoonProgressData {
  settings: CartoonSettings;
  beaten: CartoonBossId[];
  grades: Partial<Record<CartoonBossId, string>>;
  bestScores: Partial<Record<CartoonBossId, number>>;
  golden: boolean;
}

/** Boss facts the map needs (BossDef fields). */
export interface BossInfo {
  id: CartoonBossId;
  name: string;
  tagline: string;
}

const GRADES = ['A+', 'A', 'B', 'C', 'D'];
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';

export function defaultSettings(touch: boolean): CartoonSettings {
  return { autoFire: touch, vibration: true, reducedMotion: false, music: true };
}

function parse(raw: string | null, ids: readonly CartoonBossId[], touch: boolean): CartoonProgressData {
  const out: CartoonProgressData = { settings: defaultSettings(touch), beaten: [], grades: {}, bestScores: {}, golden: false };
  if (!raw) return out;
  const p = JSON.parse(raw) as Partial<Record<keyof CartoonProgressData, unknown>> | null;
  if (!p || typeof p !== 'object') return out;
  const beaten = Array.isArray(p.beaten) ? (p.beaten as unknown[]) : [];
  out.beaten = ids.filter((id) => beaten.includes(id));
  const grades = (p.grades && typeof p.grades === 'object' ? p.grades : {}) as Record<string, unknown>;
  const scores = (p.bestScores && typeof p.bestScores === 'object' ? p.bestScores : {}) as Record<string, unknown>;
  for (const id of ids) {
    const g = grades[id];
    if (typeof g === 'string' && GRADES.includes(g)) out.grades[id] = g;
    const s = scores[id];
    if (typeof s === 'number' && Number.isFinite(s) && s > 0) out.bestScores[id] = Math.floor(s);
  }
  out.golden = p.golden === true;
  const s = (p.settings && typeof p.settings === 'object' ? p.settings : {}) as Partial<Record<keyof CartoonSettings, unknown>>;
  const D = out.settings;
  out.settings = {
    autoFire: isBool(s.autoFire) ? s.autoFire : D.autoFire,
    vibration: isBool(s.vibration) ? s.vibration : D.vibration,
    reducedMotion: isBool(s.reducedMotion) ? s.reducedMotion : D.reducedMotion,
    music: isBool(s.music) ? s.music : D.music,
  };
  return out;
}

export class CartoonProgress {
  readonly data: CartoonProgressData;

  /** `store` = window.localStorage in the game (null or a throwing one: in memory only). */
  constructor(
    private readonly store: KeyValueStore | null,
    private readonly ids: readonly CartoonBossId[],
    touch: boolean,
  ) {
    let data: CartoonProgressData = { settings: defaultSettings(touch), beaten: [], grades: {}, bestScores: {}, golden: false };
    try {
      data = parse(store?.getItem(CARTOON_STORE.key) ?? null, ids, touch);
    } catch {
      /* blocked storage or corrupted JSON: play with defaults */
    }
    this.data = data;
  }

  private persist(): void {
    try {
      this.store?.setItem(CARTOON_STORE.key, JSON.stringify(this.data));
    } catch {
      /* quota / privacy mode: keep in memory */
    }
  }

  setSettings(s: CartoonSettings): void {
    this.data.settings = { ...s };
    this.persist();
  }

  /** The first boss not beaten yet, in rush order (all beaten: the first again). */
  next(): CartoonBossId {
    return this.ids.find((id) => !this.data.beaten.includes(id)) ?? this.ids[0];
  }

  stateOf(id: CartoonBossId): CartoonBossCard['state'] {
    if (this.data.beaten.includes(id)) return 'beaten';
    return id === this.next() ? 'open' : 'locked';
  }

  /** The boss after `id` in the rush, if it is now playable. */
  after(id: CartoonBossId): CartoonBossId | null {
    const n = this.ids[this.ids.indexOf(id) + 1];
    return n && this.stateOf(n) !== 'locked' ? n : null;
  }

  mapInfo(bosses: readonly BossInfo[], best: number): CartoonMapInfo {
    return {
      bosses: bosses.map((b) => ({ id: b.id, name: b.name, tagline: b.tagline, state: this.stateOf(b.id), grade: this.data.grades[b.id] ?? null })),
      next: this.next(),
      golden: this.data.golden,
      best,
      settings: { ...this.data.settings },
    };
  }

  /** A knockout: marks the boss beaten, keeps the best grade / score. Returns true if all seven are now beaten. */
  recordKnockout(id: CartoonBossId, grade: string, score: number): boolean {
    const d = this.data;
    if (!d.beaten.includes(id)) d.beaten = this.ids.filter((x) => x === id || d.beaten.includes(x));
    d.grades[id] = betterGrade(d.grades[id] ?? null, grade) ?? grade;
    d.bestScores[id] = Math.max(d.bestScores[id] ?? 0, Math.floor(score));
    const all = this.ids.every((x) => d.beaten.includes(x));
    if (all) d.golden = true;
    this.persist();
    return all;
  }
}
