/** Hills (cup world) palette: PAL plus shades sampled from ref/cup_*.png. */
import { PAL } from '../pixel';

export const HC = {
  ink: PAL.ink,
  // ground band (cup: lime #b0e404 / mid #48b625 / teal-green #1fa53a / soil #2a1416 / brick #743b36)
  grassLine: '#e2f86a',
  grass: '#b2de06',
  grassMid: PAL.grassMid,
  grassDark: '#22a03a',
  grassDeep: '#17803a',
  soil: '#2c1618',
  soilDeep: '#241214',
  brick: '#743b36',
  brickLight: '#8e4d45',
  brickShade: '#5e2f2c',
  brickSpeck: '#683430',
  // DEEP is only one step darker: deep rows still use FILL_L/R at their edges
  brickDeep: '#673430',
  brickDeepLight: '#7c433c',
  brickDeepShade: '#512827',
  // stair block
  blockFace: '#9a5a3c',
  blockLight: '#c88a5c',
  blockShade: '#6a3424',
  // sky / clouds
  skyTop: '#2a86d0',
  skyDeep: PAL.skyDeep,
  sky: PAL.sky,
  skyLow: '#7ed6f2',
  skyPale: '#ace6f6',
  cloud: '#fde9bb',
  cloudLight: '#fff4d8',
  cloudShade: '#e2d2a6',
  cloudBlue: '#b0e4f4',
  // distant hills (atmospheric, no outline)
  farBack: '#9cd6c8',
  farBackLight: '#aee0d2',
  farFront: '#84c6aa',
  farFrontLight: '#96d2b6',
  // near stepped hills
  hill: '#489c30',
  hillLight: '#5ab03a',
  hillShade: '#3e8c2c',
  hillBack: '#3a8a3a',
  hillBackLight: '#46983e',
  hillBackShade: '#327a34',
  hillLine: '#223638',
  vine: '#2a5e34',
  // bushes strip
  bush: '#2e7a38',
  bushLight: '#3a9042',
  bushShade: '#24642f',
  bushLine: '#1b4a2a',
  trunk: '#5a3a24',
  // wood (crate / sign)
  wood: '#c8873e',
  woodLight: '#e4ae62',
  woodShade: '#9a5f28',
  woodDark: '#6a3c18',
  nail: '#b8b8c0',
  // stone
  stone: '#9a9aa4',
  stoneLight: '#c4c4cc',
  stoneShade: '#70707c',
} as const;
