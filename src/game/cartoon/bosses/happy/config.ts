/** HAPPY BOX tuning: every number of the fight (world units, ms, px/s, px/s²) + sheet layouts and keys. */
import type { AttackDef } from '../tuma/kit/sched';

export type HappyAttack = 'spray' | 'drips' | 'minis' | 'rocket';

/** Paint colours: yellow, teal, orange, lime, and PINK last (pink = parryable, never on a plain hazard). */
export const PAINT = ['#f6d23c', '#4fd1a8', '#ff9a3c', '#9ad84a', '#ff7fb8'] as const;
export const PINK = PAINT.length - 1;

/** Body sheet frame (world units), feet on footY. */
export const BODY = { w: 200, h: 220, footY: 216 } as const;
export const PUFF = { w: 48, h: 44 } as const;
export const DROP = { w: 16, h: 24 } as const;
export const MINI = { w: 42, h: 44 } as const;
export const ROCKET = { w: 72, h: 34 } as const;
export const LANE = { w: 400, h: 16 } as const;
export const DECAL = { w: 70, h: 56 } as const;

/** Texture keys (all 'ct-happy-' so the boss unload drops them). */
export const HK = {
  pre: 'ct-happy-',
  body: 'ct-happy-body',
  mess: 'ct-happy-mess',
  puff: 'ct-happy-puff',
  drop: 'ct-happy-drop',
  mini: 'ct-happy-mini',
  rocket: 'ct-happy-rocket',
  lane: 'ct-happy-lane',
  splat: 'ct-happy-splat',
  decal: 'ct-happy-decal',
  glint: 'ct-happy-glint',
  dust: 'ct-happy-dust',
} as const;

export const HAPPY_LINES: Record<HappyAttack | 'rage' | 'ko', string> = {
  spray: 'Un po’ di colore!',
  drips: 'Piove felicità!',
  minis: 'Bimbi, all’attacco!',
  rocket: 'Razzo spray in arrivo!',
  rage: 'MAKE IT HAPPY!',
  ko: 'Felice... di riposare.',
};

export const HAPPY_CFG = {
  hp: 1250,
  phases: [0.5],
  scale: 1.1,
  /** phase 2: he grows this much */
  grow: 1.22,
  /** body texture scale cap (memory: drawn at the grown size so phase 2 stays sharp) */
  kMax: 2,
  x: 514,
  startMs: 1300,
  transformMs: 2300,
  koMs: 2800,
  safeW: 56,
  /** floor the hero fights on per phase: left wall .. Happy's flap (he is bigger in phase 2) */
  field: [
    [16, 410],
    [16, 386],
  ] as const,
  sayEvery: 3,
  /** where shots hurt him, body-frame units [x, y, w, h]: box + legs down to the floor (straight fire from the ground lands) */
  hurt: [24, 40, 132, 172],
  attacks: [
    [
      { kind: 'spray', telegraphMs: 800, activeMs: 1000, recoverMs: 900, weight: 3 },
      { kind: 'drips', telegraphMs: 800, activeMs: 1300, recoverMs: 900, weight: 2 },
      { kind: 'minis', telegraphMs: 750, activeMs: 1200, recoverMs: 1100, weight: 2 },
    ],
    [
      { kind: 'spray', telegraphMs: 700, activeMs: 1000, recoverMs: 700, weight: 3 },
      { kind: 'drips', telegraphMs: 700, activeMs: 1200, recoverMs: 700, weight: 2 },
      { kind: 'minis', telegraphMs: 650, activeMs: 1200, recoverMs: 900, weight: 2 },
      { kind: 'rocket', telegraphMs: 800, activeMs: 1700, recoverMs: 800, weight: 3 },
    ],
  ] as const satisfies readonly (readonly AttackDef<HappyAttack>[])[],
  spray: { n: [4, 5], flightMs: 750, g: 320, r: 13, splash: 4, lingerMs: 1800, fadeMs: 300, gapMs: 90, pinkEvery: 2 },
  drips: { n: [6, 7], top: 46, g: 420, r: 6, splash: 6, staggerMs: [170, 130] },
  minis: { n: [2, 3], hp: 6, r: 13, hopVy: 280, g: 900, speed: 80, flightMs: 700, lifeMs: 5200, gapMs: 450, landX: [300, 380] },
  rocket: { speed: 340, w: 46, h: 18, low: 13, high: 60, warnMs: 700 },
} as const;
