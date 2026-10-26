/** THE OLD SCHOOL runtime state shared by runtime.ts, moves.ts and story.ts: the pose drawn each frame and the move context. */
import type Phaser from 'phaser';
import type { BossWorld } from '../../api';
import type { FxPlayer } from './kit/fxplay';
import type { Flash } from './kit/flash';
import type { Timers } from './kit/rig';

type Sprite = Phaser.GameObjects.Sprite;

export interface OsPose {
  /** the hand at its shirt spot: lift (y) and tilt (deg) */
  handDy: number;
  handAngle: number;
  /** 'grip' holds the burger, 'open' waits empty at its spot, 'gone' = phase 2, it flies free (fist*) */
  hand: 'grip' | 'open' | 'gone';
  /** the burger sits in the hand (follows it) */
  held: boolean;
  /** the burger's foot (bottom-centre), squash and tilt */
  bx: number;
  by: number;
  bsx: number;
  bsy: number;
  bAngle: number;
  /** ARM_POSE of the little waving arm */
  arm: number;
  /** the free hand of phase 2: shown, harmless (flying in, transforming), palm position, HAND_POSE, mirror, extra tilt */
  fist: boolean;
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
  readonly parts: { readonly burger: Sprite; readonly arm: Sprite; readonly hand: readonly Sprite[]; readonly bottles: readonly Sprite[] };
  phase: number;
  volleys: number;
}
