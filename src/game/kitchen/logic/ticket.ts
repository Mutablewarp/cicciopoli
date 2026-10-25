/** The scontrino pinned on the HUD: burger checklist, menù parts, wrong items (red ✗). */
import { DRINK_NAME, euro, INGREDIENT_NAME, SIDE_NAME } from '../../../config/kitchenMenu';
import type { KitchenTicket, KitchenTicketLine } from '../../../contracts';
import { countKinds, needs } from './order';
import type { Tray } from './stack';
import { CUSTOMER_NAME } from './strings';
import type { KitchenOrder, StackLayer } from './types';

/** The burger in the works: on the paper, or already wrapped on the tray. */
export function burgerLayers(stack: readonly StackLayer[], tray: Tray): readonly StackLayer[] {
  return tray.burger ?? stack;
}

export function buildTicket(order: KitchenOrder, stack: readonly StackLayer[], tray: Tray): KitchenTicket {
  const need = needs(order.burger);
  const have = countKinds(burgerLayers(stack, tray).map((l) => l.kind));
  const lines: KitchenTicketLine[] = [...need].map(([kind, count]) => ({
    label: INGREDIENT_NAME[kind].short,
    count,
    done: have.get(kind) ?? 0,
    group: 'burger',
  }));
  const wrong = [...have.keys()].filter((k) => !need.has(k)).map((k) => INGREDIENT_NAME[k].short);
  if (order.starter && order.drink) {
    lines.push(
      { label: SIDE_NAME.patatine, count: 1, done: tray.cone ? 1 : 0, group: 'menu' },
      { label: SIDE_NAME[order.starter], count: 1, done: tray.side?.id === order.starter ? 1 : 0, group: 'menu' },
      { label: DRINK_NAME[order.drink], count: 1, done: tray.drink === order.drink ? 1 : 0, group: 'menu' },
    );
    if (tray.side && tray.side.id !== order.starter) wrong.push(SIDE_NAME[tray.side.id]);
    if (tray.drink && tray.drink !== order.drink) wrong.push(DRINK_NAME[tray.drink]);
  } else {
    if (tray.cone) wrong.push(SIDE_NAME.patatine);
    if (tray.side) wrong.push(SIDE_NAME[tray.side.id]);
    if (tray.drink) wrong.push(DRINK_NAME[tray.drink]);
  }
  return {
    title: order.name,
    form: order.form === 'menu' ? 'MENÙ' : 'SINGOLO',
    price: euro(order.priceCents),
    customer: CUSTOMER_NAME[order.customer],
    lines,
    wrong,
  };
}
