/** Level registry. */
import type { LevelId } from '../../contracts';
import { LEVEL1 } from './level1';
import { LEVEL2 } from './level2';
import type { LevelDef } from './types';

export const LEVELS: Partial<Record<LevelId, LevelDef>> = { 1: LEVEL1, 2: LEVEL2 };

/** Falls back to level 1 so a missing map never crashes the app. */
export function getLevel(id: LevelId): LevelDef {
  return LEVELS[id] ?? LEVEL1;
}
