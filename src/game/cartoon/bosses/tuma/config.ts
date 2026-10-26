/** DON TUMA tuning: every number of the fight (world units, ms, px/s, px/s²) + the rig cut from the shirt. */
import type { ImageAsset } from '../../api';
import type { RigDef } from './kit/rig';
import type { AttackDef } from './kit/sched';

export type TumaPart = 'chairBack' | 'legs' | 'wave' | 'body' | 'chairFront';

/** Texture keys (all 'ct-tuma-' so the boss unload drops them). */
export const TK = {
  pre: 'ct-tuma-',
  shot: 'ct-tuma-shot',
  splat: 'ct-tuma-splat',
  beam: 'ct-tuma-beam',
  jaws: 'ct-tuma-jaws',
  wheel: 'ct-tuma-wheel',
  glint: 'ct-tuma-glint',
  dust: 'ct-tuma-dust',
  tree: 'ct-tuma-tree',
} as const;

/** Files written by scripts/level8/tuma.mjs from ref/level8_shirt_tuma_siciliana_v2.png (preloaded by the CORE). */
const LAYERS: readonly TumaPart[] = ['chairBack', 'legs', 'wave', 'body', 'chairFront'];
const src = (name: string): string => `ct-tuma-src-${name}`;
export const TUMA_ASSETS: readonly ImageAsset[] = [
  ...LAYERS.map((p) => ({ key: src(p), url: `level8/tuma/rig-${p}.webp` })),
  { key: src('tree'), url: 'level8/tuma/tree.webp' },
];
/** preloaded bitmap -> resampled texture */
export const TUMA_RIG_LAYERS = LAYERS.map((p) => ({ src: src(p), dst: `ct-tuma-${p}` }));
export const TUMA_TREE_LAYER = { src: src('tree'), dst: TK.tree };

/**
 * The rig, in px of the photo crop (scripts/level8/tuma.mjs item 'rig', 350 x 320): pivots of the cut-out
 * parts; the anchor is the deck chair's front foot, on the floor.
 */
export const TUMA_RIG: RigDef<TumaPart> = {
  w: 350,
  h: 320,
  anchor: [150, 294],
  parts: {
    chairBack: { key: 'ct-tuma-chairBack', pivot: [150, 294] },
    legs: { key: 'ct-tuma-legs', pivot: [112, 146] },
    wave: { key: 'ct-tuma-wave', pivot: [116, 96], parent: 'body' },
    body: { key: 'ct-tuma-body', pivot: [186, 170] },
    chairFront: { key: 'ct-tuma-chairFront', pivot: [150, 294] },
  },
};
/** The potted lemon tree cut from the shirt (160 x 270 crop px), pot base at its bottom. */
export const TREE = { w: 160, h: 270, base: [88, 252] as const, scale: 0.56 } as const;

/** Crop px landmarks of the rig: the waving glove, the sunglasses, the wheel of cheese he is. */
export const SPOT = { glove: [42, 36], glasses: [200, 86], mouth: [162, 132] } as const;

/** Projectile sheet layout (props.ts drawShot). */
export const SHOT = { w: 24, h: 24, lemon: 0, orange: 1, blood: 2, honey: 3 } as const;

export type TumaAttack = 'lemons' | 'beam' | 'honey' | 'jaws' | 'spin';

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
  /** world units per crop px of the rig (~210 units tall in his deck chair) */
  scale: 0.72,
  /** texture px per crop px cap (the files are 2.5) */
  texMax: 2.5,
  /** the rig's anchor (front chair foot) on the floor */
  x: 492,
  startMs: 1800,
  transformMs: 2200,
  koMs: 2800,
  /** the hero's body is ~30 wide: every pattern leaves at least this much floor untouched */
  safeW: 56,
  /** floor the hero fights on: left wall .. the deck chair */
  field: [16, 384] as const,
  sayEvery: 3,
  /** where shots hurt him, crop px [x, y, w, h]: the cheese + the shoes and chair down to the floor (straight fire lands) */
  hurt: [
    [108, 4, 160, 168],
    [16, 168, 272, 126],
  ],
  /** where touching him hurts, crop px */
  bodyBox: [
    [116, 20, 144, 150],
    [20, 172, 260, 122],
  ],
  attacks: [
    [
      { kind: 'lemons', telegraphMs: 850, activeMs: 900, recoverMs: 1000, weight: 3 },
      { kind: 'beam', telegraphMs: 1100, activeMs: 800, recoverMs: 1000, weight: 2 },
      { kind: 'honey', telegraphMs: 900, activeMs: 1500, recoverMs: 1000, weight: 2 },
    ],
    [
      { kind: 'lemons', telegraphMs: 650, activeMs: 900, recoverMs: 700, weight: 3 },
      { kind: 'beam', telegraphMs: 900, activeMs: 800, recoverMs: 700, weight: 2 },
      { kind: 'jaws', telegraphMs: 800, activeMs: 5400, recoverMs: 600, weight: 2 },
      { kind: 'spin', telegraphMs: 900, activeMs: 3600, recoverMs: 800, weight: 2 },
    ],
  ] as const satisfies readonly (readonly AttackDef<TumaAttack>[])[],
  /** the first volley of the fight: fewer citrus, slower (read it first) */
  firstLemons: { n: 3, flightMs: 1300 },
  lemon: { n: [4, 5], flightMs: [1150, 950], g: 520, r: 7, splash: 8, gapMs: 130, pinkEvery: 2 },
  beam: { n: [2, 3], w: 44 },
  honey: { n: 6, top: 36, g: 380, r: 6, splash: 6, staggerMs: 170 },
  jaws: { speed: 300, w: 70, h: 34, restX: 600, outX: -40, pauseMs: 700, warnMs: 450 },
  /** the rolling wheel of tuma: radius, speed, where it turns back, where it rolls from */
  spin: { speed: 330, r: 20, minX: 40, fromX: 400 },
  /** idle: the wave (degrees, ms period), the breathing bob (crop px), the foot tap (degrees) */
  idle: { wave: 9, waveMs: 520, bob: 1.6, bobMs: 900, tap: 2.5, tapMs: 360 },
  /** phase 2 tint (he turns red with anger) */
  angryTint: 0xffc8b8,
} as const;

/** Texture px per crop px of the rig layers / the tree at texture scale k (load and create agree). */
export const tumaTex = (k: number): number => Math.min(k * TUMA_CFG.scale, TUMA_CFG.texMax);
export const treeTex = (k: number): number => Math.min(k * TREE.scale, TUMA_CFG.texMax);
