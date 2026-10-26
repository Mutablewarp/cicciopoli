/**
 * Level 8 hero lane tuning: the frame count / fps of every HERO_ANIMS entry and of every FX texture, the ink
 * colours of the effects.
 */
import { HERO_ANIMS, type FX } from '../api';

/**
 * Aim-while-moving poses the hero lane draws on top of api.ts HERO_ANIMS: running with ▲ (diagonal shots)
 * and firing in mid-air (forward / up / diagonal). The integrator adds them to HERO_ANIMS and the core maps
 * them in player.ts animKey(); until then they are registered here (api.ts values win if they differ).
 */
export const HERO_AIM_ANIMS = {
  runShootUp: 'ct-hero-run-shoot-up',
  airShoot: 'ct-hero-air-shoot',
  airShootUp: 'ct-hero-air-shoot-up',
  airShootDiag: 'ct-hero-air-shoot-diag',
} as const;
export const HERO_ALL_ANIMS = { ...HERO_AIM_ANIMS, ...HERO_ANIMS };

export type HeroAnimName = keyof typeof HERO_ALL_ANIMS;
export type FxName = keyof typeof FX;

interface AnimSpec {
  frames: number;
  fps: number;
  /** -1 loops, 0 plays once */
  repeat: number;
}

/** The one big sheet every hero frame lives in (anims in HERO_ALL_ANIMS order). */
export const HERO_SHEET = 'ct-hero';

export const HERO_ANIM_SPEC: Readonly<Record<HeroAnimName, AnimSpec>> = {
  intro: { frames: 10, fps: 11, repeat: 0 },
  idle: { frames: 8, fps: 10, repeat: -1 },
  run: { frames: 8, fps: 15, repeat: -1 },
  jump: { frames: 10, fps: 22, repeat: 0 },
  fall: { frames: 4, fps: 10, repeat: -1 },
  shoot: { frames: 4, fps: 16, repeat: -1 },
  shootUp: { frames: 4, fps: 16, repeat: -1 },
  runShoot: { frames: 8, fps: 15, repeat: -1 },
  dash: { frames: 5, fps: 24, repeat: 0 },
  hurt: { frames: 5, fps: 18, repeat: 0 },
  parry: { frames: 6, fps: 22, repeat: 0 },
  super: { frames: 8, fps: 12, repeat: 0 },
  victory: { frames: 12, fps: 10, repeat: 0 },
  ko: { frames: 8, fps: 10, repeat: 0 },
  runShootUp: { frames: 8, fps: 15, repeat: -1 },
  airShoot: { frames: 4, fps: 14, repeat: -1 },
  airShootUp: { frames: 4, fps: 14, repeat: -1 },
  airShootDiag: { frames: 4, fps: 14, repeat: -1 },
};

interface FxSpec extends AnimSpec {
  /** frame size in world units (the drawn object is centred in it) */
  w: number;
  h: number;
}

/** fps 0 = no '-anim' (fry is a still image, card is frame 0 empty / 1 full); the others register FX[name] + '-anim'. */
export const FX_SPEC: Readonly<Record<FxName, FxSpec>> = {
  provola: { w: 30, h: 12, frames: 3, fps: 14, repeat: -1 },
  provolaEx: { w: 58, h: 32, frames: 3, fps: 12, repeat: -1 },
  meatball: { w: 18, h: 18, frames: 3, fps: 16, repeat: -1 },
  meatballEx: { w: 42, h: 42, frames: 3, fps: 14, repeat: -1 },
  blast: { w: 60, h: 60, frames: 8, fps: 20, repeat: 0 },
  nugget: { w: 26, h: 14, frames: 2, fps: 12, repeat: -1 },
  nuggetEx: { w: 48, h: 48, frames: 6, fps: 16, repeat: -1 },
  fry: { w: 24, h: 60, frames: 1, fps: 0, repeat: 0 },
  friesCloud: { w: 240, h: 100, frames: 4, fps: 10, repeat: -1 },
  muzzle: { w: 20, h: 20, frames: 4, fps: 24, repeat: 0 },
  hit: { w: 26, h: 26, frames: 5, fps: 24, repeat: 0 },
  parryFlash: { w: 40, h: 40, frames: 6, fps: 20, repeat: 0 },
  dust: { w: 30, h: 18, frames: 6, fps: 16, repeat: 0 },
  card: { w: 16, h: 22, frames: 2, fps: 0, repeat: 0 },
};

/** Ink colours of the hero's effects (the hero himself is the owner's drawing, public/level8/hero/ciccio.webp). */
export const HERO_COL = {
  blush: 'rgba(226, 122, 98, 0.32)',
  mouth: '#5a1c16',
  tongue: '#d65a4a',
  eye: '#fffaf0',
  glint: '#ffffff',
  star: '#ffd447',
  pink: '#ff6fae',
  pinkHi: '#ffd3e8',
  speed: 'rgba(28, 21, 17, 0.5)',
} as const;

/** Food FX colours (the real provola, meatballs, nuggets and fries of Ciccio's). */
export const FX_COL = {
  batter: '#e7b04a',
  batterHi: '#f8d98c',
  batterShade: '#c4862f',
  crumb: '#a8662a',
  cheese: '#fff2bd',
  cheeseShade: '#f0cf72',
  meat: '#8c4a2d',
  meatHi: '#b86d45',
  meatShade: '#5e2f1c',
  sauce: '#c8402c',
  basil: '#4f8a3a',
  fuse: '#6e5034',
  flame: '#ffae2c',
  flameHi: '#fff3a8',
  nugget: '#dc9c47',
  nuggetShade: '#a9692b',
  fry: '#f7cb5c',
  fryShade: '#d8a03a',
  paper: '#faf4e6',
  paperShade: '#e2d6bd',
  bordeaux: '#8f2a2f',
  cloud: '#fbf3e2',
  cloudShade: '#e4d5b8',
  fire: '#ff9f2e',
  fireHi: '#ffe27a',
  smoke: '#efe1c4',
  spark: '#fff6cf',
  card: '#f7eedb',
} as const;
