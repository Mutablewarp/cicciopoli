/**
 * Who the player is on a level: sprite sheet + poses (skin), movement numbers and body size.
 * Ciccio on levels 1-2, the green rage form (art pack `hulk`) on level 5. LevelRun builds
 * Player and PlayerView from it; GameScene picks the profile from LevelDef.hero.
 */
import { CICCIO, CICCIO_ANIMS, HULK as HULK_ART, HULK_ANIMS, HULK_FX, HULK_FX_ANIMS } from '../../art/keys';
import { HERO, HULK, MOVE, type MoveParams } from '../../config/tuning';
import { DEPTH } from '../depths';
import { type AttachmentSpec, DEFAULT_ATTACHMENTS } from './attachments';

export interface HeroSkin {
  sheet: string;
  /** square frame size, px */
  frame: number;
  idle: string;
  run: string;
  /** ground speed (px/s) at which the run cycle plays at its normal rate */
  runRef: number;
  jump: number;
  apex: number;
  fall: number;
  land: number;
  hurt: number;
  /** half the distance between the two landing dust puffs */
  dustX: number;
  /** flight loop (level 2 wings) */
  fly?: string;
  shoot?: number;
  /** held-club swing animation */
  club?: string;
  attachments: readonly AttachmentSpec[];
}

export type HeroKind = 'ciccio' | 'hulk';

export interface HeroProfile {
  kind: HeroKind;
  skin: HeroSkin;
  move: MoveParams;
  body: { w: number; h: number };
}

const CICCIO_SKIN: HeroSkin = {
  sheet: CICCIO.sheet,
  frame: CICCIO.frame,
  idle: CICCIO_ANIMS.idle,
  run: CICCIO_ANIMS.run,
  runRef: MOVE.runMax,
  jump: CICCIO.jump,
  apex: CICCIO.apex,
  fall: CICCIO.fall,
  land: CICCIO.land,
  hurt: CICCIO.hurt,
  dustX: 7,
  fly: CICCIO_ANIMS.fly,
  shoot: CICCIO.shoot,
  club: CICCIO_ANIMS.club,
  attachments: DEFAULT_ATTACHMENTS,
};

/** Green rage glow behind the big hero (additive, drawn only when the art pack has it). */
const AURA: AttachmentSpec = {
  id: 'aura', key: HULK_FX.aura, anim: HULK_FX_ANIMS.aura, anchor: 'feet', originX: 0.5, originY: 1,
  depth: DEPTH.behindHero, rotate: false, squash: false, alpha: 0.55, blend: 'ADD', visible: () => true,
};

const HULK_SKIN: HeroSkin = {
  sheet: HULK_ART.sheet,
  frame: HULK_ART.frame,
  idle: HULK_ANIMS.idle,
  run: HULK_ANIMS.run,
  runRef: HULK.move.runMax,
  jump: HULK_ART.jump,
  apex: HULK_ART.apex,
  fall: HULK_ART.fall,
  land: HULK_ART.land,
  hurt: HULK_ART.hurt,
  dustX: 11,
  attachments: [AURA],
};

const PROFILES: Readonly<Record<HeroKind, HeroProfile>> = {
  ciccio: { kind: 'ciccio', skin: CICCIO_SKIN, move: MOVE, body: { w: HERO.bodyW, h: HERO.bodyH } },
  hulk: { kind: 'hulk', skin: HULK_SKIN, move: HULK.move, body: { w: HULK.bodyW, h: HULK.bodyH } },
};

export function heroProfile(kind: HeroKind = 'ciccio'): HeroProfile {
  return PROFILES[kind];
}
