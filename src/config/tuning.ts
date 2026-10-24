/**
 * Every gameplay / physics constant (BRIEF §4). Units: world px (= art px), seconds
 * for speeds (px/s, px/s²) and milliseconds for timers. Pure data, no Phaser.
 */

/** Platformer movement (Ciccio on foot). */
export const MOVE = {
  /** downward acceleration, px/s² */
  gravity: 1100,
  /** terminal fall speed, px/s */
  maxFall: 520,
  /** gravity multiplier while falling (1 = symmetric arc; the heavy hero falls faster than he rises) */
  fallMul: 1,
  /** top running speed, px/s */
  runMax: 150,
  /** acceleration while holding a direction on the ground */
  groundAccel: 1500,
  /** deceleration with no input on the ground (high: no sliding after release) */
  groundDecel: 2400,
  /** acceleration when the input points against the current velocity (snappy turns) */
  turnAccel: 3200,
  /** acceleration while airborne and holding a direction */
  airAccel: 1100,
  /** deceleration while airborne with no input (keeps some momentum) */
  airDrag: 420,
  /** initial jump speed (≈5 tiles high, ≈7 tiles long at full speed) */
  jumpV0: 420,
  /** releasing jump early cuts the upward speed to this value… */
  jumpCutVy: 170,
  /** …but only after the button was held at least this long (a tap still hops ~2.2 tiles) */
  jumpMinHoldMs: 60,
  /** jump still allowed this long after walking off a ledge */
  coyoteMs: 120,
  /** a jump pressed this long before landing still fires on touchdown */
  jumpBufferMs: 150,
  /** bounce speed after stomping an enemy */
  stompBounce: 300,
  /** bounce speed after a stomp while jump is held */
  stompBounceHeld: 420,
} as const;

export type MoveParams = { readonly [K in keyof typeof MOVE]: number };

/** Ciccio body, damage and power-up numbers. */
export const HERO = {
  bodyW: 16,
  bodyH: 34,
  maxHearts: 4,
  /** Brie: visual + body scale and jump multiplier (+6% v0 ≈ +12% height) */
  brieScale: 1.12,
  brieJumpMul: 1.06,
  /** horizontal / vertical knockback when hurt */
  knockX: 150,
  knockY: 230,
  /** input ignored after a hit so the knockback reads */
  hurtLockMs: 260,
  /** blinking invulnerability after a hit */
  invulnMs: 1600,
  /** invulnerability after a pit respawn (long enough to read the scene and step away) */
  respawnInvulnMs: 2000,
  /** awake enemies closer than this to the respawn point are sent back to their spawn */
  respawnClearPx: 96,
  /** blink frequency while invulnerable */
  blinkHz: 14,
  /** a body whose top goes this far below the level bottom has fallen into a pit */
  pitMargin: 24,
} as const;

/** Score table (BRIEF §4 Rules + §6 v2). The run starts at 161 like the cup HUD. */
export const SCORE = {
  start: 161,
  /** the coin */
  nugget: 10,
  /** Ciccio's fries tray: rarer bonus */
  fries: 30,
  burger: 25,
  brie: 30,
  goat: 50,
  thai: 60,
  crunchy: 60,
  stomp: 30,
  club: 40,
  cheese: 45,
  crate: 20,
  /** level 5: fist kill, ground-slam kill, one brick smashed to rubble */
  punch: 40,
  slam: 45,
  brick: 5,
  /** the mega burger */
  boss: 200,
  clear: { 1: 100, 2: 200, 3: 300, 4: 400, 5: 500, 6: 600 },
} as const;

/** Kill effects (BRIEF §6): world freeze + shake on a weapon kill, cheese / fire timings. */
export const KILL_FX = {
  /** physics freeze on a cheese / club kill */
  hitStopMs: 55,
  shake: 2.5,
  shakeMs: 120,
  /** fallbacks when the engulf / burn sheets are missing (placeholder art) */
  engulfMs: 520,
  burnMs: 560,
  /** engulf frame from which the enemy is hidden under the blob */
  engulfHideFrame: 3,
  /** a walker killed mid-hop drops at most this far (world px) to the ground before its effect */
  dropMaxPx: 64,
} as const;

/** Provola Goat cheese shots. */
export const CHEESE = {
  speed: 260,
  cooldownMs: 420,
  lifetimeMs: 1200,
  /** spawn offset in front of the hand so the shot never starts inside a wall behind Ciccio */
  muzzle: 4,
} as const;

