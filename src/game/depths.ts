/** Draw order of every layer of a level (higher = in front). */
export const DEPTH = {
  sky: -100,
  backdrop: -99, // huge slow background sprite (level 2 vortex), just above the sky
  layerBase: -90, // parallax layers stack upward from here
  haze: -11, // drifting background embers, in front of the castles, behind the level
  decor: -10,
  glow: -9, // additive lights around torches / braziers / the hole
  map: 0,
  hole: 2,
  flag: 3,
  checkpoint: 3,
  blocks: 4,
  pickups: 6,
  enemies: 10,
  trail: 18, // flight trail: behind the wings and Ciccio
  behindHero: 19,
  hero: 20,
  attach: 21,
  shield: 22,
  lava: 23, // in front of the hero so a fall reads as sinking in
  lavaGlow: 24,
  lavaFx: 24.5,
  shots: 25,
  fx: 30,
  popup: 40,
} as const;
