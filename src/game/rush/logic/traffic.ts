/**
 * TrafficManager: plans the road ahead with the pattern generator + validator, spawns objects
 * above the view, moves them, drops them below it. Also places pickups and delivery zones in
 * lanes the validator approves, so nothing the game asks for is ever impossible.
 */
import type { RushZone } from '../../../art/rush/keys';
import { RUSH_DELIVERY, RUSH_DENSITY, RUSH_FAIR, RUSH_KINDS, RUSH_POWERS, RUSH_ROAD, RUSH_SPEED, RUSH_TRUCK } from '../../../config/rush';
import { RushEntity, isPickup, isTraffic, type EntitySpec } from './entity';
import { patternLength, pickPattern, placePattern } from './patterns';
import { pick, randRange, shuffled, type Rng } from './rng';
import type { DespawnReason, Lane, PickupKind, RushEvent } from './types';
import { CELL, CHANGE_CELLS, LANE_IDS, SafeTable, cellOf, firstUnfair, laneBusy, revealLeadPx, staysFair, type Block } from './validator';

export interface PlanContext {
  /** zone the truck will be in when it has driven to d */
  zoneAt(d: number): RushZone;
  /** POPCORN SPRINT running: stretch the gaps */
  readonly sprint: boolean;
}

type Emit = (e: RushEvent) => void;

/** Where a delivery zone must go: a forced lane, at the shop door. */
export interface ZoneAt {
  readonly lane?: Lane;
  readonly door?: boolean;
}

/** First road coordinate >= r where the side strip shows the Ciccio's Terrasini door (strip row = -r mod period). */
export function doorAlign(r: number): number {
  const { periodPx, doorRow } = RUSH_DELIVERY.shop;
  return r + (((-doorRow - r) % periodPx) + periodPx) % periodPx;
}

/** The most road before its meeting point where a vehicle can touch the truck (RushEntity.reach). */
const MAX_REACH = Math.max(...Object.values(RUSH_KINDS).map((k) => (k.h - 2 * k.inset + RUSH_TRUCK.hitH) / 2 / (1 - k.rate)));
const MIN_GAP = Math.min(...Object.values(RUSH_DENSITY.gapPx).map((g) => g[0]));

interface ClearWindow {
  readonly lane: Lane;
  readonly from: number;
  readonly to: number;
  readonly owner: number;
  /** hand-off d of the delivery zone it keeps clear (none: the first run's empty start) */
  readonly zoneD?: number;
}

export class TrafficManager {
  /** spawned objects: what the renderer draws */
  readonly live: RushEntity[] = [];
  /** bumps whenever blocks are added or removed (the oracle bot caches on it) */
  version = 0;
  private readonly planned: RushEntity[] = [];
  /** lane occupancy of the traffic */
  private blocks: Block[] = [];
  /** delivery hand-off windows: the other lanes, virtually blocked at the zone */
  private hand: Block[] = [];
  /** delivery lanes kept free of obstacles around the zone */
  private clear: ClearWindow[] = [];
  private frontier: number = RUSH_ROAD.planAheadPx;
  private nextId = 1;

  /** `blinkLeadMs`: scooter blinkers turn on this long before the swerve (driver OCCHIO: earlier) */
  constructor(
    private readonly rng: Rng,
    private readonly blinkLeadMs: number,
  ) {}

  /** Every lane occupancy the road holds (traffic + delivery hand-off windows). */
  get allBlocks(): readonly Block[] {
    return this.hand.length > 0 ? this.blocks.concat(this.hand) : this.blocks;
  }

  /** Traffic planned from now on starts past the frontier: it cannot touch the truck before this d (FRIES TRAILS end inside it). */
  get horizon(): number {
    return this.frontier + MIN_GAP - MAX_REACH;
  }

  /** Keeps the road planned planAheadPx ahead of d. */
  plan(d: number, ctx: PlanContext): void {
    this.blocks = this.blocks.filter((b) => b.to >= d - CELL);
    this.clear = this.clear.filter((c) => c.to >= d);
    while (this.frontier < d + RUSH_ROAD.planAheadPx) this.placeNext(ctx);
  }

