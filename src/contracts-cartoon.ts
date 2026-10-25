/**
 * Level 8 · CICCIO'S GOLDEN TICKET (1930s rubber-hose cartoon boss rush) screen + HUD contracts:
 * the boss map, the HUD fields and the results card. OWNER: integrator. Re-exported by src/contracts.ts.
 */

export type CartoonWeapon = 'provola' | 'meatball' | 'nuggets';

/** The seven mascots of the Ciccio's shirts, in rush order (docs/BRIEF.md §10). */
export type CartoonBossId = 'brie' | 'pancetta' | 'tuma' | 'happy' | 'oldschool' | 'doubletriple' | 'burgergang';

export interface CartoonSettings {
  /** touch: shooting is automatic while a boss is up (SPARA button hidden); default on with touch */
  autoFire: boolean;
  vibration: boolean;
  /** no screen shake, no film jitter, calmer flicker */
  reducedMotion: boolean;
  /** music on / off (sound effects follow the global mute) */
  music: boolean;
}

export interface CartoonBossCard {
  id: CartoonBossId;
  /** "MONSIEUR BRIE" */
  name: string;
  /** one short Italian line on the card */
  tagline: string;
  /** beaten bosses can be replayed; the next one is open; later ones are locked */
  state: 'locked' | 'open' | 'beaten';
  /** best grade on this boss ("A+", "B", …), null if never beaten */
  grade: string | null;
}

/** The boss map (pre-round panel): pick a boss, settings, how to play. */
export interface CartoonMapInfo {
  bosses: CartoonBossCard[];
  /** the boss the big GIOCA button starts */
  next: CartoonBossId;
  /** all seven beaten: the golden ticket was won */
  golden: boolean;
  best: number;
  settings: CartoonSettings;
}

/** Results card after a knockout (won) or a defeat (lost): a vintage report card in our words. */
export interface CartoonResultInfo {
  boss: CartoonBossId;
  bossName: string;
  won: boolean;
  /** lost: how far the boss was pushed, 0..1 (progress bar on the defeat card) */
  progress: number;
  timeMs: number;
  /** hearts left (won) */
  hp: number;
  parries: number;
  /** super cards used */
  supers: number;
  /** "A+", "A", "B", "C", "D" (won only) */
  grade: string | null;
  score: number;
  best: number;
  newBest: boolean;
  /** the seventh boss just fell: the golden ticket finale played */
  golden: boolean;
  /** one encouraging tip */
  tip: string;
  /** text for the share button */
  shareText: string;
  /** a next boss exists and is now open */
  hasNext: boolean;
}

/** Level 8 HUD state (HudState.cartoon). */
export interface CartoonHud {
  /** super meter: 0..5 cards, fractional = the card being filled */
  cards: number;
  weapon: CartoonWeapon;
  bossName: string;
  /** boss index in the rush 0..6 and total 7 (pins) */
  bossIndex: number;
  bossTotal: number;
}
