/**
 * ART MANIFEST — the contract between art packs and gameplay. OWNER: integrator.
 *
 * Units: 1 world unit = 1 art pixel. Tiles are 16x16. Everything is pixel art
 * drawn on canvases at native resolution (never pre-scaled).
 *
 * Every key listed here MUST be produced by the pack named in brackets.
 * Frame indices are fixed; gameplay code relies on them.
 */

export const TILE = 16;

/* ======================================================= [ciccio] src/art/ciccio.ts */
/**
 * `ciccio` sheet, 48x48 frames, character faces RIGHT, feet touch the bottom
 * pixel row (y = 47), body centred on x = 24. Character ~28 px wide, ~38 px tall.
 * Physics body used by gameplay: 16 x 34, bottom-centred.
 */
export const CICCIO = {
  sheet: 'ciccio',
  frame: 48,
  idle: [0, 1, 2, 3],
  run: [4, 5, 6, 7, 8, 9, 10, 11],
  jump: 12,
  apex: 13,
  fall: 14,
  land: 15,
  hurt: 16,
  fly: [17, 18, 19, 20],
  shoot: 21,
  club: [22, 23, 24],
  victory: [25, 26],
  frameCount: 27,
  /** 16x16 head icon (HUD, progress marker) */
  headIcon: 'ciccio-head',
  /** 64x64 head portrait (victory / game over screens) */
  portrait: 'ciccio-portrait',
} as const;

export const CICCIO_ANIMS = {
  idle: 'ciccio-idle', // frames idle, ~6 fps, loop
  run: 'ciccio-run', // frames run, ~14 fps, loop
  fly: 'ciccio-fly', // frames fly, ~10 fps, loop
  club: 'ciccio-club', // frames club, ~18 fps, once
  victory: 'ciccio-victory', // frames victory, ~4 fps, loop
} as const;

/* ======================================================= [items] src/art/items.ts */
/** Pickups, worn power-ups, projectiles and generic FX (shared by both levels). */
export const ITEMS = {
  fries: 'fries', //        sheet 16x16, frames 0-3 idle shine loop — Ciccio's RED paper tray (maroon boat,
  //                         checkered liner) full of golden fries, see ref/photo_provola_fries_nuggets.jpg bottom
  burger: 'burger', //      sheet 16x16, frames 0-3 idle shine loop
  brie: 'brie', //          sheet 16x16, frames 0-3 idle shine loop   (brie wedge, white rind)
  provola: 'provola', //    sheet 16x16, frames 0-3 — PROVOLA GOAT: fried battered provola STICKS, rectangular,
  //                         golden bumpy batter (photo top box); 2 sticks, very readable
  thai: 'thai', //          sheet 16x16, frames 0-3 — chicken wings in red-orange Thai glaze
  crunchy: 'crunchy', //    sheet 24x16, frames 0-3 — golden fried crunchy wings, flame flicker
  cheeseShot: 'cheese-shot', //   sheet 12x8, frames 0-1 — flying provola stick (rectangular, battered) + streak
  cheeseSplat: 'cheese-splat', // sheet 24x16, frames 0-5 — melted cheese splat + droplets (once)
  club: 'club', //          sheet 24x24, frame 0 — giant Thai-glazed wing used as club.
  //                         Grip point at (5,19) in frame; club points up-right at angle 0.
  flame: 'flame', //        sheet 16x24, frames 0-5 loop — fire (club swing trail, torches)
  badge: 'provola-badge', //image 8x8 — mini battered provola stick pinned on the T-shirt
  wings: 'wings', //        sheet 32x24, frames 0-3 loop — two crunchy chicken wings worn as wings.
  //                         Attach point (16,12) = shoulder blades. Drawn BEHIND ciccio.
  shield: 'shield', //      sheet 48x48, frames 0-3 loop — translucent creamy brie aura around a
  //                         28x38 character positioned like the ciccio sheet (feet at y=47)
  sparkle: 'sparkle', //    sheet 8x8, frames 0-3 (once)
  dust: 'dust', //          sheet 8x8, frames 0-4 (once) — landing / running puffs
  poof: 'poof', //          sheet 16x16, frames 0-5 (once) — enemy defeated cloud
  hitStar: 'hit-star', //   sheet 16x16, frames 0-3 (once) — impact burst
  crateBits: 'crate-bits', // sheet 8x8, frames 0-3 — wooden splinters (static frames)
  digits: 'digits', //      sheet 6x8, frames 0-9 digits, 10 '+', 11 'x' — score popups (cream with dark outline)
  nugget: 'nugget', //      sheet 12x12, frames 0-5 spin loop — crunchy chicken nugget used as the COIN
  //                         (breaded golden-brown bumpy ball, see ref/photo_provola_fries_nuggets.jpg)
  cheeseEngulf: 'cheese-engulf', // sheet 32x32, frames 0-7 once — melted provola blob swallows an enemy
  //                         (centred on the enemy, bottom at y=31), then drips away to nothing
  burn: 'burn', //          sheet 32x32, frames 0-7 once — enemy catches fire: flames rise around the
  //                         silhouette, then a dark smoke/ash puff (bottom at y=31)
} as const;

