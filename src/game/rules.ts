/**
 * Score / health / power rules (BRIEF §4 Rules) as pure functions over a RunState.
 * The scene applies the returned outcome (sfx, FX, HUD); nothing here touches Phaser.
 */
import { LEVEL_IDS, type LevelId, type PowerState } from '../contracts';
import { HERO, SCORE } from '../config/tuning';

export type PickupKind = 'nugget' | 'fries' | 'burger' | 'brie' | 'goat' | 'thai' | 'crunchy';
export type KillMethod = 'stomp' | 'club' | 'cheese';

export interface RunState {
  level: LevelId;
  hearts: number;
  maxHearts: number;
  score: number;
  powers: PowerState;
}

export function createRun(level: LevelId): RunState {
  return {
    level,
    hearts: HERO.maxHearts,
    maxHearts: HERO.maxHearts,
    score: SCORE.start,
    powers: { brie: false, goat: false, thai: false, wings: false },
  };
}

export interface PickupOutcome {
  points: number;
  healed: boolean;
  /** power that was newly gained (null for food or an already-owned power) */
  gained: keyof PowerState | null;
}

const POWER_OF: Partial<Record<PickupKind, keyof PowerState>> = {
  brie: 'brie',
  goat: 'goat',
  thai: 'thai',
  crunchy: 'wings',
};

export function collect(run: RunState, kind: PickupKind): PickupOutcome {
  const points = SCORE[kind];
  run.score += points;
  let healed = false;
  if (kind === 'burger' && run.hearts < run.maxHearts) {
    run.hearts += 1;
    healed = true;
  }
  const power = POWER_OF[kind] ?? null;
  const gained = power !== null && !run.powers[power] ? power : null;
  if (power) run.powers[power] = true;
  return { points, healed, gained };
}

export function killPoints(method: KillMethod): number {
  return SCORE[method];
}

export function addScore(run: RunState, points: number): void {
  run.score += points;
}

/** 'shield' = Brie absorbed the hit, 'hurt' = lost a heart, 'dead' = no hearts left. */
export type HitOutcome = 'shield' | 'hurt' | 'dead';

export function enemyHit(run: RunState): HitOutcome {
  if (run.powers.brie) {
    run.powers.brie = false;
    return 'shield';
  }
  run.hearts = Math.max(0, run.hearts - 1);
  return run.hearts > 0 ? 'hurt' : 'dead';
}

/** Pits / lava ignore the shield; other powers are kept, Brie is lost. */
export function pitFall(run: RunState): 'respawn' | 'dead' {
  run.hearts = Math.max(0, run.hearts - 1);
  run.powers.brie = false;
  return run.hearts > 0 ? 'respawn' : 'dead';
}

/** Level chain L1 → L2 → L3 → L4 (the last one has no next). */
export function nextLevel(level: LevelId): LevelId | null {
  const i = LEVEL_IDS.indexOf(level);
  return i >= 0 && i + 1 < LEVEL_IDS.length ? LEVEL_IDS[i + 1] : null;
}

export function clearBonus(run: RunState): number {
  const points = SCORE.clear[run.level];
  run.score += points;
  return points;
}

/** Countdown used for invulnerability and other short windows. */
export class Timer {
  private left = 0;

  start(ms: number): void {
    this.left = Math.max(this.left, ms);
  }

  stop(): void {
    this.left = 0;
  }

  tick(dtMs: number): void {
    this.left = Math.max(0, this.left - dtMs);
  }

  get active(): boolean {
    return this.left > 0;
  }

  get remaining(): number {
    return this.left;
  }

  /** Blink phase for invulnerability: false on the "off" half of each period. */
  blinkOn(hz: number): boolean {
    if (!this.active) return true;
    return Math.floor((this.left / 1000) * hz * 2) % 2 === 0;
  }
}
