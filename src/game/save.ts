import type { LevelId, SaveData, SaveStore } from '../contracts';
import { LEVEL_IDS } from '../contracts';

const KEY = 'cicciopoli.save.v1';

function load(): SaveData {
  const fallback: SaveData = { best: {}, completed: [], muted: false };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const best: SaveData['best'] = {};
    for (const id of LEVEL_IDS) {
      const v = parsed.best?.[id];
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0) best[id] = Math.floor(v);
    }
    const completed = Array.isArray(parsed.completed)
      ? parsed.completed.filter((v): v is LevelId => LEVEL_IDS.includes(v))
      : [];
    return { best, completed, muted: parsed.muted === true };
  } catch {
    return fallback; // storage blocked (private mode) or corrupted JSON: play without saves
  }
}

/** localStorage-backed progress. Every failure is swallowed: the game never blocks on storage. */
export function createSave(): SaveStore {
  const data = load();
  const persist = (): void => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* quota / privacy mode — keep in-memory only */
    }
  };
  return {
    data,
    recordWin(level: LevelId, score: number): boolean {
      if (!data.completed.includes(level)) data.completed.push(level);
      const prev = data.best[level] ?? -1;
      const isBest = score > prev;
      if (isBest) data.best[level] = score;
      persist();
      return isBest;
    },
    setMuted(muted: boolean): void {
      data.muted = muted;
      persist();
    },
  };
}
