/**
 * ART MANIFEST for level 6 · CICCIO'S RUSH (pack 'rush', src/art/rush.ts buildRushArt()).
 * OWNER: integrator — the art lane must produce exactly these keys / sizes / frame counts,
 * the game lane may rely on them. Units: world px = art px.
 *
 * Camera: top-down with a slight rear 3/4 tilt; the road runs vertically and everything on
 * it faces UP the screen (we see roofs and the rear faces of vehicles). Lanes are 40 px wide,
 * the road is 3 lanes = 120 px, plus a 12 px kerb / sidewalk band drawn inside the side strips.
 * Frame anchors: vehicles are centred in their frame, the bottom row is the rear bumper.
 */

export const LANE_W = 40;
export const LANES = 3;
export const ROAD_W = LANE_W * LANES;

export type RushZone = 'centro' | 'stadio' | 'mare';
export const RUSH_ZONES: readonly RushZone[] = ['centro', 'stadio', 'mare'];

export const RUSH = {
  /**
   * The Ciccio's burger truck seen from above-behind, sheet 40x64, faces UP:
   * 0-1 drive (wheel / suspension bob), 2 lean left, 3 lean right, 4 brake (brake lights on),
   * 5 hit flash, 6-8 booster flight (rocket boosters out of the sides, flame loop).
   * Body ~34 px wide. Matte black body, red checkered bands, the white "Ciccio's" script with the
   * burger icon on the ROOF (readable on a phone: this is the shot the player sees all run),
   * the Ciccio face logo on the rear door. See ref/truck_top.png, ref/truck_photo.png.
   */
  truck: 'rush-truck',
  /** image 40x24 soft shadow under the truck (shrinks / drifts away when it flies) */
  truckShadow: 'rush-truck-shadow',
  /**
   * image 160x80 side view facing RIGHT for the pre-run panel, results, title card and the
   * ending: Sprinter-style van with the box body, "Ciccio's" script + burger icon, "The Burger
   * Truck", two red checkered bands, PALERMO, SICILY!, the face on the rear door, SEGUICI!.
   */
  truckSide: 'rush-truck-side',
  /** sheet 160x96 frames 0-3: the same side view flying, rocket boosters + flame loop */
  truckFly: 'rush-truck-fly',
  /**
   * ROADCOASTER meme (finale): image 160x96, the side-view truck floating in orbit, window open,
   * Ciccio in a white spacesuit + helmet at the wheel (round sunglasses visible through the visor),
   * arm resting on the window frame — the famous "car floating in space" shot, with our truck.
   */
  truckOrbit: 'rush-truck-orbit',
  /** image 256x256: deep space, stars, the Earth's limb with the Mediterranean and Sicily lit by the sun */
  space: 'rush-space',

  /** Traffic, top-down facing UP (slower than the truck, so it scrolls down). */
  cars: 'rush-cars', //       sheet 24x40 frames 0-5: small city cars in 6 colours
  suv: 'rush-suv', //         sheet 28x48 frames 0-2: SUVs in 3 colours
  van: 'rush-van', //         sheet 28x56 frames 0-1: white delivery van, grey light commercial
  bus: 'rush-bus', //         image 32x96: orange city bus
  scooter: 'rush-scooter', // sheet 12x24 frames 0-1: Vespa-style scooter with rider (wobble)
  ape: 'rush-ape', //         sheet 20x32 frames 0-1: three-wheeler Ape car, slow (very Palermo)
  /** sheet 24x40 frames 0-1: amber blinker overlay (frame 0 off, 1 on) for cars parked in double row / turning */
  blinker: 'rush-blinker',

  /** Hazards. */
  cone: 'rush-cone', //       image 12x12 traffic cone
  barrier: 'rush-barrier', // image 40x16 red-white roadworks barrier, one lane wide
  works: 'rush-works', //     image 40x40 roadworks pit with cones and a LAVORI sign, one lane
  puddle: 'rush-puddle', //   sheet 32x24 frames 0-1: spilled Ciccio's sauce on the asphalt (glossy, slippery)

  /**
   * Pickups, sheet 20x20 (frame index = PICKUP below). Food from the Ciccio's menu, bold outline,
   * readable by shape AND colour.
   */
  pickups: 'rush-pickups',
  shield: 'rush-shield', //   sheet 48x72 frames 0-3: golden nugget shield bubble around the truck
  grip: 'rush-grip', //       sheet 40x24 frames 0-3: melted cheddar trail under the truck
  popcorn: 'rush-popcorn', // sheet 6x6 frames 0-3: popcorn particles
  radar: 'rush-radar', //     sheet 40x16 frames 0-1: red danger chevrons for a lane / 2-3 green "safe" arrows
  flame: 'rush-flame', //     sheet 12x24 frames 0-3: booster flame (points DOWN)
  speedLine: 'rush-speedline', // image 2x24 white speed streak

  /** Deliveries. */
  customer: 'rush-customer', // sheet 16x24 frames 0-7: 0-3 customer A waving, 4-7 customer B waving
  bag: 'rush-bag', //           image 12x14 Ciccio's paper delivery bag (face logo)
  zone: 'rush-zone', //         sheet 40x64 frames 0-3: pulsing green delivery lane marker with bag icon
  parachute: 'rush-parachute', // image 16x14: small parachute for the bag dropped from the flying truck

  /**
   * Scenery per zone, keys built by zoneKey(): road strips image 120x128 (3 lanes, dashes,
   * seamless vertically), side strips (the 12 px kerb next to the road, seamless vertically:
   * sideL 128x1024 for centro / mare, 128x256 otherwise; right strips 128x256, the storefront
   * period) and 256x256 seamless fillers for very wide (landscape) views.
   * centro = Palermo centre (Politeama, Via Libertà: liberty palazzi, balconies, shop signs, the
   *          Ciccio's La Lumia storefront as a landmark), stadio = Viale del Fante (stadium stands in
   *          pink-and-black, roadworks, the Ciccio's Stadio storefront), mare = Terrasini seafront at
   *          sunset (sea, cliffs, the small fishing port with gozzi boats, palms, the coastal tower, the
   *          new Ciccio's Terrasini storefront with a PROSSIMA APERTURA banner: the last delivery is here).
   */
  driverPortraits: 'rush-drivers', // sheet 32x32 frames 0-2: the three drivers (RIFLESSI, OCCHIO, CONSEGNE)

  /* ---- v9 (BRIEF §8 "### v9") ---- */
  /**
   * The truck for the SIDE view of a landscape screen (the camera turns -90°, the truck drives to the right):
   * sheet 40x64 with exactly the 'rush-truck' frames (TRUCK_FRAME), the same truck, but the roof lettering
   * ("Ciccio's" script + burger icon) runs ALONG the body, bottom to top in the frame, so it reads left to
   * right on screen once the camera turns it. The rear-door face logo turned the same way.
   */
  truckX: 'rush-truck-x',
  /** sheet 12x12 frames 0-3: one golden fry stick of a FRIES TRAIL, glint sweeping across it (spin loop) */
  fry: 'rush-fry',
  /** sheet 40x24 frames 0-3: CICCIO FEVER gold sparkle trail behind the truck (like 'rush-grip') */
  fever: 'rush-fever',
  /** image 4x40: white air streak beside the truck on a SFIORATO! near miss */
  streak: 'rush-streak',
  /** sheet 6x6 frames 0-11: zone particles, 0-3 plane-tree leaves (centro), 4-7 dust (stadio), 8-11 sea spray (mare) */
  bits: 'rush-bits',
} as const;

