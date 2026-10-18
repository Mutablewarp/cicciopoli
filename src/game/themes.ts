/**
 * Theme configs: everything level-agnostic code needs to dress a level (art pack to
 * load lazily, texture keys, parallax stack, music, hazard). Level 2 adds INFERNO here,
 * level 5 RAMPAGE (themeRampage.ts).
 */
import { CICCIO, CICCIO_ANIMS, HILLS, HILLS_ANIMS, INFERNO, INFERNO_ANIMS, ITEM_ANIMS, ITEMS } from '../art/keys';
import { PARALLAX } from '../config/tuning';
import type { MusicName } from '../contracts';
import type { DecorKind, ThemeId } from './levels/types';
import { type AnimSpec, loop, once, seq, type TexSpec } from './placeholders';
import { RAMPAGE_THEME } from './themeRampage';

export interface LayerDef {
  key: string;
  /** horizontal parallax factor */
  factor: number;
  /** vertical parallax factor (how much the layer follows vertical camera moves) */
  vFactor: number;
  /** px the layer's bottom edge sits below the ground surface */
  sink: number;
  /** constant drift in px/s (clouds) */
  drift?: number;
}

export interface DecorDef {
  key: string;
  anim?: string;
  /** px the sprite is pushed into the ground so grass overlaps its base */
  sink: number;
  /** additive light centred this many px above the feet (torches) */
  glowDy?: number;
}

/** One huge, slow, animated sprite behind every layer (the level 2 fire vortex). */
export interface BackdropDef {
  key: string;
  anim: string;
  /** where its centre sits across the view at the level start (0 left … 1 right) */
  x: number;
  /**
   * share of the view it drifts left by the level end: a parallax factor that scales with
   * the view, so it stays in frame on a narrow portrait screen too
   */
  sweep: number;
  /** centre height above the horizon, px */
  rise: number;
  /** vertical parallax factor */
  vFactor: number;
}

export interface ThemeConfig {
  id: ThemeId;
  /**
   * Lazily imported art modules (path relative to src/game) and their build*Art export,
   * built in order. A theme may borrow props from another pack (e.g. hills ? blocks).
   */
  art: { module: string; builder: string }[];
  loadingText: string;
  music: MusicName;
  tileset: string;
  sky: string;
  backdrop?: BackdropDef;
  /** back to front */
  layers: LayerDef[];
  qblock: { key: string; anim: string; usedFrame: number };
  crate: string;
  flag: { key: string; anim: string; baseX: number; baseY: number };
  hole: string;
  checkpoint: { key: string; anim: string };
  decor: Partial<Record<DecorKind, DecorDef>>;
  /** warm additive lights on the lit brazier and the goal hole */
  lights?: boolean;
  hazard: 'pit' | 'lava';
  /** lava: px above the level bottom where the lava surface strip starts */
  lavaTop?: number;
  /**
   * Lava: feet lower than this many px above the level bottom = burnt. Omitted (pits):
   * the body must drop fully below the level.
   */
  hazardLine?: number;
  /** level 5: the goal flag is ripped off and thrown away instead of the drop into the hole */
  ripFinale?: { pole: string; cloth: string; clothAnim: string };
  /** textures the level cannot work without: placeholders are generated if missing */
  required: TexSpec[];
  /** animations gameplay plays; recreated from placeholder frames if the pack lacks them */
  anims: AnimSpec[];
}

