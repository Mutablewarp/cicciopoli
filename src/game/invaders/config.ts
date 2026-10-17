/**
 * Level 3 tuning. World units = art pixels; the playfield is a fixed 224 x 288 portrait box.
 */

export const FIELD = { w: 224, h: 288 } as const;
/** Vertical band that must stay clear of the HUD (top) and touch controls (bottom). */
export const SPAN = { top: 18, bottom: 288 } as const;

export const JET = {
  y: 250,
  speed: 118,
  accel: 1100,
  minX: 14,
  maxX: 210,
  /** hitbox around (x, y + 3) */
  hitW: 16,
  hitH: 11,
  noseY: -13,
} as const;

export const SHOT = { speed: 320, max: 2, cooldownMs: 140, autoMs: 260 } as const;

export const FORM = {
  cols: 8,
  rows: 5,
  dx: 20,
  dy: 17,
  stepX: 2,
  drop: 6,
  minX: 4,
  maxX: 220,
  /** an invader whose bottom reaches this line hits the jet's row */
  invadeY: 238,
} as const;

export type InvaderKind = 'alienA' | 'alienB' | 'planet' | 'asteroid' | 'pebble';

export interface WaveDef {
  /** y of the top row centre */
  top: number;
  rows: readonly InvaderKind[];
  baseStepMs: number;
  minStepMs: number;
  bombMs: number;
  maxBombs: number;
  bombSpeed: number;
  carriers: number;
}

export const WAVES: readonly WaveDef[] = [
  { top: 56, rows: ['alienA', 'alienB', 'planet', 'asteroid', 'pebble'], baseStepMs: 360, minStepMs: 85, bombMs: 1400, maxBombs: 2, bombSpeed: 62, carriers: 2 },
  { top: 62, rows: ['alienB', 'alienA', 'planet', 'planet', 'asteroid'], baseStepMs: 300, minStepMs: 75, bombMs: 1150, maxBombs: 3, bombSpeed: 72, carriers: 2 },
  { top: 68, rows: ['alienA', 'alienB', 'alienA', 'planet', 'asteroid'], baseStepMs: 250, minStepMs: 65, bombMs: 920, maxBombs: 3, bombSpeed: 80, carriers: 3 },
];

export const POINTS: Readonly<Record<InvaderKind, number>> = { alienA: 30, alienB: 30, planet: 20, asteroid: 10, pebble: 10 };
export const FOOD_POINTS = 50;
export const CLEAR_BONUS = 300;
export const UFO_POINTS = [100, 150, 200, 300] as const;

/** Hitbox (w, h) per kind, centred on the sprite. */
export const HITBOX: Readonly<Record<InvaderKind, readonly [number, number]>> = {
  alienA: [12, 12],
  alienB: [14, 10],
  planet: [12, 10],
  asteroid: [11, 11],
  pebble: [8, 8],
};

export const RULES = {
  hearts: 4,
  invulnMs: 1600,
  startScore: 161,
  startCharges: 1,
  maxCharges: 5,
} as const;

export const UFO = { y: 30, speed: 44, firstMs: 9000, minGapMs: 15000, maxGapMs: 23000, minAlive: 5, soundMs: 900 } as const;
export const CHAIN = { hops: 3, radius: 46, hopMs: 70 } as const;
export const DROP = { foodFall: 30, foodSway: 5, capsuleFall: 40 } as const;
export const SHIELDS = { top: 206, xs: [28, 84, 140, 196] } as const;
/** caught-food tray along the bottom of the field */
export const TRAY = { y: 279, x0: 10, step: 15, max: 14 } as const;
export const HOLE = { x: 112, y: 76 } as const;
/** hit shake: amplitude in world px, whatever the zoom (the backdrop is padded beyond it) */
export const SHAKE = { ms: 180, px: 3 } as const;
