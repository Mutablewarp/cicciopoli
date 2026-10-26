/**
 * Shared types of the level 6 logic (no Phaser, no DOM). Coordinates the renderer gets:
 * x = px from the road's left edge (lane centres 20 / 60 / 100), y = px AHEAD of the truck
 * centre (positive = up the screen).
 */
import type { RushZone } from '../../../art/rush/keys';
import type { RushDriverId } from '../../../contracts';
import type { TrafficKind } from '../../../config/rush';

export type Lane = 0 | 1 | 2;
export type LaneDir = -1 | 0 | 1;

/** v9: 'fry' = one fry stick of a FRIES TRAIL (RushEntityView.trail says which trail and where in it) */
export type PickupKind = 'nuggets' | 'waffle' | 'popcorn' | 'cheddar' | 'booster' | 'fries' | 'airNugget' | 'fry';
export type EntityKind = TrafficKind | PickupKind | 'zone';
export type TimedPower = 'radar' | 'sprint' | 'grip';
export type PowerId = 'shield' | TimedPower;

/** One step of player intent: lane presses since the last step and the FRENA button. */
export interface RushInput {
  laneDir: LaneDir;
  brake: boolean;
}

export interface RushOptions {
  seed: number;
  driver: RushDriverId;
  daily: boolean;
  /** first run: the three in-game hints */
  hints: boolean;
}

/** What the renderer draws for one road object. */
export interface RushEntityView {
  readonly id: number;
  readonly kind: EntityKind;
  /** frame / colour inside its sheet */
  readonly variant: number;
  /** lane it is in now (a swerving scooter: the nearest one) */
  readonly lane: Lane;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** blinker on: -1 left, 1 right, 0 both (hazards); null = off */
  readonly blink: LaneDir | null;
  /** ms until it can touch the truck at the current speed (Infinity = not an obstacle / gone by) */
  readonly ttcMs: number;
  /** zone: the customer waits on this sidewalk (-1 left, 1 right); hand-off done / missed */
  readonly side: -1 | 1;
  readonly done: boolean;
  /** v9 'fry': its FRIES TRAIL (id), its place in it (0-based) and the trail length */
  readonly trail?: { readonly id: number; readonly index: number; readonly of: number };
}

export interface RushTruckView {
  /** lane it is in, or leaving while it changes */
  readonly lane: Lane;
  readonly target: Lane;
  readonly x: number;
  readonly lean: LaneDir;
  /** FRENA held: brake lights */
  readonly braking: boolean;
  /** > 0: invulnerable (blink); ms left of the timed part, 1 while recovering from a hit */
  readonly invulnMs: number;
  /** 0..1 sauce wobble left */
  readonly slip: number;
  readonly flying: boolean;
  /** 0..1 flight progress, 0 on the ground */
  readonly flight: number;
}

export type OrderState = 'waiting' | 'active' | 'zone' | 'recovery' | 'delivered' | 'lost';

export interface RushOrderView {
  readonly index: number;
  /** "Big + Waffle Fries" */
  readonly pair: string;
  readonly customer: string;
  /** "Via Libertà" / "Ciccio's Terrasini" */
  readonly place: string;
  /** banner sub line: "Big + Waffle Fries per Rosalia, Via Libertà" */
  readonly text: string;
  readonly state: OrderState;
  /** 0..100 */
  readonly fresh: number;
}

export type RadarMark = 'danger' | 'safe';

export interface RushSnapshot {
  readonly phase: 'play' | 'over';
  readonly timeMs: number;
  readonly timeLeftMs: number;
  readonly zone: RushZone;
  readonly zoneIndex: number;
  /** road driven, px (scroll the asphalt with it) */
  readonly distance: number;
  /** px/s now */
  readonly speed: number;
  readonly truck: RushTruckView;
  readonly hearts: number;
  readonly score: number;
  /** clean-driving multiplier, 1..3 */
  readonly combo: number;
  readonly power: TimedPower | null;
  /** 0..1 left of the timed power (or of the shield when it runs alone) */
  readonly powerLeft: number;
  readonly shield: boolean;
  /** WAFFLE RADAR marks per lane, null when off */
  readonly radar: readonly RadarMark[] | null;
  readonly order: RushOrderView | null;
  readonly delivered: number;
  /** road coordinate (like `distance`) of the Ciccio's Terrasini door, once the last zone is placed there */
  readonly shopD: number | null;
  /** obstacles ahead: show a warning when ttcMs <= warnMs (driver OCCHIO: earlier) */
  readonly warnMs: number;
  readonly entities: readonly RushEntityView[];
  /** v9 CICCIO FEVER: 0..1 time left (points x2), 0 = off */
  readonly fever: number;
}

