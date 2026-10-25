/** DON TUMA tuning: every number of the fight (world units, ms, px/s, px/s²). */
import type { AttackDef } from './kit/sched';

/** Body sheet frame (world units), feet on footY. */
export const BODY = { w: 200, h: 200, footY: 196 } as const;

/** The rolling cheese wheel (body frame TF.ball): centre and radius in frame units. */
export const BALL = { x: 100, y: 174, r: 22 } as const;

/** Projectile sheet layout (props.ts drawShot). */
export const SHOT = { w: 24, h: 24, lemon: 0, orange: 1, blood: 2, honey: 3 } as const;

export type TumaAttack = 'lemons' | 'beam' | 'honey' | 'jaws' | 'spin';

/** Texture keys (all 'ct-tuma-' so the boss unload drops them). */
export const TK = {
  pre: 'ct-tuma-',
  body: 'ct-tuma-body',
  chair: 'ct-tuma-chair',
  shot: 'ct-tuma-shot',
  splat: 'ct-tuma-splat',
  beam: 'ct-tuma-beam',
  jaws: 'ct-tuma-jaws',
  glint: 'ct-tuma-glint',
  dust: 'ct-tuma-dust',
} as const;

/** Speech balloons (one every `sayEvery` attacks). */
export const TUMA_LINES: Record<TumaAttack | 'rage' | 'ko', string> = {
  lemons: 'Prendi, picciotto!',
  beam: 'Guarda che sole!',
  honey: 'Dolce come il miele!',
  jaws: 'Sdraio, mordi!',
  spin: 'Rotola, tuma!',
  rage: 'Mi stai scassando!',
  ko: 'Mamma mia...',
};

export const TUMA_CFG = {
  hp: 1150,
  phases: [0.5],
  /** world units per art unit of the body sheet */
  scale: 1.2,
  /** body texture scale cap (memory: one frame is BODY.w * k px wide) */
  kMax: 2.25,
  seatX: 486,
  standX: 470,
  startMs: 1300,
  transformMs: 2200,
  koMs: 2800,
  /** the hero's body is ~30 wide: every pattern leaves at least this much floor untouched */
  safeW: 56,
  /** floor the hero fights on: left wall .. Don Tuma's shoes */
  field: [16, 410] as const,
  sayEvery: 3,
  /** where shots hurt him, body-frame units [x, y, w, h]: down to the floor so straight fire from the ground lands */
  hurt: {
    /** body + the legs and deck chair under him */
    seat: [
      [80, 58, 96, 112],
      [26, 148, 158, 44],
    ],
    stand: [[58, 44, 96, 150]],
  },
  attacks: [
    [
      { kind: 'lemons', telegraphMs: 750, activeMs: 900, recoverMs: 900, weight: 3 },
      { kind: 'beam', telegraphMs: 1000, activeMs: 800, recoverMs: 900, weight: 2 },
      { kind: 'honey', telegraphMs: 800, activeMs: 1500, recoverMs: 900, weight: 2 },
    ],
    [
      { kind: 'lemons', telegraphMs: 650, activeMs: 900, recoverMs: 700, weight: 3 },
      { kind: 'beam', telegraphMs: 900, activeMs: 800, recoverMs: 700, weight: 2 },
      { kind: 'jaws', telegraphMs: 800, activeMs: 5400, recoverMs: 600, weight: 2 },
      { kind: 'spin', telegraphMs: 900, activeMs: 3600, recoverMs: 800, weight: 2 },
    ],
  ] as const satisfies readonly (readonly AttackDef<TumaAttack>[])[],
  lemon: { n: [4, 5], flightMs: [1150, 950], g: 520, r: 7, splash: 8, gapMs: 130, pinkEvery: 2 },
  beam: { n: [2, 3], w: 44 },
  honey: { n: 6, top: 36, g: 380, r: 6, splash: 6, staggerMs: 170 },
  jaws: { speed: 300, w: 70, h: 34, restX: 590, outX: -40, pauseMs: 700, warnMs: 450 },
  spin: { speed: 330, r: 21, minX: 40 },
} as const;
