/**
 * PIASTRA (3 slots) and FRIGGITRICE (2 baskets): one cooking model. An item cooks CRUDO ->
 * PERFETTO (window) -> troppo cotto -> BRUCIATO; burger patties cook 2 sides (tap = GIRA, then
 * tap = take, the served quality is the worse side). Burnt items can only go in the bin.
 */
import { FRY_ITEMS, FRY_STATE, GRIDDLE_ITEMS, GRIDDLE_STATE, type FryItemId } from '../../../art/kitchen/keys';
import { KITCHEN_FRYER, KITCHEN_GRIDDLE, type CookSpec } from '../../../config/kitchen';
import { BANNER } from './strings';
import type { CookEvent, CookPhase, CookQuality, CookRing, CookSlotView, GriddleItemId, Station } from './types';

export function cookPhase(s: CookSpec, ms: number): CookPhase {
  if (ms < s.perfectAtMs) return 'raw';
  if (ms < s.perfectAtMs + s.windowMs) return 'perfect';
  if (ms < s.perfectAtMs + s.windowMs + s.overMs) return 'over';
  return 'burnt';
}

export function cookRing(s: CookSpec, ms: number): CookRing {
  const overAtMs = s.perfectAtMs + s.windowMs;
  return { ms, perfectAtMs: s.perfectAtMs, overAtMs, burntAtMs: overAtMs + s.overMs, phase: cookPhase(s, ms) };
}

const RANK: Readonly<Record<CookPhase, number>> = { perfect: 0, over: 1, raw: 2, burnt: 3 };

/** A raw side spoils a burger more than an over-cooked one. */
export function worse(a: CookPhase, b: CookPhase): CookPhase {
  return RANK[a] >= RANK[b] ? a : b;
}

/** How a slot looks: raw for the first half of side 1, cooking after (and while side 2 is raw). */
export type CookLook = 'raw' | 'cooking' | CookQuality | 'burnt';

interface StationSpec<T extends string> {
  readonly station: Station;
  readonly size: number;
  readonly tapGuardMs: number;
  spec(item: T): CookSpec;
  sides(item: T): 1 | 2;
  frame(item: T, look: CookLook): number;
}

interface Cell<T extends string> {
  item: T;
  side: 1 | 2;
  ms: number;
  /** phase of side 1 when it was flipped */
  first: CookPhase | null;
  guardMs: number;
}

export type TapResult<T extends string> =
  | { kind: 'flipped'; item: T }
  | { kind: 'taken'; item: T; quality: CookQuality }
  | { kind: 'trashed'; item: T }
  /** the item is ready but has nowhere to go (tray full / burger already wrapped) */
  | { kind: 'blocked' }
  | { kind: 'guard' }
  | { kind: 'empty' };

export class CookStation<T extends string> {
  private cells: (Cell<T> | null)[];

  constructor(private readonly s: StationSpec<T>) {
    this.cells = new Array<Cell<T> | null>(s.size).fill(null);
  }

  get size(): number {
    return this.s.size;
  }

  /** Into the first free place; null = full. */
  put(item: T): number | null {
    const i = this.cells.indexOf(null);
    if (i < 0) return null;
    this.cells[i] = { item, side: 1, ms: 0, first: null, guardMs: this.s.tapGuardMs };
    return i;
  }

  /** Tap a slot: flip side 1, take it off, or bin it when burnt. `canTake` says if it has a place to go. */
  tap(i: number, canTake: (item: T) => boolean): TapResult<T> {
    const c = this.cells[i];
    if (!c) return { kind: 'empty' };
    if (c.guardMs > 0) return { kind: 'guard' };
    const phase = cookPhase(this.s.spec(c.item), c.ms);
    if (phase === 'burnt') return { kind: 'trashed', item: this.remove(i) };
    if (this.s.sides(c.item) === 2 && c.side === 1) {
      Object.assign(c, { side: 2, ms: 0, first: phase, guardMs: this.s.tapGuardMs });
      return { kind: 'flipped', item: c.item };
    }
    if (!canTake(c.item)) return { kind: 'blocked' };
    const quality = worse(c.first ?? phase, phase) as CookQuality;
    return { kind: 'taken', item: this.remove(i), quality };
  }

  /** Straight into the bin, whatever its state; null = empty. */
  trash(i: number): T | null {
    return this.cells[i] ? this.remove(i) : null;
  }

  private remove(i: number): T {
    const item = (this.cells[i] as Cell<T>).item;
    this.cells[i] = null;
    return item;
  }

  clear(): void {
    this.cells.fill(null);
  }

  /** Items of this kind cooking now. */
  count(item: T): number {
    return this.cells.filter((c) => c?.item === item).length;
  }

  get free(): number {
    return this.cells.filter((c) => c === null).length;
  }

  step(dt: number, out: { push(e: CookEvent): number }): void {
    this.cells.forEach((c, index) => {
      if (!c) return;
      const spec = this.s.spec(c.item);
      const before = cookPhase(spec, c.ms);
      c.ms += dt;
      c.guardMs = Math.max(0, c.guardMs - dt);
      const now = cookPhase(spec, c.ms);
      if (now === before) return;
      const station = this.s.station;
      if (now === 'burnt') out.push({ type: 'burnt', station, index, text: BANNER.burnt });
      else if (now !== 'raw') out.push({ type: now === 'perfect' ? 'perfect' : 'burning', station, index });
    });
  }

  view(): (CookSlotView<T> | null)[] {
    return this.cells.map((c) => {
      if (!c) return null;
      const spec = this.s.spec(c.item);
      const ring = cookRing(spec, c.ms);
      const sides = this.s.sides(c.item);
      const look: CookLook = ring.phase !== 'raw' ? ring.phase : c.side === 2 || c.ms >= spec.perfectAtMs * KITCHEN_GRIDDLE.cookingLookAt ? 'cooking' : 'raw';
      const tap = ring.phase === 'burnt' ? 'trash' : sides === 2 && c.side === 1 ? 'flip' : 'take';
      return { ...ring, item: c.item, sides, side: c.side, frame: this.s.frame(c.item, look), tap };
    });
  }
}

const FRY_LOOK: Readonly<Record<CookLook, number>> = {
  raw: FRY_STATE.raw, cooking: FRY_STATE.raw, perfect: FRY_STATE.perfect, over: FRY_STATE.perfect, burnt: FRY_STATE.burnt,
};

export function makeGriddle(): CookStation<GriddleItemId> {
  const G = KITCHEN_GRIDDLE;
  return new CookStation<GriddleItemId>({
    station: 'griddle',
    size: G.slots,
    tapGuardMs: G.tapGuardMs,
    spec: (item) => G.cook[item],
    sides: (item) => G.sides[item],
    frame: (item, look) => GRIDDLE_ITEMS.indexOf(item) * GRIDDLE_STATE.count + GRIDDLE_STATE[look],
  });
}

export function makeFryer(): CookStation<FryItemId> {
  const F = KITCHEN_FRYER;
  return new CookStation<FryItemId>({
    station: 'fryer',
    size: F.baskets,
    tapGuardMs: F.tapGuardMs,
    spec: (item) => F.cook[item],
    sides: () => 1,
    frame: (item, look) => FRY_ITEMS.indexOf(item) * FRY_STATE.count + FRY_LOOK[look],
  });
}