export const ITEM_ANIMS = {
  fries: 'fries-idle',
  burger: 'burger-idle',
  brie: 'brie-idle',
  provola: 'provola-idle',
  thai: 'thai-idle',
  crunchy: 'crunchy-idle',
  cheeseShot: 'cheese-shot-fly',
  cheeseSplat: 'cheese-splat-once',
  flame: 'flame-loop',
  wings: 'wings-flap',
  shield: 'shield-loop',
  sparkle: 'sparkle-once',
  dust: 'dust-once',
  poof: 'poof-once',
  hitStar: 'hit-star-once',
  nugget: 'nugget-spin', //       10 fps loop
  cheeseEngulf: 'cheese-engulf-once', // 14 fps once
  burn: 'burn-once', //            14 fps once
} as const;

/* ============================================ TILESET INDICES (both themes, same layout) */
/**
 * Tileset canvas = 8 columns x 2 rows of 16x16 tiles (128x32 px), no margin.
 * GROUND = solid terrain. TOP tiles have the walkable surface on their top edge.
 * PLAT = floating one-way platform (walkable top, open underside visible as bricks).
 */
export const T = {
  GROUND_TOP_L: 0,
  GROUND_TOP_M: 1,
  GROUND_TOP_R: 2,
  GROUND_TOP_SINGLE: 3,
  GROUND_FILL_L: 4,
  GROUND_FILL_M: 5,
  GROUND_FILL_R: 6,
  GROUND_FILL_SINGLE: 7,
  PLAT_L: 8,
  PLAT_M: 9,
  PLAT_R: 10,
  PLAT_SINGLE: 11,
  BLOCK: 12, //            solid square block (stairs / walls)
  GROUND_TOP_M_ALT: 13, // variation of GROUND_TOP_M (flowers / pebbles / glow cracks)
  GROUND_FILL_M_ALT: 14, // variation of GROUND_FILL_M
  GROUND_FILL_DEEP: 15, // fill tile used 2+ rows below the surface (darker)
} as const;

/* ======================================================= [hills] src/art/hills.ts */
export const HILLS = {
  tiles: 'hills-tiles', //  tileset (see T)
  // Parallax layers: images 512 wide (seamless horizontally), drawn bottom-aligned.
  sky: 'hills-sky', //      image 16x512 vertical gradient (top deep sky -> horizon pale cyan)
  clouds: 'hills-clouds', //image 512x128 cream pixel clouds, transparent elsewhere
  far: 'hills-far', //      image 512x128 distant pale hills
  near: 'hills-near', //    image 512x192 big stepped green hills with dark outline + vine lines
  bushes: 'hills-bushes', //image 512x64 bushes / small trees strip sitting on the horizon
  // Props
  qblock: 'qblock', //      sheet 16x16: 0-3 shimmer loop, 4 = used/empty block
  crate: 'crate', //        image 16x16 wooden crate (breakable)
  flag: 'flag', //          sheet 32x64: 0-3 waving red golf flag on yellow/orange pole,
  //                         pole base at (8,63). Matches the cup: red flag, dark outline.
  hole: 'hole', //          image 32x10 — dark golf hole with grass lip, sits ON the ground surface
  checkpoint: 'checkpoint', // sheet 16x32: 0 = inactive (grey pennant), 1-3 = active waving
  tree: 'deco-tree', //     image 32x48
  bush: 'deco-bush', //     image 32x16
  flower: 'deco-flower', // sheet 8x8, frames 0-3 sway loop
  rock: 'deco-rock', //     image 16x8
  sign: 'deco-sign', //     image 16x16 wooden arrow sign pointing right
  // Enemies (face LEFT by default; gameplay flips)
  pickle: 'pickle', //      sheet 24x24: 0-3 walk, 4-5 charge (angry, faster legs), 6 squashed
  chili: 'chili', //        sheet 24x24: 0-1 idle bounce, 2 crouch, 3 airborne, 4 squashed
  armor: 'armor-burger', // sheet 32x32: 0-3 walk, 4 clang (hit by stomp), 5 dazed
} as const;

