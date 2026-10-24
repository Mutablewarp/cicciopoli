/**
 * Every number of level 6 · CICCIO'S RUSH (BRIEF §8). Units: world px (= art px), px/s for
 * speeds, ms for timers. "d" is the distance the truck has driven: traffic is laid out on it,
 * so braking slows the whole road uniformly and a validated layout stays valid.
 * Pure data, no Phaser.
 */
import { LANE_W, LANES, type RushZone } from '../art/rush/keys';
import type { RushDriverId } from '../contracts';

/** Run timeline. */
export const RUSH_RUN = {
  durationMs: 90_000,
  /** zone i starts at zoneStartMs[i]: PALERMO CENTRO, ZONA STADIO, LUNGOMARE TERRASINI */
  zoneStartMs: [0, 30_000, 60_000],
  hearts: 3,
  /** blinking invulnerability after a hit… */
  hitInvulnMs: 1200,
  /** …longer while the truck is still somewhere unsafe (inside traffic), up to this */
  recoverMaxMs: 3000,
  /** longest frame integrated at once (a stalled tab must not teleport the truck) */
  maxStepMs: 50,
  /** first run only: the three hints appear at these times */
  hintMs: [1200, 4800, 8800],
  /** first run only: the truck's starting lane stays free of obstacles this long (the first lesson is a dodge, not a crash) */
  firstRunClearMs: 7000,
} as const;

/** Road layout and the planning horizon. */
export const RUSH_ROAD = {
  laneW: LANE_W,
  lanes: LANES,
  /** traffic appears this far ahead of the truck centre (keep it above the top of the view) */
  spawnAheadPx: 380,
  /** …and leaves this far behind it (below the bottom of the view) */
  despawnBehindPx: 220,
  /** the generator keeps the road planned this far ahead (>= spawnAhead / (1 - fastest rate)) */
  planAheadPx: 660,
  /** after the road ahead was cleared (landing) new traffic starts at least this far ahead (no pop-in) */
  reopenPx: 560,
  /**
   * Camera: road shown ahead of the truck centre. At least min (every obstacle on screen warnMs
   * before contact at top speed; or draw top-edge warnings for entities with ttcMs <= warnMs),
   * at most max (objects appear above the top edge, never pop in).
   */
  viewAheadPx: { min: 270, max: 330 },
} as const;

/** Auto-forward speed: difficulty grows by density and pattern variety, the speed only a little. */
export const RUSH_SPEED = {
  base: { centro: 150, stadio: 165, mare: 180 } as Readonly<Record<RushZone, number>>,
  /** blend between two zone speeds */
  zoneBlendMs: 1500,
  /** FRENA: speed factor while held, eased in / out with these time constants */
  brakeMul: 0.55,
  brakeInTauMs: 180,
  brakeOutTauMs: 300,
} as const;

/** The burger truck. */
export const RUSH_TRUCK = {
  /** hit box (art 40x64, body ~34 px wide): forgiving on purpose */
  hitW: 28,
  hitH: 56,
  /** standard lane change; drivers and powers scale it */
  changeMs: 250,
  /** Ciccio's sauce: lane changes this much slower for slipMs, the truck wobbles */
  slipMul: 1.8,
  slipMs: 1500,
  /** a hand-off counts when the truck centre is this close to the zone lane centre (40 px lanes: clearly in it) */
  handoffTolPx: 16,
} as const;

export interface KindSpec {
  /** art frame size */
  readonly w: number;
  readonly h: number;
  /** hit box inset on every side */
  readonly inset: number;
  /** road the vehicle drives per px the truck drives (0 = standing still, always < 1) */
  readonly rate: number;
  /** colour frames in its sheet */
  readonly variants: number;
  /** a vehicle: passing it clean scores */
  readonly scores: boolean;
}

