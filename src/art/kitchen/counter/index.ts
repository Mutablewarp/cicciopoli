/**
 * KITCHEN-COUNTER-ART lane: the BANCONE view of level 7 (dining room, steel counter top, pergola beam
 * with ring lights, neon, face disc, till, the plates and straw cup of the photo, the ten customers) and
 * the golden award. Raster builders only (no DOM), one per key of SHEET_SPEC / IMAGE_SPEC in ../keys.ts
 * whose lane is 'counter'.
 */
import type { Raster } from '../../hills/raster';
import { KITCHEN } from '../keys';
import { buildBeam, buildCounterTop, buildRegister } from './counter';
import { buildCustomers } from './customers';
import { buildGoldenText } from './goldText';
import { buildConfetti, buildGoldRays, buildGoldenBurger, buildStar } from './golden';
import { buildFaceDisc, buildNeon } from './neon';
import { buildCounterProps } from './props';
import { buildRoomFill, buildRoomTall, buildRoomWide } from './room';

export const COUNTER_SHEETS: readonly (readonly [string, () => Raster[]])[] = [
  [KITCHEN.beam, buildBeam],
  [KITCHEN.neon, buildNeon],
  [KITCHEN.faceDisc, buildFaceDisc],
  [KITCHEN.customer, buildCustomers],
  [KITCHEN.star, buildStar],
  [KITCHEN.goldenBurger, buildGoldenBurger],
  [KITCHEN.confetti, buildConfetti],
];

export const COUNTER_IMAGES: readonly (readonly [string, () => Raster])[] = [
  [KITCHEN.roomTall, buildRoomTall],
  [KITCHEN.roomWide, buildRoomWide],
  [KITCHEN.roomFill, buildRoomFill],
  [KITCHEN.counterTop, buildCounterTop],
  [KITCHEN.register, buildRegister],
  [KITCHEN.counterProps, buildCounterProps],
  [KITCHEN.goldenText, buildGoldenText],
  [KITCHEN.goldRays, buildGoldRays],
];
