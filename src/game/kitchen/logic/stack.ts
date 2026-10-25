/**
 * MONTAGGIO: the burger growing on its bottom bun (side view, bottom to top) and the serving tray.
 * The bottom bun is always there; the top bun closes the burger: it is wrapped and goes on the tray.
 * Every layer the order wants slides into its place of the menu's order (the patty under the cheddar
 * taken while it cooked, the bacon over the cheddar), so the burger always comes out as on the menu;
 * what the order does not want (wrong, extra, raw) sits on top, where a tap takes it back off.
 */
import type { DrinkId, IngredientId, StarterId } from '../../../art/kitchen/keys';
import { KITCHEN_STACK } from '../../../config/kitchen';
import type { CookQuality, StackLayer } from './types';

const LOOK: Readonly<Record<CookQuality, StackLayer['look']>> = { raw: 'raw', perfect: 'normal', over: 'burnt' };

/** Index of the n-th (0-based) `kind` in the recipe, -1 when it has fewer. */
function nth(recipe: readonly IngredientId[], kind: IngredientId, n: number): number {
  let seen = 0;
  for (let i = 0; i < recipe.length; i++) if (recipe[i] === kind && seen++ === n) return i;
  return -1;
}

export class Stack {
  /** the order's layers in the menu's order (repeats = "doppio" / "triplo"); empty = every layer on top */
  recipe: readonly IngredientId[] = [];
  private items: StackLayer[] = [];
  /** items[0..fits-1] follow the recipe; the rest is on top, in the order it came */
  private fits = 0;

  get layers(): readonly StackLayer[] {
    return this.items;
  }

  /** Cheddar melts on a griddle / fryer item that just came off the heat, or on melted cheddar. */
  private melts(below: StackLayer | undefined, nowMs: number): boolean {
    if (!below) return false;
    if (below.kind === 'cheddar') return below.melted;
    return below.quality !== null && nowMs - below.atMs <= KITCHEN_STACK.meltWindowMs;
  }

  /** Recipe place the new layer takes, -1 = on top (not wanted, one too many, or raw). */
  private place(kind: IngredientId, quality: CookQuality | null): number {
    if (quality === 'raw') return -1;
    const n = this.items.slice(0, this.fits).filter((l) => l.kind === kind).length;
    const slot = nth(this.recipe, kind, n);
    if (slot < 0) return -1;
    const counts = new Map<IngredientId, number>();
    let at = 0;
    for (const l of this.items.slice(0, this.fits)) {
      const k = counts.get(l.kind) ?? 0;
      counts.set(l.kind, k + 1);
      if (nth(this.recipe, l.kind, k) < slot) at++;
    }
    return at;
  }

  /** null = the stack is full. */
  add(kind: IngredientId, quality: CookQuality | null, nowMs: number): StackLayer | null {
    if (this.items.length >= KITCHEN_STACK.maxLayers) return null;
    const p = this.place(kind, quality);
    const at = p < 0 ? this.items.length : p;
    const below = this.items[at - 1];
    const layer: StackLayer = { kind, quality, melted: kind === 'cheddar' && this.melts(below, nowMs), look: quality ? LOOK[quality] : 'normal', atMs: nowMs };
    this.items.splice(at, 0, layer);
    if (p >= 0) this.fits++;
    // a hot item slid under cheddar taken while it cooked: the cheddar above melts on it
    for (let i = at + 1; quality !== null && this.items[i]?.kind === 'cheddar'; i++) this.items[i] = { ...this.items[i], melted: true };
    return layer;
  }

  removeTop(): StackLayer | null {
    const top = this.items.pop() ?? null;
    this.fits = Math.min(this.fits, this.items.length);
    return top;
  }

  /** Closes the burger: its layers leave the paper (a fresh bottom bun takes their place). */
  wrap(): StackLayer[] {
    const out = this.items;
    this.clear();
    return out;
  }

  clear(): void {
    this.items = [];
    this.fits = 0;
  }
}

export interface Tray {
  burger: readonly StackLayer[] | null;
  cone: CookQuality | null;
  side: { id: StarterId; quality: CookQuality } | null;
  drink: DrinkId | null;
}

export function emptyTray(): Tray {
  return { burger: null, cone: null, side: null, drink: null };
}
