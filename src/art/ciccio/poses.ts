/**
 * Per-frame pose table, indexed exactly like CICCIO in keys.ts (27 frames).
 * Ground rule: a planted 'flat'/'toeUp' shoe has its ankle at y=43, 'heelUp' at y=42,
 * so the sole lands on row 47.
 */
import type { ArmPose, LegPose, Pose, Pt } from './body';
import type { ShoeKind } from './shoes';

const BASE_Y = 38;
/** Running legs share almost one hip line (side view), so both strides look equal. */
const HIP = { F: 1, B: -1 } as const;

/** Leg with knee/ankle given relative to that leg's stride hip. */
function leg(pel: Pt, side: 'F' | 'B', knee: Pt, ankle: Pt, shoe: ShoeKind): LegPose {
  const hx = pel[0] + HIP[side];
  return { knee: [hx + knee[0], pel[1] + knee[1]], ankle: [hx + ankle[0], pel[1] + ankle[1]], shoe };
}

const arm = (up: number, lo: number): ArmPose => ({ up, lo });

const IDLE: Pose = {
  pelvis: [24, BASE_Y],
  lean: 0,
  face: 'normal',
  armB: arm(-15, -5),
  armF: arm(10, 40),
  legB: { knee: [20, 41], ankle: [20, 43], shoe: 'flat' },
  legF: { knee: [28, 41], ankle: [28, 43], shoe: 'flat' },
  club: 0.3,
};

function idle(dy: number, belly: number, face: Pose['face']): Pose {
  return { ...IDLE, pelvis: [24, BASE_Y + dy], belly, face };
}

/* ------------------------------------------------------------------ run */
const RUN_BOB = [0, 1, 0, -1, 0, 1, 0, -1];
const RUN_BELLY = [0, 0.8, 0.2, -0.5, 0, 0.8, 0.2, -0.5];
// near arm stays mostly forward (fist ahead of the belly), far arm swings mostly back
const RUN_ARM_F = [-15, 0, 20, 40, 45, 30, 10, -10];
const RUN_ARM_B = [45, 30, 5, -25, -45, -40, -20, 20];

/** One leg through the 8-phase stride; phase 0 = this leg's heel strike in front. */
function stride(pel: Pt, side: 'F' | 'B', phase: number): LegPose {
  const y = pel[1] - BASE_Y;
  switch (phase) {
    case 0: return leg(pel, side, [4, 2], [7, 5 - y], 'toeUp');
    case 1: return leg(pel, side, [3, 2], [2, 5 - y], 'flat');
    case 2: return leg(pel, side, [1, 3], [-1, 5 - y], 'flat');
    case 3: return leg(pel, side, [-2, 3], [-5, 4 - y], 'heelUp');
    case 4: return leg(pel, side, [-4, 3], [-7, 4 - y], 'heelUp');
    case 5: return leg(pel, side, [-3, 3], [-6, 1], 'trail');
    case 6: return leg(pel, side, [3, 1], [0, 3], 'point');
    default: return leg(pel, side, [5, 1], [7, 3], 'point');
  }
}

function run(k: number): Pose {
  const pel: Pt = [24, BASE_Y + RUN_BOB[k]];
  const lag = RUN_BOB[(k + 7) % 8] - RUN_BOB[k];
  const a = RUN_ARM_F[k];
  const b = RUN_ARM_B[k];
  return {
    pelvis: pel,
    lean: 8,
    belly: RUN_BELLY[k],
    head: [0, lag],
    face: 'normal',
    armF: arm(a, a + 85),
    armB: arm(b, b + 80),
    legF: stride(pel, 'F', k),
    legB: stride(pel, 'B', (k + 4) % 8),
    club: 0.2 + (a / 45) * 0.15,
  };
}

/* ----------------------------------------------------------- airborne */
// Airborne and hurt poses keep the near (club) hand at belly height, in front: the held
// Thai club must point forward, never up across the glasses (QA L1-02).
const JUMP: Pose = {
  pelvis: [24, 35],
  lean: -2,
  face: 'joy',
  armF: arm(55, 80),
  armB: arm(-150, -165),
  legF: { knee: [30, 37], ankle: [28, 42], shoe: 'point' },
  legB: { knee: [22, 38], ankle: [19, 42], shoe: 'point' },
  club: 0.55,
};

const APEX: Pose = {
  pelvis: [24, 35],
  lean: 0,
  belly: 0.4,
  face: 'normal',
  armF: arm(65, 90),
  armB: arm(-105, -140),
  legF: { knee: [30, 38], ankle: [28, 42], shoe: 'point' },
  legB: { knee: [21, 38], ankle: [18, 42], shoe: 'point' },
  club: 0.6,
};

const FALL: Pose = {
  pelvis: [24, 37],
  lean: -3,
  belly: -0.3,
  face: 'hurt',
  armF: arm(60, 95),
  armB: arm(-130, -100),
  legF: { knee: [28, 40], ankle: [29, 42], shoe: 'point' },
  legB: { knee: [21, 40], ankle: [20, 42], shoe: 'point' },
  club: 0.7,
};

