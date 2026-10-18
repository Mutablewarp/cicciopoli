/**
 * Action poses of the hero: punch, ground slam, roar, flag grab / throw and victory (frames 17-34 of HULK in
 * keys.ts). All powerful: the head stays above the shoulders (at most 3 px below its idle height, even in the
 * slam squat: wide legs, chest up) and the fists lead the motion. The slam apex stretches the arms (a smear) so the
 * fists clear the hair; the landing carries three comic impact lines (impact.ts).
 */
import { air, arm, HIP_Y, planted, PX } from './posekit';
import type { Pose } from './rig';

/* ------------------------------------------------------------- punch */
/** Fist cocked at the ribs, the chest turned away: the whole body coils before the strike. */
const PUNCH_WINDUP: Pose = {
  pelvis: [PX - 5, HIP_Y + 1],
  lean: -6,
  twist: -0.5,
  head: [-0.5, 0],
  face: 'grit',
  armF: arm(-52, 30, { flex: 1 }),
  armB: arm(62, 88, { flex: 0.5, behind: true }),
  legF: planted(PX + 8, 0),
  legB: planted(PX - 12, 0),
};

/** Strike (smear): the body stretches, the arm shoots out level at chest height, the rear foot drives off the ground. */
const PUNCH_HIT: Pose = {
  pelvis: [PX - 9, HIP_Y + 1],
  lean: 1,
  twist: 0.75,
  breath: 0.6,
  head: [0.5, 0],
  face: 'roar',
  armF: arm(98, 97, { big: true }),
  armB: arm(-38, 24, { flex: 0.5 }),
  legF: planted(PX + 7, 0, [1, -0.1]),
  legB: planted(PX - 21, 34),
};

/** Held impact: the whole body drops into the blow, shoulder driven forward over a deep front knee. */
const PUNCH_HOLD: Pose = {
  pelvis: [PX - 11, HIP_Y + 3],
  lean: 12,
  twist: 0.6,
  breath: 1.2,
  head: [0.5, -0.6],
  face: 'roar',
  armF: arm(103, 100, { big: true }),
  armB: arm(-28, 14, { flex: 0.5 }),
  legF: planted(PX + 9, 0, [1, -0.1]),
  legB: planted(PX - 19, 38),
};

const PUNCH_RECOVER: Pose = {
  pelvis: [PX - 7, HIP_Y + 1],
  lean: 4,
  twist: 0.3,
  face: 'grit',
  armF: arm(30, 72, { flex: 0.6 }),
  armB: arm(-16, 14),
  legF: planted(PX + 8, 0),
  legB: planted(PX - 12, 10),
};

/* -------------------------------------------------------------- slam */
/** Wide squat before the leap: knees out, chest up, fists swung back. The head drops 3 px and pushes forward. */
const SLAM_CROUCH: Pose = {
  pelvis: [PX, HIP_Y + 2.5],
  lean: 6,
  twist: 0.1,
  breath: 0.8,
  head: [0.5, -0.4],
  face: 'grit',
  armF: arm(-14, -20, { flex: 0.4 }),
  armB: arm(-16, -22, { flex: 0.4 }),
  legF: planted(PX + 14, 0, [1, -0.2]),
  legB: planted(PX - 12.5, 0, [1, -0.1]),
};

/** Leap apex: the body stretched, knees tucked, both arms straight up and slightly inward, the fists well above the head. */
const SLAM_UP: Pose = {
  pelvis: [PX, HIP_Y + 3],
  lean: 0,
  twist: 0,
  breath: 1.2,
  head: [0, 0],
  face: 'roar',
  armF: arm(188, 192, { flex: 0.6, len: 2, thick: 1.12 }),
  armB: arm(172, 168, { flex: 0.6, len: 2, thick: 1.12 }),
  legF: air(PX + 6, 54, 30, [1, 0.3]),
  legB: air(PX - 3, 58, 42, [1, 0.3]),
};

/** Both fists driven down ahead of the stance: the torso pitched forward over a deep front knee, the head up and forward. */
const SLAM_SMASH: Pose = {
  pelvis: [PX - 7, HIP_Y + 2],
  lean: 26,
  twist: 0.5,
  breath: 0.6,
  head: [0.5, -2],
  face: 'roar',
  armF: arm(70, 52, { flex: 0.3, len: 1.2, thick: 1.12 }),
  armB: arm(54, 38, { flex: 0.3, len: 1.2, thick: 1.12 }),
  legF: planted(PX + 10, 0, [1, -0.2]),
  legB: planted(PX - 14, 0, [1, -0.1]),
};

/** Deep squat on impact: both fists planted on the ground in front, chest up, the head still above the shoulders. */
const SLAM_IMPACT: Pose = {
  pelvis: [PX - 10, HIP_Y + 3.5],
  lean: 22,
  twist: 0.45,
  breath: 1,
  head: [0.5, -2.5],
  face: 'roar',
  impact: true,
  armF: arm(34, 12, { flex: 0.2, len: 1.4, thick: 1.12 }),
  armB: arm(24, 8, { flex: 0.2, len: 1.4, thick: 1.12 }),
  legF: planted(PX + 7, 0, [1, -0.2]),
  legB: planted(PX - 17, 0, [1, -0.1]),
};