/** Frame index inside RUSH.pickups. */
export const PICKUP = {
  nuggets: 0, //   SCUDO NUGGETS (shield)
  waffle: 1, //    WAFFLE RADAR
  popcorn: 2, //   POPCORN SPRINT (chicken pop corn)
  cheddar: 3, //   CHEDDAR GRIP
  booster: 4, //   PROPULSORE (easter egg: the flying truck)
  fries: 5, //     score pickup (Ciccio's fries tray)
  frames: 6,
} as const;

export const TRUCK_FRAME = { driveA: 0, driveB: 1, leanL: 2, leanR: 3, brake: 4, hit: 5, fly: [6, 7, 8], count: 9 } as const;

/**
 * 'sideRPlain' = the right strip without the Ciccio's storefront (128x256; the game draws the storefront
 * once as a landmark), 'fillR' = filler beyond the right strip (mare: Terrasini rooftops 128x128,
 * centro / stadio: same as 'fill' 64x64; 'fill' of mare is the open sea).
 */
export function zoneKey(zone: RushZone, part: 'road' | 'sideL' | 'sideR' | 'sideRPlain' | 'fill' | 'fillR' | ZoneSeamPart): string {
  return `rush-${part}-${zone}`;
}

/**
 * v9 seams (no straight cut between two textures, BRIEF v9 point 2), per zone:
 * 'capL' / 'capR' image 16x256, seamless vertically: the edge drawn where the left / right side strip meets its
 *   filler (hedge, wall, railing, low shadow), facing the filler side;
 * 'blendL' / 'blendR' image 128x256: the left / right side strip easing from this zone into the NEXT one (mixed
 *   buildings of both), drawn once in the transition band before the cross street (not for 'mare').
 */
export type ZoneSeamPart = 'capL' | 'capR' | 'blendL' | 'blendR';

/**
 * v9: an upright sign plate of each Ciccio's storefront for the SIDE view (the storefront art turns with the
 * camera; this plate stays readable): image 96x28, "Ciccio's La Lumia" / "Ciccio's Stadio" /
 * "Ciccio's Terrasini" + PROSSIMA APERTURA, the brand script, bold outline.
 */
export function shopSignKey(zone: RushZone): string {
  return `rush-shopsign-${zone}`;
}

export const RUSH_ANIMS = {
  drive: 'rush-truck-drive', //   frames 0-1, 10 fps loop
  fly: 'rush-truck-flight', //    frames 6-8, 14 fps loop
  sideFly: 'rush-truck-side-fly', // truckFly frames 0-3, 12 fps loop
  scooter: 'rush-scooter-ride', // 6 fps loop
  ape: 'rush-ape-ride', //        6 fps loop
  blink: 'rush-blink', //         blinker 0-1, 3 fps loop
  puddle: 'rush-puddle-shine', // 3 fps loop
  shield: 'rush-shield-loop', //  10 fps loop
  grip: 'rush-grip-loop', //      12 fps loop
  radar: 'rush-radar-pulse', //   4 fps loop
  flame: 'rush-flame-loop', //    16 fps loop
  zone: 'rush-zone-pulse', //     6 fps loop
  customerA: 'rush-customer-a', // frames 0-3, 6 fps loop
  customerB: 'rush-customer-b', // frames 4-7, 6 fps loop
  /* v9 */
  driveX: 'rush-truck-x-drive', // truckX frames 0-1, 10 fps loop
  flyX: 'rush-truck-x-flight', //  truckX frames 6-8, 14 fps loop
  fry: 'rush-fry-spin', //         8 fps loop
  fever: 'rush-fever-loop', //     12 fps loop
} as const;
