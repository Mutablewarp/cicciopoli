/**
 * [ciccio] art pack — the hero sprite sheet, HUD head icon and portrait.
 * Frames are composed in plain pixel buffers (src/art/ciccio/) and converted
 * to canvases once at the end.
 */
import type { AnimDef, CiccioArtPack } from '../contracts';
import { CICCIO, CICCIO_ANIMS } from './keys';
import { packSheet } from './pixel';
import { FRAME, renderPose } from './ciccio/body';
import { headIcon, portrait } from './ciccio/icons';
import { IDLE_SEQUENCE, POSES } from './ciccio/poses';
import { toCanvas } from './ciccio/raster';

function anim(key: string, frames: readonly number[], frameRate: number, repeat: number): AnimDef {
  return { key, sheet: CICCIO.sheet, frames: [...frames], frameRate, repeat };
}

export function buildCiccioArt(): CiccioArtPack {
  const rendered = POSES.map(renderPose);
  const sheet = packSheet(rendered.map((f) => toCanvas(f.raster)), FRAME, FRAME);
  return {
    name: 'ciccio',
    sheets: [{ key: CICCIO.sheet, canvas: sheet, frameWidth: FRAME, frameHeight: FRAME }],
    images: [
      { key: CICCIO.headIcon, canvas: toCanvas(headIcon()) },
      { key: CICCIO.portrait, canvas: toCanvas(portrait()) },
    ],
    tilesets: [],
    anims: [
      anim(CICCIO_ANIMS.idle, IDLE_SEQUENCE, 6, -1),
      anim(CICCIO_ANIMS.run, CICCIO.run, 14, -1),
      anim(CICCIO_ANIMS.fly, CICCIO.fly, 10, -1),
      anim(CICCIO_ANIMS.club, CICCIO.club, 18, 0),
      anim(CICCIO_ANIMS.victory, CICCIO.victory, 4, -1),
    ],
    anchors: rendered.map((f) => f.anchors),
  };
}
