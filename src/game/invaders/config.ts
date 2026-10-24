/**
 * Level 3 tuning. World units = art pixels; the playfield is a fixed 204 x 246 portrait box
 * (it was 224 x 288 before the zoom pass: a narrower, shorter field is framed at a bigger
 * zoom, and the jet art grew from 29 to 41 px). Distances shrank by ~0.8 x (width) and
 * ~0.7 x (formation to jet), so the speeds below are scaled to keep every time the same:
 * edge-to-edge flight, shot and bomb flight, formation march (see invaders.test.ts).
 */

export const FIELD = { w: 204, h: 246 } as const;
/** Vertical band that must stay clear of the HUD (top) and touch controls (bottom). */
export const SPAN = { top: 10, bottom: 246 } as const;

export const JET = {
  y: 208,
  speed: 108,
  accel: 1100,
  /** the 41 px wide jet may touch the field edges */
  minX: 21,
  maxX: 183,
  /** hitbox (inside the box of Ciccio's face, not the wing tips) around (x, y + hitDy) */
  hitW: 14,
  hitH: 12,
  hitDy: 2,
  noseY: -17,
  /** falling food / capsules are caught by a box as wide as the wings */
  catchW: 28,
  catchH: 24,
  catchDy: 2,
} as const;

export const SHOT = { speed: 260, max: 2, cooldownMs: 140, autoMs: 260 } as const;

export const FORM = {
  cols: 8,
  rows: 5,
  dx: 18,
  dy: 17,
  stepX: 2,
  drop: 4,
  minX: 2,
  maxX: 202,
  /** an invader whose bottom reaches this line hits the jet's row */
  invadeY: 194,
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
  { top: 44, rows: ['alienA', 'alienB', 'planet', 'asteroid', 'pebble'], baseStepMs: 360, minStepMs: 85, bombMs: 1400, maxBombs: 2, bombSpeed: 45, carriers: 2 },
  { top: 50, rows: ['alienB', 'alienA', 'planet', 'planet', 'asteroid'], baseStepMs: 300, minStepMs: 75, bombMs: 1150, maxBombs: 3, bombSpeed: 51, carriers: 2 },
  { top: 56, rows: ['alienA', 'alienB', 'alienA', 'planet', 'asteroid'], baseStepMs: 250, minStepMs: 65, bombMs: 920, maxBombs: 3, bombSpeed: 55, carriers: 3 },
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

export const UFO = { y: 22, speed: 41, firstMs: 9000, minGapMs: 15000, maxGapMs: 23000, minAlive: 5, soundMs: 900 } as const;
export const CHAIN = { hops: 3, radius: 42, hopMs: 70 } as const;
export const DROP = { foodFall: 24, foodSway: 4, capsuleFall: 32 } as const;
export const SHIELDS = { top: 162, xs: [27, 77, 127, 177] } as const;
/** caught-food tray along the bottom of the field: one 20 px food icon per 20 px slot, edge to edge */
export const TRAY = { y: 236, x0: 12, step: 20, max: 10 } as const;
export const HOLE = { x: 102, y: 78 } as const;
/** hit shake: amplitude in world px, whatever the zoom (the backdrop is padded beyond it) */
export const SHAKE = { ms: 180, px: 3 } as const;