/** Traffic and hazards (sizes = src/art/rush/keys.ts). */
export const RUSH_KINDS = {
  car: { w: 24, h: 40, inset: 2, rate: 0.35, variants: 6, scores: true },
  suv: { w: 28, h: 48, inset: 2, rate: 0.32, variants: 3, scores: true },
  van: { w: 28, h: 56, inset: 2, rate: 0.3, variants: 2, scores: true },
  bus: { w: 32, h: 96, inset: 2, rate: 0.22, variants: 1, scores: true },
  scooter: { w: 12, h: 24, inset: 1, rate: 0.4, variants: 1, scores: true },
  ape: { w: 20, h: 32, inset: 2, rate: 0.12, variants: 1, scores: true },
  /** a car in double row with hazard blinkers */
  parked: { w: 24, h: 40, inset: 2, rate: 0, variants: 6, scores: true },
  cone: { w: 12, h: 12, inset: 1, rate: 0, variants: 1, scores: false },
  barrier: { w: 40, h: 16, inset: 3, rate: 0, variants: 1, scores: false },
  works: { w: 40, h: 40, inset: 3, rate: 0, variants: 1, scores: false },
  /** spilled sauce: no damage, slippery */
  sauce: { w: 32, h: 24, inset: 4, rate: 0, variants: 1, scores: false },
} as const satisfies Record<string, KindSpec>;

export type TrafficKind = keyof typeof RUSH_KINDS;

/** Scooters cutting into the next lane: the swerve takes this much truck travel. */
export const RUSH_SCOOTER = { swervePx: 70 } as const;

/** Pickups (sheet 20x20) and the delivery zone (40x64). */
export const RUSH_ITEMS = {
  pickupSize: 20,
  pickupInset: 2,
  zoneW: 40,
  zoneH: 64,
} as const;

/** Fairness model used by the validator (src/game/rush/logic/validator.ts). */
export const RUSH_FAIR = {
  /** every obstacle is on screen at least this long before it can touch the truck (at base speed) */
  warnMs: 1200,
  /** human reaction time, taken out of the warning */
  reactMs: 300,
  /** validator grid cell, px of d */
  cellPx: 8,
  /** pattern picks per slot before the generator inserts empty road and tries again */
  attempts: 8,
  repairGapPx: 40,
} as const;

/** Traffic density per zone. */
export const RUSH_DENSITY = {
  /** empty road between two patterns, [min, max] px of d */
  gapPx: { centro: [150, 230], stadio: [110, 180], mare: [80, 140] } as Readonly<
    Record<RushZone, readonly [number, number]>
  >,
  /** POPCORN SPRINT: gaps stretched while it runs (the spawner adapts so it stays fair) */
  sprintGapMul: 1.3,
} as const;

/** Orders and hand-offs. */
export const RUSH_DELIVERY = {
  count: 3,
  /** each order banner comes 2.5 s after its zone title, so both can be read */
  announceMs: [2500, 32_500, 62_500],
  dueMs: [25_000, 53_000, 80_000],
  /** the green zone is placed this long before it reaches the truck */
  leadMs: 4000,
  /** after a miss: the ULTIMA CHANCE zone */
  recoveryLeadMs: 3200,
  /** no obstacle in the zone lane this close to the zone (px of d) */
  clearPx: 80,
  /**
   * The hand-off counts on any step with the truck in the zone lane while d is within windowPx of
   * the zone centre (zone and truck overlap on screen for +-64 px; well inside clearPx). The
   * validator only needs the zone lane reachable at the centre: it blocks the other lanes for
   * +-handBlockPx there.
   */
  windowPx: 28,
  handBlockPx: 8,
  /** placement retries, each one this much farther */
  placeTries: 8,
  placeStepPx: 40,
  /**
   * The last order is handed over at the door of the Ciccio's Terrasini storefront: the shop-side
   * lane, the hand-off at row doorRow of the mare right side strip (periodPx tall, art/rush/mare.ts),
   * its recovery zone in the same lane.
   */
  shop: { order: 2, lane: 2, periodPx: 256, doorRow: 124 },
  freshStart: 100,
  freshDecayPerS: 0.4,
  /** …plus this while FRENA is held: slow driving cools the order */
  freshBrakePerS: 3,
  freshHit: 20,
  freshMiss: 20,
  /** CONSEGNA PERFETTA at or above this freshness */
  perfectFresh: 90,
} as const;

