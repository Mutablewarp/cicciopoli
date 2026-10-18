/**
 * Level data model. A level is an ASCII map (one char per 16x16 tile) built from
 * horizontal chunks plus a legend that maps chars to terrain or entities.
 */
import type { LevelId } from '../../contracts';
import type { PickupKind } from '../rules';

export type Terrain = 'air' | 'ground' | 'plat' | 'block';

export type EnemyKind = 'pickle' | 'chili' | 'armor' | 'bat' | 'demon' | 'spirit' | 'brute' | 'megaburger';
export type DecorKind = 'tree' | 'bush' | 'flower' | 'rock' | 'sign' | 'torch' | 'spire' | 'chain' | 'lamp' | 'cone' | 'dumpster';
export type ThemeId = 'hills' | 'inferno' | 'rampage';
/** Things the level 5 hero smashes; they are sprites on top of the terrain, like crates. */
export type SmashKind = 'brick' | 'crate' | 'barrel';

export type EntitySpec =
  | { type: 'spawn' }
  | { type: 'checkpoint' }
  | { type: 'goal' }
  | { type: 'pickup'; kind: PickupKind }
  | { type: 'qblock'; contents: PickupKind }
  | { type: 'crate' }
  /** level 5: breakable prop; `contents` pops out when it breaks, `locked` = arena gate (opens with the boss) */
  | { type: 'smash'; kind: SmashKind; contents?: PickupKind; locked?: boolean }
  /** level 5: left edge of the mini-boss arena */
  | { type: 'arena' }
  | { type: 'enemy'; kind: EnemyKind }
  | { type: 'decor'; kind: DecorKind };

export type LegendEntry = { terrain: Terrain } | { entity: EntitySpec };
export type Legend = Readonly<Record<string, LegendEntry>>;

export interface EntitySpawn {
  spec: EntitySpec;
  col: number;
  row: number;
}

/** Controls hint shown once when the hero first walks past `col`. */
export interface LevelHint {
  col: number;
  text: string;
  touch: string;
  keys: string;
}

export interface LevelDef {
  id: LevelId;
  name: string;
  theme: ThemeId;
  /** hero form (default 'ciccio') */
  hero?: 'ciccio' | 'hulk';
  /** banner sub line (default "LIVELLO n") */
  subtitle?: string;
  hints?: readonly LevelHint[];
  /** map rows, split in horizontal chunks of equal height for readability */
  chunks: readonly (readonly string[])[];
  /** extra / overriding legend entries for this level */
  legend?: Legend;
}

export interface Cell {
  col: number;
  row: number;
}

export interface ParsedLevel {
  cols: number;
  rows: number;
  /** terrain[row][col]; entity cells are 'air' */
  terrain: Terrain[][];
  entities: EntitySpawn[];
  spawn: Cell;
  goal: Cell;
}
