/**
 * [space] Level 3 "CICCIO'S INVADERS" texture keys and frame layout.
 * Produced by src/art/space.ts, consumed by src/game/invaders/**.
 */

export const SPACE = {
  /** sheet 43x40: 0-1 level (engine flicker), 2-3 banking left, 4-5 banking right. Nose up, centre column x=21. */
  jet: 'space-jet',
  /** sheet 16x16, 2-frame march each */
  alienA: 'space-alien-a',
  alienB: 'space-alien-b',
  /** sheet 16x16: [0,1] coral planet, [2,3] teal planet, [4,5] violet planet (ringed, 2-frame) */
  planet: 'space-planet',
  /** sheet 16x16: [0,1] big asteroid, [2,3] small asteroid */
  asteroid: 'space-asteroid',
  /** sheet 40x20, frames 0-3 running lights */
  ufo: 'space-ufo',
  /** sheet 8x16, frames 0-1 — flying provola stick going up */
  shot: 'space-shot',
  /** sheet 10x10, frames 0-3 — alien goo drop / tumbling meteor bit */
  goo: 'space-goo',
  rock: 'space-rock',
  /** sheet 14x20, frames 0-3 — lightning capsule (glow pulse) */
  capsule: 'space-capsule',
  /** sheet 16x16, frames 0-3 — electric impact spark (once) */
  spark: 'space-spark',
  /** sheet 20x20, frames 0..FOOD_COUNT-1 — the owner's foods */
  food: 'space-food',
  /** sheet 24x24, frames 0-5 — grey smoke puff (once) */
  smoke: 'space-smoke',
  /** sheet 24x24, frames 0-6 — explosion (once) */
  boom: 'space-boom',
  /** sheet 64x64, frames 0-7 — black hole swirl loop */
  hole: 'space-hole',
  /** image 32x20 — burger shield (copied per shield, then eroded) */
  shield: 'space-shield',
  /** image ~190x70 — "CICCIO'S / INVADERS" wordmark */
  title: 'space-title',
  /** sheet 13x13, frames 0-3 — star twinkle on the wordmark (once) */
  glint: 'space-glint',
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
  /** image ~167x239 — the owner's logo face (FACE_URL), loaded by the scene, not built by space.ts */
  face: 'space-face',
} as const;

/** Ciccio's head cut out of the owner's logo (ref/ciccio_face_logo.jpg): the face on the jet and on the level card. */
export const FACE_URL = `${import.meta.env.BASE_URL}brand/ciccio-face.png`;

/**
 * The face over the jet sheet, in frame pixels (level flight): centre and height. It covers the
 * canopy and the fuselage down to the top of the engine bell; the nose tip, the wings with their
 * red trim, the fins and the bell stay visible around it. The hit box (game/invaders/config.ts)
 * lies inside it.
 */
export const JET_FACE = { x: 21.5, y: 19.5, h: 27 } as const;

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
  glint: 'space-glint-twinkle',
} as const;

/** cheese wheel, roast chicken, wheat, drumstick, lettuce, tomatoes, egg, cheese slices, half bun */
export const FOOD_COUNT = 9;
