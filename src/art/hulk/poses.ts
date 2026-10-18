/**
 * Per-frame pose table, indexed exactly like HULK in keys.ts (35 frames): idle, run, airborne, hurt here;
 * punch, slam, roar, grab, throw and victory in poses-action.ts. Planted feet sit on the sole line; airborne
 * frames are snapped to the bottom row by the renderer. Every pose keeps the head above the shoulders (at most
 * 3 px below its idle height) and the arms clear of the waist.
 */
import { air, arm, HIP_Y, planted, PX } from './posekit';
import { GRAB_POSES, PUNCH_POSES, ROAR_POSES, SLAM_POSES, THROW_POSES, VICTORY_POSES } from './poses-action';
import type { LegPose, Pose } from './rig';

/* -------------------------------------------------------------- idle */
/** Chest rise (`breath`), a 1 px head lift at the top of the breath and a fist sway across the 4 frames. */
function idle(breath: number, headDy: number, sway: number): Pose {
  return {
    pelvis: [PX, HIP_Y],
    lean: 0,
    twist: 0,
    breath,
    head: [0, headDy],
    face: 'grit',
    armF: arm(20 + sway, -32 + sway * 0.5, { flex: 0.3 }),
    armB: arm(-13 - sway, 30 - sway * 0.5, { flex: 0.3 }),
    legF: planted(PX + 8.6, 0),
    legB: planted(PX - 9, 0),
  };
}

/* ------------------------------------------------------------- run */
/** Hip height per phase of a step: contact, down (lowest), push-off, flight (highest). Both steps of the cycle repeat it. */
const RUN_BOB = [-0.6, 0.3, -0.4, -1].map((d) => HIP_Y + d);
const RUN_X = PX - 3;
const RUN_HIPS = 0.8;
/** Planted ankles slide back this far per frame; at RUN_FPS that cancels the hero's top run speed (RUN_SPEED px/s). */
export const RUN_SLIDE = 20 / 3;
export const RUN_SPEED = 120;
export const RUN_FPS = Math.round(RUN_SPEED / RUN_SLIDE);
/** Where the heel strikes, ahead of the pelvis centre: the same for both legs, so the strides are even. */
const CONTACT = 6.7;

/**
 * One leg through the 8-phase stride, ankle positions relative to the pelvis centre cx (by = pelvis height). Phases 0-2
 * are the stance (heel strike, down, toe push-off): the foot stays nearly flat and slides back RUN_SLIDE px per frame.
 * Phases 3-7 swing the leg through: kicked up behind, knee driven forward, shin swinging out, leg reaching ahead for
 * the next contact. Phase 3 of one leg is phase 7 of the other: both feet are off the ground (the flight frames).
 */
function stride(cx: number, by: number, phase: number): LegPose {
  switch (phase) {
    case 0: return planted(cx + CONTACT, -7);
    case 1: return planted(cx + CONTACT - RUN_SLIDE, 0);
    case 2: return planted(cx + CONTACT - 2 * RUN_SLIDE, 4);
    case 3: return air(cx - 10, by + 14, 50, [0.5, 1]);
    case 4: return air(cx - 6.5, by + 12, 55, [1, -0.2]);
    case 5: return air(cx - 1.5, by + 11, 60, [1, -0.5]);
    case 6: return air(cx + 6, by + 17.5, 5);
    default: return air(cx + 8.5, by + 22, 0);
  }
}

/** Bent-elbow pump opposite to the same-side leg: the fist rides at the chest going forward and at the hip going back. */
function run(k: number): Pose {
  const s = Math.cos((k * Math.PI) / 4);
  const by = RUN_BOB[k % 4];
  return {
    pelvis: [RUN_X, by],
    hips: RUN_HIPS,
    lean: 7,
    twist: 0.65,
    breath: 0.5,
    head: [0, 0],
    face: 'grit',
    armF: arm(-6 - 34 * s, 112 - 55 * s, { flex: 0.5 }),
    armB: arm(-6 + 34 * s, 112 + 55 * s, { flex: 0.5, behind: true }),
    legF: stride(RUN_X, by, k),
    legB: stride(RUN_X, by, (k + 4) % 8),
  };
}

/* ----------------------------------------------------------- airborne */
/** Takeoff: one fist driven up, the other cocked at the hip, knees tucked (a single fist up, never the victory cheer). */
const JUMP: Pose = {
  pelvis: [PX - 3, HIP_Y - 2],
  lean: 2,
  twist: 0.25,
  breath: 0.8,
  face: 'roar',
  armF: arm(142, 166, { flex: 0.6 }),
  armB: arm(-34, 44, { flex: 0.5 }),
  legF: air(PX + 5.5, 50, 28),
  legB: air(PX - 6, 52.5, 35),
};

/** Apex: both fists cocked at the chest, ready to smash down. */
const APEX: Pose = {
  pelvis: [PX - 2, HIP_Y - 1.5],
  lean: 0,
  twist: 0.15,
  breath: 1.2,
  face: 'roar',
  armF: arm(36, 160, { flex: 1 }),
  armB: arm(-26, 62, { flex: 0.8 }),
  legF: air(PX + 6, 49, 42),
  legB: air(PX - 8, 51, 50),
};

/** Falling: fists driven down and forward, legs braced for the landing. */
const FALL: Pose = {
  pelvis: [PX - 2, HIP_Y - 1],
  lean: 4,
  twist: 0.2,
  face: 'roar',
  armF: arm(30, 8, { flex: 0.4 }),
  armB: arm(-22, 14, { flex: 0.4 }),
  legF: air(PX + 6, 54, 18),
  legB: air(PX - 7.5, 55, 28),
};

/** Heavy landing: wide squat, the head down 3 px and pushed forward, back straight, fists near the knees. */
const LAND: Pose = {
  pelvis: [PX, HIP_Y + 3],
  lean: 7,
  twist: 0.1,
  breath: 1,
  head: [0.5, 0],
  face: 'grit',
  armF: arm(18, 4, { flex: 0.4 }),
  armB: arm(-24, -6, { flex: 0.4 }),
  legF: planted(PX + 13, 0, [1, -0.2]),
  legB: planted(PX - 13.5, 0, [1, -0.1]),
};

/** Hit: the whole body recoils (spine arched back, head thrown back), eyes squeezed shut, arms flung out, heels dug in. */
const HURT: Pose = {
  pelvis: [PX + 1, HIP_Y + 0.5],
  lean: -14,
  twist: -0.2,
  head: [-1, 0.5],
  face: 'hurt',
  armF: arm(58, 24, { flex: 0 }),
  armB: arm(-54, -16, { flex: 0 }),
  legF: planted(PX + 10, -16),
  legB: planted(PX - 8, 22),
};

export const POSES: readonly Pose[] = [
  idle(0, 0, 0),
  idle(0.6, -0.2, 1.5),
  idle(1.2, -0.4, 3),
  idle(0.6, -0.2, 1.5),
  ...[0, 1, 2, 3, 4, 5, 6, 7].map(run),
  JUMP,
  APEX,
  FALL,
  LAND,
  HURT,
  ...PUNCH_POSES,
  ...SLAM_POSES,
  ...ROAR_POSES,
  ...GRAB_POSES,
  ...THROW_POSES,
  ...VICTORY_POSES,
];
