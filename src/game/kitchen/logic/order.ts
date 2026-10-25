/** What an order needs: the burger's layers as a multiset, the menù parts, the real price. */
import { FRY_ITEMS, GRIDDLE_ITEMS, INGREDIENTS, type FryItemId, type IngredientId } from '../../../art/kitchen/keys';
import { burger, INGREDIENT_NAME, SIDE_NAME, STATION_OF, type BurgerId } from '../../../config/kitchenMenu';
import type { BinId, GriddleItemId, OrderForm } from './types';

export function isIngredient(id: BinId): id is IngredientId {
  return (INGREDIENTS as readonly string[]).includes(id);
}

/** Bin / ticket label: "CHEDDAR", "PATATINE". */
export function binLabel(id: BinId): string {
  return isIngredient(id) ? INGREDIENT_NAME[id].short : SIDE_NAME[id];
}

export function isGriddleItem(id: BinId): id is GriddleItemId {
  return (GRIDDLE_ITEMS as readonly string[]).includes(id);
}

export function isFryItem(id: BinId): id is FryItemId {
  return (FRY_ITEMS as readonly string[]).includes(id);
}

/** Cold pans and sauce bottles: tapped straight onto the stack. */
export function isCold(id: IngredientId): boolean {
  return STATION_OF[id] === 'bin' || STATION_OF[id] === 'sauce';
}

/** Griddle and fryer items: raw / perfect / over once on the stack. */
export function isCooked(id: IngredientId): boolean {
  return !isCold(id);
}

/** Real price of the order form, euro cents (menù = burger + 5,00 €, kitchenMenu.ts). */
export function priceOf(id: BurgerId, form: OrderForm): number {
  const b = burger(id);
  return form === 'menu' ? b.menuPriceCents : b.priceCents;
}

/** kind -> how many, in the menu's order of first appearance. */
export function countKinds(kinds: readonly IngredientId[]): Map<IngredientId, number> {
  const m = new Map<IngredientId, number>();
  for (const k of kinds) m.set(k, (m.get(k) ?? 0) + 1);
  return m;
}

/** The burger's layers between the buns ("doppio" / "triplo" repeated). */
export function needs(id: BurgerId): Map<IngredientId, number> {
  return countKinds(burger(id).ingredients);
}

/** Order-of-magnitude of the work: layers + things to cook (the deck sorts by it). */
export function complexity(id: BurgerId): number {
  const ing = burger(id).ingredients;
  return ing.length + ing.filter(isCooked).length;
}
