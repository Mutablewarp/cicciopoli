/**
 * A road object on d (the truck's driven distance): it meets the truck centre at `meetD` and
 * drives `rate` px per px of the truck, so its distance ahead is (1 - rate) * (meetD - d).
 */
import { RUSH_DELIVERY, RUSH_ITEMS, RUSH_KINDS, RUSH_ROAD, RUSH_SCOOTER, RUSH_TRUCK, type TrafficKind } from '../../../config/rush';
import { laneX } from './lanes';
import type { Block } from './validator';
import type { EntityKind, Lane, LaneDir, PickupKind, RushEntityView } from './types';

const smooth = (u: number): number => u * u * (3 - 2 * u);

/** A pickup is taken while d is within this of its meetD (and the truck overlaps it sideways). */
export const PICK_REACH = (RUSH_ITEMS.pickupSize - 2 * RUSH_ITEMS.pickupInset + RUSH_TRUCK.hitH) / 2;

export interface TrailSlot {
  readonly id: number;
  readonly index: number;
  readonly of: number;
}

export function isTraffic(kind: EntityKind): kind is TrafficKind {
  return kind in RUSH_KINDS;
}

export function isPickup(kind: EntityKind): kind is PickupKind {
  return kind !== 'zone' && !isTraffic(kind);
}

export interface EntitySpec {
  kind: EntityKind;
  lane: Lane;
  meetD: number;
  variant?: number;
  /** scooter swerve: target lane, start d, blinker-on d */
  to?: Lane | null;
  swerveD?: number;
  blinkD?: number;
  /** v9 'fry': off the lane centre (halfway between two lanes on a shift of its trail), its trail */
  x?: number;
  trail?: TrailSlot;
}

export class RushEntity implements RushEntityView {
  readonly kind: EntityKind;
  readonly variant: number;
  readonly w: number;
  readonly h: number;
  readonly meetD: number;
  readonly rate: number;
  readonly from: Lane;
  readonly to: Lane | null;
  readonly swerveD: number;
  readonly blinkD: number;
  /** half of the truck travel during which it overlaps the truck lengthwise (traffic only) */
  readonly reach: number;
  lane: Lane;
  x: number;
  y = 0;
  blink: LaneDir | null = null;
  ttcMs = Infinity;
  side: -1 | 1 = 1;
  done = false;
  spawned = false;
  touched = false;
  passed = false;
  /** v9: the truck began to leave this obstacle's lane within the near-miss window (SFIORATO! once it goes by clean) */
  close = false;
  readonly trail?: TrailSlot;
  blocks: Block[] = [];

  constructor(
    readonly id: number,
    s: EntitySpec,
  ) {
    this.kind = s.kind;
    this.variant = s.variant ?? 0;
    this.meetD = s.meetD;
    this.from = s.lane;
    this.lane = s.lane;
    this.to = s.to ?? null;
    this.swerveD = s.swerveD ?? NaN;
    this.blinkD = s.blinkD ?? NaN;
    this.x = s.x ?? laneX(s.lane);
    this.trail = s.trail;
    if (isTraffic(s.kind)) {
      const k = RUSH_KINDS[s.kind];
      this.w = k.w;
      this.h = k.h;
      this.rate = k.rate;
      this.reach = (k.h - 2 * k.inset + RUSH_TRUCK.hitH) / 2 / (1 - k.rate);
    } else {
      const zone = s.kind === 'zone';
      this.w = zone ? RUSH_ITEMS.zoneW : RUSH_ITEMS.pickupSize;
      this.h = zone ? RUSH_ITEMS.zoneH : RUSH_ITEMS.pickupSize;
      this.rate = 0;
      this.reach = 0;
    }
  }

  /** px ahead of the truck centre at driven distance d */
  relAt(d: number): number {
    return (1 - this.rate) * (this.meetD - d);
  }

  /** Lane occupancy on d for the validator; `lead` = reveal lead px (see validator.revealLeadPx). */
  makeBlocks(lead: number): Block[] {
    if (!isTraffic(this.kind)) return [];
    const a = this.meetD - this.reach;
    const z = this.meetD + this.reach;
    const out: Block[] = [];
    const add = (lane: Lane, from: number, to: number): void => {
      if (to > from) out.push({ lane, from, to, vis: from - lead, owner: this.id });
    };
    if (this.to === null) add(this.from, a, z);
    else {
      add(this.from, a, Math.min(z, this.swerveD + RUSH_SCOOTER.swervePx));
      add(this.to, Math.max(a, this.swerveD), z);
    }
    return out;
  }

