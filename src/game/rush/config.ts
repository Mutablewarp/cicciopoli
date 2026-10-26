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
  /** re-framing (rotation, resize, HUD inset) eases the camera over this long */
  easeMs: 250,
  /** labels and speech bubbles by the truck grow with the road on big canvases: to the zoom (CSS px per world px) /
   * zoomCss, from the overlay text size up to max (phones and tablets stay as they are) */
  nearText: { zoomCss: 2.67, max: 2.25 },
  /** the view turned: floating labels still in flight fade out this fast (their screen spots are gone) */
  turnFadeMs: 120,
  /**
   * v9 SIDE VIEW (landscape window, canvas aspect > aspect; once on, it holds while the aspect > aspectHold):
   * the camera turns so the truck drives to the RIGHT and the road fills the free height. World px unless named.
   */
  side: {
    aspect: 1.15,
    aspectHold: 1.05,
    /** road + kerb + this much sidewalk on each side always in the free height */
    minSidePx: 20,
    /** CSS px of the ▲ ▼ column on the left edge (touch screens): the truck rides right of it */
    controlsCss: 92,
    /** truck centre to the left edge of the free width (truck half length 32 + air)… */
    behindPx: 48,
    /** …and on 1x screens it may ride this close to get an integer zoom */
    behindTightPx: 36,
  },
} as const;

/** Truck sprite length and width (art/rush/keys.ts: sheet 40x64), for framing, labels and the debug readout. */
export const TRUCK_LEN = 64;
export const TRUCK_W = 40;

/**
 * The Ciccio's storefronts, each drawn once over the plain right strip (scenery.ts), at the first
 * strip period that puts the whole shop past a road coordinate: La Lumia this far ahead of the
 * start (in sight from the first frame), Stadio this far past the ZONA STADIO cross street.
 */
export const LANDMARK = {
  laLumiaAheadPx: 150,
  stadioAfterPx: 40,
  /** side view: the sign plate's top edge overlaps the road edge by this much… */
  plateInPx: 2,
  /** …and slides out to cover the storefront art's own blade sign (art/rush/street.ts ciccios: 5 + 27 px from the
   * road edge) wherever the screen shows the sidewalk that far */
  bladeFarPx: 32,
} as const;

/**
 * v9 light grade per zone (Centro daylight, Stadio late afternoon, Terrasini sunset), multiplied over the road
 * world; it eases from one zone to the next across this many px of road around each cross street.
 */
export const GRADE = {
  colors: [0xffffff, 0xfff0dc, 0xffe2cc] as readonly number[],
  bandPx: 240,
} as const;

/** v9 zone particles (RUSH.bits): plane-tree leaves, stadium dust, sea spray drifting over the road. */
export const BITS = {
  /** at most this many on screen */
  max: 14,
  /** one new bit every this many ms */
  everyMs: 260,
  /** sideways drift px/s, and how much slower than the road they move (they blow along) */
  driftPx: 26,
  lagPx: 30,
  swayPx: 3,
  swayMs: 520,
  alpha: 0.85,
  /** frames of each zone inside the sheet: 0-3 leaves, 4-7 dust, 8-11 spray */
  perZone: 4,
} as const;

/**
 * v9 customers outside each Ciccio's storefront: they wave all the time, hop and cheer as the truck goes by
 * (once per shop per run), x px out from the road edge (on the sidewalk) and y px apart along the shop front:
 * upright they flank the blade sign (28 rows, centred on the shop) so they never cover the logo.
 */
export const FANS = {
  outPx: [9, 11] as readonly number[],
  spacingPx: 56,
  /** side view: both on the kerb edge, either side of the shop's sign plate (plus this gap) */
  sideOutPx: 14,
  sideGapPx: 10,
  hopPx: 2,
  hopMs: 120,
  /** the truck is "passing" while the shop centre is within this many px of the truck */
  nearPx: 70,
  cheers: ['VAI CICCIO!', 'FORZA CICCIO!', 'GRANDE CICCIO!'] as readonly string[],
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
  /** v9 blinkers on a lane change: amber dots at the corners (offsets from the centre), flash period, held after */
  blinkDx: 15,
  blinkDy: 27,
  blinkerMs: 110,
  blinkerHoldMs: 220,
  /** v9 CICCIO FEVER gold trail behind the truck */
  feverDy: 40,
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
  /** v9 scooters wobble ±1 px sideways with this period */
  wobbleMs: 140,
  /** WAFFLE RADAR marks: px ahead of the truck */
  radarAheadPx: 150,
  /** top-edge warnings and the delivery arrow sit this far under the top of the free band… */
  edgeMarkPx: 12,
  /** …and this far from the right edge in the side view (clear of the FRENA button in the bottom-right corner) */
  edgeMarkSidePx: 40,
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
  /** points picked at the truck pop this far ahead of its centre (side view: further, the digits run along the road) */
  gainDy: 34,
  gainSideDy: 46,
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
  /** v9 FEVER: its gold speed lines come this often (it lasts 6 s, often over other effects) */
  feverLineEveryMs: 80,
  speedLineMs: 260,
  vibrateHitMs: 120,
  vibrateDeliver: [40, 60, 40] as readonly number[],
  /** the customer's speech bubble keeps its bottom this far above the truck's front (world px)… */
  bubbleTruckGapPx: 4,
  /** …and fades out over this long once the customer is behind the truck (or its time is up) */
  bubbleFadeMs: 160,
  /** pass "+50" popups and coin blips: at most one per this many ms */
  passGapMs: 140,
  /** side view: pass / SFIORATO! points pop at most this far behind the truck centre (right of the ▲ ▼ column) */
  popupBackSidePx: 24,
  /** the last seconds: tick sfx + big digits from this many seconds left */
  urgentS: 10,
  bigDigitsS: 5,
  /** v9 SFIORATO!: the white streak beside the truck, the tiny slow-down pulse (game speed x scale), a horn every n */
  streakMs: 260,
  streakPx: 22,
  nearSlowMs: 120,
  nearSlowScale: 0.55,
  nearHornEvery: 3,
  /** v9 FEVER banner: shown this long; behind a key banner it waits up to waitMs, else a label by the truck tells it */
  feverBannerMs: 1600,
  feverBannerWaitMs: 2000,
  /** v9 FEVER: gold sparks behind the truck every this many ms; the gold road edges (world px wide), their pulse */
  feverSparkMs: 70,
  feverEdgePx: 4,
  feverEdgeAlpha: 0.5,
  feverEdgePulse: 0.35,
  feverPulseMs: 120,
  feverGold: 0xffc828,
  /** v9 FEVER glow round the screen: band depth (CSS px), alpha of each of its 3 steps (the edge gets all three) + pulse */
  feverGlowCss: 18,
  feverGlowAlpha: 0.09,
  feverGlowPulse: 0.05,
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
