/**
 * Level 8 · CICCIO'S GOLDEN TICKET tuning (docs/BRIEF.md §10). World units = the 640 x 360 arena of
 * src/game/cartoon/api.ts; speeds in units / s, accelerations in units / s², times in ms.
 * Tuned for phones: a forgiving hit box, generous parry window, short coyote time and jump buffer.
 */

/** Progress + settings key (src/game/cartoon/logic/store.ts). */
export const CARTOON_STORE = { key: 'cicciopoli.cartoon.v1' } as const;

export const CT_PLAYER = {
  hp: 3,
  /** hit box (smaller than the drawing: fair on a small screen), feet at its bottom centre */
  hitW: 16,
  hitH: 32,
  runSpeed: 158,
  accelGround: 2200,
  accelAir: 1500,
  gravity: 1650,
  jumpVy: 560,
  /** releasing SALTA while rising keeps this share of the upward speed (variable jump) */
  jumpCut: 0.42,
  /** a jump rises at least this long before a release cuts it (a quick tap still hops) */
  jumpMinMs: 80,
  maxFall: 660,
  coyoteMs: 100,
  jumpBufferMs: 140,
  dashSpeed: 420,
  dashMs: 190,
  dashCooldownMs: 380,
  /** SCATTO: invulnerable a little longer than the smear itself */
  dashIframesMs: 240,
  hurtIframesMs: 1700,
  hurtStunMs: 260,
  hurtKnockVx: 130,
  hurtKnockVy: 300,
  /** PARATA: a mid-air SALTA opens this window; pink things inside hitbox + pad pop */
  parryWindowMs: 230,
  parryPad: 12,
  parryBounceVy: 500,
  parryIframesMs: 320,
  /** walls of the arena (hero centre) */
  minX: 20,
  maxX: 620,
  blinkMs: 70,
  /** landing squash amount after a fall at full speed (0..1) */
  landSquash: 0.32,
  squashDecay: 7,
} as const;

/** QA bot look-ahead (src/game/cartoon/logic/dodge.ts, bot.ts): debug only, a careful stand-in player. */
export const CT_BOT = {
  horizonMs: 750,
  stepMs: 25,
  /** hazards are this much bigger in the look-ahead (prediction error) */
  padding: 3,
  jumpDelaysMs: [0, 120, 240, 360] as readonly number[],
  /** distance kept from the boss body, room it needs on a side, gap to the walls */
  keep: 150,
  minRoom: 70,
  wallGap: 24,
  /** it sways this far either side of its spot, switching every wanderMs */
  wander: 55,
  wanderMs: 1000,
  /** reaction delay: hazards younger than this are not seen yet */
  reactMs: 60,
  /** the weapon choice is reconsidered this often */
  weaponEveryMs: 1200,
  /** chance per frame to spend one card on an EX */
  exChance: 0.006,
  /** telegraphed hazards are expected this much earlier and later than their nominal window */
  telegraphSlackMs: 80,
  /** Double Triple's wind-up stub sits this far left of the whip's held end (bosses/doubletriple/moves.ts) */
  whipStubDx: 30,
  cost: { hitPerMs: 10, perUnit: 0.35, facingAway: 25, jump: 12, lateJumpPerMs: 0.01, dash: 35, airborne: 6 },
} as const;

/** Player weapons (damage per hit; the boss hp in BossDef is tuned on these). */
export const CT_WEAPONS = {
  order: ['provola', 'meatball', 'nuggets'] as const,
  provola: { intervalMs: 115, speed: 650, damage: 4, r: 6, lifeMs: 1000 },
  meatball: { intervalMs: 430, vx: 250, vy: -330, upVy: -560, gravity: 1150, damage: 9, splash: 30, r: 6, lifeMs: 2600 },
  nuggets: { intervalMs: 125, speed: 380, turnRate: 7, damage: 2.6, r: 5, lifeMs: 1700, spread: 0.14 },
  /** EX shots: one card each; the hero holds the pose for lockMs */
  ex: {
    lockMs: 260,
    provola: { speed: 560, damage: 34, r: 16, lifeMs: 1400 },
    meatball: { vx: 230, vy: -360, upVy: -560, gravity: 1000, damage: 40, splash: 62, r: 15, lifeMs: 2600 },
    nuggets: { count: 6, damage: 6, speed: 330, fan: 0.9 },
  },
  /** SUPER (5 cards) PIOGGIA DI PATATINE */
  super: { poseMs: 650, rainMs: 2500, fries: 54, damage: 4.6, fallSpeed: 560, spread: 66, cloudY: 46, r: 5 },
} as const;

