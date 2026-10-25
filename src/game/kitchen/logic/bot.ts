/**
 * Simulated players of a shift, with human timings: the playability tests and the scene's debug
 * autopilot drive KitchenShift through its public actions only. CAREFUL = an attentive phone
 * player, SLOPPY = taps wrong bins, forgets toppings, flips late, fixes only half of its mistakes.
 * Both build like the guide: the protein starts first, the fryer and the drink while it cooks, then
 * the layers on the bun in the menu's order (never a topping on a bare bun).
 */
import type { IngredientId } from '../../../art/kitchen/keys';
import { burger } from '../../../config/kitchenMenu';
import { randInt, type Rng } from '../../rush/logic/rng';
import { countKinds, isCold, isFryItem, isGriddleItem, isIngredient, needs } from './order';
import type { KitchenShift } from './shift';
import { burgerLayers } from './ticket';
import { canStart, pendingLayers } from './tutorial';
import type { BasketView, BinId, CookSlotView, GriddleSlotView, KitchenEvent, KitchenSnapshot } from './types';

export interface BotProfile {
  /** delay before the first action of a phase */
  readonly reactionMs: number;
  /** busy after every tap */
  readonly actionMs: number;
  /** reading the speech bubble before PRENDI L'ORDINE */
  readonly readMs: number;
  /** cooked items are taken this far into the PERFETTO window (0.5 = the middle) */
  readonly takeAt: number;
  /** extra lateness on flips / takes / lifts: 0..lateMs */
  readonly lateMs: number;
  /** chance that a tap goes to a random bin instead */
  readonly wrongTap: number;
  /** chance to forget each cold ingredient of an order */
  readonly forget: number;
  /** chance per decision to notice a wrong layer / menù part (red ✗ on the ticket) and undo it */
  readonly fix: number;
}

export const CAREFUL: BotProfile = { reactionMs: 400, actionMs: 700, readMs: 1500, takeAt: 0.5, lateMs: 0, wrongTap: 0, forget: 0, fix: 1 };
export const SLOPPY: BotProfile = { reactionMs: 800, actionMs: 1000, readMs: 2500, takeAt: 0.9, lateMs: 2000, wrongTap: 0.12, forget: 0.15, fix: 0.5 };

export class KitchenBot {
  private busyMs = 0;
  private phase = '';
  private forgotten = new Set<string>();
  private orderIndex = -1;
  /** per slot / basket: lateness drawn when the item appeared */
  private late = new Map<string, number>();

  constructor(private readonly p: BotProfile, private readonly rng: Rng) {}

  /** One frame: maybe one tap. Returns the events the tap caused. */
  update(shift: KitchenShift, dt: number): KitchenEvent[] {
    const s = shift.snapshot;
    if (s.phase !== this.phase) {
      this.phase = s.phase;
      this.busyMs = Math.max(this.busyMs, this.p.reactionMs + (s.phase === 'ordering' ? this.p.readMs : 0));
    }
    this.busyMs -= dt;
    if (this.busyMs > 0) return [];
    if (s.order && s.order.index !== this.orderIndex) this.newOrder(s);
    const tap = s.phase === 'ordering' ? () => shift.takeOrder() : s.phase === 'cooking' ? this.decide(shift, s) : null;
    if (!tap) return [];
    this.busyMs = this.p.actionMs;
    return tap();
  }

  private newOrder(s: KitchenSnapshot): void {
    const o = s.order;
    if (!o) return;
    this.orderIndex = o.index;
    this.forgotten.clear();
    this.late.clear();
    for (const k of new Set(burger(o.burger).ingredients)) if (isCold(k) && this.rng() < this.p.forget) this.forgotten.add(k);
  }

  private lateness(key: string): number {
    let v = this.late.get(key);
    if (v === undefined) this.late.set(key, (v = this.rng() * this.p.lateMs));
    return v;
  }

  /** Is this cooking item due (taken at takeAt of the window, plus lateness)? */
  private due(v: CookSlotView<string>, key: string): boolean {
    if (v.phase === 'burnt') return true;
    const at = v.perfectAtMs + this.p.takeAt * (v.overAtMs - v.perfectAtMs) + this.lateness(`${key}:${v.side}`);
    return v.ms >= at;
  }

