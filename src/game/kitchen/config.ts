/**
 * Scene-side numbers of level 7 (layout, look and feel). Gameplay numbers live in
 * src/config/kitchen.ts. Units: world px (= art px), CSS px where named, ms for timers.
 */

export type { Orient } from './plan';

/** The burger on the board: drawn at the plan's BoardArt.stack, less (in quarter steps) when the closed burger would
 * not fit the plan's room. Tray places cut at these tray px (1x): the wrapped burger, then the boat of fries, the
 * starter, the drink (the drink's place reaches past the tray's right edge). */
export const TRAY_CUTS = [44, 74, 104, 134] as const;

/** A pan in its place (art px, x the page's pan scale): the pan `dy` under the cell's top, its label tape on its front
 * lip `lip` px down the pan (higher when the cell is too short for two lines); a sauce bottle stands in its empty pan,
 * its bottom `bottleBottom` px down the pan. */
export const PAN = { dy: 1, lip: 28, bottleBottom: 32 } as const;
/** Label tapes: the 3x5 pixel font at the page's label scale, lines never wider than `maxW` font px. */
export const LABEL = { maxW: 36, lineH: 6 } as const;
/** Drinks: two per rack, each can over the middle of its place standing on the rack's floor, its label tape under it on
 * the rack's front; the can as tall as its place leaves, at most `canMax` times the rack's scale. */
export const DRINK = { canMax: 1.5 } as const;

/** Two pages (MONTAGGIO | COTTURA): the camera glide between them, the swipe, the tab. */
export const PAGER = {
  slideMs: 380,
  /** a horizontal swipe of this many CSS px switches the page; a tap moves less than `tapPx` */
  swipePx: 40,
  tapPx: 14,
  /** the mini cook bars of the griddle / fryer on the COTTURA tab (tab px x the page's label scale / 1.25) */
  bar: { w: 14, h: 4, gap: 3 },
  /** the other page's tab pulses (period) when something there needs you */
  pulseMs: 700,
  /** after a cooked item is taken off, the camera slides to MONTAGGIO this much later */
  handoffMs: 280,
} as const;

/** Touch feel: the pressed pan's contents lift (squash and stretch, a shadow), the pan bounces; a drag needs `dragPx`;
 * haptics when KitchenSettings.vibration is on (ms). */
export const TOUCH = {
  liftPx: 7,
  liftMs: 110,
  shadowAlpha: 0.35,
  dragPx: 12,
  /** the dragged piece is drawn this much bigger than in its pan, over the finger */
  dragScale: 1.25,
  dragLiftPx: 18,
  vibrate: { grab: 10, drop: 18 },
  /** drop target glow */
  glow: { color: 0xfff2a0, alpha: 0.28, rim: 0.9, pad: 3 },
} as const;

/** Furniture drawn under the stations: their soft shadows, the MONTAGGIO panel, the wooden board. */
export const FURNITURE = {
  shadow: { color: 0x101218, near: { dx: 1, dy: 2, alpha: 0.22 }, far: { dx: 3, dy: 5, alpha: 0.12 } },
  panel: { fill: 0x7d828b, rim: 0x2c2e34, lit: 0xaeb3bb, dark: 0x5f636b },
  board: { fill: 0xb7814f, rim: 0x5a3719, lit: 0xd49d63, grain: 0xa06c3c, grainEvery: 9 },
} as const;

/** Camera framing: integer zoom when it keeps this share of the ideal one. */
export const KITCHEN_VIEW = {
  integerKeepHiDpi: 0.9,
  integerKeepLoDpi: 0.85,
  /** a kitchen page snaps to an integer zoom only when it keeps this much: the stations stay as big as they can */
  integerKeepPage: 0.95,
  /** ... never when the smallest tap area (a page's `hit`) would drop under this many CSS px (adult fingers) */
  tapCss: 60,
  /** label letters and pans at least this tall / wide on screen (CSS px); a big screen shows both pages only when they hold */
  labelCss: 11,
  panCss: 72,
  /** a patty on the griddle at least this wide (CSS px), the griddle this share of a portrait screen's width */
  pattyCss: 64,
  griddleShare: 0.8,
  /** art px of the tallest closed burger of the menu (layout.test.ts): a board shorter than it at the plan's stack
   * scale makes the tallest burgers shrink, the framing prefers a plan that does not */
  tallestBurger: 57,
  /** taps in the kitchen count once the slide is this far */
  tapSlide: 0.85,
  /** both views draw their backdrop this far past the screen (a camera shake never shows the void) */
  pad: 8,
  /** the kitchen starts this far past one screen width: neither view's pad shows on the other at rest */
  gap: 12,
} as const;

