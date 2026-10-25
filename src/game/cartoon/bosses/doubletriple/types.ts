/** DOUBLE TRIPLE runtime state shared by runtime.ts, moves.ts and story.ts: the pose drawn each frame and the move context. */
import type Phaser from 'phaser';
import type { BossWorld } from '../../api';
import type { FxPlayer } from '../oldschool/kit/fxplay';
import type { Flash } from '../oldschool/kit/flash';
import type { Temps, Timers } from '../oldschool/kit/rig';

type Sprite = Phaser.GameObjects.Sprite;

export interface MiniPose {
  x: number;
  y: number;
  sx: number;
  sy: number;
  face: number;
  arm: number;
  legs: number;
}

export interface DtPose {
  body: boolean;
  bx: number;
  by: number;
  sx: number;
  sy: number;
  face: number;
  armL: number;
  armR: number;
  legs: number;
  minis: boolean;
  m: MiniPose[];
}

interface DtKeys {
  frisbee: string;
  frisbeeAnim: string;
  wave: string;
  waveAnim: string;
  wavePinkAnim: string;
  whip: string;
  stub: string;
  lane: string;
  salsa: string;
  shock: string;
  shockAnim: string;
}

export interface DtCtx {
  readonly world: BossWorld;
  readonly pose: DtPose;
  readonly fx: FxPlayer;
  readonly flash: Flash;
  readonly timers: Timers;
  readonly temps: Temps;
  readonly keys: DtKeys;
  readonly parts: { readonly big: readonly Sprite[]; readonly armL: Sprite; readonly minis: readonly Sprite[]; readonly miniArms: readonly Sprite[] };
  phase: number;
}