export const HILLS_ANIMS = {
  qblock: 'qblock-shine',
  flag: 'flag-wave',
  checkpointOn: 'checkpoint-wave',
  flower: 'flower-sway',
  pickleWalk: 'pickle-walk',
  pickleCharge: 'pickle-charge',
  chiliIdle: 'chili-idle',
  armorWalk: 'armor-walk',
} as const;

/* ===================================================== [inferno] src/art/inferno.ts */
export const INFERNO = {
  tiles: 'inferno-tiles', // tileset (see T): dark stone / bricks with hot glowing edges
  sky: 'inferno-sky', //    image 16x512 gradient bordeaux (top) -> red -> coral (horizon)
  vortex: 'inferno-vortex', // sheet 256x256, frames 0-7 loop — huge fire swirl (box art)
  clouds: 'inferno-clouds', // image 512x128 amber/orange pixel clouds
  far: 'inferno-far', //    image 512x160 far castle silhouettes, pointy spires
  near: 'inferno-near', //  image 512x192 nearer dark castles with lit orange windows
  lava: 'lava', //          sheet 32x32 frames 0-3 — seamless horizontal lava surface strip:
  //                         bright crest on top 6 px, dark wavy line, molten body below
  lavaGlow: 'lava-glow', // image 64x32 soft additive glow (used with ADD blend)
  ember: 'ember', //        sheet 4x4 frames 0-3
  torch: 'deco-torch', //   sheet 8x16 frames 0-3 loop
  spire: 'deco-spire', //   image 16x48 rock spike / broken pillar
  chain: 'deco-chain', //   image 8x32 hanging chain
  flag: 'inferno-flag', //  sheet 32x64 frames 0-3 — burning golf flag on dark iron pole (pole base (8,63))
  hole: 'inferno-hole', //  image 32x10 glowing hole in obsidian
  checkpoint: 'brazier', // sheet 16x32: 0 unlit brazier, 1-3 lit loop
  bat: 'bat', //            sheet 24x16: 0-3 flap loop, 4 hit
  demon: 'demon', //        sheet 24x24: 0-3 walk, 4 squashed
  spirit: 'spirit', //      sheet 16x24: 0-3 flicker loop
} as const;

export const INFERNO_ANIMS = {
  vortex: 'vortex-spin',
  lava: 'lava-flow',
  ember: 'ember-glow',
  torch: 'torch-burn',
  flag: 'inferno-flag-wave',
  checkpointOn: 'brazier-burn',
  bat: 'bat-flap',
  demonWalk: 'demon-walk',
  spirit: 'spirit-flicker',
} as const;

/* ============================================== [hulk] src/art/hulk.ts (level 5 hero + FX) */
/**
 * `hulk` sheet, 64x64 frames, character faces RIGHT, feet touch the bottom pixel row (y = 63),
 * body centred on x = 32. Ciccio in HULK form: green skin, huge arms and chest, the black
 * hair and round black sunglasses of the logo on the green face, torn purple shorts (see
 * ref/hulk_screenshot.png, ref/hulk_photo.png) but standing UPRIGHT and heroic: V-taper torso, thick neck,
 * long legs. Character ~46 px wide, ~60 px tall.
 * Pack type is CiccioArtPack: anchors[i] belongs to frame i (hand = fist impact point,
 * chest, back, head = centre of the sunglasses).
 */
export const HULK = {
  sheet: 'hulk',
  frame: 64,
  idle: [0, 1, 2, 3],
  run: [4, 5, 6, 7, 8, 9, 10, 11],
  jump: 12,
  apex: 13,
  fall: 14,
  land: 15,
  hurt: 16,
  /** windup, strike, strike hold, recover */
  punch: [17, 18, 19, 20],
  /** crouch + leap, fists overhead at the apex, smash down, impact crouch */
  slam: [21, 22, 23, 24],
  /** chest-pounding roar, loops */
  roar: [25, 26],
  /** reach for the flag, grip it, rip it off the pole */
  grab: [27, 28, 29],
  /** windup, release (arm fully extended), follow-through */
  throw: [30, 31, 32],
  victory: [33, 34],
  frameCount: 35,
  /** 16x16 head icon (HUD, progress marker) */
  headIcon: 'hulk-head',
  /** 64x64 head portrait (victory / game over screens) */
  portrait: 'hulk-portrait',
} as const;