  private placeNext(ctx: PlanContext): void {
    const zone = ctx.zoneAt(this.frontier);
    const base = RUSH_SPEED.base[zone];
    const start = this.frontier + randRange(this.rng, RUSH_DENSITY.gapPx[zone]) * (ctx.sprint ? RUSH_DENSITY.sprintGapMul : 1);
    const lead = revealLeadPx(base);
    const blink = (this.blinkLeadMs / 1000) * base;
    for (let a = 0; a < RUSH_FAIR.attempts; a++) {
      const p = pickPattern(this.rng, zone);
      const ents = placePattern(this.rng, p, start).map(
        (it) =>
          new RushEntity(this.nextId++, {
            kind: it.k,
            lane: it.lane,
            meetD: it.meetD,
            variant: it.variant,
            to: it.to,
            swerveD: it.swerveD,
            blinkD: it.swerveD - blink,
          }),
      );
      // no vehicle may drive through a hazard or another vehicle of its lane on screen
      const road = [...this.live, ...this.planned];
      if (ents.some((e, i) => road.some((o) => e.overlapsOnRoad(o)) || ents.slice(0, i).some((o) => e.overlapsOnRoad(o)))) continue;
      const added = ents.flatMap((e) => (e.blocks = e.makeBlocks(lead)));
      if (added.some((b) => this.clear.some((c) => c.lane === b.lane && b.to >= c.from && b.from <= c.to))) continue;
      if (ents.some((e) => this.clear.some((c) => c.zoneD !== undefined && e.showsInZone(c.lane, c.zoneD)))) continue;
      // fair for a player who ignores the delivery, and for one who goes for it
      if (!staysFair(this.blocks, added) || (this.hand.length > 0 && !staysFair(this.allBlocks, added))) continue;
      this.planned.push(...ents);
      this.blocks.push(...added);
      this.version++;
      this.frontier = start + patternLength(p);
      return;
    }
    this.frontier = start + RUSH_FAIR.repairGapPx;
  }

  /** No obstacle in `lane` while d is in [from, to] (first run: the starting lane). Call before the first plan(). */
  keepClear(lane: Lane, from: number, to: number): void {
    this.clear.push({ lane, from, to, owner: -1 });
  }

  /** Spawns what came into range, poses everything, drops what went below the view. */
  update(d: number, speed: number, emit: Emit): void {
    for (let i = this.planned.length - 1; i >= 0; i--) {
      const e = this.planned[i];
      if (e.relAt(d) > RUSH_ROAD.spawnAheadPx) continue;
      this.planned.splice(i, 1);
      e.spawned = true;
      e.update(d, speed);
      this.live.push(e);
      emit({ type: 'spawn', entity: e });
    }
    for (let i = this.live.length - 1; i >= 0; i--) {
      const e = this.live[i];
      e.update(d, speed);
      if (e.y < -RUSH_ROAD.despawnBehindPx) this.drop(e, 'passed', emit);
    }
  }

  /** Removes an object (hit, picked, cleared, gone by) and the lane occupancy it caused. */
  drop(e: RushEntity, reason: DespawnReason, emit: Emit): void {
    const list = e.spawned ? this.live : this.planned;
    const i = list.indexOf(e);
    if (i >= 0) list.splice(i, 1);
    if (e.spawned) emit({ type: 'despawn', id: e.id, reason });
    this.release(e.id);
  }

  /** Drops every object (spawned or planned) matching `pred`; returns how many. */
  dropWhere(pred: (e: RushEntity) => boolean, reason: DespawnReason, emit: Emit): number {
    const hit = [...this.live, ...this.planned].filter(pred);
    for (const e of hit) this.drop(e, reason, emit);
    return hit.length;
  }

  /** The generator goes on right after the traffic still on the road (never closer than reopenPx). */
  reopen(d: number): void {
    let last = d + RUSH_ROAD.reopenPx;
    for (const e of [...this.live, ...this.planned]) if (isTraffic(e.kind)) last = Math.max(last, e.meetD);
    this.frontier = last;
  }

  /** Forgets the lane occupancy owned by `owner` (an object that left, a zone after its hand-off). */
  release(owner: number): void {
    const n = this.blocks.length + this.hand.length;
    this.blocks = this.blocks.filter((b) => b.owner !== owner);
    this.hand = this.hand.filter((b) => b.owner !== owner);
    this.clear = this.clear.filter((c) => c.owner !== owner);
    if (this.blocks.length + this.hand.length !== n) this.version++;
  }

  /** Settled in `lane` at d, the truck has a way through all the traffic planned so far. */
  safeAt(lane: Lane, d: number): boolean {
    return new SafeTable(this.blocks, cellOf(d)).safe(lane, cellOf(d));
  }

  /** Traffic occupies `lane` somewhere in [from, to] of d (WAFFLE RADAR). */
  laneDanger(lane: number, from: number, to: number): boolean {
    return laneBusy(this.blocks, lane as Lane, from, to);
  }