/** Super meter: 5 cards, filled by damage dealt and parries (EX / super damage does not refill). */
export const CT_CARDS = { max: 5, perDamage: 1 / 105, parry: 1, ex: 1, super: 5 } as const;

/** Report card (src/game/cartoon/logic/rules.ts). */
export const CT_GRADE = {
  /** par time = boss hp / parDps, clamped */
  parDps: 27,
  parMinMs: 45_000,
  parMaxMs: 110_000,
  /** at slowFactor x par the time share is 0 */
  slowFactor: 2.2,
  parriesFull: 3,
  supersFull: 5,
  weights: { time: 0.3, hp: 0.35, parries: 0.15, supers: 0.2 },
  /** minimum share for each grade, best first */
  thresholds: [
    ['A+', 0.9],
    ['A', 0.78],
    ['B', 0.6],
    ['C', 0.4],
    ['D', 0],
  ] as ReadonlyArray<readonly [string, number]>,
} as const;

export const CT_SCORE = {
  perDamage: 2,
  perParry: 150,
  perHeart: 1000,
  timeBonusMax: 3000,
  grade: { 'A+': 5000, A: 3500, B: 2000, C: 1000, D: 300 } as Readonly<Record<string, number>>,
} as const;

/** Round flow beats. */
export const CT_FLOW = {
  introMs: 2100,
  /** after AL TAPPETO! the results wait at least this long and for the boss knockout animation */
  knockoutHoldMs: 2800,
  knockoutSlowMs: 650,
  knockoutTimeScale: 0.3,
  defeatHoldMs: 2300,
  parryHitStopMs: 90,
  /** BossRuntime.onHit (the boss's hit flash) at most this often: <= 3 flashes / s (photosensitivity) */
  bossFlashGapMs: 340,
  /** longest simulated step (a hitch never teleports through a hazard) */
  maxStepMs: 34,
  /** a slow frame runs up to this many steps (game time keeps real time down to ~7 fps, then slows) */
  maxSteps: 4,
  /** the golden ticket finale lasts at most this long (a tap skips it after skipAfterMs) */
  goldenMs: 9000,
  goldenSkipAfterMs: 1500,
  vibrateHurtMs: 90,
  vibrateKo: [60, 50, 120] as readonly number[],
} as const;

/** Framing + texture scale (src/game/cartoon/logic/framing.ts, view.ts). */
export const CT_VIEW = {
  /** portrait: gap around the arena inside the free band (CSS px) */
  marginCss: 6,
  /** k is quantised to this step so a small resize never redraws the art */
  kStep: 0.5,
  /** a viewport change bigger than this share of the width or height (or a turn) pauses the fight */
  pauseOnResize: 0.15,
  /** canvas backing store at most this many device px per CSS px (fill rate of full-screen layers on 3x phones) */
  dprCap: 2,
  /**
   * Where the arena is shown under minZoomCss CSS px per unit (a phone held upright), fights push in up to
   * `max` (never past minZoomCss) on the hero, the boss and the hazards within `watch`
   * units of the hero (margins around the hero: heroX each side, heroTop above the feet), the floor down
   * to floorY always in view; it eases to its target with these time constants (calm: x calmSlow).
   */
  push: { max: 1.35, minZoomCss: 0.84, watch: 190, heroX: 46, heroTop: 72, bossPad: 10, hazardPad: 10, floorY: 334, zoomTauMs: 650, panTauMs: 320, calmSlow: 2 },
  background: '#140d08',
  frameInk: 0x1c1511,
  frameGold: 0xc9a05a,
} as const;

/** Film look (src/game/cartoon/film.ts); calm = reduced motion. */
export const CT_FILM = {
  grainAlpha: 0.2,
  grainEveryFrames: 2,
  grainEveryFramesCalm: 8,
  vignetteEdge: 'rgba(38,20,6,0.78)',
  /** warm wash over the whole arena, baked into the vignette layer (one full-screen layer, not two) */
  sepia: 'rgba(214,163,92,0.1)',
  /** flicker = the wash + vignette layer dips by up to this share of its alpha */
  flickerMax: 0.3,
  flickerMaxCalm: 0.06,
  flickerEveryMs: 70,
  speckChance: 0.18,
  speckChanceCalm: 0.03,
  specks: 6,
  scratchChance: 0.012,
  jitter: 0.6,
  jitterChance: 0.08,
} as const;

/** Lettering (title cards, golden ticket): a vintage serif stack, heavy weight. */
export const CT_FONT = {
  display: '"Rockwell Extra Bold", "Rockwell", "Clarendon", "Bookman Old Style", "Georgia", "Times New Roman", serif',
  script: '"Georgia", "Times New Roman", serif',
} as const;