  /**
   * A vehicle shows up inside the delivery zone of `lane` (hand-off at zoneD) while that zone is on
   * screen: the zone, standing on the road, catches up with one that meets the truck a little after
   * it, or a scooter swerves in. It never hits there (no block), but the lane to take reads occupied.
   * Standing objects move with the zone: the clear window keeps them out.
   */
  showsInZone(lane: Lane, zoneD: number): boolean {
    if (this.rate === 0 || (this.from !== lane && this.to !== lane)) return false;
    // lengthwise overlap: |(1 - rate)(meetD - d) - (zoneD - d)| < reachH, i.e. |d - mid| < reachH / rate
    const reachH = (this.h + RUSH_ITEMS.zoneH) / 2 / this.rate;
    const mid = (zoneD - (1 - this.rate) * this.meetD) / this.rate;
    // in the zone lane: always (no swerve), before the swerve ends (from) or once it starts (to)
    const inLo = this.from === lane ? -Infinity : this.swerveD;
    const inHi = this.from === lane && this.to !== null ? this.swerveD + RUSH_SCOOTER.swervePx : Infinity;
    // the zone is on screen ahead, until its clear window is behind the truck
    const lo = Math.max(mid - reachH, inLo, zoneD - RUSH_ROAD.viewAheadPx.max - RUSH_ITEMS.zoneH / 2);
    const hi = Math.min(mid + reachH, inHi, zoneD + RUSH_DELIVERY.clearPx);
    return lo < hi;
  }

  /** Lanes it drives in, each over a range of d (a swerving scooter is in both during the swerve). */
  private spans(): [Lane, number, number][] {
    if (this.to === null) return [[this.from, -Infinity, Infinity]];
    return [
      [this.from, -Infinity, this.swerveD + RUSH_SCOOTER.swervePx],
      [this.to, this.swerveD, Infinity],
    ];
  }

  /**
   * Two road objects in one lane would slide through each other (a car through a roadworks pit,
   * a bus inside a bus) somewhere between their spawn and despawn lines. Sauce lies flat on the
   * asphalt: traffic drives over it.
   */
  overlapsOnRoad(o: RushEntity): boolean {
    if (!isTraffic(this.kind) || !isTraffic(o.kind) || this.kind === 'sauce' || o.kind === 'sauce') return false;
    // y_this - y_o = a + k d; they overlap lengthwise while |a + k d| < half (always or never when k = 0)
    const k = this.rate - o.rate;
    const a = (1 - this.rate) * this.meetD - (1 - o.rate) * o.meetD;
    const half = (this.h + o.h) / 2;
    if (k === 0 && Math.abs(a) >= half) return false;
    const lo0 = k === 0 ? -Infinity : Math.min((-half - a) / k, (half - a) / k);
    const hi0 = k === 0 ? Infinity : Math.max((-half - a) / k, (half - a) / k);
    for (const [lane, from, to] of this.spans()) {
      for (const [lane2, from2, to2] of o.spans()) {
        if (lane !== lane2) continue;
        const lo = Math.max(lo0, from, from2);
        const hi = Math.min(hi0, to, to2);
        // y falls with d: the overlap shows when it starts below the spawn line and ends above the despawn one
        if (lo < hi && this.relAt(hi) < RUSH_ROAD.spawnAheadPx && this.relAt(lo) > -RUSH_ROAD.despawnBehindPx) return true;
      }
    }
    return false;
  }

  /** Pose for the renderer at driven distance d and speed px/s. */
  update(d: number, speed: number): void {
    this.y = this.relAt(d);
    if (this.to !== null) {
      const u = Math.min(1, Math.max(0, (d - this.swerveD) / RUSH_SCOOTER.swervePx));
      this.x = laneX(this.from) + (laneX(this.to) - laneX(this.from)) * smooth(u);
      this.lane = u < 0.5 ? this.from : this.to;
      this.blink = d >= this.blinkD && u < 1 ? (this.to > this.from ? 1 : -1) : null;
    } else if (this.kind === 'parked') this.blink = 0;
    if (this.reach > 0) {
      const toContact = this.meetD - this.reach - d;
      this.ttcMs = d > this.meetD + this.reach ? Infinity : Math.max(0, (toContact / Math.max(1, speed)) * 1000);
    }
  }
}
