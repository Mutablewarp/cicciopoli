/**
 * MONSIEUR BRIE tuning (boss 1 of the rush): the rig geometry the hit boxes follow, every attack's
 * timing / speed / size, and the transformation / knockout beats. World units, ms, units / s.
 * Phase 0 = on the blue bicycle; phase 1 = off the bike, on his own rubber-hose legs, melting.
 */
import { ARENA } from '../../api';

const F = ARENA.floorY;

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
    { x: 512, y: F },
    { x: 540, y: F },
  ] as const,
  drift: { amp: 7, periodMs: 2600 },
  /** rig offsets from the feet (facing left) */
  rig: {
    bikeWedge: { x: 26, y: -70 },
    footWedge: { x: 0, y: -40 },
    /** shoulder on the wedge, from the wedge's bottom centre */
    shoulder: { x: -34, y: -22 },
    /** beret centre on the wedge, from the wedge's bottom centre */
    beret: { x: 4, y: -106 },
    /** hand of the throw pose, from the shoulder */
    throwHand: { x: -56, y: -10 },
    bundleHand: { x: -6, y: -52 },
    twirlHand: { x: -20, y: -60 },
    basket: { x: -60, y: -74 },
  },
  /** hit boxes (from the feet, facing left; mirrored when facing right) */
  box: {
    bike: { x: -80, y: -60, w: 160, h: 60 },
    rider: { x: -22, y: -178, w: 82, h: 110 },
    foot: { x: -42, y: -150, w: 84, h: 150 },
  },
  baguette: { teleMs: 800, count: 3, everyMs: 820, speed: 300, dipMs: 220, laneX: 400, w: 40, h: 8, low: 8, high: 58, recoverMs: 650 },
  volley: { teleMs: 700, everyMs: 720, speed: 340, order: ['low', 'high', 'low', 'low'] as const, recoverMs: 600 },
  wheels: { teleMs: 750, count: 3, everyMs: 1000, speed: 190, r: 15, g: 1200, popVy: -160, hopVy: 90, spin: -840, pinkIndex: 1, recoverMs: 600 },
  bounce: { teleMs: 700, count: 3, everyMs: 950, speed: 175, r: 15, g: 900, popVy: -250, hopVy: 355, spin: -760, pinkIndex: 2, spawnX: 515, spawnLift: 40, recoverMs: 600 },
  charge: { teleMs: 1000, rollTo: 430, rollMs: 350, landX: 110, leapMs: 1100, apex: 170, turnMs: 450, settleMs: 250, shake: 6, recoverMs: 700 },
  beret: { teleMs: 800, r: 11, low: 12, high: 92, diveTo: 330, diveMs: 500, farX: 40, outMs: 950, turnMs: 450, backTo: 480, backMs: 1300, homeMs: 300, spin: 900, recoverMs: 600 },
  hop: { teleMs: 750, minX: 70, maxX: 400, outMs: 850, apex: 150, holdMs: 350, backMs: 850, backApex: 130, wave: { w: 26, h: 18, speed: 230, gap: 20 }, shake: 7, recoverMs: 600 },
  javelin: { teleMs: 900, count: 3, spacing: 120, minX: 40, maxX: 430, everyMs: 300, flightMs: 700, apex: 60, stickMs: 700, r: 10, stuckLift: 16, pinkIndex: 1, recoverMs: 600 },
} as const;
