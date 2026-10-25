/**
 * The worktop of one order: PIASTRA, FRIGGITRICE, the burger on its paper and the tray. Pure
 * mechanics, no customer and no clock of its own: KitchenShift calls these only while cooking
 * and passes the shift time (cheddar melts on a burger that just came off the heat).
 */
import type { DrinkId, FryItemId, IngredientId, StarterId } from '../../../art/kitchen/keys';
import { KITCHEN_STACK } from '../../../config/kitchen';
import { isCold, isIngredient } from './order';
import { emptyTray, Stack, type Tray } from './stack';
import { makeFryer, makeGriddle } from './station';
import { BANNER } from './strings';
import type { CookQuality, GriddleItemId, KitchenEvent, KitchenTarget, NopeReason, StackLayer, Stars, TrashTarget } from './types';

type Out = KitchenEvent[];

export class Bench {
  readonly griddle = makeGriddle();
  readonly fryer = makeFryer();
  readonly stack = new Stack();
  tray: Tray = emptyTray();

  /** Everything off the worktop (new customer / angry leave). `keepTray` = the tray is being served. */
  clear(keepTray = false): void {
    this.griddle.clear();
    this.fryer.clear();
    this.stack.clear();
    if (!keepTray) this.tray = emptyTray();
  }

  step(dt: number, out: Out): void {
    this.griddle.step(dt, out);
    this.fryer.step(dt, out);
  }

  private nope(out: Out, target: KitchenTarget, reason: NopeReason): void {
    out.push({ type: 'nope', target, reason });
  }

  placeOnGriddle(item: GriddleItemId, out: Out): void {
    const slot = this.griddle.put(item);
    if (slot === null) this.nope(out, { kind: 'bin', id: item }, 'full');
    else out.push({ type: 'griddlePlaced', slot, item });
  }

  flipOrTake(slot: number, nowMs: number, out: Out): void {
    const target: KitchenTarget = { kind: 'griddle', slot };
    const r = this.griddle.tap(slot, () => this.canStack());
    if (r.kind === 'flipped') out.push({ type: 'flipped', slot, item: r.item });
    else if (r.kind === 'trashed') out.push({ type: 'trashed', from: 'griddle', what: r.item });
    else if (r.kind === 'taken') {
      out.push({ type: 'griddleTaken', slot, item: r.item, quality: r.quality, text: r.quality === 'perfect' ? BANNER.perfect : null });
      this.pushLayer(r.item, r.quality, nowMs, out);
    } else if (r.kind === 'blocked') this.nope(out, target, this.tray.burger ? 'trayFull' : 'full');
    else if (r.kind === 'empty') this.nope(out, target, 'empty');
  }

  dropInFryer(item: FryItemId, out: Out): void {
    const basket = this.fryer.put(item);
    if (basket === null) this.nope(out, { kind: 'bin', id: item }, 'full');
    else out.push({ type: 'fryDropped', basket, item });
  }

  lift(basket: number, nowMs: number, out: Out): void {
    const target: KitchenTarget = { kind: 'fryer', basket };
    const r = this.fryer.tap(basket, (item) => this.canTakeFried(item));
    if (r.kind === 'trashed') out.push({ type: 'trashed', from: 'fryer', what: r.item });
    else if (r.kind === 'taken') {
      const { item, quality } = r;
      const to = isIngredient(item) ? 'stack' : item === 'patatine' ? 'cone' : 'side';
      out.push({ type: 'fryLifted', basket, item, quality, to, text: quality === 'perfect' ? BANNER.perfect : null });
      if (isIngredient(item)) this.pushLayer(item, quality, nowMs, out);
      else if (item === 'patatine') this.putTray('cone', out, () => (this.tray.cone = quality));
      else this.putTray('side', out, () => (this.tray.side = { id: item as StarterId, quality }));
    } else if (r.kind === 'blocked') this.nope(out, target, 'trayFull');
    else if (r.kind === 'empty') this.nope(out, target, 'empty');
  }

  addToStack(id: IngredientId, nowMs: number, out: Out): void {
    const target: KitchenTarget = { kind: 'bin', id };
    if (!isCold(id)) this.nope(out, target, 'notCold');
    else if (this.tray.burger) this.nope(out, target, 'trayFull');
    else if (!this.canStack()) this.nope(out, target, 'full');
    else this.pushLayer(id, null, nowMs, out);
  }

  removeTop(out: Out): void {
    const top = this.tray.burger ? null : this.stack.removeTop();
    if (!top) return this.nope(out, { kind: 'stackTop' }, 'empty');
    out.push({ type: 'removed', kind: top.kind }, { type: 'trashed', from: 'stack', what: top.kind });
  }

  /** `judge` = the closed burger's stars on its own (the verdict shown before it is wrapped). */
  closeBurger(out: Out, judge: (layers: readonly StackLayer[]) => Stars): void {
    if (this.tray.burger) return this.nope(out, { kind: 'bun' }, 'trayFull');
    if (this.stack.layers.length === 0) return this.nope(out, { kind: 'bun' }, 'empty');
    const burger = this.stack.wrap();
    this.tray.burger = burger;
    out.push({ type: 'wrapped', stars: judge(burger) });
  }

  pickDrink(id: DrinkId, out: Out): void {
    this.putTray('drink', out, () => (this.tray.drink = id), true);
  }

  trashItem(t: TrashTarget, out: Out): void {
    let what: string | null = null;
    let target: KitchenTarget;
    if (t.from === 'griddle') {
      what = this.griddle.trash(t.slot);
      target = { kind: 'griddle', slot: t.slot };
    } else if (t.from === 'fryer') {
      what = this.fryer.trash(t.basket);
      target = { kind: 'fryer', basket: t.basket };
    } else {
      if (this.tray[t.part] !== null) what = t.part;
      this.tray = { ...this.tray, [t.part]: null };
      target = { kind: 'tray', part: t.part };
    }
    if (what === null) this.nope(out, target, 'empty');
    else out.push({ type: 'trashed', from: t.from, what });
  }

  private canStack(): boolean {
    return this.tray.burger === null && this.stack.layers.length < KITCHEN_STACK.maxLayers;
  }

  private canTakeFried(item: FryItemId): boolean {
    if (isIngredient(item)) return this.canStack();
    return item === 'patatine' ? this.tray.cone === null : this.tray.side === null;
  }

  private pushLayer(kind: IngredientId, quality: CookQuality | null, nowMs: number, out: Out): void {
    const layer = this.stack.add(kind, quality, nowMs);
    if (layer) out.push({ type: 'stacked', layer, height: this.stack.layers.length });
  }

  /** `swap`: a new drink replaces the one on the tray (it goes back in the fridge). */
  private putTray(part: 'cone' | 'side' | 'drink', out: Out, put: () => void, swap = false): void {
    if (!swap && this.tray[part] !== null) return this.nope(out, { kind: 'tray', part }, 'trayFull');
    put();
    out.push({ type: 'trayPut', part });
  }
}