export const HILLS_THEME: ThemeConfig = {
  id: 'hills',
  art: [{ module: '../art/hills.ts', builder: 'buildHillsArt' }],
  loadingText: 'Preparo le colline…',
  music: 'hills',
  tileset: HILLS.tiles,
  sky: HILLS.sky,
  layers: [
    { key: HILLS.clouds, factor: PARALLAX.clouds, vFactor: 0.15, sink: -64, drift: PARALLAX.cloudDrift },
    { key: HILLS.far, factor: PARALLAX.far, vFactor: 0.3, sink: 8 },
    { key: HILLS.near, factor: PARALLAX.near, vFactor: 0.5, sink: 8 },
    { key: HILLS.bushes, factor: PARALLAX.bushes, vFactor: 0.75, sink: 8 },
  ],
  qblock: { key: HILLS.qblock, anim: HILLS_ANIMS.qblock, usedFrame: 4 },
  crate: HILLS.crate,
  flag: { key: HILLS.flag, anim: HILLS_ANIMS.flag, baseX: 8, baseY: 63 },
  hole: HILLS.hole,
  checkpoint: { key: HILLS.checkpoint, anim: HILLS_ANIMS.checkpointOn },
  decor: {
    tree: { key: HILLS.tree, sink: 2 },
    bush: { key: HILLS.bush, sink: 2 },
    flower: { key: HILLS.flower, anim: HILLS_ANIMS.flower, sink: 1 },
    rock: { key: HILLS.rock, sink: 1 },
    sign: { key: HILLS.sign, sink: 1 },
  },
  hazard: 'pit',
  required: [
    { key: HILLS.tiles, w: 16, h: 16, frames: 16, kind: 'tileset' },
    { key: HILLS.sky, w: 16, h: 512, color: '#60ccf0' },
    { key: HILLS.clouds, w: 512, h: 128, color: 'transparent' },
    { key: HILLS.far, w: 512, h: 128, color: '#a8d8c0' },
    { key: HILLS.near, w: 512, h: 192, color: '#489c30' },
    { key: HILLS.bushes, w: 512, h: 64, color: '#2f7a24' },
    { key: HILLS.qblock, w: 16, h: 16, frames: 5, color: '#fc9000' },
    { key: HILLS.crate, w: 16, h: 16, color: '#a86c30' },
    { key: HILLS.flag, w: 32, h: 64, frames: 4, color: '#fc000c' },
    { key: HILLS.hole, w: 32, h: 10, color: '#141414' },
    { key: HILLS.checkpoint, w: 16, h: 32, frames: 4, color: '#fcc000' },
    { key: HILLS.tree, w: 32, h: 48, color: '#2f7a24' },
    { key: HILLS.bush, w: 32, h: 16, color: '#48b424' },
    { key: HILLS.flower, w: 8, h: 8, frames: 4, color: '#fc0c24' },
    { key: HILLS.rock, w: 16, h: 8, color: '#8a8a8a' },
    { key: HILLS.sign, w: 16, h: 16, color: '#a86c30' },
    { key: HILLS.pickle, w: 24, h: 24, frames: 7, color: '#5cc020' },
    { key: HILLS.chili, w: 24, h: 24, frames: 5, color: '#e83020' },
    { key: HILLS.armor, w: 32, h: 32, frames: 6, color: '#9a9aa8' },
  ],
  anims: [
    loop(HILLS_ANIMS.qblock, HILLS.qblock, [0, 1, 2, 3], 6),
    loop(HILLS_ANIMS.flag, HILLS.flag, [0, 1, 2, 3], 8),
    loop(HILLS_ANIMS.checkpointOn, HILLS.checkpoint, [1, 2, 3], 8),
    loop(HILLS_ANIMS.flower, HILLS.flower, [0, 1, 2, 3], 4),
    loop(HILLS_ANIMS.pickleWalk, HILLS.pickle, [0, 1, 2, 3], 8),
    loop(HILLS_ANIMS.pickleCharge, HILLS.pickle, [4, 5], 14),
    loop(HILLS_ANIMS.chiliIdle, HILLS.chili, [0, 1], 8),
    loop(HILLS_ANIMS.armorWalk, HILLS.armor, [0, 1, 2, 3], 6),
  ],
};

