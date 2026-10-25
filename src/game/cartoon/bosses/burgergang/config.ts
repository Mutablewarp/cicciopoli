/**
 * IL BOSS DELLA BURGER GANG (final boss of level 8) — every tuning number in one place. World units of
 * the 640 x 360 arena (api.ts ARENA), y grows down, times in ms, speeds in units / s.
 * Boss space: x / y relative to the boss feet (centre bottom), at scale 1 (the giant multiplies them).
 */
import type { SfxName } from '../../../../contracts';

export const BG_ID = 'burgergang' as const;
export const PRE = `ct-${BG_ID}-`;

export const BG = {
  hp: 2300,
  /** phase 2 (the gang) under 66 % hp, phase 3 (giant) under 33 % */
  phases: [0.66, 0.33] as readonly number[],
  /** the boss sheets are drawn sharper than k so the giant stays crisp */
  texBoost: 1.2,
  /** stands against the right wall: no pocket behind him for a hero who dashes through (CT_PLAYER.maxX) */
  bx: 580,
  giantBx: 556,
  giant: 1.55,
  growMs: 1100,
  /** idle strut: horizontal sway, breathing squash */
  sway: 6,
  swayMs: 2600,
  squash: 0.035,
  strutFps: 9,
  idleFps: 7,
  startDelayMs: 900,
  /** rest between two attack rounds, per phase */
  restMs: [850, 650, 520] as readonly number[],
  hitFlashMs: 70,
  /** colour-matrix brightness of a hit flash and of the telegraph blinks */
  hitBright: 1.3,
  teleBright: 1.75,
  /** knockout: dizzy, then topples over, done */
  koDizzyMs: 1300,
  koFallMs: 520,
  koDoneMs: 2700,
  /** phase transformations (attacks paused) */
  whistleMs: 1300,
  gulpMs: 1200,
  /** share of gulpMs before the burp and the growth */
  burpAt: 0.55,
  afterPhaseMs: 300,
} as const;

/** Small motion details of the runtime (shakes are halved-to-nothing with reduced motion). */
export const MOTION = {
  canSpinDegMs: 0.6,
  canRattleDeg: 14,
  canRattleMs: 40,
  markGrowMs: 220,
  koShake: 4,
  koShakeMs: 200,
  growShake: 7,
  calmShake: 1,
  /** knockout gag: dizzy wobble, face-first fall, one bounce, the stars fade */
  ko: { wobbleMs: 130, wobbleDeg: 7, fallDeg: 82, bounceDeg: 8, bounceMs: 260, settleMs: 520, starFadeMs: 600, starLift: 14 },
  koShades: { vx: 120, vy: -360, g: 900, spin: 720, drop: 20 },
  stars: { rx: 34, ry: 9, ms: 900 },
  /** telegraph: three brightness blinks of this length */
  blinkMs: 70,
} as const;

/**
 * Body sheet frame (bun stack + face + arms): the stack bottom centre sits at (w / 2, base) and at boss
 * y = -stack (just above the hips). Legs sheet frame: feet on its bottom centre, hips `hip` above it.
 */
export const BODY = { w: 166, h: 144, base: 138, stack: 37, bunH: 102, bunW: 47 } as const;
export const LEGS = { w: 84, h: 44, hip: 36 } as const;
/** Touch / shot box in boss space (scale 1): the bun stack down to the floor (no hiding under the belly). */
export const BOXES = {
  body: { x: -46, y: -139, w: 92, h: 139 },
} as const;

/** Where things leave the boss (boss space, scale 1). */
export const EMIT = {
  cup: { x: -76, y: -96 },
  throwHand: { x: -60, y: -100 },
  shadesHand: { x: -62, y: -102 },
  foot: { x: -34, y: -10 },
  /** gang members jump out from behind the boss legs */
  gang: { x: 30, y: 0 },
} as const;

export const MIN_TELEGRAPH_MS = 500;

