/**
 * [space] Level 3 "CICCIO'S INVADERS" texture keys and frame layout.
 * Produced by src/art/space.ts, consumed by src/game/invaders/**.
 */

export const SPACE = {
  /** sheet 32x32: 0-1 level (engine flicker), 2-3 banking left, 4-5 banking right. Nose up, centre x=16. */
  jet: 'space-jet',
  /** sheet 16x16, 2-frame march each */
  alienA: 'space-alien-a',
  alienB: 'space-alien-b',
  /** sheet 16x16: [0,1] coral planet, [2,3] teal planet, [4,5] violet planet (ringed, 2-frame) */
  planet: 'space-planet',
  /** sheet 16x16: [0,1] big asteroid, [2,3] small asteroid */
  asteroid: 'space-asteroid',
  /** sheet 32x16, frames 0-3 running lights */
  ufo: 'space-ufo',
  /** sheet 6x12, frames 0-1 — flying provola stick going up */
  shot: 'space-shot',
  /** sheet 8x8, frames 0-3 — alien goo drop / tumbling meteor bit */
  goo: 'space-goo',
  rock: 'space-rock',
  /** sheet 12x16, frames 0-3 — lightning capsule (glow pulse) */
  capsule: 'space-capsule',
  /** sheet 16x16, frames 0-3 — electric impact spark (once) */
  spark: 'space-spark',
  /** sheet 16x16, frames 0..FOOD_COUNT-1 — the owner's foods */
  food: 'space-food',
  /** sheet 24x24, frames 0-5 — grey smoke puff (once) */
  smoke: 'space-smoke',
  /** sheet 24x24, frames 0-6 — explosion (once) */
  boom: 'space-boom',
  /** sheet 64x64, frames 0-7 — black hole swirl loop */
  hole: 'space-hole',
  /** image 32x20 — burger shield (copied per shield, then eroded) */
  shield: 'space-shield',
  /** image — "CICCIO'S / INVADERS" wordmark */
  title: 'space-title',
  /** images 128x128, seamless star tiles (far / mid / near) */
  starsFar: 'space-stars-far',
  starsMid: 'space-stars-mid',
  starsNear: 'space-stars-near',
  /** image 16x256 — deep navy gradient, stretched behind everything */
  sky: 'space-sky',
  /** image 128x96 — soft dithered nebula cloud */
  nebula: 'space-nebula',
  /** image 48x32 — distant ringed planet / image 20x20 — distant moon */
  farPlanet: 'space-far-planet',
  farMoon: 'space-far-moon',
  /** image 12x12 — lightning icon (food tray counter / side panel) */
  boltIcon: 'space-bolt-icon',
} as const;

export const SPACE_ANIMS = {
  jetLevel: 'space-jet-level',
  jetLeft: 'space-jet-left',
  jetRight: 'space-jet-right',
  ufo: 'space-ufo-lights',
  shot: 'space-shot-fly',
  goo: 'space-goo-drip',
  rock: 'space-rock-tumble',
  capsule: 'space-capsule-pulse',
  spark: 'space-spark-once',
  smoke: 'space-smoke-once',
  boom: 'space-boom-once',
  hole: 'space-hole-spin',
} as const;

/** cheese wheel, roast chicken, wheat, drumstick, lettuce, tomatoes, egg, cheese slices, half bun */
export const FOOD_COUNT = 9;
