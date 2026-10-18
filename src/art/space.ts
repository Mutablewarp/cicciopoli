/**
 * [space] Level 3 "CICCIO'S INVADERS" art pack: Ciccio's jet, the marching formation
 * (aliens, ringed planets, asteroids), UFO, foods, bombs, lightning capsule, FX, black hole,
 * burger shields, wordmark and the starfield. Helpers live in ./space/.
 */
import type { AnimDef, ArtPack } from '../contracts';
import { buildBoltIcon, buildBoom, buildCapsule, buildGoo, buildRock, buildShot, buildSmoke, buildSpark } from './space/fx';
import { buildFoods, FOOD_SIZE } from './space/foods';
import { buildAlienA, buildAlienB, buildAsteroids, buildPlanets, buildUfo } from './space/invaders';
import { buildJet } from './space/jet';
import { SPACE, SPACE_ANIMS } from './space/keys';
import { buildFarMoon, buildFarPlanet, buildHole, buildNebula, buildShield, buildSky, buildStars } from './space/scenery';
import { buildGlint, buildTitle, GLINT_SIZE } from './space/title';

function anim(key: string, sheet: string, frames: number[], frameRate: number, repeat = -1): AnimDef {
  return { key, sheet, frames, frameRate, repeat };
}

export function buildSpaceArt(): ArtPack {
  return {
    name: 'space',
    tilesets: [],
    images: [
      { key: SPACE.sky, canvas: buildSky() },
      { key: SPACE.starsFar, canvas: buildStars('far') },
      { key: SPACE.starsMid, canvas: buildStars('mid') },
      { key: SPACE.starsNear, canvas: buildStars('near') },
      { key: SPACE.nebula, canvas: buildNebula() },
      { key: SPACE.farPlanet, canvas: buildFarPlanet() },
      { key: SPACE.farMoon, canvas: buildFarMoon() },
      { key: SPACE.shield, canvas: buildShield() },
      { key: SPACE.title, canvas: buildTitle() },
      { key: SPACE.boltIcon, canvas: buildBoltIcon() },
    ],
    sheets: [
      { key: SPACE.jet, canvas: buildJet(), frameWidth: 43, frameHeight: 40 },
      { key: SPACE.alienA, canvas: buildAlienA(), frameWidth: 16, frameHeight: 16 },
      { key: SPACE.alienB, canvas: buildAlienB(), frameWidth: 16, frameHeight: 16 },
      { key: SPACE.planet, canvas: buildPlanets(), frameWidth: 16, frameHeight: 16 },
      { key: SPACE.asteroid, canvas: buildAsteroids(), frameWidth: 16, frameHeight: 16 },
      { key: SPACE.ufo, canvas: buildUfo(), frameWidth: 40, frameHeight: 20 },
      { key: SPACE.shot, canvas: buildShot(), frameWidth: 8, frameHeight: 16 },
      { key: SPACE.goo, canvas: buildGoo(), frameWidth: 10, frameHeight: 10 },
      { key: SPACE.rock, canvas: buildRock(), frameWidth: 10, frameHeight: 10 },
      { key: SPACE.capsule, canvas: buildCapsule(), frameWidth: 14, frameHeight: 20 },
      { key: SPACE.spark, canvas: buildSpark(), frameWidth: 16, frameHeight: 16 },
      { key: SPACE.food, canvas: buildFoods(), frameWidth: FOOD_SIZE, frameHeight: FOOD_SIZE },
      { key: SPACE.smoke, canvas: buildSmoke(), frameWidth: 24, frameHeight: 24 },
      { key: SPACE.boom, canvas: buildBoom(), frameWidth: 24, frameHeight: 24 },
      { key: SPACE.hole, canvas: buildHole(), frameWidth: 64, frameHeight: 64 },
      { key: SPACE.glint, canvas: buildGlint(), frameWidth: GLINT_SIZE, frameHeight: GLINT_SIZE },
    ],
    anims: [
      anim(SPACE_ANIMS.jetLevel, SPACE.jet, [0, 1], 14),
      anim(SPACE_ANIMS.jetLeft, SPACE.jet, [2, 3], 14),
      anim(SPACE_ANIMS.jetRight, SPACE.jet, [4, 5], 14),
      anim(SPACE_ANIMS.ufo, SPACE.ufo, [0, 1, 2, 3], 8),
      anim(SPACE_ANIMS.shot, SPACE.shot, [0, 1], 12),
      anim(SPACE_ANIMS.goo, SPACE.goo, [0, 1, 2, 3], 10),
      anim(SPACE_ANIMS.rock, SPACE.rock, [0, 1, 2, 3], 12),
      anim(SPACE_ANIMS.capsule, SPACE.capsule, [0, 1, 2, 3], 8),
      anim(SPACE_ANIMS.spark, SPACE.spark, [0, 1, 2, 3], 18, 0),
      anim(SPACE_ANIMS.smoke, SPACE.smoke, [0, 1, 2, 3, 4, 5], 12, 0),
      anim(SPACE_ANIMS.boom, SPACE.boom, [0, 1, 2, 3, 4, 5, 6], 18, 0),
      anim(SPACE_ANIMS.hole, SPACE.hole, [0, 1, 2, 3, 4, 5, 6, 7], 10),
      anim(SPACE_ANIMS.glint, SPACE.glint, [0, 1, 2, 3, 2, 1, 0], 16, 0),
    ],
  };
}