export const INFERNO_THEME: ThemeConfig = {
  id: 'inferno',
  // ? blocks are borrowed from the cup world: the box art shows the same orange ??? blocks
  art: [
    { module: '../art/hills.ts', builder: 'buildHillsArt' },
    { module: '../art/inferno.ts', builder: 'buildInfernoArt' },
  ],
  loadingText: 'Scaldo la lava…',
  music: 'inferno',
  tileset: INFERNO.tiles,
  sky: INFERNO.sky,
  backdrop: { key: INFERNO.vortex, anim: INFERNO_ANIMS.vortex, x: 0.66, sweep: PARALLAX.vortexSweep, rise: 150, vFactor: 0.1 },
  layers: [
    { key: INFERNO.clouds, factor: PARALLAX.clouds, vFactor: 0.15, sink: -100, drift: PARALLAX.cloudDrift },
    { key: INFERNO.far, factor: PARALLAX.far, vFactor: 0.3, sink: 4 },
    { key: INFERNO.near, factor: PARALLAX.near, vFactor: 0.5, sink: 10 },
  ],
  qblock: { key: HILLS.qblock, anim: HILLS_ANIMS.qblock, usedFrame: 4 },
  crate: HILLS.crate,
  flag: { key: INFERNO.flag, anim: INFERNO_ANIMS.flag, baseX: 8, baseY: 63 },
  hole: INFERNO.hole,
  checkpoint: { key: INFERNO.checkpoint, anim: INFERNO_ANIMS.checkpointOn },
  decor: {
    torch: { key: INFERNO.torch, anim: INFERNO_ANIMS.torch, sink: 0, glowDy: 13 },
    spire: { key: INFERNO.spire, sink: 2 },
    chain: { key: INFERNO.chain, sink: 0 },
  },
  lights: true,
  hazard: 'lava',
  // the lava strip reaches the level bottom exactly; feet 10 px into it burn
  hazardLine: 22,
  lavaTop: 32,
  required: [
    { key: INFERNO.tiles, w: 16, h: 16, frames: 16, kind: 'tileset' },
    { key: INFERNO.sky, w: 16, h: 512, color: '#6e1626' },
    { key: INFERNO.vortex, w: 256, h: 256, frames: 8, color: 'transparent' },
    { key: INFERNO.clouds, w: 512, h: 128, color: 'transparent' },
    { key: INFERNO.far, w: 512, h: 160, color: '#4a0e1c' },
    { key: INFERNO.near, w: 512, h: 192, color: '#2a1018' },
    { key: INFERNO.lava, w: 32, h: 32, frames: 4, color: '#fc7a10' },
    { key: INFERNO.lavaGlow, w: 64, h: 32, color: 'transparent' },
    { key: INFERNO.ember, w: 4, h: 4, frames: 4, color: '#fc9c30' },
    { key: INFERNO.torch, w: 8, h: 16, frames: 4, color: '#fc7a10' },
    { key: INFERNO.spire, w: 16, h: 48, color: '#3a2a30' },
    { key: INFERNO.chain, w: 8, h: 32, color: '#56404a' },
    { key: INFERNO.flag, w: 32, h: 64, frames: 4, color: '#fc000c' },
    { key: INFERNO.hole, w: 32, h: 10, color: '#141414' },
    { key: INFERNO.checkpoint, w: 16, h: 32, frames: 4, color: '#fcc000' },
    { key: INFERNO.bat, w: 24, h: 16, frames: 5, color: '#6a2034' },
    { key: INFERNO.demon, w: 24, h: 24, frames: 5, color: '#d8281c' },
    { key: INFERNO.spirit, w: 16, h: 24, frames: 4, color: '#fc7a10' },
    { key: HILLS.qblock, w: 16, h: 16, frames: 5, color: '#fc9000' },
    { key: HILLS.crate, w: 16, h: 16, color: '#a86c30' },
  ],
  anims: [
    loop(INFERNO_ANIMS.vortex, INFERNO.vortex, seq(8), 6),
    loop(INFERNO_ANIMS.lava, INFERNO.lava, seq(4), 6),
    loop(INFERNO_ANIMS.ember, INFERNO.ember, seq(4), 10),
    loop(INFERNO_ANIMS.torch, INFERNO.torch, seq(4), 10),
    loop(INFERNO_ANIMS.flag, INFERNO.flag, seq(4), 10),
    loop(INFERNO_ANIMS.checkpointOn, INFERNO.checkpoint, [1, 2, 3], 10),
    loop(INFERNO_ANIMS.bat, INFERNO.bat, seq(4), 12),
    loop(INFERNO_ANIMS.demonWalk, INFERNO.demon, seq(4), 8),
    loop(INFERNO_ANIMS.spirit, INFERNO.spirit, seq(4), 10),
    loop(HILLS_ANIMS.qblock, HILLS.qblock, [0, 1, 2, 3], 6),
  ],
};

export const THEMES: Partial<Record<ThemeId, ThemeConfig>> = { hills: HILLS_THEME, inferno: INFERNO_THEME, rampage: RAMPAGE_THEME };

export function getTheme(id: ThemeId): ThemeConfig {
  return THEMES[id] ?? HILLS_THEME;
}