/** The BANCONE stage: counter top height, how deep the customer stands behind it, the head top in the frame. */
export const COUNTER_VIEW = {
  topH: 56,
  /** frame rows hidden behind the counter */
  customerSink: 20,
  headTopPx: 6,
  walkBobPx: 2,
  walkStepMs: 170,
  beamH: 30,
  /** room kept over the customer's head for the speech bubble (three lines and the tail) when the counter is
   * framed, on a screen at least `bubbleRefCssW` wide (narrower: more lines, more room in proportion); the neon's
   * room goes over it. The UI keeps the bubble in the lower half of the room over the head (ui/kitchen/text.ts
   * placeBubble), the neon and the disc hang in the upper half: the bubble never covers them, nor the face. */
  bubbleCssPx: 112,
  bubbleRefCssW: 360,
  /** the UI's margin round its free area (ui/kitchen/hud.ts FREE_MARGIN) and the bubble's ink rim drawn outside its
   * box (ui/kitchen/play.css), CSS px */
  freeMarginCss: 8,
  bubbleRimCss: 3,
  /** landscape: the least of the counter top's rows kept on screen (a short screen shows the room and a big
   * customer over a strip of it, like the photo); the till, the tray and the stars fit it */
  minTopPx: 22,
  /** the counter props of the photo (plates, straw cup): nearer the player under the till when the counter shows
   * that much; else right of the till, their base `cutPx` under the bottom of the screen, `minShow` px of them on it */
  props: { gapPx: 3, minShow: 40, cutPx: 3 },
  /**
   * The neon hangs at the top of the free area (counterDecor.ts), `gapPx` round it, over the bubble's room;
   * its chains (colour) hang `chainAt` of its half width from its centre. The face-logo disc (`disc` art px
   * across) hangs on the plaster wall of the room art: centred on `wall` (room art px, src/art/kitchen/counter/
   * room.ts street), `r` room px round: portrait over the small menu board under the CICCIOPOLY poster (it
   * covers it), landscape right of the poster, never lower than the upper half of the bubble's room (it rises
   * over the menu board) and slid left to stay on screen.
   */
  signs: {
    gapPx: 3,
    disc: 36,
    chain: 0x1a1a1e,
    chainAt: 0.38,
    wall: { portrait: { x: 174, y: 137, r: 17 }, landscape: { x: 340, y: 84, r: 12 } },
    /** the first plaster row of the room art's walls (under the ceiling's edge) */
    wallTop: 2,
  },
  /** COMBO plate: left of the customer, this far over the counter top (the money column is on the right) */
  comboLiftPx: 40,
  /** register: its centre this far right of the customer's (the widest pose reaches 43 px: the raised hand stays clear) */
  tillFromCustomer: 74,
  registerSinkPx: 26,
  /** half width of a customer's body in the frame (the money column and COMBO stay clear of it) */
  bodyHalfW: 34,
  /** the tray rests on the counter in front of the customer; at the walk-out Ciccio clears it first */
  trayDy: 6,
  /** landscape: the served tray rests left of the customer instead, `gapPx` from the body, scaled up to `maxScale` as
   * that room allows (the ticket column is empty while serving); COMBO pops `comboGapPx` (x its scale) over it */
  trayLeft: { gapPx: 4, maxScale: 2, comboGapPx: 10 },
  /** the tray art's VASSOIO plate (its front face, art px x..x+w, y..y+h), covered at the counter by the
   * plain face's column `plainX` (a kitchen label: no name plate on the served tray) */
  trayPlate: { x: 44, w: 34, y: 38, h: 6, plainX: 20 },
  trayRiseMs: 450,
  trayClearMs: 380,
  /** the till's display (the shift's takings) sits on the till, its right edge on the till's; drawn
   * at 2x when 1x would be smaller than this many CSS px */
  tillDisplayDy: 2,
  tillDisplayMinCssPx: 9,
  /** the money column's right edge: the screen's right edge, at most this far right of the till */
  moneyReachPx: 60,
  /** rating stars in a row on the counter front, under the tray */
  starGap: 18,
  starDy: 36,
  starEveryMs: 160,
  /** talk frames while the bubble types (UI types 28 ms per letter) */
  talkCharMs: 28,
  talkFlipMs: 120,
} as const;