  /** A lane where a pickup (span px long, meeting the truck at meetD) is safe to reach, or null. */
  pickupLane(d: number, meetD: number, span: number, rng: Rng): Lane | null {
    const table = new SafeTable(this.allBlocks, cellOf(d));
    const c = RUSH_POWERS.clearPx;
    const busy = (l: Lane): boolean =>
      laneBusy(this.blocks, l, meetD - c, meetD + span + c) ||
      [...this.live, ...this.planned].some((e) => !isTraffic(e.kind) && e.from === l && Math.abs(e.meetD - meetD) < span + c);
    const ok = LANE_IDS.filter((l) => !busy(l) && table.safe(l, cellOf(meetD)));
    return ok.length > 0 ? pick(rng, ok) : null;
  }

  /** A pickup (spawned or planned) closer than px of d to meetD and dx sideways to x (FRIES TRAILS keep off the others). */
  pickupNear(x: number, meetD: number, px: number, dx: number): boolean {
    return [...this.live, ...this.planned].some((e) => isPickup(e.kind) && Math.abs(e.meetD - meetD) < px && Math.abs(e.x - x) < dx);
  }

  add(spec: EntitySpec): RushEntity {
    const e = new RushEntity(this.nextId++, spec);
    this.planned.push(e);
    return e;
  }

  addPickup(kind: PickupKind, lane: Lane, meetD: number): RushEntity {
    return this.add({ kind, lane, meetD });
  }

  /**
   * Delivery zone ~aheadPx ahead in a lane that every fair player can still reach: the other
   * lanes get a virtual block at the hand-off, the zone lane is kept clear of obstacles (planned
   * ones in the way are removed; nothing visible ever vanishes). `rng`: the orders stream, so the
   * traffic stream stays the same for everybody (daily challenge). `at.lane` forces the lane,
   * `at.door` lines the hand-off up with the Ciccio's Terrasini door (one strip period per retry).
   */
  placeZone(d: number, aheadPx: number, vis: number, rng: Rng, at: ZoneAt = {}): RushEntity {
    const R = RUSH_DELIVERY;
    const door = (r: number): number => (at.door ? doorAlign(r) : r);
    for (let t = 0; t < R.placeTries; t++) {
      const meetD = door(d + aheadPx + t * (at.door ? R.shop.periodPx : R.placeStepPx));
      for (const lane of at.lane === undefined ? shuffled(rng, LANE_IDS) : [at.lane]) {
        const inWay = (e: RushEntity): boolean =>
          e.blocks.some((b) => b.lane === lane && b.to >= meetD - R.clearPx && b.from <= meetD + R.clearPx) || e.showsInZone(lane, meetD);
        if (this.live.some(inWay)) continue;
        const doomed = new Set(this.planned.filter(inWay).map((e) => e.id));
        const kept = this.blocks.filter((b) => !doomed.has(b.owner));
        const id = this.nextId;
        const hand = LANE_IDS.filter((l) => l !== lane).map((l) => ({ lane: l, from: meetD - R.handBlockPx, to: meetD + R.handBlockPx, vis, owner: id }));
        if (!staysFair(kept.concat(this.hand), hand)) continue;
        // removing traffic can make new states possible: the road must stay fair for a player who skips the zone
        if (doomed.size > 0 && firstUnfair(kept, cellOf(d)) !== null) continue;
        for (const e of this.planned.filter((p) => doomed.has(p.id))) this.drop(e, 'cleared', () => undefined);
        return this.commitZone(lane, meetD, hand, rng);
      }
    }
    // shortcut: open road past everything planned, reachable from any lane; never seen in the 2000-seed sweep
    const lane = at.lane ?? 1;
    const meetD = door(Math.max(this.frontier, d + aheadPx) + 2 * CHANGE_CELLS * CELL + R.clearPx);
    this.frontier = meetD + R.clearPx;
    const id = this.nextId;
    const hand = LANE_IDS.filter((l) => l !== lane).map((l) => ({ lane: l, from: meetD - R.handBlockPx, to: meetD + R.handBlockPx, vis, owner: id }));
    return this.commitZone(lane, meetD, hand, rng);
  }

  private commitZone(lane: Lane, meetD: number, hand: Block[], rng: Rng): RushEntity {
    const e = this.add({ kind: 'zone', lane, meetD });
    e.side = lane === 0 ? -1 : lane === 2 ? 1 : rng() < 0.5 ? -1 : 1;
    this.hand.push(...hand);
    this.clear.push({ lane, from: meetD - RUSH_DELIVERY.clearPx, to: meetD + RUSH_DELIVERY.clearPx, owner: e.id, zoneD: meetD });
    this.version++;
    return e;
  }
}