/** Shared textures from the base packs (ciccio + items) that gameplay relies on. */
export const BASE_REQUIRED: TexSpec[] = [
  { key: CICCIO.sheet, w: 48, h: 48, frames: 27, color: '#fcfcf4' },
  { key: ITEMS.nugget, w: 12, h: 12, frames: 6, color: '#d8901c' },
  { key: ITEMS.fries, w: 16, h: 16, frames: 4, color: '#fcc030' },
  { key: ITEMS.burger, w: 16, h: 16, frames: 4, color: '#e0902c' },
  { key: ITEMS.brie, w: 16, h: 16, frames: 4, color: '#fcf0d8' },
  { key: ITEMS.provola, w: 16, h: 16, frames: 4, color: '#fcd400' },
  { key: ITEMS.thai, w: 16, h: 16, frames: 4, color: '#d82810' },
  { key: ITEMS.crunchy, w: 24, h: 16, frames: 4, color: '#d88a10' },
  { key: ITEMS.cheeseShot, w: 12, h: 8, frames: 2, color: '#fcd400' },
  { key: ITEMS.cheeseSplat, w: 24, h: 16, frames: 6, color: '#fcd400' },
  { key: ITEMS.club, w: 24, h: 24, frames: 1, color: '#d82810' },
  { key: ITEMS.flame, w: 16, h: 24, frames: 6, color: '#fc7a10' },
  { key: ITEMS.badge, w: 8, h: 8, color: '#fcd400' },
  { key: ITEMS.wings, w: 32, h: 24, frames: 4, color: '#d88a10' },
  { key: ITEMS.shield, w: 48, h: 48, frames: 4, color: 'transparent' },
  { key: ITEMS.sparkle, w: 8, h: 8, frames: 4, color: '#fcf070' },
  { key: ITEMS.dust, w: 8, h: 8, frames: 5, color: '#e4cca8' },
  { key: ITEMS.poof, w: 16, h: 16, frames: 6, color: '#fcf0d8' },
  { key: ITEMS.hitStar, w: 16, h: 16, frames: 4, color: '#fcc020' },
  { key: ITEMS.crateBits, w: 8, h: 8, frames: 4, color: '#a86c30' },
  { key: ITEMS.digits, w: 6, h: 8, frames: 12, color: '#fce4c0' },
];

export const BASE_ANIMS: AnimSpec[] = [
  loop(CICCIO_ANIMS.idle, CICCIO.sheet, [...CICCIO.idle], 6),
  loop(CICCIO_ANIMS.run, CICCIO.sheet, [...CICCIO.run], 14),
  loop(CICCIO_ANIMS.fly, CICCIO.sheet, [...CICCIO.fly], 10),
  once(CICCIO_ANIMS.club, CICCIO.sheet, [...CICCIO.club], 18),
  loop(CICCIO_ANIMS.victory, CICCIO.sheet, [...CICCIO.victory], 4),
  loop(ITEM_ANIMS.nugget, ITEMS.nugget, seq(6), 10),
  loop(ITEM_ANIMS.fries, ITEMS.fries, seq(4), 8),
  loop(ITEM_ANIMS.burger, ITEMS.burger, seq(4), 8),
  loop(ITEM_ANIMS.brie, ITEMS.brie, seq(4), 8),
  loop(ITEM_ANIMS.provola, ITEMS.provola, seq(4), 8),
  loop(ITEM_ANIMS.thai, ITEMS.thai, seq(4), 8),
  loop(ITEM_ANIMS.crunchy, ITEMS.crunchy, seq(4), 8),
  loop(ITEM_ANIMS.cheeseShot, ITEMS.cheeseShot, seq(2), 12),
  once(ITEM_ANIMS.cheeseSplat, ITEMS.cheeseSplat, seq(6), 14),
  loop(ITEM_ANIMS.flame, ITEMS.flame, seq(6), 14),
  loop(ITEM_ANIMS.wings, ITEMS.wings, seq(4), 12),
  loop(ITEM_ANIMS.shield, ITEMS.shield, seq(4), 8),
  once(ITEM_ANIMS.sparkle, ITEMS.sparkle, seq(4), 16),
  once(ITEM_ANIMS.dust, ITEMS.dust, seq(5), 16),
  once(ITEM_ANIMS.poof, ITEMS.poof, seq(6), 16),
  once(ITEM_ANIMS.hitStar, ITEMS.hitStar, seq(4), 20),
  // kill sheets have no placeholder: these only exist once the items pack draws them
  once(ITEM_ANIMS.cheeseEngulf, ITEMS.cheeseEngulf, seq(8), 14),
  once(ITEM_ANIMS.burn, ITEMS.burn, seq(8), 14),
];
