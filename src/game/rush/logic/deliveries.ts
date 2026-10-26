/**
 * Three orders per run (real menu pairs, Palermo names, real streets; the third one goes to the
 * new Ciccio's Terrasini, handed over at its door in the shop-side lane). Each shows its green zone
 * ~4 s ahead in a lane the validator keeps reachable; driving through it in that lane (at any moment
 * of the hand-off window) hands the bag over. One miss = one ULTIMA CHANCE zone a few seconds later,
 * a second miss loses the order (the run goes on). Freshness drops with time, faster while braking,
 * and on hits.
 */
import { RUSH_ZONES } from '../../../art/rush/keys';
import { RUSH_DELIVERY, RUSH_FAIR, RUSH_TRUCK } from '../../../config/rush';
import type { RushEntity } from './entity';
import { laneX } from './lanes';
import { pick, shuffled, type Rng } from './rng';
import { deliveryPoints, type ScoreBook } from './score';
import { CUSTOMERS, MENU_PAIRS, ORDER_PLACES, RUSH_TEXT, orderText } from './strings';
import type { TrafficManager } from './traffic';
import type { OrderState, RushEvent, RushOrderView } from './types';

type Emit = (e: RushEvent) => void;

export interface Order extends RushOrderView {
  state: OrderState;
  fresh: number;
}

export interface DeliveryContext {
  readonly timeMs: number;
  readonly d: number;
  /** base speed of the zone now, px/s (turns lead times into road) */
  readonly base: number;
  readonly truckX: number;
  /** FRENA held: the order cools faster */
  readonly braking: boolean;
  readonly flying: boolean;
  readonly traffic: TrafficManager;
  readonly score: ScoreBook;
  readonly emit: Emit;
}

function makeOrders(rng: Rng): Order[] {
  const pairs = shuffled(rng, MENU_PAIRS);
  const names = shuffled(rng, CUSTOMERS);
  return RUSH_ZONES.map((zone, index) => {
    const place = pick(rng, ORDER_PLACES[zone]);
    return {
      index,
      pair: pairs[index],
      customer: names[index],
      place,
      text: orderText(pairs[index], names[index], place, zone),
      state: 'waiting',
      fresh: RUSH_DELIVERY.freshStart,
    };
  });
}

export class Deliveries {
  readonly orders: Order[];
  /** freshness at each hand-off */
  readonly handFresh: number[] = [];
  delivered = 0;
  perfect = 0;
  /** road coordinate of the Ciccio's Terrasini door once the last zone is placed there (the scenery draws the shop) */
  shopD: number | null = null;
  private zone: RushEntity | null = null;

  constructor(
    private readonly rng: Rng,
    private readonly hitFreshMul: number,
  ) {
    this.orders = makeOrders(rng);
  }

  /** The order on board (announced, not yet delivered or lost). */
  get current(): Order | null {
    return this.orders.find((o) => o.state === 'active' || o.state === 'zone' || o.state === 'recovery') ?? null;
  }

  update(dtMs: number, c: DeliveryContext): void {
    const R = RUSH_DELIVERY;
    let cur = this.current;
    if (!cur) {
      const next = this.orders.find((o) => o.state === 'waiting');
      if (!next || c.timeMs < R.announceMs[next.index]) return;
      next.state = 'active';
      c.emit({ type: 'orderNew', order: next, title: RUSH_TEXT.newOrder });
      cur = next;
    }
    const decay = R.freshDecayPerS + (c.braking ? R.freshBrakePerS : 0);
    cur.fresh = Math.max(0, cur.fresh - (decay * dtMs) / 1000);
    if (cur.state === 'active' && c.timeMs >= R.dueMs[cur.index] - R.leadMs) this.showZone(cur, c, R.leadMs, false);
    if (this.zone && c.d >= this.zone.meetD - R.windowPx) this.resolve(cur, c);
  }

