/**
 * [hulk] art pack — level 5 hero (Ciccio in rampage form): 64x64 sheet, HUD head icon, portrait and
 * the comic FX (shockwave, starburst, lettering, rubble, dust, rage aura). Frames are composed in
 * plain pixel buffers (src/art/hulk/) and converted to canvases once at the end.
 */
import type { AnimDef, CiccioArtPack } from '../contracts';
import { HULK, HULK_ANIMS, HULK_FX, HULK_FX_ANIMS } from './keys';
import { packSheet } from './pixel';
import { FRAME, renderPose } from './hulk/body';
import { AURA, auraFrames } from './hulk/fx/aura';
import { BURST_H, BURST_W, burstFrames } from './hulk/fx/burst';
import { DUST_H, DUST_W, dustFrames, rubbleChips, SHOCK_H, SHOCK_W, shockFrames } from './hulk/fx/ground';
import { spaccaText } from './hulk/fx/text';
import { headIcon, portrait } from './hulk/icons';
import { POSES, RUN_FPS } from './hulk/poses';
import { toCanvas, type Raster } from './ciccio/raster';

function anim(key: string, sheet: string, frames: readonly number[], frameRate: number, repeat: number): AnimDef {
  return { key, sheet, frames: [...frames], frameRate, repeat };
}

function strip(frames: readonly Raster[], w: number, h: number): HTMLCanvasElement {
  return packSheet(frames.map(toCanvas), w, h, frames.length);
}

const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

export function buildHulkArt(): CiccioArtPack {
  const rendered = POSES.map(renderPose);
  const hero = packSheet(rendered.map((f) => toCanvas(f.raster)), FRAME, FRAME);
  const shock = shockFrames();
  const burst = burstFrames();
  const dust = dustFrames();
  const aura = auraFrames();
  return {
    name: 'hulk',
    sheets: [
      { key: HULK.sheet, canvas: hero, frameWidth: FRAME, frameHeight: FRAME },
      { key: HULK_FX.shock, canvas: strip(shock, SHOCK_W, SHOCK_H), frameWidth: SHOCK_W, frameHeight: SHOCK_H },
      { key: HULK_FX.burst, canvas: strip(burst, BURST_W, BURST_H), frameWidth: BURST_W, frameHeight: BURST_H },
      { key: HULK_FX.rubble, canvas: strip(rubbleChips(), 8, 8), frameWidth: 8, frameHeight: 8 },
      { key: HULK_FX.dust, canvas: strip(dust, DUST_W, DUST_H), frameWidth: DUST_W, frameHeight: DUST_H },
      { key: HULK_FX.aura, canvas: strip(aura, AURA, AURA), frameWidth: AURA, frameHeight: AURA },
    ],
    images: [
      { key: HULK.headIcon, canvas: toCanvas(headIcon()) },
      { key: HULK.portrait, canvas: toCanvas(portrait()) },
      { key: HULK_FX.text, canvas: toCanvas(spaccaText()) },
    ],
    tilesets: [],
    anims: [
      anim(HULK_ANIMS.idle, HULK.sheet, HULK.idle, 6, -1),
      anim(HULK_ANIMS.run, HULK.sheet, HULK.run, RUN_FPS, -1),
      anim(HULK_ANIMS.punch, HULK.sheet, HULK.punch, 22, 0),
      anim(HULK_ANIMS.slam, HULK.sheet, HULK.slam, 14, 0),
      anim(HULK_ANIMS.roar, HULK.sheet, HULK.roar, 6, -1),
      anim(HULK_ANIMS.grab, HULK.sheet, HULK.grab, 8, 0),
      anim(HULK_ANIMS.throw, HULK.sheet, HULK.throw, 12, 0),
      anim(HULK_ANIMS.victory, HULK.sheet, HULK.victory, 4, -1),
      anim(HULK_FX_ANIMS.shock, HULK_FX.shock, range(shock.length), 16, 0),
      anim(HULK_FX_ANIMS.burst, HULK_FX.burst, range(burst.length), 22, 0),
      anim(HULK_FX_ANIMS.dust, HULK_FX.dust, range(dust.length), 10, 0),
      anim(HULK_FX_ANIMS.aura, HULK_FX.aura, range(aura.length), 10, -1),
    ],
    anchors: rendered.map((f) => f.anchors),
  };
}
