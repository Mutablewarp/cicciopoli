/**
 * KitchenShift: one turno of CICCIO'S KITCHEN (8 customers) as a pure, deterministic state machine.
 * The scene calls step(dtMs) on every frame it is not paused (no step = time frozen), calls the
 * action methods on taps (each returns what it caused), draws `snapshot` and reacts to the events
 * (sfx, banners, particles, camera). A restart = a new KitchenShift.
 *
 * Phases per customer: walkIn -> ordering (bubble, PRENDI L'ORDINE) -> cooking (kitchen view, SERVI)
 * -> serving (tray over the counter) -> reaction (stars / angry line) -> walkOut; then finished.
 */
import type { DrinkId, FryItemId, IngredientId } from '../../../art/kitchen/keys';
import { KITCHEN_PATIENCE, KITCHEN_SHIFT, KITCHEN_TIMING } from '../../../config/kitchen';
import { burger } from '../../../config/kitchenMenu';
import { Bench } from './bench';
import { buildDeck, seenOf } from './deck';
import { isCooked, isFryItem, isGriddleItem } from './order';
import { rateBurger, rateOrder, type Rating } from './rating';
import { comboFor, scoreOrder, shiftStars } from './score';
import { BANNER, comboText, REACTION } from './strings';
import { buildTicket } from './ticket';
import { guide } from './tutorial';
import type {
  BinId, GriddleItemId, KitchenEvent, KitchenGuide, KitchenOptions, KitchenOrder, KitchenPhase, KitchenPoints,
  KitchenShiftSummary, KitchenSnapshot, OrderResult, SeenId, TrashTarget,
} from './types';

type Out = KitchenEvent[];

export class KitchenShift {
  readonly orders: readonly KitchenOrder[];
  private phase: KitchenPhase = 'walkIn';
  private phaseMs = 0;
  private timeMs = 0;
  private index = 0;
  private started = false;
  private patienceMs = 0;
  private patienceMax = 1;
  private hearts: number = KITCHEN_SHIFT.hearts;
  private readonly points: KitchenPoints = { orders: 0, speed: 0, perfect: 0, combo: 0 };
  private streak = 0;
  private takingsCents = 0;
  private readonly ratings: number[] = [];
  private readonly seen: SeenId[] = [];
  private angry = 0;
  private readonly bench = new Bench();
  private pending: { rating: Rating; patience: number } | null = null;
  private result: OrderResult | null = null;
  private readonly stats = {
    perfectCooks: 0, perfectPatties: 0, bacon: 0, perfectBacon: 0, menuFive: false,
    rawOrders: 0, overOrders: 0, wrongOrders: 0, menuErrors: 0, slowOrders: 0,
  };
  private lastTicket = '';
  private lastGuide = '';

  constructor(readonly options: KitchenOptions) {
    this.orders = buildDeck(options.seed, options.tutorial, options.cooked);
  }

  /* ------------------------------------------------------------------ time */

  /** Advances the shift; returns what happened, in order. The first call lets the first customer in. */
  step(dtMs: number): KitchenEvent[] {
    const out: Out = [];
    if (!this.started) {
      this.started = true;
      this.walkIn(out);
    }
    if (this.phase === 'finished' || !(dtMs > 0)) return out;
    const dt = Math.min(dtMs, KITCHEN_SHIFT.maxStepMs);
    const T = KITCHEN_TIMING;
    this.timeMs += dt;
    this.phaseMs += dt;
    if (this.phase === 'walkIn' && this.phaseMs >= T.walkInMs) this.ordering(out);
    else if (this.phase === 'ordering') this.wait(dt, out);
    else if (this.phase === 'cooking') {
      this.bench.step(dt, out);
      this.wait(dt, out);
    } else if (this.phase === 'serving' && this.phaseMs >= T.servingMs) this.react(out);
    else if (this.phase === 'reaction' && this.phaseMs >= (this.result?.kind === 'angry' ? T.angryMs : T.reactionMs)) this.setPhase('walkOut', out);
    else if (this.phase === 'walkOut' && this.phaseMs >= T.walkOutMs) this.next(out);
    this.track(out);
    return out;
  }

