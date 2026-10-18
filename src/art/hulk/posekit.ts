/** Small constructors shared by the pose tables (poses.ts, poses-action.ts). */
import { rad, type ArmPose, type LegPose, type Pt } from './rig';

/** Pelvis x of the standing pose: puts the visual centre of the figure on x = 32. */
export const PX = 32;
/** Hip line height of the standing pose. */
export const HIP_Y = 37;
/** Bottom edge of the sole (the last opaque row is row 62; the outline takes row 63). */
const SOLE = 62.99;

export const arm = (up: number, lo: number, extra: Omit<ArmPose, 'up' | 'lo'> = {}): ArmPose => ({ up, lo, ...extra });

/** Lowest point of the foot below the ankle for a toe angle (heel, ball and toe discs of limbs.ts). */
function footDrop(deg: number): number {
  const s = Math.sin(rad(deg));
  const c = Math.cos(rad(deg));
  return Math.max(-0.8 * s + 2.3 * c + 2.3, 4.6 * s + 2.6 * c + 2.3, 8.6 * s + 3.1 * c + 1.7);
}

/** Foot standing on the ground at x with the given toe angle; `knee` = direction the knee points to (default forward). */
export const planted = (x: number, foot = 0, knee?: Pt): LegPose => ({ ankle: [x, SOLE - footDrop(foot)], foot, knee });

/** Foot at an explicit ankle position (airborne or lifted); never pushed through the ground. */
export const air = (x: number, y: number, foot = 0, knee?: Pt): LegPose => ({
  ankle: [x, Math.min(y, SOLE - 0.8 - footDrop(foot))],
  foot,
  knee,
});
