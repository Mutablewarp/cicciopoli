// STUB (integrator) — replaced by the CHARACTER agent. Placeholder frames so the game boots.
import type { CiccioArtPack, CiccioFrameAnchors } from '../contracts';
import { CICCIO, CICCIO_ANIMS } from './keys';
import { buildFrames, fillEllipse, makeCanvas, ctxOf, PAL } from './pixel';

export function buildCiccioArt(): CiccioArtPack {
  const n = CICCIO.frameCount;
  const sheet = buildFrames(n, 48, 48, (ctx) => {
    fillEllipse(ctx, 24, 36, 9, 10, PAL.shirt);
    fillEllipse(ctx, 24, 18, 8, 8, PAL.skin);
    fillEllipse(ctx, 24, 12, 8, 4, PAL.hair);
    fillEllipse(ctx, 21, 18, 2, 2, PAL.ink);
    fillEllipse(ctx, 27, 18, 2, 2, PAL.ink);
  });
  const head = makeCanvas(16, 16);
  fillEllipse(ctxOf(head), 8, 8, 6, 6, PAL.skin);
  const portrait = makeCanvas(64, 64);
  fillEllipse(ctxOf(portrait), 32, 32, 24, 24, PAL.skin);
  const anchor: CiccioFrameAnchors = {
    hand: { x: 33, y: 34, angle: 0 },
    chest: { x: 26, y: 33 },
    back: { x: 17, y: 30 },
    head: { x: 25, y: 18 },
  };
  return {
    name: 'ciccio',
    sheets: [{ key: CICCIO.sheet, canvas: sheet, frameWidth: 48, frameHeight: 48 }],
    images: [
      { key: CICCIO.headIcon, canvas: head },
      { key: CICCIO.portrait, canvas: portrait },
    ],
    tilesets: [],
    anims: [
      { key: CICCIO_ANIMS.idle, sheet: CICCIO.sheet, frames: [...CICCIO.idle], frameRate: 6, repeat: -1 },
      { key: CICCIO_ANIMS.run, sheet: CICCIO.sheet, frames: [...CICCIO.run], frameRate: 14, repeat: -1 },
      { key: CICCIO_ANIMS.fly, sheet: CICCIO.sheet, frames: [...CICCIO.fly], frameRate: 10, repeat: -1 },
      { key: CICCIO_ANIMS.club, sheet: CICCIO.sheet, frames: [...CICCIO.club], frameRate: 18, repeat: 0 },
      { key: CICCIO_ANIMS.victory, sheet: CICCIO.sheet, frames: [...CICCIO.victory], frameRate: 4, repeat: -1 },
    ],
    anchors: Array.from({ length: n }, () => anchor),
  };
}