/** Juice of the kitchen: flights, plops, floating texts, cook bars, cues. */
export const KITCHEN_FX = {
  flightMs: 300,
  arcPx: 16,
  plopDropPx: 8,
  plopMs: 240,
  floatMs: 950,
  floatRisePx: 16,
  /** the money floats at the counter: longer, on a dark plate */
  moneyFloatMs: 1500,
  /**
   * cook bar over a griddle slot / fryer basket (world px): w x h inside a 1 px frame (two bars side by side keep
   * a gap on the 56 px slot pitch), the gold PERFETTO band rimmed in light gold, the marker `markerW` wide
   * reaching `markerOut` px over and under the bar
   */
  bar: { w: 44, h: 8, dy: -2, markerW: 4, markerOut: 2 },
  /**
   * The cue: a dark badge `w` art px wide (x scale) on the station's front panel under its slot / basket
   * (`griddleY` / `fryerY` px down the station), covering the panel's own plate and dials there. Short words:
   * a badge fits its slot's pitch (56 px), so two cues side by side never touch.
   */
  cue: { scale: 2, w: 17, griddleY: 81, fryerY: 68, flip: 'GIRA!', take: 'OK!', lift: 'OK!', burning: 'AHIA!' },
  cueBlinkMs: 260,
  heatAlpha: 0.4,
  shakePx: 2,
  shakeMs: 140,
  nopeMs: 180,
  /** AIUTI pulse: period and strongest alpha of the glow */
  pulseMs: 1000,
  pulseAlpha: 0.9,
  /** patience left under this: red edges pulse in the kitchen */
  urgentPatience: 0.25,
  urgentBeatMs: 700,
  /** CHIUDI: the closed burger is shown off (hop, squash, sparkles, its stars) before the wrap */
  reveal: { holdMs: 750, hopPx: 5, starGap: 14, starDy: 9, starEveryMs: 80, sparkles: 3 },
  /** banner of the end of the shift before the results */
  endHoldMs: 1900,
  burst: 14,
  vibrate: { burnt: 40, serve: 25, angry: 90 },
} as const;

/**
 * The cooking show (cookView.ts / cookFx.ts): the raw patty slaps down (drop, squash, grease spits, a puff of steam),
 * fat bubbles at its edge while it cooks, steam rises, GIRA! flips it on a spatula in an arc; the basket dunks into
 * big bubbling oil, shakes now and then, lifts out dripping with steam. World px, ms. Reduced motion: no shakes, no
 * arcs, few bits.
 */
export const COOK_FX = {
  slap: { dropPx: 16, ms: 170, squashX: 1.28, squashY: 0.68, settleMs: 260, spits: 3 },
  /** fat at the patty's edge: dots on a ring of `r` px round the slot, each lit `litMs` of every `periodMs` */
  fat: { dots: 7, r: 15, periodMs: 520, litMs: 260, colors: [0xfff0c0, 0xffd23a, 0xffffff] },
  /** a wisp of steam over a cooking item: shown from this share of the PERFETTO time, `alpha` at most */
  steam: { from: 0.35, alpha: 0.8, dy: -14 },
  spatula: { ms: 460, arcPx: 26, swingPx: 10, blade: { w: 22, h: 14 }, handle: { w: 5, h: 26 }, steel: 0xc8ccd4, lit: 0xf2f4f8, dark: 0x7a7f88, wood: 0x2a1c14 },
  dunk: { fromPx: -16, ms: 190, bubbles: 9, bubbleMs: 700 },
  shake: { everyMs: 1700, px: 2, ms: 240 },
  lift: { risePx: 12, ms: 300, drips: 5, dripMs: 520 },
  /** the raised (empty) basket over its well, px from the well's centre (lowered: its rim on the well, cookView.ts);
   * a basket never rises more than `headroom` px over the COTTURA page's top (a landscape page starts at the HUD's edge) */
  basket: { up: -10, headroom: 2 },
  oil: { colors: [0xffe6a0, 0xfff6d8, 0xd8a040] },
} as const;

/** YOU ARE SO GOLDEN finale. */
export const KITCHEN_GOLDEN = {
  ms: 5200,
  skipAfterMs: 2000,
  dropMs: 1200,
  textAtMs: 1300,
  flashEveryMs: 150,
  raysSpinMs: 9000,
  raysAlpha: 0.75,
  confetti: 90,
  confettiCalm: 25,
  /**
   * Centred on the SCREEN (counter px of CounterFrame.view), `margin` of its shorter side round it,
   * `gap` between the pieces. Tall screens (height >= `tallAspect` x width): face logo, lettering and
   * trophy one over the other; else the lettering over the face and the trophy side by side. The
   * lettering `textW` of the width (at most `textH` of the height); trophy and face share one scale,
   * at most `scaleMax`, the trophy at most `trophyW` of the width (wide: trophy and face together).
   */
  layout: { tallAspect: 1.2, margin: 0.05, gap: 0.03, textW: 0.7, textH: 0.42, trophyW: 0.6, scaleMax: 3 },
} as const;

/** Cook bar bands (raw -> PERFETTO -> troppo cotto -> bruciato) and text colours. */
export const KITCHEN_COLORS = {
  raw: 0xd8402c,
  perfect: 0xffd23a,
  over: 0x8a5426,
  burnt: 0x161616,
  barFrame: 0x161214,
  /** top highlight row of each band, and the rim of the PERFETTO band */
  barHi: { raw: 0xf2826a, perfect: 0xfff2a0, over: 0xb47c48, burnt: 0x3c3836 },
  marker: 0xffffff,
  urgent: 0xe01a1a,
  pulse: 0xfff2a0,
  text: { gold: '#ffd23a', red: '#ff5a4a', cream: '#fff6dc', green: '#8ee05a' },
  confetti: [0xffd23a, 0xffffff, 0xe83a3a, 0x1a1a1a, 0xff8ab4, 0xfff0c0],
} as const;
