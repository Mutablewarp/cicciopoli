/**
 * The customer tastes: 1..5 stars from the burger (missing / wrong / extra layers, raw or over-cooked
 * items), the menù parts (fries, starter, drink) and the patience left, plus the reaction line.
 * 5 stars = flawless; every penalty is in KITCHEN_RATING.
 */
import type { IngredientId } from '../../../art/kitchen/keys';
import { KITCHEN_RATING } from '../../../config/kitchen';
import { burger } from '../../../config/kitchenMenu';
import { countKinds, isCooked, needs } from './order';
import type { Tray } from './stack';
import { REACTION } from './strings';
import type { CookQuality, KitchenOrder, Mood, StackLayer, Stars } from './types';

export interface Rating {
  readonly stars: Stars;
  readonly line: string;
  readonly mood: Mood;
  /** needed items served PERFETTO */
  readonly perfect: number;
  readonly perfectPatties: number;
  /** bacon / guanciale strips on the burger, and how many PERFETTO */
  readonly bacon: number;
  readonly perfectBacon: number;
  readonly raw: boolean;
  readonly over: boolean;
  readonly wrong: boolean;
  readonly menuError: boolean;
  readonly slow: boolean;
}

/** Reaction priority: the first issue found speaks (unless the order still got 5 stars). */
const ISSUES = ['raw', 'missing', 'wrong', 'menuMissing', 'menuWrong', 'menuRaw', 'over', 'slow', 'extra'] as const;
type Issue = (typeof ISSUES)[number];

const PATTIES: readonly IngredientId[] = ['manzo', 'vegetale'];
const STRIPS: readonly IngredientId[] = ['bacon', 'guanciale'];

/** `patience` = 0..1 left at SERVI; `variant` picks the praise line. */
export function rateOrder(order: KitchenOrder, tray: Tray, patience: number, variant: number): Rating {
  const R = KITCHEN_RATING;
  const layers = tray.burger ?? [];
  const need = needs(order.burger);
  const have = countKinds(layers.map((l) => l.kind));
  const lines: Partial<Record<Issue, string>> = {};
  let penalty = 0;
  /** over-cooked items: one "Bruciacchiato", capped at KITCHEN_RATING.overMax */
  let over = 0;
  const hit = (issue: Issue, p: number, line: string): void => {
    penalty += p;
    lines[issue] ??= line;
  };

  // missing: the first one in the menu's order speaks ("Ma... e il bacon?")
  for (const kind of burger(order.burger).ingredients) {
    if ((have.get(kind) ?? 0) < (need.get(kind) ?? 0)) lines.missing ??= REACTION.missing(kind);
  }
  let perfect = 0;
  let perfectPatties = 0;
  for (const [kind, n] of need) {
    const got = have.get(kind) ?? 0;
    penalty += Math.max(0, n - got) * (isCooked(kind) && !STRIPS.includes(kind) ? R.missingMain : R.missing);
    if (got > n) hit('extra', (got - n) * R.extra, REACTION.extra);
    const good = Math.min(n, layers.filter((l) => l.kind === kind && l.quality === 'perfect').length);
    perfect += good;
    if (PATTIES.includes(kind)) perfectPatties += good;
  }
  for (const [kind, got] of have) if (!need.has(kind)) hit('wrong', got * R.wrong, REACTION.wrong(kind));
  for (const l of layers) {
    if (l.quality === 'raw') hit('raw', R.raw, REACTION.raw);
    if (l.quality === 'over') over += R.over;
  }

  const beforeMenu = penalty;
  const fried = (q: CookQuality, rawLine: string): void => {
    if (q === 'perfect') perfect++;
    if (q === 'raw') hit('menuRaw', R.menuRaw, rawLine);
    if (q === 'over') over += R.menuOver;
  };
  if (order.starter && order.drink) {
    if (!tray.cone) hit('menuMissing', R.menuMissing, REACTION.missing('patatine'));
    else fried(tray.cone, REACTION.rawFries);
    if (!tray.side) hit('menuMissing', R.menuMissing, REACTION.missing(order.starter));
    else if (tray.side.id !== order.starter) hit('menuWrong', R.menuWrong, REACTION.wrongPart(order.starter, tray.side.id));
    else fried(tray.side.quality, REACTION.rawStarter);
    if (!tray.drink) hit('menuMissing', R.menuMissing, REACTION.missingDrink);
    else if (tray.drink !== order.drink) hit('menuWrong', R.menuWrong, REACTION.wrongPart(order.drink, tray.drink));
  } else {
    const extras = [tray.cone, tray.side, tray.drink].filter((x) => x !== null).length;
    if (extras) hit('extra', extras * R.extra, REACTION.extra);
  }
  const menuError = penalty - beforeMenu >= R.menuMissing;
  if (over > 0) hit('over', Math.min(over, R.overMax), REACTION.over);

  const slow = R.slow.find((s) => patience < s.below);
  if (slow) hit('slow', slow.penalty, REACTION.slow);

  const stars = Math.max(1, Math.min(5, Math.floor(5 - penalty + 1e-9))) as Stars;
  const issue = ISSUES.map((k) => lines[k]).find((l) => l !== undefined);
  const praise = REACTION.praise[stars];
  const strips = layers.filter((l) => STRIPS.includes(l.kind));
  return {
    stars,
    line: stars === 5 || !issue ? praise[variant % praise.length] : issue,
    mood: stars >= 4 ? 'happy' : stars === 3 ? 'neutral' : 'angry',
    perfect,
    perfectPatties,
    bacon: strips.length,
    perfectBacon: strips.filter((l) => l.quality === 'perfect').length,
    raw: lines.raw !== undefined,
    over: lines.over !== undefined,
    wrong: lines.missing !== undefined || lines.wrong !== undefined,
    menuError,
    slow: slow !== undefined,
  };
}

/** The burger alone, as if served at once without menù parts: the verdict when it is closed. */
export function rateBurger(order: KitchenOrder, layers: readonly StackLayer[]): Stars {
  return rateOrder({ ...order, starter: null, drink: null }, { burger: layers, cone: null, side: null, drink: null }, 1, 0).stars;
}