const LAND: Pose = {
  pelvis: [24, 40],
  lean: 2,
  squash: 0.07,
  belly: 1,
  face: 'blink',
  armF: arm(55, 85),
  armB: arm(-55, -85),
  legF: { knee: [30, 42], ankle: [29, 43], shoe: 'flat' },
  legB: { knee: [18, 42], ankle: [19, 43], shoe: 'flat' },
  club: 0.65,
};

const HURT: Pose = {
  pelvis: [23, 38],
  lean: -12,
  head: [-1, 0],
  face: 'hurt',
  armF: arm(45, 75),
  armB: arm(-150, -120),
  legF: { knee: [29, 39], ankle: [31, 41], shoe: 'point' },
  legB: { knee: [20, 41], ankle: [19, 43], shoe: 'flat' },
  club: 1,
};

/* -------------------------------------------------------------- flying */
const FLY_BOB = [0, -1, 0, 1];
const FLY_BELLY = [0, 0.6, 0, -0.4];
const FLY_KICK = [0, 1, 0, -1];

function fly(k: number): Pose {
  const b = FLY_BOB[k];
  const kick = FLY_KICK[k];
  return {
    pelvis: [18, 36 + b],
    lean: 75,
    squash: -0.12,
    belly: FLY_BELLY[k],
    headAt: [28, 15 + b + (k === 2 ? 1 : 0)],
    face: 'fly',
    armF: arm(88 - kick * 2, 92),
    armB: arm(100, 95),
    legF: { knee: [12, 40 + b], ankle: [8, 41 + b + kick], shoe: 'trail' },
    legB: { knee: [12, 35 + b], ankle: [8, 35 + b - kick], shoe: 'trail' },
    club: 0.8,
  };
}

/* ------------------------------------------------------ attacks & joy */
const SHOOT: Pose = {
  pelvis: [24, BASE_Y],
  lean: 4,
  face: 'grit',
  armF: arm(75, 88),
  armB: arm(-50, -20),
  legF: { knee: [30, 41], ankle: [30, 43], shoe: 'flat' },
  legB: { knee: [19, 41], ankle: [18, 42], shoe: 'heelUp' },
  club: 0.35,
};

const STANCE: Pick<Pose, 'legF' | 'legB'> = {
  legF: { knee: [31, 41], ankle: [32, 43], shoe: 'flat' },
  legB: { knee: [19, 41], ankle: [18, 43], shoe: 'flat' },
};

const LUNGE: Pick<Pose, 'legF' | 'legB'> = {
  legF: { knee: [33, 41], ankle: [33, 43], shoe: 'flat' },
  legB: { knee: [20, 41], ankle: [17, 42], shoe: 'heelUp' },
};

const CLUB_UP: Pose = {
  ...STANCE,
  pelvis: [24, BASE_Y],
  lean: -8,
  face: 'grit',
  armF: arm(-60, -60),
  armB: arm(60, 90),
  club: -2,
};

const CLUB_HIT: Pose = {
  ...LUNGE,
  pelvis: [25, BASE_Y],
  lean: 10,
  face: 'grit',
  armF: arm(70, 78),
  armB: arm(-60, -30),
  club: 0.9,
};

const CLUB_FOLLOW: Pose = {
  ...LUNGE,
  pelvis: [25, BASE_Y + 1],
  lean: 14,
  belly: 0.5,
  face: 'joy',
  armF: arm(30, 20),
  armB: arm(-45, -20),
  club: 1.9,
};

const VICTORY_PUMP: Pose = {
  pelvis: [24, BASE_Y],
  lean: -6,
  face: 'joy',
  armF: arm(140, 165),
  armB: arm(-40, -10),
  armFBack: true,
  legF: { knee: [29, 41], ankle: [29, 43], shoe: 'flat' },
  legB: { knee: [19, 41], ankle: [19, 43], shoe: 'flat' },
  club: -0.6,
};

const VICTORY_HOP: Pose = {
  pelvis: [24, 35],
  lean: -6,
  belly: -0.3,
  face: 'joy',
  armF: arm(140, 160),
  armB: arm(-150, -165),
  armFBack: true,
  legF: { knee: [28, 39], ankle: [28, 42], shoe: 'point' },
  legB: { knee: [21, 39], ankle: [20, 42], shoe: 'point' },
  club: -0.6,
};

export const POSES: readonly Pose[] = [
  idle(0, 0, 'normal'),
  idle(-1, -0.3, 'normal'),
  idle(0, 0.8, 'normal'),
  idle(0, 0, 'blink'),
  ...[0, 1, 2, 3, 4, 5, 6, 7].map(run),
  JUMP,
  APEX,
  FALL,
  LAND,
  HURT,
  ...[0, 1, 2, 3].map(fly),
  SHOOT,
  CLUB_UP,
  CLUB_HIT,
  CLUB_FOLLOW,
  VICTORY_PUMP,
  VICTORY_HOP,
];

/** Idle loop: breathe in/out twice, then a blink — about 3 s at 6 fps. */
export const IDLE_SEQUENCE: readonly number[] = [0, 1, 1, 0, 2, 2, 0, 1, 1, 0, 2, 2, 0, 1, 1, 3, 2, 2];
