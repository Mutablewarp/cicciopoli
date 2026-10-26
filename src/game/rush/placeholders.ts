/**
 * Stand-ins for every texture / animation of the 'rush' pack (sizes from src/art/rush/keys.ts), so
 * level 6 always runs with simple coloured shapes when the pack failed to load or lacks a key. The v9
 * side-view truck, seam caps / blends and shop sign plates have none: the scene falls back to the upright
 * truck and skips the others while the pack lacks them.
 */
import type Phaser from 'phaser';
import { PICKUP, RUSH, RUSH_ANIMS, RUSH_ZONES, TRUCK_FRAME, zoneKey } from '../../art/rush/keys';
import { ensureAnims, ensureTextures, loop, seq, type AnimSpec, type TexSpec } from '../placeholders';

const sheet = (key: string, w: number, h: number, frames: number, color: string): TexSpec => ({ key, w, h, frames, kind: 'sheet', color });
const image = (key: string, w: number, h: number, color: string): TexSpec => ({ key, w, h, color });

const ZONE_COLORS = { centro: ['#4a4a52', '#b89a78', '#8a7a68'], stadio: ['#3e3e46', '#d04a8a', '#5a8a4a'], mare: ['#3a3640', '#2a5aa0', '#c89a5a'] } as const;

const TEXTURES: readonly TexSpec[] = [
  sheet(RUSH.truck, 40, 64, TRUCK_FRAME.count, '#1c1c20'),
  image(RUSH.truckShadow, 40, 24, '#000000'),
  image(RUSH.truckSide, 160, 80, '#1c1c20'),
  sheet(RUSH.truckFly, 160, 96, 4, '#1c1c20'),
  image(RUSH.truckOrbit, 160, 96, '#1c1c20'),
  image(RUSH.space, 256, 256, '#0a1a3a'),
  sheet(RUSH.cars, 24, 40, 6, '#c83a3a'),
  sheet(RUSH.suv, 28, 48, 3, '#3a6ac8'),
  sheet(RUSH.van, 28, 56, 2, '#e8e8e8'),
  image(RUSH.bus, 32, 96, '#f08a2a'),
  sheet(RUSH.scooter, 12, 24, 2, '#7ac8e8'),
  sheet(RUSH.ape, 20, 32, 2, '#e8d040'),
  sheet(RUSH.blinker, 24, 40, 2, 'transparent'),
  image(RUSH.cone, 12, 12, '#ff7a20'),
  image(RUSH.barrier, 40, 16, '#e83030'),
  sheet(RUSH.works, 40, 40, 2, '#a07040'), // frame 1: the side-view pit
  sheet(RUSH.puddle, 32, 24, 2, '#b8401c'),
  sheet(RUSH.pickups, 20, 20, PICKUP.frames, '#ffd040'),
  sheet(RUSH.shield, 48, 72, 4, 'transparent'),
  sheet(RUSH.grip, 40, 24, 4, '#ffb020'),
  sheet(RUSH.popcorn, 6, 6, 4, '#fff6dc'),
  sheet(RUSH.radar, 40, 16, 2, '#e83030'),
  sheet(RUSH.flame, 12, 24, 4, '#ff8a2a'),
  image(RUSH.speedLine, 2, 24, '#ffffff'),
  sheet(RUSH.customer, 16, 24, 8, '#e8a070'),
  image(RUSH.bag, 12, 14, '#c8a070'),
  sheet(RUSH.zone, 40, 64, 4, '#3ad06a'),
  image(RUSH.parachute, 16, 14, '#e83030'),
  sheet(RUSH.fry, 16, 16, 4, '#ffd040'),
  sheet(RUSH.fever, 40, 24, 4, '#ffd040'),
  image(RUSH.streak, 4, 40, '#ffffff'),
  sheet(RUSH.bits, 6, 6, 12, '#8ab060'),
  ...RUSH_ZONES.flatMap((z) => [
    image(zoneKey(z, 'road'), 120, 128, ZONE_COLORS[z][0]),
    image(zoneKey(z, 'sideL'), 128, 256, ZONE_COLORS[z][1]),
    image(zoneKey(z, 'sideR'), 128, 256, ZONE_COLORS[z][1]),
    image(zoneKey(z, 'sideRPlain'), 128, 256, ZONE_COLORS[z][1]),
    image(zoneKey(z, 'fill'), 64, 64, ZONE_COLORS[z][2]),
    image(zoneKey(z, 'fillR'), z === 'mare' ? 128 : 64, z === 'mare' ? 128 : 64, ZONE_COLORS[z][2]),
  ]),
];

const ANIMS: readonly AnimSpec[] = [
  loop(RUSH_ANIMS.drive, RUSH.truck, [TRUCK_FRAME.driveA, TRUCK_FRAME.driveB], 10),
  loop(RUSH_ANIMS.fly, RUSH.truck, [...TRUCK_FRAME.fly], 14),
  loop(RUSH_ANIMS.sideFly, RUSH.truckFly, seq(4), 12),
  loop(RUSH_ANIMS.scooter, RUSH.scooter, seq(2), 6),
  loop(RUSH_ANIMS.ape, RUSH.ape, seq(2), 6),
  loop(RUSH_ANIMS.blink, RUSH.blinker, seq(2), 3),
  loop(RUSH_ANIMS.puddle, RUSH.puddle, seq(2), 3),
  loop(RUSH_ANIMS.shield, RUSH.shield, seq(4), 10),
  loop(RUSH_ANIMS.grip, RUSH.grip, seq(4), 12),
  loop(RUSH_ANIMS.radar, RUSH.radar, [0], 4),
  loop(RUSH_ANIMS.flame, RUSH.flame, seq(4), 16),
  loop(RUSH_ANIMS.zone, RUSH.zone, seq(4), 6),
  loop(RUSH_ANIMS.customerA, RUSH.customer, [0, 1, 2, 3], 6),
  loop(RUSH_ANIMS.customerB, RUSH.customer, [4, 5, 6, 7], 6),
  loop(RUSH_ANIMS.fry, RUSH.fry, seq(4), 8),
  loop(RUSH_ANIMS.fever, RUSH.fever, seq(4), 12),
];

/** Registers stand-ins for whatever the pack did not provide; returns the missing keys. */
export function ensureRushArt(scene: Phaser.Scene): string[] {
  const missing = ensureTextures(scene, TEXTURES);
  ensureAnims(scene, ANIMS);
  return missing;
}