export type DespawnReason = 'passed' | 'hit' | 'picked' | 'cleared';

export type RushEvent =
  | { type: 'spawn'; entity: RushEntityView }
  | { type: 'despawn'; id: number; reason: DespawnReason }
  /** lane press: started, queued behind the current change, or bumped into the kerb */
  | { type: 'lane'; dir: LaneDir; result: 'start' | 'queued' | 'blocked' }
  | { type: 'hit'; id: number; kind: EntityKind; shielded: boolean; hearts: number }
  | { type: 'slip'; id: number }
  | { type: 'pass'; id: number; points: number; combo: number }
  | { type: 'combo'; combo: number; text: string }
  | { type: 'pickup'; id: number; kind: PickupKind; points: number }
  | { type: 'powerStart'; power: PowerId; ms: number; title: string; sub: string }
  | { type: 'powerWarn'; power: PowerId }
  | { type: 'powerEnd'; power: PowerId; reason: 'expired' | 'replaced' | 'used' }
  | { type: 'orderNew'; order: RushOrderView; title: string }
  | { type: 'deliveryZone'; order: number; id: number; lane: Lane; recovery: boolean; etaMs: number; title: string }
  | { type: 'delivered'; order: number; points: number; fresh: number; perfect: boolean; sky: boolean; title: string; line: string }
  | { type: 'missed'; order: number; lost: boolean; title: string; sub: string }
  | { type: 'zoneChange'; zone: RushZone; index: number; title: string; sub: string }
  | { type: 'zoneClean'; zone: RushZone; points: number; title: string }
  | { type: 'flightStart'; title: string; sub: string }
  | { type: 'flightEnd'; cleared: number }
  | { type: 'hint'; index: number; text: string }
  /** v9: SFIORATO! a vehicle passed in the next lane within RUSH near-miss px at speed (side: where it passed) */
  | { type: 'nearMiss'; id: number; side: -1 | 1; points: number; combo: number; title: string }
  /** v9: one fry of a FRIES TRAIL picked (index 0-based, of = trail length); the run also emits 'despawn' picked */
  | { type: 'trail'; id: number; trail: number; index: number; of: number; points: number }
  /** v9: a whole FRIES TRAIL picked: "CATENA x8!" */
  | { type: 'chain'; trail: number; count: number; points: number; title: string }
  /** v9: CICCIO FEVER on (ms long) / off */
  | { type: 'feverStart'; ms: number; title: string; sub: string }
  | { type: 'feverEnd'; reason: 'expired' | 'hit' }
  | { type: 'finale'; title: string; lines: readonly string[] }
  | { type: 'end'; reason: 'time' | 'crash'; completed: boolean; title: string };

/** Points by source; their sum is the score. */
export interface RushPoints {
  deliveries: number;
  fresh: number;
  sky: number;
  passes: number;
  zones: number;
  pickups: number;
  /** v9: SFIORATO! near misses, FRIES TRAIL chain bonuses (single fries count as pickups) */
  nearMiss: number;
  chains: number;
  /** v9: the extra half of everything scored during CICCIO FEVER (the x2 part) */
  fever: number;
}

/** Everything the results screen, achievements and records need from a finished run. */
export interface RushRunSummary {
  readonly seed: number;
  readonly daily: boolean;
  readonly driver: RushDriverId;
  /** all three orders delivered */
  readonly completed: boolean;
  /** played until 0 s (not ended by a crash) */
  readonly reachedEnd: boolean;
  readonly score: number;
  readonly points: Readonly<RushPoints>;
  readonly delivered: number;
  readonly perfect: number;
  /** freshness at each hand-off */
  readonly fresh: readonly number[];
  readonly collisions: number;
  /** best clean-driving multiplier reached */
  readonly bestCombo: number;
  /** the PROPULSORE was used */
  readonly flew: boolean;
  /** v9 */
  readonly nearMisses: number;
  readonly chains: number;
  readonly fevers: number;
}
