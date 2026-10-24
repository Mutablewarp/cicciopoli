/** Raster-level manifest of the rush pack (kept apart from the canvases so tests run without a DOM). */
import type { Raster } from '../hills/raster';
import { buildBag, buildCustomers, buildParachute, buildZone } from './deliveries';
import { buildDrivers } from './drivers';
import { buildSpace } from './earth';
import { buildFlame, buildGrip, buildPopcorn, buildRadar, buildShield, buildSpeedLine } from './fx';
import { buildBarrier, buildCone, buildPuddle, buildWorks } from './hazards';
import { RUSH, RUSH_ANIMS, RUSH_ZONES, TRUCK_FRAME, zoneKey } from './keys';
import { buildPickups } from './pickups';
import { buildFill, buildRoad, buildSide, extraKey } from './scenery';
import { buildApe, buildBlinker, buildScooter } from './smallTraffic';
import { buildBus, buildCars, buildSuvs, buildVans } from './traffic';
import { buildTruckFly, buildTruckOrbit } from './truckFly';
import { buildTruckSide } from './truckSide';
import { buildTruck, buildTruckShadow } from './truckTop';

export const RUSH_SHEETS: readonly (readonly [string, () => Raster[]])[] = [
  [RUSH.truck, buildTruck],
  [RUSH.truckFly, buildTruckFly],
  [RUSH.cars, buildCars],
  [RUSH.suv, buildSuvs],
  [RUSH.van, buildVans],
  [RUSH.scooter, buildScooter],
  [RUSH.ape, buildApe],
  [RUSH.blinker, buildBlinker],
  [RUSH.puddle, buildPuddle],
  [RUSH.pickups, buildPickups],
  [RUSH.shield, buildShield],
  [RUSH.grip, buildGrip],
  [RUSH.popcorn, buildPopcorn],
  [RUSH.radar, buildRadar],
  [RUSH.flame, buildFlame],
  [RUSH.customer, buildCustomers],
  [RUSH.zone, buildZone],
  [RUSH.driverPortraits, buildDrivers],
];

export const RUSH_IMAGES: readonly (readonly [string, () => Raster])[] = [
  [RUSH.truckShadow, buildTruckShadow],
  [RUSH.truckSide, buildTruckSide],
  [RUSH.truckOrbit, buildTruckOrbit],
  [RUSH.space, buildSpace],
  [RUSH.bus, buildBus],
  [RUSH.cone, buildCone],
  [RUSH.barrier, buildBarrier],
  [RUSH.works, buildWorks],
  [RUSH.bag, buildBag],
  [RUSH.parachute, buildParachute],
  [RUSH.speedLine, buildSpeedLine],
  ...RUSH_ZONES.flatMap((zone) => [
    [zoneKey(zone, 'road'), () => buildRoad(zone)],
    [zoneKey(zone, 'sideL'), () => buildSide(zone, 'L')],
    [zoneKey(zone, 'sideR'), () => buildSide(zone, 'R')],
    [zoneKey(zone, 'fill'), () => buildFill(zone)],
    [extraKey(zone, 'sideRPlain'), () => buildSide(zone, 'R', false)],
    [extraKey(zone, 'fillR'), () => buildFill(zone, 'R')],
  ] as const),
];

/** Looping animations: [key, sheet, frames, fps] (fps as written in keys.ts). */
export const RUSH_ANIM_LIST: readonly (readonly [string, string, readonly number[], number])[] = [
  [RUSH_ANIMS.drive, RUSH.truck, [TRUCK_FRAME.driveA, TRUCK_FRAME.driveB], 10],
  [RUSH_ANIMS.fly, RUSH.truck, TRUCK_FRAME.fly, 14],
  [RUSH_ANIMS.sideFly, RUSH.truckFly, [0, 1, 2, 3], 12],
  [RUSH_ANIMS.scooter, RUSH.scooter, [0, 1], 6],
  [RUSH_ANIMS.ape, RUSH.ape, [0, 1], 6],
  [RUSH_ANIMS.blink, RUSH.blinker, [0, 1], 3],
  [RUSH_ANIMS.puddle, RUSH.puddle, [0, 1], 3],
  [RUSH_ANIMS.shield, RUSH.shield, [0, 1, 2, 3], 10],
  [RUSH_ANIMS.grip, RUSH.grip, [0, 1, 2, 3], 12],
  // the two radar frames are different marks (0 red danger, 1 green safe): the pulse loops the danger mark
  [RUSH_ANIMS.radar, RUSH.radar, [0], 4],
  [RUSH_ANIMS.flame, RUSH.flame, [0, 1, 2, 3], 16],
  [RUSH_ANIMS.zone, RUSH.zone, [0, 1, 2, 3], 6],
  [RUSH_ANIMS.customerA, RUSH.customer, [0, 1, 2, 3], 6],
  [RUSH_ANIMS.customerB, RUSH.customer, [4, 5, 6, 7], 6],
];
