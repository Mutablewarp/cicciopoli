/**
 * HERO lane entry (level 8): `loadHero(scene, k)` builds Ciccio from the owner's drawing
 * ref/level8_ciccio_hero.png — its cut-out parts (HERO_ASSETS, preloaded by the CORE) posed on a rig — into
 * one sheet at texture scale k and registers every HERO_ANIMS animation (plus the aim poses of
 * HERO_AIM_ANIMS), then draws every FX texture of api.ts (animated ones also get FX[x] + '-anim').
 */
import type Phaser from 'phaser';
import { FX, HERO_FRAME, type ImageAsset } from '../api';
import { anim, image, sheet, type Draw } from '../draw/canvas';
import { FX_SPEC, HERO_ALL_ANIMS, HERO_ANIM_SPEC, HERO_SHEET, type FxName } from './config';
import { drawBlast, drawCard, drawDust, drawHit, drawMuzzle, drawParryFlash } from './fxBursts';
import { drawFriesCloud, drawFry } from './fxFries';
import { drawMeatball, drawMeatballEx, drawNugget, drawNuggetEx, drawProvola, drawProvolaEx } from './fxShots';
import { drawHeroFrame } from './overlay';
import { HERO_ATLAS } from './parts';
import { HERO_ORDER, heroLayout, heroPose } from './pose';

export { HERO_AIM_ANIMS } from './config';
export { HERO_MUZZLE } from './pose';
/** The cut-out parts of the owner's drawing (scripts/level8/hero.mjs); the CORE preloads them before loadHero(). */
const ART: ImageAsset = { key: `${HERO_SHEET}-art`, url: HERO_ATLAS.url };
export const HERO_ASSETS: readonly ImageAsset[] = [ART];

const FX_DRAW: Readonly<Record<FxName, Draw>> = {
  provola: drawProvola,
  provolaEx: drawProvolaEx,
  meatball: drawMeatball,
  meatballEx: drawMeatballEx,
  blast: drawBlast,
  nugget: drawNugget,
  nuggetEx: drawNuggetEx,
  fry: drawFry,
  friesCloud: drawFriesCloud,
  muzzle: drawMuzzle,
  hit: drawHit,
  parryFlash: drawParryFlash,
  dust: drawDust,
  card: drawCard,
};

function loadFx(scene: Phaser.Scene, k: number): void {
  for (const name of Object.keys(FX) as FxName[]) {
    const key = FX[name];
    const s = FX_SPEC[name];
    if (s.frames === 1) image(scene, key, s.w, s.h, k, FX_DRAW[name]);
    else sheet(scene, key, s.w, s.h, s.frames, k, FX_DRAW[name]);
    if (s.fps > 0) anim(scene, `${key}-anim`, key, s.frames, s.fps, s.repeat);
  }
}

/** Draw and register the hero sheet + HERO_ALL_ANIMS and every FX texture / anim at texture scale k. */
export function loadHero(scene: Phaser.Scene, k: number): void {
  if (!scene.textures.exists(ART.key)) throw new Error(`hero art not preloaded: ${ART.url}`);
  const art = scene.textures.get(ART.key).getSourceImage() as CanvasImageSource;
  const { start, total } = heroLayout();
  const poses = HERO_ORDER.flatMap((name) => Array.from({ length: HERO_ANIM_SPEC[name].frames }, (_, f) => heroPose(name, f)));
  sheet(scene, HERO_SHEET, HERO_FRAME.w, HERO_FRAME.h, total, k, (ctx, i) => drawHeroFrame(ctx, art, poses[i]));
  for (const name of HERO_ORDER) {
    const s = HERO_ANIM_SPEC[name];
    const frames = Array.from({ length: s.frames }, (_, f) => start[name] + f);
    anim(scene, HERO_ALL_ANIMS[name], HERO_SHEET, frames, s.fps, s.repeat);
  }
  loadFx(scene, k);
}