/** Alette Thai club swing. */
export const CLUB = {
  /** hitbox reaches this far in front of the body edge */
  reach: 30,
  /** hitbox half height around the body centre */
  vRange: 22,
  cooldownMs: 550,
  /** hitbox is live in this window of the swing */
  activeFromMs: 30,
  activeToMs: 170,
  /** whole swing animation (3 frames at 18 fps) */
  swingMs: 170,
} as const;

/** Alette Crunchy flight (level 2 mode). */
export const FLIGHT = {
  riseVy: -110,
  glideVy: 55,
  diveVy: 150,
  speedX: 155,
  /** how fast vy approaches its target, px/s² */
  approach: 700,
  /** highest world y the body top may reach */
  ceilingY: 48,
  /** upward kick when taking off from the ground (then the steady climb takes over) */
  takeoffVy: -290,
  /** horizontal acceleration while airborne and steering */
  accelX: 900,
  /** a wing flap sfx every this many ms while climbing */
  flapMs: 280,
  /** a trail puff every this many ms while climbing */
  trailMs: 28,
} as const;

export type FlightParams = { readonly [K in keyof typeof FLIGHT]: number };

/** Enemy behaviour. Speeds px/s, times ms, distances px. */
export const ENEMY = {
  pickle: { walk: 34, charge: 105, senseX: 104, senseY: 30, telegraphMs: 360, chargeMs: 1200, restMs: 800 },
  /** leash: never lands farther than this from its spawn, hops back home when it strayed */
  chili: { hopVy: -150, idleHopMs: 900, senseX: 100, telegraphMs: 560, leapVy: -330, leapVx: 80, restMs: 1100, leash: 56 },
  /** clangKick: sideways push on Ciccio after a stomp on the armour (no endless trampoline) */
  armor: { walk: 20, dazedMs: 650, clangKick: 160 },
  /** sine flight around the spawn point: horizontal sweep + faster vertical wave (rad/s) */
  bat: { rangeX: 40, wx: 0.9, amp: 18, wy: 2.6, track: 4 },
  demon: { walk: 30, chase: 60, senseX: 96, senseY: 28, hopVy: -170, hopMs: 1700 },
  /** hovering bob (not stompable) */
  spirit: { bob: 5, wy: 2.4, driftX: 6, wx: 0.7, track: 4 },
  /** level 5 brute: walks, telegraphs, charges in a straight line, crashes dazed into walls */
  brute: { walk: 26, charge: 170, senseX: 150, senseY: 40, telegraphMs: 520, chargeMs: 1100, restMs: 700, dazedMs: 900 },
  /**
   * level 5 mini-boss: walks at the hero, telegraphs, jumps and smashes the ground; the impact
   * sends two low shockwaves (px/s, travel px, height px) that must be jumped over;
   * stunGraceMs: after a slam stagger ends it cannot be staggered again for this long
   */
  megaburger: { walk: 30, walkMs: 1800, telegraphMs: 800, jumpVy: -430, jumpVx: 100, smashMs: 520, restMs: 900, waveSpeed: 130, waveRange: 440, waveH: 16, stunGraceMs: 2000 },
  /** enemies wake up when this close to the camera edge */
  wakeMargin: 48,
} as const;

/** Hit points against the level 5 fists (level 1-2 enemies die from their single weapon hit). */
export const ENEMY_HP: Readonly<Record<string, number>> = {
  pickle: 1,
  chili: 1,
  armor: 2,
  bat: 1,
  demon: 1,
  spirit: 1,
  brute: 3,
  megaburger: 8,
};

/** Level 5 hero: Ciccio in rage form (BRIEF §7). Slower, higher jump, heavier fall, two fist actions. */
export const HULK = {
  bodyW: 22,
  bodyH: 50,
  move: {
    ...MOVE,
    gravity: 1250,
    fallMul: 1.4,
    maxFall: 640,
    runMax: 120,
    groundAccel: 1100,
    groundDecel: 2200,
    turnAccel: 2600,
    airAccel: 900,
    airDrag: 380,
    jumpV0: 520,
    jumpCutVy: 190,
    coyoteMs: 70,
    stompBounce: 330,
    stompBounceHeld: 440,
  } satisfies MoveParams,
  /** PUGNO: hitbox in front of the body; vUp / vDown measured from the body centre */
  punch: { reach: 30, vUp: 30, vDown: 24, cooldownMs: 350, activeFromMs: 50, activeToMs: 150, swingMs: 230 },
  /** SPACCA: hop (ground) or straight dive (air), then a shockwave of `radius` around the feet */
  slam: {
    hopVy: 360,
    hangMs: 60,
    diveVy: 780,
    radius: 48,
    reachUp: 64,
    reachDown: 10,
    enemyDamage: 2,
    brickDamage: 2,
    stunMs: 1500,
    cooldownMs: 650,
    recoverMs: 220,
    shake: 5,
    shakeMs: 200,
    hitStopMs: 70,
  },
  /** a landing faster than minSpeed (a full jump) dazes the enemies close to the feet */
  landing: { minSpeed: 480, radius: 36, stunMs: 800, shake: 2.5, shakeMs: 90 },
  /** a punched enemy that survives is staggered; a killed one is launched away spinning */
  hit: { stunMs: 420, knockVx: 90 },
  launch: { dist: 190, rise: 54, ms: 620, spin: 900 },
  /** a brick takes this many hits (or slam damage points) to break */
  brickHits: 3,
  /** nuggets that burst out of a loaded crate */
  nuggets: 3,
} as const;

