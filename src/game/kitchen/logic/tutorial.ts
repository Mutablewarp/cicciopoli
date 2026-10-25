/**
 * The next useful step of the open order: the tutorial's pointing hand + hint line (first run,
 * orders 1-2) and the AIUTI pulse. Order of care: bin what burnt, take what is PERFETTO, undo
 * mistakes, start what cooks, the menù fries / starter, the drink, then the burger bottom-up as on
 * the menu (the patty first, then each topping on it), close, SERVI. While the patty cooks the guide
 * sends the player to the fryer and the drinks, never a topping onto a bare bun: an upper cooked
 * layer (the bacon) starts only once the layers of other cooked kinds under it are on the bun.
 */
import type { FryItemId, IngredientId } from '../../../art/kitchen/keys';
import { burger } from '../../../config/kitchenMenu';
import { countKinds, isCold, isFryItem, isGriddleItem, isIngredient, needs } from './order';
import type { Tray } from './stack';
import { guideText, THE } from './strings';
import { burgerLayers } from './ticket';
import type { BasketView, GriddleSlotView, GuideStep, KitchenGuide, KitchenOrder, KitchenPhase, KitchenTarget, StackLayer } from './types';

export interface GuideInput {
  readonly phase: KitchenPhase;
  readonly order: KitchenOrder | null;
  readonly griddle: readonly (GriddleSlotView | null)[];
  readonly fryer: readonly (BasketView | null)[];
  readonly stack: readonly StackLayer[];
  readonly tray: Tray;
}

const WAIT: readonly GuideStep[] = ['waitFlip', 'waitTake', 'waitFry'];

function make(step: GuideStep, target: KitchenTarget, what = ''): KitchenGuide {
  return { step, target, text: guideText(step, what), wait: WAIT.includes(step) };
}

/** The menu's layers not on the burger yet, bottom-up (the first one goes on next); [] once wrapped. */
export function pendingLayers(order: KitchenOrder, stack: readonly StackLayer[], tray: Tray): IngredientId[] {
  if (tray.burger) return [];
  const have = countKinds(stack.map((l) => l.kind));
  const seen = new Map<IngredientId, number>();
  return burger(order.burger).ingredients.filter((kind) => {
    const n = seen.get(kind) ?? 0;
    seen.set(kind, n + 1);
    return (have.get(kind) ?? 0) <= n;
  });
}

/** A cooked layer may start once every pending layer under it is cold or of its own kind (both patties
 * together): the protein first, the bacon once the patty is on the bun. */
export function canStart(kind: IngredientId, pending: readonly IngredientId[]): boolean {
  return pending.slice(0, pending.indexOf(kind)).every((k) => isCold(k) || k === kind);
}

