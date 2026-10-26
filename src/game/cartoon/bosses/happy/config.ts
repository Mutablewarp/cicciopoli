/** HAPPY BOX tuning: every number of the fight (world units, ms, px/s, px/s²) + the rig cut from the shirt. */
import type { ImageAsset } from '../../api';
import type { RigDef } from '../tuma/kit/rig';
import type { AttackDef } from '../tuma/kit/sched';

export type HappyPart = 'wing' | 'feet' | 'body' | 'lid' | 'armL' | 'armR';

export type HappyAttack = 'spray' | 'drips' | 'minis' | 'rocket';

/** Paint colours: yellow, teal, orange, lime, and PINK last (pink = parryable, never on a plain hazard). */
export const PAINT = ['#f6d23c', '#4fd1a8', '#ff9a3c', '#9ad84a', '#ff7fb8'] as const;
export const PINK = PAINT.length - 1;

export const PUFF = { w: 48, h: 44 } as const;
export const DROP = { w: 16, h: 24 } as const;
export const ROCKET = { w: 72, h: 34 } as const;
export const LANE = { w: 400, h: 16 } as const;
export const DECAL = { w: 70, h: 56 } as const;

/** Texture keys (all 'ct-happy-' so the boss unload drops them). */
export const HK = {
  pre: 'ct-happy-',
  puff: 'ct-happy-puff',
  drop: 'ct-happy-drop',
  mini: 'ct-happy-mini',
  rocket: 'ct-happy-rocket',
  lane: 'ct-happy-lane',
  splat: 'ct-happy-splat',
  decal: 'ct-happy-decal',
  glint: 'ct-happy-glint',
  dust: 'ct-happy-dust',
  mural: 'ct-happy-mural',
} as const;

/** Files written by scripts/level8/happy.mjs from ref/level8_shirt_make_it_happy_v2.png (preloaded by the CORE). */
const LAYERS: readonly HappyPart[] = ['wing', 'feet', 'body', 'lid', 'armL', 'armR'];
const src = (name: string): string => `ct-happy-src-${name}`;
export const HAPPY_ASSETS: readonly ImageAsset[] = [...LAYERS, 'mural'].map((p) => ({ key: src(p), url: `level8/happy/${p}.webp` }));
/** preloaded bitmap -> resampled texture */
export const HAPPY_RIG_LAYERS = LAYERS.map((p) => ({ src: src(p), dst: `ct-happy-${p}` }));
export const HAPPY_MURAL_LAYER = { src: src('mural'), dst: HK.mural };
/** The mural bitmap: crop px, world units per crop px. */
export const MURAL = { w: 395, h: 160, scale: 0.86 } as const;

/**
 * The rig, in px of the photo crop (scripts/level8/happy.mjs, 300 x 260): pivots of the cut-out parts; the
 * anchor is between his feet, on the floor. The arms, the lid and the side flap hang on the box.
 */
export const HAPPY_RIG: RigDef<HappyPart> = {
  w: 300,
  h: 260,
  anchor: [134, 234],
  parts: {
    wing: { key: 'ct-happy-wing', pivot: [98, 104], parent: 'body' },
    feet: { key: 'ct-happy-feet', pivot: [138, 168] },
    body: { key: 'ct-happy-body', pivot: [140, 166] },
    lid: { key: 'ct-happy-lid', pivot: [102, 40], parent: 'body' },
    armL: { key: 'ct-happy-armL', pivot: [96, 146], parent: 'body' },
    armR: { key: 'ct-happy-armR', pivot: [192, 136], parent: 'body' },
  },
};
/** Crop px landmarks: the spray nozzle (on armR), the box mouth under the lid, the gutter drips aim. */
export const SPOT = { nozzle: [222, 44], boxTop: [156, 30] } as const;

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
  /** world units per crop px of the rig (~178 units tall) */
  scale: 0.8,
  /** phase 2: he grows this much */
  grow: 1.15,
  /** texture px per crop px cap (the files are 2.5) */
  texMax: 2.5,
  /** the rig's anchor (between the feet) */
  x: 490,
  startMs: 1800,
  transformMs: 2300,
  koMs: 2800,
  safeW: 56,
  /** floor the hero fights on per phase: left wall .. Happy's glove (he is bigger in phase 2) */
  field: [
    [16, 396],
    [16, 380],
  ] as const,
  sayEvery: 3,
  /** where shots hurt him, crop px [x, y, w, h]: box, glove and feet down to the floor (straight fire from the ground lands) */
  hurt: [26, 34, 196, 200],
  /** where touching him hurts, crop px */
  bodyBox: [34, 44, 180, 190],
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
  minis: { n: [2, 3], hp: 6, r: 13, hopVy: 280, g: 900, speed: 80, flightMs: 700, lifeMs: 5200, gapMs: 450, landX: [300, 370], scale: 0.13, squashMs: 170 },
  rocket: { speed: 340, w: 46, h: 18, low: 13, high: 60, warnMs: 700 },
} as const;

/** Texture px per crop px of the rig layers at texture scale k (drawn at the grown size: phase 2 stays sharp). */
export const happyTex = (k: number): number => Math.min(k * HAPPY_CFG.scale * HAPPY_CFG.grow, HAPPY_CFG.texMax);
