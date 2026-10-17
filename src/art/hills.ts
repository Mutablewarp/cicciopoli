/**
 * Level 1 "LE COLLINE" art pack (cup world): tileset, parallax layers, props and
 * enemies. Every key of HILLS / HILLS_ANIMS in keys.ts is produced here.
 */
import type { AnimDef, ArtPack, SheetDef } from '../contracts';
import { HILLS, HILLS_ANIMS, TILE } from './keys';
import { buildArmor } from './hills/armor';
import { buildChili } from './hills/chili';
import { buildBush, buildFlower, buildTree } from './hills/flora';
import { buildCheckpoint, buildFlag, buildHole } from './hills/goal';
import { buildBushes, buildNear } from './hills/near';
import { buildPickle } from './hills/pickle';
import { buildCrate, buildQBlock, buildRock, buildSign } from './hills/props';
import { type Raster, sheetCanvas } from './hills/raster';
import { buildClouds, buildFar, buildSky } from './hills/sky';
import { buildHillsTiles } from './hills/tiles';

function sheet(key: string, frames: Raster[]): SheetDef {
  return { key, canvas: sheetCanvas(frames), frameWidth: frames[0].w, frameHeight: frames[0].h };
}

function loop(key: string, sheetKey: string, frames: number[], frameRate: number): AnimDef {
  return { key, sheet: sheetKey, frames, frameRate, repeat: -1 };
}

export function buildHillsArt(): ArtPack {
  return {
    name: 'hills',
    sheets: [
      sheet(HILLS.qblock, buildQBlock()),
      sheet(HILLS.flag, buildFlag()),
      sheet(HILLS.checkpoint, buildCheckpoint()),
      sheet(HILLS.flower, buildFlower()),
      sheet(HILLS.pickle, buildPickle()),
      sheet(HILLS.chili, buildChili()),
      sheet(HILLS.armor, buildArmor()),
    ],
    images: [
      { key: HILLS.sky, canvas: buildSky() },
      { key: HILLS.clouds, canvas: buildClouds() },
      { key: HILLS.far, canvas: buildFar() },
      { key: HILLS.near, canvas: buildNear() },
      { key: HILLS.bushes, canvas: buildBushes() },
      { key: HILLS.crate, canvas: buildCrate().toCanvas() },
      { key: HILLS.hole, canvas: buildHole().toCanvas() },
      { key: HILLS.tree, canvas: buildTree().toCanvas() },
      { key: HILLS.bush, canvas: buildBush().toCanvas() },
      { key: HILLS.rock, canvas: buildRock().toCanvas() },
      { key: HILLS.sign, canvas: buildSign().toCanvas() },
    ],
    tilesets: [{ key: HILLS.tiles, canvas: buildHillsTiles(), tileSize: TILE }],
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
}