/** Attack numbers. Lanes: y of a centre above the floor (positive = up). */
export const ATK = {
  fizz: { teleMs: 750, count: 5, gapMs: 720, speed: 165, r: 10, settleMs: 420, low: 13, high: 82, bob: 3, bobMs: 520, pinkAt: 2 },
  shades: { teleMs: 820, leftX: 46, cy: 56, ay: 36, flightMs: 2400, r: 12, spin: 900, catchMs: 260 },
  geyser: { teleMs: 900, step: 150, w: 26, h: 150, liveMs: 650, wave2Ms: 1000, lo: 34 },
  cans: { edge: 30, jitter: 1.4, jitterMs: 70, graceMs: 150, teleMs: 620, throwMs: 260, cadenceMs: 1350, flightMs: 860, apex: 74, r: 8, rattleMs: 480, offsets: [0, -115, 115] as readonly number[], pinkAt: 1 },
  burst: { dropY: 18, w: 22, h: 118, liveMs: 480, dropR: 5, dropVx: 105, dropVy: 290, dropG: 1000 },
  burger: { r: 12, speed: 112, hopMs: 640, hopH: 50, hp: 14 },
  fries: { w: 16, h: 22, speed: 175, hp: 8, hopH: 6, hopMs: 260 },
  gang: { teleMs: 800, burgerGapMs: 1500, friesAtMs: 2400 },
  stomp: { edge: 24, teleMs: 950, stompMs: 320, waveW: 28, waveH: 26, waveSpeed: 235, shake: 6, shakeMs: 380, bricks: [0, -150, 150] as readonly number[], brickR: 9, brickG: 900, brickSpin: 420 },
  rain: { teleMs: 950, sprayMs: 500, x0: 26, step: 40, r: 12, speed: 112, sway: 6, swayMs: 1900, stagger: 14, waveGapMs: 1900, shiftCols: 2 },
  double: { teleMs: 900, secondMs: 1150 },
  /** gang members laid over other rounds (ms from the round start) */
  combo: { cansBurgerMs: 2600, shadesFriesMs: 1700, fastCadenceMs: 1100, fastBurgerMs: 3300 },
} as const;

/** Sound cues (level 8 sfx). */
export const SFX: Readonly<Record<'tele' | 'throw' | 'burst' | 'whoosh' | 'stomp' | 'grow' | 'burp', SfxName>> = {
  tele: 'ex',
  throw: 'lob',
  burst: 'blast',
  whoosh: 'dash',
  stomp: 'blast',
  grow: 'blast',
  burp: 'oof',
};

/** Speech balloons (Italian). */
export const LINES = {
  start: 'Ehi bello, questo tetto è della gang!',
  gang: 'Ragazzi! Tutti qui!',
  giant: 'BUUURP! Ora faccio sul serio!',
  shadesLost: 'I miei occhiali!',
  ko: 'Ok… la gang è tua…',
} as const;

/** Colours (rubber-hose palette after the Burger Gang shirt). */
export const COL = {
  bun: '#e8a052',
  bunLight: '#f8cd8a',
  bunShade: '#bd7234',
  seed: '#fff3d6',
  lettuce: '#62c23c',
  lettuceDark: '#3a8a22',
  tomato: '#e2432f',
  patty: '#7b4527',
  pattyDark: '#56301a',
  cheese: '#ffc93a',
  cheeseDark: '#e79b16',
  skin: '#dc9450',
  glove: '#fffaf0',
  gloveShade: '#ddd3c0',
  sock: '#f7f3ea',
  shoe: '#3aa8ea',
  shoeLight: '#8fd6ff',
  sole: '#f4f1ea',
  frame: '#ffd43c',
  lens: '#ff3f8e',
  cup: '#e3342c',
  cupDark: '#a3201b',
  white: '#fffaf0',
  tongue: '#e9505a',
  mouth: '#5a1a14',
  pink: '#ff69ad',
  pinkLight: '#ffc2dc',
  soda: '#f3dcae',
  sodaDark: '#b9773e',
  brick: '#c8623e',
  fry: '#ffd257',
  box: '#d7342c',
} as const;
