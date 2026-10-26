/**
 * HAPPY BOX poses for the cut-out rig (kit/rig.ts): spring targets of his parts per moment of the fight.
 * Rotations in degrees (+ = clockwise; - swings the can arm up over the box toward the hero, - lifts the
 * lid on its left hinge), offsets in crop px.
 */
import type { PartPose, Rig } from '../tuma/kit/rig';
import type { HappyPart } from './config';

export type HappyPose = 'idle' | 'shake' | 'spray' | 'drips' | 'minis' | 'aim' | 'launch' | 'puff' | 'dizzy' | 'flat';

type Pose = Partial<Record<HappyPart, PartPose>>;

const POSES: Record<Exclude<HappyPose, 'idle' | 'shake' | 'dizzy'>, Pose> = {
  // the can over his head, nozzle at the hero
  spray: { armR: { rot: -24, dy: -6 }, body: { rot: -4 }, armL: { rot: 8 }, wing: { rot: 8 } },
  // lid up: the paint drips from the gutter answer him
  drips: { lid: { rot: -28, dy: -3 }, armR: { rot: -14 }, armL: { rot: -16 }, body: { sy: 1.04, sx: 0.97 } },
  // lid wide open: the mini boxes jump out
  minis: { lid: { rot: -70, dy: -8 }, body: { sy: 0.94, sx: 1.05 }, armL: { rot: -16 }, armR: { rot: 10 } },
  // the can levelled at the hero like a bazooka
  aim: { armR: { rot: -36, dx: 6 }, armL: { rot: 10 }, body: { rot: 3 } },
  // ... and the kick of the launch
  launch: { armR: { rot: -28, dx: 8 }, body: { rot: 7, sx: 0.96 }, wing: { rot: -12 } },
  // phase 2: he puffs up, everything flaps
  puff: { lid: { rot: -40, dy: -6 }, armR: { rot: -24 }, armL: { rot: -18 }, wing: { rot: -16 }, body: { sx: 1.06, sy: 1.06 } },
  // knocked out: folded flat
  flat: { body: { sy: 0.32, sx: 1.36 }, lid: { rot: -100, dy: 20 }, armR: { rot: 60 }, armL: { rot: -24 }, feet: { sy: 0.5 } },
};

/** Applies `pose` at time `t` (ms); `angry` = phase 2 (livelier). */
export function applyHappyPose(rig: Rig<HappyPart>, pose: HappyPose, t: number, angry: boolean): void {
  const sp = angry ? 1.5 : 1;
  const s1 = Math.sin((t * sp) / 170);
  const s2 = Math.sin((t * sp) / 260);
  if (pose === 'idle' || pose === 'dizzy') {
    const dizzy = pose === 'dizzy';
    rig.pose('body', { rot: dizzy ? Math.sin(t / 140) * 7 : s2 * 1.5, dy: Math.abs(s1) * -1.5 });
    rig.pose('armR', { rot: dizzy ? 34 + s1 * 4 : s2 * 6 - (angry ? 10 : 0) });
    rig.pose('armL', { rot: dizzy ? -16 : -s2 * 5 });
    rig.pose('wing', { rot: dizzy ? 8 : s1 * 7 });
    rig.pose('lid', { rot: dizzy ? -12 : Math.max(0, Math.sin((t * sp) / 400)) * (angry ? -10 : -3) });
    rig.pose('feet', { sy: 1 - Math.abs(s1) * 0.03 });
    return;
  }
  if (pose === 'shake') {
    // shaking the spray can before the shot (the rattle sells it)
    rig.pose('armR', { rot: -18 + Math.sin(t / 32) * 9 });
    rig.pose('body', { rot: Math.sin(t / 32) * 1.2 });
    for (const p of ['armL', 'wing', 'lid', 'feet'] as const) rig.pose(p, {});
    return;
  }
  const p = POSES[pose];
  for (const part of ['wing', 'feet', 'body', 'lid', 'armL', 'armR'] as const) rig.pose(part, p[part] ?? {});
}
