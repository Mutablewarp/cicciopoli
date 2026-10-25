/** THE OLD SCHOOL runtime state shared by runtime.ts, moves.ts and story.ts: the pose drawn each frame and the move context. */
import type Phaser from 'phaser';
import type { BossWorld } from '../../api';
import type { FxPlayer } from './kit/fxplay';
import type { Flash } from './kit/flash';
import type { Timers } from './kit/rig';

type Sprite = Phaser.GameObjects.Sprite;

export interface OsPose {
  handDy: number;
  handAngle: number;
  hand: 'grip' | 'open' | 'gone';
  /** the burger sits in the hand (follows it) */
  held: boolean;
  bx: number;
  by: number;
  bsx: number;
  bsy: number;
  face: number;
  arm: number;
  fist: boolean;
  /** the fist cannot hurt (flying in, transforming) */
  fistSafe: boolean;
  fx: number;
  fy: number;
  fistFrame: number;
  fistFlip: boolean;
  fistAngle: number;
  /** per bottle: > 0 squeezed, < 0 inflated */
  bottle: number[];
  bottleFrame: number[];
}

interface OsKeys {
  bacon: string;
  sauce: string;
  shock: string;
  shockAnim: string;
}

export interface OsCtx {
  readonly world: BossWorld;
  readonly pose: OsPose;
  readonly fx: FxPlayer;
  readonly flash: Flash;
  readonly timers: Timers;
  readonly keys: OsKeys;
  readonly parts: { readonly burger: Sprite; readonly arm: Sprite; readonly hand: readonly Sprite[]; readonly fist: Sprite; readonly bottles: readonly Sprite[] };
  phase: number;
  volleys: number;
}
