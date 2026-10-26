/**
 * MONSIEUR BRIE tuning (boss 1 of the rush): the rig geometry the hit boxes follow (measured on the shirt
 * cut-outs, BRIE_ART pivots), every attack's timing / speed / size, and the transformation / knockout beats.
 * World units, ms, units / s. Phase 0 = on the blue bicycle; phase 1 = off the bike, on his own
 * rubber-hose legs, melting.
 */
import { ARENA, type Vec } from '../../api';
import { BRIE_ART as A } from './sheet';

const F = ARENA.floorY;
const PX = A.pxPerUnit;
const P = A.pivots;
/** pivot b seen from pivot a, world units */
const rel = (a: Vec, b: Vec): Vec => ({ x: (b.x - a.x) / PX, y: (b.y - a.y) / PX });

/** Arm pose: the hand (the glove's wrist) from the shoulder, the hose bend and a glove twist (radians). */
export interface ArmPose {
  readonly hand: Vec;
  readonly bend: number;
  readonly twist: number;
}
const arm = (x: number, y: number, bend: number, twist = 0): ArmPose => ({ hand: { x, y }, bend, twist });
const GRIP = rel(P.shoulderR, P.wrist);

export const BRIE = {
  hp: 1400,
  phases: [0.5] as readonly number[],
  introMs: 900,
  transformMs: 2200,
  koMs: 2400,
  /** the transformation: brakes (skid), flung off the bike (fly) onto his own legs; the bike rolls away */
  transform: { skidMs: 500, flyMs: 1000, apex: 140, skidBack: 30, bikeRoll: 0.42, bikeSpin: 0.012 },
  /** the knockout: wobble, melt into a puddle, the beret floats down */
  ko: { wobbleMs: 500, meltMs: 1200, beretFrom: -150, beretTo: -24, starsAt: 700 },
  /** rest feet position per phase and the gentle back-and-forth while pedalling */
  rest: [
    { x: 506, y: F },
    { x: 540, y: F },
  ] as const,
  drift: { amp: 7, periodMs: 2600 },
  /** rig offsets (facing left, as printed on the shirt) */
  rig: {
    /** the wedge's bottom centre from the feet: on the saddle (as printed) / standing on his legs */
    bikeWedge: rel(A.origin, P.wedgeBase),
    footWedge: { x: 0, y: -50 },
    /** right shoulder (where the arm leaves the cheese) and left shoulder, from the wedge's bottom centre */
    shoulder: rel(P.wedgeBase, P.shoulderR),
    shoulderL: rel(P.wedgeBase, P.shoulderL),
    /** hips from the wedge's bottom centre; ankles from the feet (on foot) */
    hips: [rel(P.wedgeBase, P.hipFar), rel(P.wedgeBase, P.hipNear)] as const,
    ankles: [
      { x: -18, y: -24 },
      { x: 10, y: -24 },
    ] as const,
    /** hand of the throw pose, the javelin bundle and the beret twirl, from the shoulder */
    throwHand: { x: -52, y: 14 },
    bundleHand: { x: 6, y: -50 },
    twirlHand: { x: -15, y: -76 },
    /** beret centre on the wedge, from the wedge's bottom centre */
    beret: rel(P.wedgeBase, P.beret),
    /** basket mouth, from the feet (the brie wheels pop out of it) */
    basket: rel(A.origin, P.basket),
  },
  /** right-arm poses (from the right shoulder); grip = on the handlebar as printed */
  arms: {
    grip: arm(GRIP.x, GRIP.y, 0),
    raise: arm(14, -36, -6, -0.3),
    throw: arm(-52, 14, 8),
    twirl: arm(-15, -76, -8, 0.2),
    basket: arm(-62, 14, -10),
    bundle: arm(6, -50, -8),
    fist: arm(6, -40, -6, -0.2),
    limp: arm(10, 30, 8, 0.4),
  },
  /** limbs: hose fill width and ink edge (world units); a foot's turn when standing */
  limb: { arm: { w: 2.8, edge: 1.5 }, leg: { w: 4.6, edge: 1.5 }, footRot: -0.35 },
  /** hit boxes (from the feet, facing left; mirrored when facing right) */
  box: {
    bike: { x: -64, y: -84, w: 128, h: 84 },
    rider: { x: -30, y: -190, w: 98, h: 108 },
    foot: { x: -44, y: -156, w: 94, h: 156 },
  },
  baguette: { teleMs: 800, count: 3, everyMs: 820, speed: 300, dipMs: 220, laneX: 400, w: 40, h: 8, low: 8, high: 58, recoverMs: 650 },
  volley: { teleMs: 700, everyMs: 720, speed: 340, order: ['low', 'high', 'low', 'low'] as const, recoverMs: 600 },
  wheels: { teleMs: 750, count: 3, everyMs: 1000, speed: 190, r: 15, g: 1200, popVy: -160, hopVy: 90, spin: -840, pinkIndex: 1, recoverMs: 600 },
  bounce: { teleMs: 700, count: 3, everyMs: 950, speed: 175, r: 15, g: 900, popVy: -250, hopVy: 355, spin: -760, pinkIndex: 2, spawnX: 515, spawnLift: 40, recoverMs: 600 },
  charge: { teleMs: 1000, rollTo: 430, rollMs: 350, landX: 110, leapMs: 1100, apex: 170, turnMs: 450, settleMs: 250, shake: 6, recoverMs: 700 },
  beret: { teleMs: 800, r: 11, low: 12, high: 92, diveTo: 330, diveMs: 500, farX: 40, outMs: 950, turnMs: 450, backTo: 480, backMs: 1300, homeMs: 300, spin: 900, recoverMs: 600 },
  /** openDx: the phase-1 opener lands this far beside the hero (clear of his hit box), not on him */
  hop: { teleMs: 750, minX: 70, maxX: 400, openDx: 90, outMs: 850, apex: 150, holdMs: 350, backMs: 850, backApex: 130, wave: { w: 26, h: 18, speed: 230, gap: 20 }, shake: 7, recoverMs: 600 },
  javelin: { teleMs: 900, count: 3, spacing: 120, minX: 40, maxX: 430, everyMs: 300, flightMs: 700, apex: 60, stickMs: 700, r: 10, stuckLift: 16, pinkIndex: 1, recoverMs: 600 },
} as const;