  private get order(): KitchenOrder {
    return this.orders[this.index];
  }

  private get frozen(): boolean {
    return this.options.tutorial && this.index < KITCHEN_SHIFT.tutorialOrders;
  }

  private setPhase(phase: KitchenPhase, out: Out): void {
    this.phase = phase;
    this.phaseMs = 0;
    out.push({ type: 'phase', phase });
  }

  private walkIn(out: Out): void {
    const o = this.order;
    const P = KITCHEN_PATIENCE;
    const recipe = burger(o.burger).ingredients;
    this.patienceMax = P.baseMs + P.perItemMs * recipe.length + P.perCookMs * recipe.filter(isCooked).length + (o.form === 'menu' ? P.menuMs : 0);
    this.patienceMs = this.patienceMax;
    this.bench.stack.recipe = recipe;
    this.setPhase('walkIn', out);
    out.push({ type: 'customerIn', customer: o.customer, index: o.index });
  }

  private ordering(out: Out): void {
    this.setPhase('ordering', out);
    out.push({ type: 'say', text: this.order.line, mood: 'neutral' });
  }

  private wait(dt: number, out: Out): void {
    if (this.frozen) return;
    this.patienceMs -= dt;
    if (this.patienceMs > 0) return;
    this.patienceMs = 0;
    this.bench.clear();
    this.angry++;
    this.hearts--;
    this.streak = 0;
    this.result = { kind: 'angry', line: REACTION.angry };
    this.setPhase('reaction', out);
    out.push(
      { type: 'angryLeave', text: REACTION.angry },
      { type: 'heartLost', hearts: this.hearts },
      { type: 'say', text: REACTION.angry, mood: 'angry' },
    );
  }

  /** The stars show: points, takings, combo. */
  private react(out: Out): void {
    const p = this.pending;
    this.pending = null;
    if (!p) return;
    const { rating: r, patience } = p;
    const o = this.order;
    this.streak = r.stars === 5 ? this.streak + 1 : 0;
    const sc = scoreOrder(r, o.priceCents, patience, this.streak);
    for (const k of ['orders', 'speed', 'perfect', 'combo'] as const) this.points[k] += sc[k];
    this.takingsCents += o.priceCents + sc.tipCents;
    this.ratings.push(r.stars);
    this.seen.push(...seenOf(o));
    const st = this.stats;
    st.perfectCooks += r.perfect;
    st.perfectPatties += r.perfectPatties;
    st.bacon += r.bacon;
    st.perfectBacon += r.perfectBacon;
    st.menuFive ||= o.form === 'menu' && r.stars === 5;
    st.rawOrders += r.raw ? 1 : 0;
    st.overOrders += r.over ? 1 : 0;
    st.wrongOrders += r.wrong ? 1 : 0;
    st.menuErrors += r.menuError ? 1 : 0;
    st.slowOrders += r.slow ? 1 : 0;
    const res = { stars: r.stars, line: r.line, mood: r.mood, priceCents: o.priceCents, tipCents: sc.tipCents, points: sc.total };
    this.result = { kind: 'rated', ...res };
    this.setPhase('reaction', out);
    out.push({ type: 'rated', ...res }, { type: 'say', text: r.line, mood: r.mood });
    if (this.streak >= 2) out.push({ type: 'combo', combo: comboFor(this.streak), text: comboText(comboFor(this.streak)) });
  }

  private next(out: Out): void {
    this.bench.clear();
    this.result = null;
    if (this.hearts <= 0) return this.finish(false, out);
    if (this.index + 1 >= this.orders.length) return this.finish(true, out);
    this.index++;
    if (this.options.tutorial && this.index === KITCHEN_SHIFT.tutorialOrders) out.push({ type: 'tutorialDone' });
    this.walkIn(out);
  }