/** Level 5 goal cinematic (flag ripped off the pole and thrown away), ms unless noted. */
export const FINALE = {
  /** hero walks to the pole at this speed, px/s */
  walkSpeed: 95,
  reachMs: 170,
  gripMs: 200,
  ripMs: 260,
  windMs: 170,
  releaseMs: 140,
  followMs: 220,
  roarMs: 800,
  poseMs: 600,
  /** the thrown cloth tumbles off screen this long */
  flightMs: 1100,
  /** share of the way to the cloth the camera drifts while it flies */
  cameraShare: 0.35,
  /** the finale starts this far (px) in front of the pole */
  mouth: 44,
} as const;

/** Mini-boss arena: the view is clamped to it once the hero steps in. */
export const ARENA = {
  /** world px the camera bounds ease toward their target, 1/s */
  boundsRate: 4,
  /** invisible side wall thickness */
  wall: 16,
} as const;

/** Camera framing. */
export const CAMERA = {
  /** exponential smoothing rates (1/s): higher = snappier */
  followX: 7,
  followY: 5,
  /** minimum look-ahead distance in the facing direction */
  lookAhead: 34,
  /** look-ahead as a share of the view width (narrow portrait views see further ahead)… */
  lookShare: 0.15,
  lookShareFlight: 0.3,
  /** …capped so wide views keep Ciccio near the centre */
  lookMax: 48,
  lookMaxFlight: 80,
  lookAheadRate: 3,
  /** vertical dead zone around the last grounded height (px above / below) */
  deadUp: 52,
  /**
   * the rage hero's dead zone: just above his 108 px jump, so a normal jump never drags the view
   * up (the walking line would sink behind the landscape touch controls); only the head-under-HUD
   * limit lifts it
   */
  deadUpRage: 116,
  deadDown: 10,
  /** where the feet sit in the view (0 top … 1 bottom) */
  feetAt: 0.72,
  /** landscape overlay controls: max world px shown below the level bottom (World draws 4 extra rows) */
  maxExtraBottom: 48,
  /** extra room kept between the covered band and the walking line, world px */
  insetMargin: 6,
  /** Ciccio's head is kept at least this far below the HUD bar (insetTop), world px */
  headMargin: 6,
  /** world px the view may rise above the level top beyond the HUD band (high jumps) */
  maxExtraTop: 64,
  /**
   * CSS px under the HUD band a banner covers (8 px offset + box + 7 px drop shadow, measured
   * from ui/overlays.css: one line in landscape, two in portrait). The head stays below it.
   */
  bannerCss: { landscape: 56, portrait: 70 },
  /** the banner's slide-out after its time is up (ui/banner.ts OUT_MS) */
  bannerOutMs: 240,
  /** smoothing rate (1/s) of the banner band, so the view never jumps when one pops in */
  bannerRate: 8,
  /** screen shake amplitudes, world px */
  shakeHurt: 4,
  shakeClang: 2,
  /** preferBottom framing (lava levels): head room kept above the hero, share of the view */
  topMargin: 0.22,
} as const;

/** Background parallax factors (0 = glued to the camera, 1 = moves with the world). */
export const PARALLAX = {
  clouds: 0.12,
  cloudDrift: 3,
  far: 0.25,
  near: 0.45,
  bushes: 0.7,
  /** level 2 fire vortex drifts this share of the view over the level (effective factor ~0.04-0.09) */
  vortexSweep: 0.4,
} as const;

/** Level flow. */
export const FLOW = {
  /** "VAI IN BUCA!" appears when the player gets this close (tiles) to the hole */
  goalBannerTiles: 20,
  /** HUD time refresh period */
  hudTimeMs: 250,
  /** delay before the game-over / victory overlays */
  gameOverDelayMs: 900,
  victoryDelayMs: 1100,
} as const;
