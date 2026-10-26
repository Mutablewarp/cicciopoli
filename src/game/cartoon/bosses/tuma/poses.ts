/**
 * DON TUMA poses for the cut-out rig (kit/rig.ts): spring targets of his parts per moment of the fight.
 * Rotations in degrees (+ = clockwise; he faces left: - leans the body / swings the arm / kicks toward the
 * hero, + winds back over his head), offsets in crop px.
 */
import type { PartPose, Rig } from './kit/rig';
import { TUMA_CFG as C, type TumaPart } from './config';

export type TumaPose = 'idle' | 'reach' | 'throw' | 'glint' | 'honey' | 'whistle' | 'windup' | 'kick' | 'rage' | 'dizzy' | 'melt';

type Pose = Partial<Record<TumaPart, PartPose>>;

const POSES: Record<Exclude<TumaPose, 'idle' | 'rage' | 'dizzy'>, Pose> = {
  // arm back over the head, citrus in the glove
  reach: { wave: { rot: 42, dy: -2 }, body: { rot: 4, dy: -1, sy: 1.04, sx: 0.97 } },
  // the throw: arm snaps forward, the body follows
  throw: { wave: { rot: -34 }, body: { rot: -5, sx: 1.03, sy: 0.97 }, legs: { rot: -4 } },
  // leans toward the hero, the sunglasses catch the sun
  glint: { wave: { rot: 12 }, body: { rot: -8, dx: -3, dy: -2 } },
  // points at the sky: honey falls from the awning
  honey: { wave: { rot: 50, dy: -4 }, body: { rot: 3, dy: -3, sy: 1.05, sx: 0.96 } },
  // whistles for his folding deck chair
  whistle: { wave: { rot: 16 }, body: { rot: 6, sy: 0.97, sx: 1.03 } },
  // the crossed leg winds up ...
  windup: { legs: { rot: 5, dy: -2 }, body: { rot: 5, sy: 0.95, sx: 1.04 }, wave: { rot: 20 } },
  // ... and kicks the wheel of tuma
  kick: { legs: { rot: -7, dx: -2 }, body: { rot: -6, sy: 1.04 }, wave: { rot: 22 } },
  // knocked out: he melts into his chair
  melt: { body: { sy: 0.42, sx: 1.32, rot: 0 }, wave: { rot: -70, dy: 6 }, legs: { rot: 5 } },
};

/** Applies `pose` at time `t` (ms) on the rig; `angry` = phase 2 (faster, wider). */
export function applyPose(rig: Rig<TumaPart>, pose: TumaPose, t: number, angry: boolean): void {
  const I = C.idle;
  const sp = angry ? 1.6 : 1;
  const wave = Math.sin((t * 2 * Math.PI * sp) / I.waveMs);
  if (pose === 'idle' || pose === 'rage' || pose === 'dizzy') {
    const shake = pose === 'rage' ? 3 : angry ? 1 : 0;
    rig.pose('wave', { rot: pose === 'dizzy' ? -40 + wave * 6 : wave * I.wave * (angry ? 2.2 : 1) + (angry ? 18 : 0) });
    rig.pose('body', { dy: Math.sin((t * 2 * Math.PI) / I.bobMs) * I.bob, dx: shake * Math.sin(t / 23), rot: pose === 'dizzy' ? Math.sin(t / 140) * 8 : 0 });
    rig.pose('legs', { rot: -Math.max(0, Math.sin((t * 2 * Math.PI * sp) / I.tapMs)) * I.tap });
    return;
  }
  const p = POSES[pose];
  for (const part of ['wave', 'body', 'legs'] as const) rig.pose(part, p[part] ?? {});
}