  private finish(completed: boolean, out: Out): void {
    this.setPhase('finished', out);
    const stars = this.summary.stars;
    if (stars === 3) out.push({ type: 'golden', title: BANNER.golden });
    out.push({ type: 'shiftEnd', completed, stars, title: completed ? BANNER.finished : BANNER.closed });
  }

  /** HUD refresh (ticket) and tutorial steps after anything changed. */
  private track(out: Out): void {
    const open = this.phase === 'ordering' || this.phase === 'cooking';
    const ticket = open ? buildTicket(this.order, this.bench.stack.layers, this.bench.tray) : null;
    const key = ticket ? `${this.index}:${JSON.stringify(ticket)}` : '';
    if (key !== this.lastTicket) {
      this.lastTicket = key;
      out.push({ type: 'ticketChanged', ticket });
    }
    const g = this.frozen ? this.guideNow() : null;
    const gKey = g ? `${this.index}:${g.step}:${JSON.stringify(g.target)}` : '';
    if (gKey === this.lastGuide) return;
    this.lastGuide = gKey;
    if (g) out.push({ type: 'tutorialStep', step: g.step, text: g.text, target: g.target });
  }

  /** The next useful step, also with AIUTI off (the paged kitchen's hand-offs follow it). */
  guideNow(): KitchenGuide | null {
    if (this.phase !== 'ordering' && this.phase !== 'cooking') return null;
    const b = this.bench;
    return guide({ phase: this.phase, order: this.order, griddle: b.griddle.view(), fryer: b.fryer.view(), stack: b.stack.layers, tray: b.tray });
  }

  /* --------------------------------------------------------------- actions */

  /** Runs a kitchen action (cooking phase only) and appends the HUD / tutorial updates. */
  private act(fn: (out: Out) => void, phase: KitchenPhase = 'cooking'): KitchenEvent[] {
    const out: Out = [];
    if (this.phase !== phase) return out;
    fn(out);
    this.track(out);
    return out;
  }

  /** PRENDI L'ORDINE: the camera slides to the kitchen. */
  takeOrder(): KitchenEvent[] {
    return this.act((out) => this.setPhase('cooking', out), 'ordering');
  }

  /** Tap on the bubble / the counter: hurry the walk-in, the reaction or the walk-out. */
  skipDialog(): KitchenEvent[] {
    const out: Out = [];
    if (this.phaseMs < KITCHEN_TIMING.skipMinMs) return out;
    if (this.phase === 'walkIn') this.ordering(out);
    else if (this.phase === 'reaction') this.setPhase('walkOut', out);
    else if (this.phase === 'walkOut') this.next(out);
    this.track(out);
    return out;
  }

  /** A tap on a bin: meat to the griddle, fryer items to a basket, everything else on the burger. */
  tapBin(id: BinId): KitchenEvent[] {
    if (isGriddleItem(id)) return this.placeOnGriddle(id);
    if (isFryItem(id)) return this.dropInFryer(id);
    return this.addToStack(id);
  }

  placeOnGriddle(item: GriddleItemId): KitchenEvent[] {
    return this.act((out) => this.bench.placeOnGriddle(item, out));
  }

  /** Tap on a griddle slot: GIRA, take it onto the burger, or bin it when burnt. */
  flipOrTake(slot: number): KitchenEvent[] {
    return this.act((out) => this.bench.flipOrTake(slot, this.timeMs, out));
  }

  dropInFryer(item: FryItemId): KitchenEvent[] {
    return this.act((out) => this.bench.dropInFryer(item, out));
  }

  /** Lift a basket: chicken onto the burger, fries into the cup, the starter into its box; burnt = bin. */
  lift(basket: number): KitchenEvent[] {
    return this.act((out) => this.bench.lift(basket, this.timeMs, out));
  }

  /** A cold ingredient or a sauce onto the burger (griddle / fryer items: nope, they cook first). */
  addToStack(id: IngredientId): KitchenEvent[] {
    return this.act((out) => this.bench.addToStack(id, this.timeMs, out));
  }

