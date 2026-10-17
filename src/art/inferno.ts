/**
 * [inferno] Level 2 "ALETTE CRUNCHY" art pack: box-world sky, fire vortex, castles,
 * volcanic tiles, lava, props and enemies. Helpers live in ./inferno/.
 */
import type { AnimDef, ArtPack } from '../contracts';
import { INFERNO, INFERNO_ANIMS, TILE } from './keys';
import { buildBat, buildDemon, buildSpirit } from './inferno/enemies';
import { buildFar, buildNear } from './inferno/castles';
import { buildEmber, buildLava, buildLavaGlow } from './inferno/lava';
import { buildBrazier, buildChain, buildInfernoFlag, buildInfernoHole, buildSpire, buildTorch } from './inferno/props';
import { buildClouds, buildSky, buildVortex } from './inferno/sky';
import { buildInfernoTiles } from './inferno/tiles';

function loop(key: string, sheet: string, frames: number[], frameRate: number): AnimDef {
  return { key, sheet, frames, frameRate, repeat: -1 };
}

export function buildInfernoArt(): ArtPack {
  return {
    name: 'inferno',
    tilesets: [{ key: INFERNO.tiles, canvas: buildInfernoTiles(), tileSize: TILE }],
    images: [
      { key: INFERNO.sky, canvas: buildSky() },
      { key: INFERNO.clouds, canvas: buildClouds() },
      { key: INFERNO.far, canvas: buildFar() },
      { key: INFERNO.near, canvas: buildNear() },
      { key: INFERNO.lavaGlow, canvas: buildLavaGlow() },
      { key: INFERNO.spire, canvas: buildSpire() },
      { key: INFERNO.chain, canvas: buildChain() },
      { key: INFERNO.hole, canvas: buildInfernoHole() },
    ],
    sheets: [
      { key: INFERNO.vortex, canvas: buildVortex(), frameWidth: 256, frameHeight: 256 },
      { key: INFERNO.lava, canvas: buildLava(), frameWidth: 32, frameHeight: 32 },
      { key: INFERNO.ember, canvas: buildEmber(), frameWidth: 4, frameHeight: 4 },
      { key: INFERNO.torch, canvas: buildTorch(), frameWidth: 8, frameHeight: 16 },
      { key: INFERNO.flag, canvas: buildInfernoFlag(), frameWidth: 32, frameHeight: 64 },
      { key: INFERNO.checkpoint, canvas: buildBrazier(), frameWidth: 16, frameHeight: 32 },
      { key: INFERNO.bat, canvas: buildBat(), frameWidth: 24, frameHeight: 16 },
      { key: INFERNO.demon, canvas: buildDemon(), frameWidth: 24, frameHeight: 24 },
      { key: INFERNO.spirit, canvas: buildSpirit(), frameWidth: 16, frameHeight: 24 },
    ],
    anims: [
      loop(INFERNO_ANIMS.vortex, INFERNO.vortex, [0, 1, 2, 3, 4, 5, 6, 7], 6),
      loop(INFERNO_ANIMS.lava, INFERNO.lava, [0, 1, 2, 3], 6),
      loop(INFERNO_ANIMS.ember, INFERNO.ember, [0, 1, 2, 3], 10),
      loop(INFERNO_ANIMS.torch, INFERNO.torch, [0, 1, 2, 3], 10),
      loop(INFERNO_ANIMS.flag, INFERNO.flag, [0, 1, 2, 3], 10),
      loop(INFERNO_ANIMS.checkpointOn, INFERNO.checkpoint, [1, 2, 3], 10),
      loop(INFERNO_ANIMS.bat, INFERNO.bat, [0, 1, 2, 3], 12),
      loop(INFERNO_ANIMS.demonWalk, INFERNO.demon, [0, 1, 2, 3], 8),
      loop(INFERNO_ANIMS.spirit, INFERNO.spirit, [0, 1, 2, 3], 10),
    ],
  };
}