/** Score table. */
export const RUSH_SCORE = {
  delivery: 1000,
  /** freshness bonus at hand-off: fresh / 100 * freshMax */
  freshMax: 500,
  /** CONSEGNA DAL CIELO extra */
  sky: 200,
  /**
   * clean pass = pass * combo; the combo grows comboStep every comboEvery passes up to comboMax.
   * Deliveries + freshness stay the main source for most players; on a flawless run the passes
   * weigh about as much (more traffic on the seed = more of them).
   */
  pass: 15,
  comboEvery: 4,
  comboStep: 0.25,
  comboMax: 3,
  /** a zone driven without hits */
  cleanZone: 300,
  fries: 25,
  /** nuggets floating in the air during the flight */
  airNugget: 50,
} as const;

/** Stars: 1 = a delivery; 2 = two deliveries and twoScore points; 3 = all, threeFresh avg, no hits. */
export const RUSH_STARS = { twoDeliveries: 2, twoScore: 2500, threeFresh: 80 } as const;

/** Power-ups from the menu. One timed power at a time; the shield may stack. */
export const RUSH_POWERS = {
  ms: { shield: 8000, radar: 5000, sprint: 4000, grip: 6000 },
  /** the chip warns ('expire' sfx) when this much time is left */
  warnMs: 1000,
  sprintMul: 1.15,
  sprintTauMs: 250,
  /** CHEDDAR GRIP lane change factor */
  gripMul: 0.7,
  /** WAFFLE RADAR: a lane blocked within this distance ahead (px of d) is red */
  radarAheadPx: 300,
  /** power pickups: first one, then one every [min, max]; retry when no lane is free */
  firstMs: 7000,
  everyMs: [9000, 13_000],
  retryMs: 1500,
  weights: { shield: 3, radar: 2, sprint: 2, grip: 2 },
  /** fries tray lines */
  friesFirstMs: 3000,
  friesEveryMs: [2600, 4200],
  friesLine: 3,
  friesGapPx: 26,
  /** pickups keep this distance from any obstacle in their lane (px of d) */
  clearPx: 40,
} as const;

/** PROPULSORE easter egg: the flying truck. */
export const RUSH_BOOSTER = {
  /**
   * After the Terrasini title and the last order banner were read, and late enough that a clean
   * first try (crate reached ~2 s later) is still in the air when the last zone shows (dueMs[2] - leadMs).
   */
  fromMs: 73_000,
  untilMs: 78_000,
  /** the crate only appears after this long without hits */
  cleanMs: 8000,
  retryMs: 1000,
  flightMs: 5000,
  /**
   * A delivery zone still open holds the flight with this much left (= TRUCK_LOOK.flyEase x
   * flightMs: full height, before the descent) until it is handed over from the sky.
   */
  holdLeftMs: 700,
  landInvulnMs: 1000,
  /** landing clears all the traffic ahead and this far behind the truck centre (px) */
  landClearBehindPx: 80,
  /** air nuggets: a line of nuggetLine every nuggetEveryPx of d, starting nuggetFromPx ahead */
  nuggetFromPx: 160,
  nuggetEveryPx: 120,
  nuggetLine: 3,
  nuggetGapPx: 24,
} as const;

export interface DriverSpec {
  readonly changeMs: number;
  /** warnings (blinkers, radar) this much earlier */
  readonly warnBonusMs: number;
  /** freshness lost on a hit, factor */
  readonly hitFreshMul: number;
}

export const RUSH_DRIVERS: Readonly<Record<RushDriverId, DriverSpec>> = {
  riflessi: { changeMs: 200, warnBonusMs: 0, hitFreshMul: 1 },
  occhio: { changeMs: 250, warnBonusMs: 300, hitFreshMul: 1 },
  consegne: { changeMs: 250, warnBonusMs: 0, hitFreshMul: 0.5 },
};

/** The standard driver (daily challenge, first run). */
export const RUSH_DEFAULT_DRIVER: RushDriverId = 'riflessi';

/** Game-owned save of level 6 (settings, drivers, achievements, daily bests). */
export const RUSH_STORE = { key: 'cicciopoli.rush.v1', dailyKeep: 14 } as const;

/** Salts of the independent random streams of one seed. */
export const RUSH_SEED = { traffic: 0x9e3779b9, pickups: 0x85ebca6b, orders: 0xc2b2ae35 } as const;