  /** Tap on the top layer: it goes in the bin. */
  removeTop(): KitchenEvent[] {
    return this.act((out) => this.bench.removeTop(out));
  }

  /** The top bun: the burger is wrapped and goes on the tray. */
  closeBurger(): KitchenEvent[] {
    return this.act((out) => this.bench.closeBurger(out, (layers) => rateBurger(this.order, layers)));
  }

  /** From the fridge rack onto the tray (another drink swaps it). */
  pickDrink(id: DrinkId): KitchenEvent[] {
    return this.act((out) => this.bench.pickDrink(id, out));
  }

  trashItem(t: TrashTarget): KitchenEvent[] {
    return this.act((out) => this.bench.trashItem(t, out));
  }

  /** SERVI: the tray goes over the counter; the customer tastes during `serving`. */
  serve(): KitchenEvent[] {
    return this.act((out) => {
      const b = this.bench;
      if (!b.tray.burger) return void out.push({ type: 'nope', target: { kind: 'action' }, reason: 'noBurger' });
      const patience = this.frozen ? 1 : this.patienceMs / this.patienceMax;
      this.pending = { rating: rateOrder(this.order, b.tray, patience, this.index), patience };
      b.clear(true);
      this.setPhase('serving', out);
      out.push({ type: 'served' });
    });
  }

  /* ---------------------------------------------------------------- views */

  get snapshot(): KitchenSnapshot {
    const open = this.phase === 'ordering' || this.phase === 'cooking';
    const o = this.order;
    const b = this.bench;
    const hint = this.frozen || this.options.hints ? this.guideNow() : null;
    const r = this.result;
    const counterSay = this.phase === 'ordering' ? { text: o.line, mood: 'neutral' as const } : null;
    const say = this.phase === 'reaction' && r ? { text: r.line, mood: r.kind === 'angry' ? ('angry' as const) : r.mood } : counterSay;
    return {
      phase: this.phase,
      phaseMs: this.phaseMs,
      timeMs: this.timeMs,
      view: this.phase === 'cooking' ? 'kitchen' : 'counter',
      index: this.index,
      total: this.orders.length,
      order: this.phase === 'finished' ? null : o,
      customer: this.phase === 'finished' ? null : o.customer,
      mood: say?.mood ?? 'neutral',
      say,
      patience: open ? this.patienceMs / this.patienceMax : null,
      frozen: this.frozen,
      hearts: this.hearts,
      score: this.score,
      combo: comboFor(this.streak + 1),
      takingsCents: this.takingsCents,
      served: this.ratings.length,
      griddle: b.griddle.view(),
      fryer: b.fryer.view(),
      stack: b.stack.layers,
      tray: { ...b.tray },
      ticket: open ? buildTicket(o, b.stack.layers, b.tray) : null,
      guide: hint,
      tutorial: this.frozen && hint !== null,
      canServe: this.phase === 'cooking' && b.tray.burger !== null,
      result: this.phase === 'reaction' || this.phase === 'walkOut' ? r : null,
    };
  }

  get score(): number {
    const p = this.points;
    return p.orders + p.speed + p.perfect + p.combo;
  }

  /** What the results screen needs (valid at any time; final once phase = finished). */
  get summary(): KitchenShiftSummary {
    const base = {
      completed: this.phase === 'finished' && this.hearts > 0,
      served: this.ratings.length,
      total: this.orders.length,
      ratings: [...this.ratings],
      angry: this.angry,
    };
    const stars = shiftStars(base);
    return {
      ...base,
      ...this.stats,
      seed: this.options.seed,
      seen: [...this.seen],
      stars,
      golden: stars === 3,
      score: this.score,
      points: { ...this.points },
      takingsCents: this.takingsCents,
      tutorialDone: this.index >= KITCHEN_SHIFT.tutorialOrders || base.completed,
    };
  }
}
