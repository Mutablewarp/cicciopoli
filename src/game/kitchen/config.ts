/**
 * Scene-side numbers of level 7 (layout, look and feel). Gameplay numbers live in
 * src/config/kitchen.ts. Units: world px (= art px), CSS px where named, ms for timers.
 */

export type { Orient } from './plan';

/**
 * MONTAGGIO drawn big, the centre of the kitchen: the paper and the burger at `scale`, the tray at
 * `trayScale` (its places >= HIT_MIN px wide). The closed burger may rise `room` px over its base: the
 * tallest of the menu (BIG) fits at `scale`, a taller pile of wrong layers shrinks to fit.
 */
export const MONTAGGIO = { scale: 2, trayScale: 1.5, room: 114 } as const;
/** Tray places cut at these tray px (1x): the wrapped burger, then the boat of fries, the starter, the drink
 * (the drink's place reaches past the tray's right edge: every place >= HIT_MIN px wide at trayScale). */
export const TRAY_CUTS = [44, 74, 104, 134] as const;
/** The pedal bin at the edge of the panel, drawn bigger than its art (a Good Pizza bin). */
export const TRASH_SCALE = 1.5;

/** A pan in its place: drawn at (dx, dy) of the cell; its label tape (pixel font x `scale`) at `dy` of the
 * cell over the pan's front lip; a sauce bottle stands in its empty pan, its bottom `bottleBottom` under the cell's top. */
export const PAN = { dy: 1, labelDy: 29, bottleBottom: 32 } as const;
/** Label tapes: the 3x5 pixel font drawn `scale` x (one px taller than before), lines never wider than `maxW` font px. */
export const LABEL = { scale: 1.25, maxW: 36 } as const;
/** Drinks: two per rack, near its ends (two labels side by side never touch); the label under the rack; each taps on its half of the
 * rack, `reach` px past the rack's ends (every place >= HIT_MIN wide), from `top` over the rack to its label. */
export const DRINK = { at: [18, 66], labelDy: 31, reach: 4, top: 2, h: 50 } as const;
/** Station taps: griddle slots and fryer baskets this wide (centred on the slot / basket; the outer ones
 * reach a little past the station's edges). */
export const STATION_HIT = { w: 44 } as const;

/** Paged kitchen (a phone too short for the whole plan): the switch and the swipe. */
export const PAGER = {
  slideMs: 320,
  /** a vertical swipe of this many CSS px switches the page; a tap moves less than `tapPx` */
  swipePx: 36,
  tapPx: 14,
  /** the tab's plate, text scale and the mini cook bars of the griddle / fryer on it */
  textScale: 2,
  bar: { w: 14, h: 4, gap: 3 },
} as const;

/**
 * Furniture drawn under the stations: their soft shadows, the MONTAGGIO panel, the wooden board; the
 * locked pans (at most `keep` of the places an order leaves free, the others hold decoys: pan and
 * contents tinted dark, a padlock `w` x `h` art px centred on the contents, like Good Pizza's lone lock).
 */
export const FURNITURE = {
  shadow: { color: 0x101218, near: { dx: 1, dy: 2, alpha: 0.22 }, far: { dx: 3, dy: 5, alpha: 0.12 } },
  panel: { fill: 0x7d828b, rim: 0x2c2e34, lit: 0xaeb3bb, dark: 0x5f636b },
  board: { fill: 0xb7814f, rim: 0x5a3719, lit: 0xd49d63, grain: 0xa06c3c, grainEvery: 9 },
  lock: { keep: 1, w: 16, h: 19, panTint: 0x9a9ea6, fillTint: 0x878b94, rim: 0x24262c, metal: 0xb4b9c2, body: 0xdcdfe5, lit: 0xffffff, dark: 0x9a9ea8 },
} as const;

/** Camera framing: integer zoom when it keeps this share of the ideal one. */
export const KITCHEN_VIEW = {
  integerKeepHiDpi: 0.9,
  integerKeepLoDpi: 0.85,
  /** ... never when the smallest tap area (HIT_MIN) would drop under this many CSS px */
  tapCss: 44,
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
   * cook bar over a griddle slot / fryer basket (world px): w x h inside a 1 px frame (34 px: two
   * bars side by side keep a gap on the 36 px slot pitch), the gold PERFETTO band rimmed in light
   * gold, the marker `markerW` wide reaching `markerOut` px over and under the bar
   */
  bar: { w: 32, h: 7, dy: -2, markerW: 4, markerOut: 2 },
  /**
   * The cue: a dark badge `w` art px wide (x scale) on the station's front panel under its slot /
   * basket, covering the panel's own plate and dials there. Short words: a badge fits its slot's
   * pitch (36 px), so two cues side by side never touch.
   */
  cue: { scale: 2, w: 17, griddleY: 53, fryerY: 40, flip: 'GIRA!', take: 'OK!', lift: 'OK!', burning: 'AHIA!' },
  cueBlinkMs: 260,
  heatAlpha: 0.4,
  shakePx: 2,
  shakeMs: 140,
  nopeMs: 180,
  flipMs: 220,
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