  /** A delivery zone is on the road, its hand-off still open (the PROPULSORE holds the landing for it). */
  get zoneOpen(): boolean {
    return this.zone !== null;
  }

  /** A delivery zone is on the road or one is due within withinMs (FRIES TRAILS wait: never in a hand-off's way). */
  zoneSoon(timeMs: number, withinMs: number): boolean {
    const R = RUSH_DELIVERY;
    return (
      this.zone !== null ||
      this.orders.some((o) => (o.state === 'waiting' || o.state === 'active') && timeMs >= R.dueMs[o.index] - R.leadMs - withinMs)
    );
  }

  /** A hit spoils the order on board. */
  hit(): void {
    const cur = this.current;
    if (cur) cur.fresh = Math.max(0, cur.fresh - RUSH_DELIVERY.freshHit * this.hitFreshMul);
  }

  private showZone(o: Order, c: DeliveryContext, leadMs: number, recovery: boolean): void {
    const ahead = (leadMs / 1000) * c.base;
    const shop = o.index === RUSH_DELIVERY.shop.order;
    // the player knows the lane once the banner is read: reaction time after the announcement
    const vis = c.d + (RUSH_FAIR.reactMs / 1000) * c.base;
    const z = c.traffic.placeZone(c.d, ahead, vis, this.rng, shop ? { lane: RUSH_DELIVERY.shop.lane, door: !recovery } : {});
    if (shop && !recovery) this.shopD = z.meetD;
    this.zone = z;
    o.state = recovery ? 'recovery' : 'zone';
    c.emit({
      type: 'deliveryZone',
      order: o.index,
      id: z.id,
      lane: z.from,
      recovery,
      etaMs: ((z.meetD - c.d) / c.base) * 1000,
      title: recovery ? RUSH_TEXT.lastChanceAhead : RUSH_TEXT.zoneAhead,
    });
  }

  /** In the hand-off window: delivered once the truck is in the zone lane (or flies over it), missed once the window is behind. */
  private resolve(o: Order, c: DeliveryContext): void {
    const z = this.zone;
    if (!z) return;
    const sky = c.flying;
    const inLane = Math.abs(c.truckX - laneX(z.from)) <= RUSH_TRUCK.handoffTolPx;
    if (!sky && !inLane && c.d <= z.meetD + RUSH_DELIVERY.windowPx) return;
    this.zone = null;
    z.done = true;
    c.traffic.release(z.id);
    if (sky || inLane) {
      this.deliver(o, sky, c);
      return;
    }
    if (o.state === 'zone') {
      o.fresh = Math.max(0, o.fresh - RUSH_DELIVERY.freshMiss);
      c.emit({ type: 'missed', order: o.index, lost: false, title: RUSH_TEXT.missed, sub: RUSH_TEXT.lastChance });
      this.showZone(o, c, RUSH_DELIVERY.recoveryLeadMs, true);
      return;
    }
    o.state = 'lost';
    c.emit({ type: 'missed', order: o.index, lost: true, title: RUSH_TEXT.lost, sub: RUSH_TEXT.lostSub });
  }

  private deliver(o: Order, sky: boolean, c: DeliveryContext): void {
    const fresh = Math.round(o.fresh);
    const p = deliveryPoints(fresh, sky);
    c.score.add('deliveries', p.base);
    c.score.add('fresh', p.fresh);
    c.score.add('sky', p.sky);
    const perfect = fresh >= RUSH_DELIVERY.perfectFresh;
    o.state = 'delivered';
    this.delivered++;
    if (perfect) this.perfect++;
    this.handFresh.push(fresh);
    c.emit({
      type: 'delivered',
      order: o.index,
      points: p.base + p.fresh + p.sky,
      fresh,
      perfect,
      sky,
      title: sky ? RUSH_TEXT.sky : perfect ? RUSH_TEXT.perfect : RUSH_TEXT.delivered,
      line: pick(this.rng, RUSH_TEXT.customerLines),
    });
  }
}
