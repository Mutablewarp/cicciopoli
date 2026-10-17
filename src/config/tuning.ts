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
  clear: { 1: 100, 2: 200, 3: 300, 4: 400 },
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
  /** enemies wake up when this close to the camera edge */
  wakeMargin: 48,
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
