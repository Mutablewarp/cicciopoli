/** Raster-level manifest of the rampage pack (kept separate from the canvases so tests run without a DOM). */
import { RAMPAGE } from '../keys';
import type { Raster } from '../hills/raster';
import { buildBrute } from './brute';
import { buildMegaburger } from './megaburger';
import { buildBarrel, buildBrick, buildCrate } from './props';
import { buildCone, buildDumpster, buildLamp, buildRoadSign } from './decor';
import { buildFar } from './far';
import { buildCheckpoint, buildFlag, buildFlagCloth, buildHole, buildPoleRipped } from './goal';
import { buildNear } from './near';
import { buildClouds, buildSky } from './sky';

export const RAMPAGE_SHEETS: readonly (readonly [string, () => Raster[]])[] = [
  [RAMPAGE.brick, buildBrick],
  [RAMPAGE.flag, buildFlag],
  [RAMPAGE.flagCloth, buildFlagCloth],
  [RAMPAGE.checkpoint, buildCheckpoint],
  [RAMPAGE.brute, buildBrute],
  [RAMPAGE.megaburger, buildMegaburger],
];

export const RAMPAGE_IMAGES: readonly (readonly [string, () => Raster])[] = [
  [RAMPAGE.sky, buildSky],
  [RAMPAGE.clouds, buildClouds],
  [RAMPAGE.far, buildFar],
  [RAMPAGE.near, buildNear],
  [RAMPAGE.crate, buildCrate],
  [RAMPAGE.barrel, buildBarrel],
  [RAMPAGE.poleRipped, buildPoleRipped],
  [RAMPAGE.hole, buildHole],
  [RAMPAGE.lamp, buildLamp],
  [RAMPAGE.cone, buildCone],
  [RAMPAGE.dumpster, buildDumpster],
  [RAMPAGE.sign, buildRoadSign],
];