  private decide(shift: KitchenShift, s: KitchenSnapshot): (() => KitchenEvent[]) | null {
    const o = s.order;
    if (!o) return null;
    if (this.rng() < this.p.wrongTap) return this.wrong(shift, s);
    const tray = s.tray;
    // the menu's layers still to put on, bottom-up, without the ones this player forgot
    const todo = pendingLayers(o, s.stack, tray).filter((k) => !(isCold(k) && this.forgotten.has(k)));
    const next = todo[0];
    // a needed layer done early waits on the heat for the ones under it, unless it is getting worse
    const holds = (v: GriddleSlotView | BasketView): boolean =>
      v.tap === 'take' && v.phase === 'perfect' && isIngredient(v.item) && todo.includes(v.item) && v.item !== next;
    // 1. the most urgent cooking item that is due
    const left = (v: CookSlotView<string>): number => v.overAtMs - v.ms;
    const due = [
      ...s.griddle.map((v, i) => ({ v, i, key: `g${i}` })),
      ...s.fryer.map((v, i) => ({ v, i, key: `f${i}` })),
    ].flatMap((x) => (x.v && this.due(x.v, x.key) && !holds(x.v) ? [{ ...x, v: x.v }] : []));
    due.sort((a, b) => left(a.v) - left(b.v));
    const first = due[0];
    if (first) {
      this.late.delete(`${first.key}:${first.v.side}`);
      return first.key.startsWith('g') ? () => shift.flipOrTake(first.i) : () => shift.lift(first.i);
    }
    const need = needs(o.burger);
    const have = countKinds(burgerLayers(s.stack, tray).map((l) => l.kind));
    const short = (k: IngredientId, cooking = 0): number => (tray.burger ? 0 : (need.get(k) ?? 0) - (have.get(k) ?? 0) - cooking);
    const starter = o.starter;
    // 2. notice a mistake (the red ✗ on the ticket) and undo it
    const top = s.stack[s.stack.length - 1];
    const wrongTop = top !== undefined && short(top.kind) < 0;
    const wrongCone = tray.cone !== null && !starter;
    const wrongSide = tray.side !== null && tray.side.id !== starter;
    if ((wrongTop || wrongCone || wrongSide) && this.rng() < this.p.fix) {
      if (wrongTop) return () => shift.removeTop();
      return () => shift.trashItem({ from: 'tray', part: wrongCone ? 'cone' : 'side' });
    }
    // 3. start what cooks: the protein (the bacon once the layers under it are on), fries and starter
    for (const k of need.keys()) {
      const station = isGriddleItem(k) ? s.griddle : isFryItem(k) ? s.fryer : null;
      if (station?.includes(null) && short(k, station.filter((v) => v?.item === k).length) > 0 && canStart(k, todo)) return () => shift.tapBin(k);
    }
    if (starter && s.fryer.includes(null)) {
      if (!tray.cone && !s.fryer.some((v) => v?.item === 'patatine')) return () => shift.tapBin('patatine');
      if (!tray.side && !s.fryer.some((v) => v?.item === starter)) return () => shift.tapBin(starter);
    }
    // 4. the drink, then the next layer if it is a cold one
    const drink = o.drink;
    if (drink && tray.drink !== drink) return () => shift.pickDrink(drink);
    if (next !== undefined && isCold(next)) return () => shift.tapBin(next);
    // 5. close when every layer is on (or forgotten), SERVI when the menù parts are there
    if (!tray.burger && s.stack.length > 0 && next === undefined) return () => shift.closeBurger();
    const menuReady = !starter || (tray.cone !== null && tray.side !== null) || s.fryer.every((v) => v === null);
    if (tray.burger && menuReady) return () => shift.serve();
    return null;
  }

  /** A sloppy tap: a random bin of the worktop or a random drink. */
  private wrong(shift: KitchenShift, s: KitchenSnapshot): () => KitchenEvent[] {
    const b = s.order?.bins;
    const all: BinId[] = b ? [...b.cold, ...b.sauces, ...b.fryer] : [];
    const n = randInt(this.rng, all.length + 1);
    const drinks = b?.drinks ?? [];
    if (n === all.length && drinks.length) {
      const d = drinks[randInt(this.rng, drinks.length)];
      return () => shift.pickDrink(d);
    }
    const id = all[n] ?? 'cheddar';
    return () => shift.tapBin(id);
  }
}

/** Runs a whole shift with one bot (tests / debug); returns every event. `maxMs` guards a stuck machine. */
export function autopilot(shift: KitchenShift, bot: KitchenBot, dtMs = 50, maxMs = 30 * 60_000): KitchenEvent[] {
  const events: KitchenEvent[] = [];
  for (let t = 0; t < maxMs && shift.snapshot.phase !== 'finished'; t += dtMs) {
    events.push(...shift.step(dtMs), ...bot.update(shift, dtMs));
  }
  return events;
}