/* ------------------------------------------------------------- roar */
/** Double biceps: elbows out and down, forearms vertical, fists clear of the head so the neck stays visible. */
const ROAR_FLEX: Pose = {
  pelvis: [PX, HIP_Y],
  lean: -2,
  twist: 0.05,
  breath: 1.5,
  head: [0, -0.3],
  face: 'roar',
  armF: arm(44, 172, { flex: 1 }),
  armB: arm(-44, -172, { flex: 1 }),
  legF: planted(PX + 8.5, 0),
  legB: planted(PX - 9, 0),
};

const ROAR_POUND: Pose = {
  ...ROAR_FLEX,
  breath: 1.2,
  armF: arm(14, -118, { flex: 0.8 }),
};

/* ------------------------------------------------------------- flag */
/** The hand hooks over the pole (~45 px above the ground) with the fingers curling; the whole body stretches toward it. */
const GRAB_REACH: Pose = {
  pelvis: [PX - 9, HIP_Y],
  lean: 7,
  twist: 0.45,
  face: 'grit',
  armF: arm(126, 136, { hand: 'wrap', flex: 0.3, len: 1.18, thick: 1.12 }),
  armB: arm(-8, 10, { flex: 0.3 }),
  legF: planted(PX + 5, 0),
  legB: planted(PX - 17, 10),
};

const GRAB_GRIP: Pose = {
  ...GRAB_REACH,
  pelvis: [PX - 9, HIP_Y + 0.5],
  lean: 9,
  breath: 0.6,
  armF: arm(124, 132, { flex: 0.9, len: 1.18, thick: 1.12 }),
};

/** The yank: elbow driven back, the torn cloth in the fist at chest height, chest out. */
const GRAB_RIP: Pose = {
  pelvis: [PX - 2, HIP_Y],
  lean: -5,
  twist: 0.4,
  breath: 1.4,
  head: [-0.5, -0.5],
  face: 'roar',
  armF: arm(-30, 120, { flex: 1 }),
  armB: arm(-26, -10, { flex: 0.4 }),
  legF: planted(PX + 7, -4),
  legB: planted(PX - 11, 10),
};

/** Overarm throw: windup with the chest turned away and the hand cocked back past the shoulder, release at full reach, swing down. */
const THROW_WINDUP: Pose = {
  pelvis: [PX + 2, HIP_Y],
  lean: -12,
  twist: -1,
  breath: 0.8,
  head: [-0.5, -1],
  face: 'grit',
  armF: arm(-102, -128, { flex: 0.8, len: 1.85, thick: 1.12, behind: true }),
  armB: arm(-22, 8, { flex: 0.3 }),
  legF: planted(PX + 7, 0),
  legB: planted(PX - 11, 0),
};

const THROW_RELEASE: Pose = {
  pelvis: [PX - 11, HIP_Y + 1],
  lean: 6,
  twist: 0.6,
  head: [0.5, 0],
  face: 'roar',
  armF: arm(110, 116, { hand: 'claw', len: 1.05, thick: 1.3, flex: 0.4 }),
  armB: arm(-14, 4, { flex: 0.4 }),
  legF: planted(PX + 5, -4),
  legB: planted(PX - 17, 14),
};

const THROW_FOLLOW: Pose = {
  pelvis: [PX - 9, HIP_Y + 1],
  lean: 5,
  twist: 0.5,
  breath: 0.6,
  face: 'roar',
  armF: arm(64, 44, { hand: 'claw', flex: 0.5, thick: 1.15 }),
  armB: arm(-16, -4, { flex: 0.4 }),
  legF: planted(PX + 6, -2),
  legB: planted(PX - 15, 26),
};

/* ----------------------------------------------------------- victory */
const VICTORY_FLEX: Pose = {
  pelvis: [PX, HIP_Y],
  lean: -2,
  twist: 0.05,
  breath: 1.4,
  head: [0, -0.3],
  face: 'joy',
  armF: arm(48, 176, { flex: 1 }),
  armB: arm(-48, -176, { flex: 1 }),
  legF: planted(PX + 8.5, 0),
  legB: planted(PX - 9, 0),
};

const VICTORY_ROAR: Pose = {
  pelvis: [PX, HIP_Y],
  lean: -3,
  twist: 0.05,
  breath: 1.5,
  head: [0, -0.3],
  face: 'roar',
  armF: arm(32, 170, { flex: 0.6 }),
  armB: arm(-32, -170, { flex: 0.6 }),
  legF: planted(PX + 8.5, 0),
  legB: planted(PX - 9, 0),
};

export const PUNCH_POSES: readonly Pose[] = [PUNCH_WINDUP, PUNCH_HIT, PUNCH_HOLD, PUNCH_RECOVER];
export const SLAM_POSES: readonly Pose[] = [SLAM_CROUCH, SLAM_UP, SLAM_SMASH, SLAM_IMPACT];
export const ROAR_POSES: readonly Pose[] = [ROAR_FLEX, ROAR_POUND];
export const GRAB_POSES: readonly Pose[] = [GRAB_REACH, GRAB_GRIP, GRAB_RIP];
export const THROW_POSES: readonly Pose[] = [THROW_WINDUP, THROW_RELEASE, THROW_FOLLOW];
export const VICTORY_POSES: readonly Pose[] = [VICTORY_FLEX, VICTORY_ROAR];