export const HULK_ANIMS = {
  idle: 'hulk-idle', //       6 fps loop
  run: 'hulk-run', //        fps chosen by the pack so the feet do not slide at the game's run speed (~120 px/s)
  punch: 'hulk-punch', //    22 fps once
  slam: 'hulk-slam', //      14 fps once
  roar: 'hulk-roar', //       6 fps loop
  grab: 'hulk-grab', //       8 fps once
  throw: 'hulk-throw', //    12 fps once
  victory: 'hulk-victory', // 4 fps loop
} as const;

/** FX that belong to the Hulk pack (all comic-book style: thick outlines, lime / magenta / white). */
export const HULK_FX = {
  shock: 'hulk-shock', //    sheet 96x32, frames 0-5 once — ground shockwave ring, centre bottom (48,31)
  burst: 'spacca-burst', //  sheet 64x48, frames 0-4 once — magenta comic starburst impact pop (no text)
  text: 'spacca-text', //    image 64x24 — the word "SPACCA!" in white comic lettering, lime outline
  rubble: 'rubble', //       sheet 8x8, frames 0-5 static — brick / stone chips (6 variations)
  dust: 'rubble-dust', //    sheet 32x24, frames 0-5 once — big grey-brown dust cloud, bottom-centred
  aura: 'hulk-aura', //      sheet 64x64, frames 0-3 loop — green rage glow behind the hero (ADD blend)
} as const;

export const HULK_FX_ANIMS = {
  shock: 'hulk-shock-once',
  burst: 'spacca-burst-once',
  dust: 'rubble-dust-once',
  aura: 'hulk-aura-loop',
} as const;

/* ======================================== [rampage] src/art/rampage.ts (level 5 world) */
/**
 * Theme 'rampage' — "SPACCA!" world: a smashed-up Palermo street / building site at a comic-book
 * dusk (black, lime green, magenta, purple, white — the T-shirt palette). Tileset layout = T.
 * Everything destructible is an entity drawn on top of the terrain (like crates).
 */
export const RAMPAGE = {
  tiles: 'rampage-tiles', //   tileset (see T): cracked asphalt / concrete, steel girders as PLAT
  sky: 'rampage-sky', //       image 16x512 gradient: deep purple (top) -> magenta -> orange (horizon)
  clouds: 'rampage-clouds', // image 512x128 comic-book clouds / smoke puffs, transparent elsewhere
  far: 'rampage-far', //       image 512x160 far skyline silhouettes (flat-roofed Palermo blocks, cranes)
  near: 'rampage-near', //     image 512x192 nearer buildings, lit windows, half demolished
  brick: 'rampage-brick', //   sheet 16x16 frames 0-3: 0 intact wall brick, 1-3 progressively cracked
  crate: 'rampage-crate', //   image 16x16 wooden crate (breaks in one punch)
  barrel: 'rampage-barrel', // image 16x16 steel drum (breaks in one punch, bigger debris)
  flag: 'rampage-flag', //     sheet 32x64 frames 0-3 waving red flag on a steel pole, pole base at (8,63)
  poleRipped: 'rampage-pole-ripped', // image 32x64 same pole after the flag was torn off: torn fabric
  //                           scrap at the top, pole slightly bent, same base (8,63)
  flagCloth: 'rampage-flag-cloth', //  sheet 32x24 frames 0-3 the red flag alone, torn edge, tumbling (loop)
  hole: 'rampage-hole', //     image 32x10 dark hole in the asphalt with a broken-concrete lip, sits ON the ground
  checkpoint: 'rampage-checkpoint', // sheet 16x32: 0 inactive, 1-3 active waving
  lamp: 'deco-lamp', //        image 16x48 bent street lamp
  cone: 'deco-cone', //        image 8x12 traffic cone
  dumpster: 'deco-dumpster', // image 32x20 battered green dumpster
  sign: 'deco-sign-r', //      image 16x16 road sign bent over
  // Enemies (face LEFT by default; gameplay flips). The pickle / chili / armour burger of the hills pack
  // are re-used on this level too.
  brute: 'brute', //           sheet 40x40: 0-3 walk, 4 windup, 5 strike, 6 hit flash, 7 dazed
  megaburger: 'megaburger', // sheet 64x64: 0-3 walk, 4 windup, 5 jump up, 6 smash, 7 hit flash, 8 dazed, 9 defeated
} as const;

export const RAMPAGE_ANIMS = {
  flag: 'rampage-flag-wave',
  flagCloth: 'rampage-flag-cloth-tumble',
  checkpointOn: 'rampage-checkpoint-wave',
  bruteWalk: 'brute-walk',
  megaburgerWalk: 'megaburger-walk',
} as const;
