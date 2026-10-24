/**
 * Scene-side numbers of level 6 (camera, look and feel). Gameplay numbers live in
 * src/config/rush.ts. Units: world px (= art px), CSS px where named, ms for timers.
 */

/** Camera framing (framing.ts). */
export const RUSH_VIEW = {
  /** truck centre to the bottom of the free band: the truck rides in the bottom fifth */
  behindPx: 84,
  /** road + kerb + some sidewalk on each side that must always be on screen */
  minSidePx: 30,
  /** kerb band beside the road (the corner controls must not cover road or kerb) */
  kerbPx: 12,
  /** landscape: CSS px each bottom corner needs for the ◀ ▶ / FRENA buttons */
  cornerReserveCss: 190,
  /** CSS px of air under the truck where the controls are only in the corners */
  cornerMarginCss: 8,
  /** integer zoom when it keeps this share of the ideal one (dense / 1x screens) */
  integerKeepHiDpi: 0.9,
  integerKeepLoDpi: 0.8,
  /** the next integer zoom up is taken when it costs at most this share of the view… */
  integerSnap: 0.01,
  /** …and on 1x screens the truck may ride this low to get it (uneven art pixels show most there) */
  behindTightPx: 60,
  /** the scenery is drawn this far past every edge of the view, so a camera shake never shows the void */
  overscanPx: 8,
} as const;

/**
 * The Ciccio's storefronts, each drawn once over the plain right strip (scenery.ts), at the first
 * strip period that puts the whole shop past a road coordinate: La Lumia this far ahead of the
 * start (in sight from the first frame), Stadio this far past the ZONA STADIO cross street.
 */
export const LANDMARK = {
  laLumiaAheadPx: 150,
  stadioAfterPx: 40,
} as const;

/** Draw order inside the world layer. */
export const DEPTH = {
  scenery: 0,
  band: 5,
  zone: 10,
  shadow: 12,
  hazard: 14,
  vehicle: 16,
  pickup: 20,
  customer: 22,
  truckShadow: 24,
  trail: 25,
  truck: 30,
  /** the portal signs over the road: above the traffic, under the flying truck */
  portal: 34,
  flight: 40,
  fx: 50,
  marks: 60,
} as const;

/** Truck look (truckView.ts). */
export const TRUCK_LOOK = {
  /** suspension bob period, ms */
  bobMs: 180,
  /** lean tilt (rad) while changing lane, eased with leanTauMs */
  leanRad: 0.07,
  leanTauMs: 70,
  /** sauce wobble: rad amplitude, ms period */
  wobbleRad: 0.12,
  wobbleMs: 110,
  hitFlashMs: 140,
  blinkMs: 90,
  shadowAlpha: 0.32,
  /** flight: lift scale, shadow drift (px) and shrink, ease-in/out share of the flight */
  flyScale: 0.38,
  flyShadowDx: 16,
  flyShadowDy: 26,
  flyShadowShrink: 0.45,
  flyEase: 0.14,
  /** booster flame offsets from the truck centre (frame boosters at x 2 / 37, nozzle y 43) */
  flameDx: 17.5,
  flameDy: 24,
  /** rear light halos while braking (offsets from the truck centre) */
  brakeDx: 14,
  brakeDy: 24,
  /** rear of the truck (cheddar trail, popcorn, exhaust) */
  rearDy: 30,
  popcornEveryMs: 45,
} as const;

/** Road objects (entityView.ts). */
export const ENTITY_LOOK = {
  shadowDx: 2,
  shadowDy: 3,
  shadowAlpha: 0.28,
  /** customer stands this far outside the road edge, on the sidewalk */
  customerOutPx: 9,
  /** air nuggets fade in over this long */
  fadeInMs: 320,
  bobPx: 2,
  bobMs: 420,
  /** scooter blinker dots */
  blinkMs: 330,
  /** WAFFLE RADAR marks: px ahead of the truck */
  radarAheadPx: 150,
  /** top-edge warnings and the delivery arrow sit this far under the top of the free band */
  edgeMarkPx: 12,
  /** delivered zone fades to this */
  doneAlpha: 0.35,
  /** the green glow under a delivery zone pulses between glowMin and glowMin + glowAmp */
  glowMin: 0.16,
  glowAmp: 0.22,
} as const;

/** One-shot effects (fx.ts, react.ts). */
export const FX = {
  popupRisePx: 14,
  popupMs: 720,
  /** camera shake amplitudes in world px, the same on every screen (RUSH_VIEW.overscanPx covers them) */
  shakeHitMs: 220,
  shakeHitPx: 5,
  shakeBumpMs: 90,
  shakeBumpPx: 1.5,
  shakeLandMs: 160,
  shakeLandPx: 3,
  flashHitMs: 200,
  bagArcMs: 520,
  bagArcPx: 30,
  parachuteMs: 900,
  speedLineEveryMs: 40,
  speedLineMs: 260,
  vibrateHitMs: 120,
  vibrateDeliver: [40, 60, 40] as readonly number[],
  /** the customer's speech bubble keeps its bottom this far above the truck's front (world px)… */
  bubbleTruckGapPx: 4,
  /** …and fades out over this long once the customer is behind the truck (or its time is up) */
  bubbleFadeMs: 160,
  /** pass "+50" popups and coin blips: at most one per this many ms */
  passGapMs: 140,
  /** the last seconds: tick sfx + big digits from this many seconds left */
  urgentS: 10,
  bigDigitsS: 5,
} as const;

/** Run flow (session.ts). */
export const FLOW = {
  /** CORSA TERMINATA / time up without the finale: banner, then the results */
  endHoldMs: 1700,
  /** hints stay this long unless the player does the thing */
  hintMs: 3400,
  /** pre-run attract scroll behind the setup panel, px/s */
  attractSpeed: 60,
} as const;

/** Finale cinematic (finale.ts). */
export const FINALE = {
  /** stage the camera fits (world px) */
  stageW: 340,
  stageH: 220,
  /** the horizon sits this share of the view height below the centre (portrait: more sunset, less sea) */
  horizonLow: 0.2,
  /** sea → sunset → space climb */
  climbMs: 2600,
  /** hard cut to the orbit shot under a white flash (a cross-fade showed two trucks at once) */
  flashMs: 450,
  flashAlpha: 0.9,
  /** the full card stays up ~6 s before the results come in by themselves */
  totalMs: 11_000,
  skipAfterMs: 2000,
  /** meme card: one line every lineMs, starting at cardAtMs */
  cardAtMs: 3000,
  lineMs: 330,
  driftPx: 10,
  /** orbit sway: tiny, a rotated sprite breaks the pixel art into steps */
  spinRad: 0.025,
} as const;