export function guide(s: GuideInput): KitchenGuide | null {
  if (s.phase === 'ordering') return make('order', { kind: 'action' });
  const o = s.order;
  if (s.phase !== 'cooking' || !o) return null;
  const { tray } = s;
  const need = needs(o.burger);
  const have = countKinds(burgerLayers(s.stack, tray).map((l) => l.kind));
  const short = (k: IngredientId): number => (need.get(k) ?? 0) - (have.get(k) ?? 0);
  const open = tray.burger === null;
  const menu = o.starter !== null && o.drink !== null;
  const missing = pendingLayers(o, s.stack, tray);
  const next = missing[0];
  // a cooked layer done early waits in its PERFETTO window for the layers under it, unless it is getting worse
  const takeNow = (item: IngredientId, v: GriddleSlotView | BasketView): boolean => short(item) > 0 && (item === next || v.phase === 'over');
  const fryWanted = (item: FryItemId): boolean => {
    if (item === 'patatine') return menu && !tray.cone;
    if (item === o.starter) return !tray.side;
    return isIngredient(item) && open && short(item) > 0;
  };

  // 1. burnt: into the bin
  const burntG = s.griddle.findIndex((v) => v?.phase === 'burnt');
  if (burntG >= 0) return make('trash', { kind: 'griddle', slot: burntG });
  const burntF = s.fryer.findIndex((v) => v?.phase === 'burnt');
  if (burntF >= 0) return make('trash', { kind: 'fryer', basket: burntF });

  // 2. PERFETTO (or troppo cotto: save it before it burns) and still needed: flip / take / lift now,
  //    the one closest to getting worse first
  const ready: { left: number; guide: KitchenGuide }[] = [];
  const done = (v: GriddleSlotView | BasketView): boolean => v.phase === 'perfect' || v.phase === 'over';
  const left = (v: GriddleSlotView | BasketView): number => (v.phase === 'perfect' ? v.overAtMs : v.burntAtMs) - v.ms;
  const step = (v: GriddleSlotView | BasketView, ok: GuideStep): GuideStep => (v.phase === 'over' ? 'hurry' : ok);
  s.griddle.forEach((v, slot) => {
    if (v && done(v) && (v.tap === 'flip' || (open && takeNow(v.item, v)))) {
      ready.push({ left: left(v), guide: make(step(v, v.tap === 'flip' ? 'flip' : 'take'), { kind: 'griddle', slot }) });
    }
  });
  s.fryer.forEach((v, basket) => {
    const item = v?.item;
    if (v && item && done(v) && fryWanted(item) && (!isIngredient(item) || takeNow(item, v))) ready.push({ left: left(v), guide: make(step(v, 'lift'), { kind: 'fryer', basket }) });
  });
  const urgent = ready.sort((a, b) => a.left - b.left)[0];
  if (urgent) return urgent.guide;

  // 3. undo mistakes: a layer the order does not want (or raw) on top, a wrong menù part
  const top = s.stack[s.stack.length - 1];
  if (open && top && (short(top.kind) < 0 || top.quality === 'raw')) return make('removeTop', { kind: 'stackTop' });
  if (tray.cone && !menu) return make('trayTrash', { kind: 'tray', part: 'cone' });
  if (tray.side && tray.side.id !== o.starter) return make('trayTrash', { kind: 'tray', part: 'side' });
  if (tray.drink && !menu) return make('trayTrash', { kind: 'tray', part: 'drink' });

  // 4. start what cooks (the lowest cooked layers first)
  if (open) {
    for (const [kind] of need) {
      const cooking = isGriddleItem(kind) ? s.griddle : isFryItem(kind) ? s.fryer : null;
      if (!cooking || short(kind) - cooking.filter((v) => v?.item === kind).length <= 0 || !canStart(kind, missing)) continue;
      if (cooking.includes(null)) return make(isGriddleItem(kind) ? 'griddleBin' : 'fryBin', { kind: 'bin', id: kind }, THE[kind]);
    }
  }
  if (menu && o.starter) {
    for (const item of ['patatine', o.starter] as const) {
      const done = item === 'patatine' ? tray.cone : tray.side;
      if (!done && !s.fryer.some((v) => v?.item === item) && s.fryer.includes(null)) return make('fryBin', { kind: 'bin', id: item }, THE[item]);
    }
  }

  // 5. the drink
  if (menu && o.drink && tray.drink !== o.drink) return make('drink', { kind: 'drink', id: o.drink }, THE[o.drink]);

  // 6. the burger bottom-up: the next layer from its pan, or the one cooking to wait for; all on: close
  if (open) {
    if (next === undefined) return make('close', { kind: 'bun' });
    if (isCold(next)) return make('topping', { kind: 'bin', id: next }, THE[next]);
    const g = s.griddle.findIndex((v) => v?.item === next);
    if (g >= 0) return make(s.griddle[g]?.tap === 'flip' ? 'waitFlip' : 'waitTake', { kind: 'griddle', slot: g });
    const f = s.fryer.findIndex((v) => v?.item === next);
    if (f >= 0) return make('waitFry', { kind: 'fryer', basket: f });
  }

  // 7. menù parts still frying
  const frying = s.fryer.findIndex((v) => v !== null && fryWanted(v.item));
  if (frying >= 0) return make('waitFry', { kind: 'fryer', basket: frying });
  return tray.burger ? make('serve', { kind: 'action' }) : null;
}
