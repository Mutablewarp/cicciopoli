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
  fries: 'fries', //        sheet 16x16, frames 0-3 idle shine loop   (fries box, cup style)
  burger: 'burger', //      sheet 16x16, frames 0-3 idle shine loop
  brie: 'brie', //          sheet 16x16, frames 0-3 idle shine loop   (brie wedge, white rind)
  provola: 'provola', //    sheet 16x16, frames 0-3 — YELLOW SQUARE cheese block, very readable
  thai: 'thai', //          sheet 16x16, frames 0-3 — chicken wings in red-orange Thai glaze
  crunchy: 'crunchy', //    sheet 24x16, frames 0-3 — golden fried crunchy wings, flame flicker
  cheeseShot: 'cheese-shot', //   sheet 12x8, frames 0-1 — rectangular cheese projectile
  cheeseSplat: 'cheese-splat', // sheet 24x16, frames 0-5 — melted cheese splat + droplets (once)
  club: 'club', //          sheet 24x24, frame 0 — giant Thai-glazed wing used as club.
  //                         Grip point at (5,19) in frame; club points up-right at angle 0.
  flame: 'flame', //        sheet 16x24, frames 0-5 loop — fire (club swing trail, torches)
  badge: 'provola-badge', //image 8x8 — little yellow cheese square pinned on the T-shirt
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
