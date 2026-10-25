import { describe, expect, it } from 'vitest';
import { DRINKS, FRY_ITEMS, INGREDIENTS, SIDES } from '../../../art/kitchen/keys';
import { KITCHEN_SHIFT, KITCHEN_STACK } from '../../../config/kitchen';
import { BURGERS, burger } from '../../../config/kitchenMenu';
import { mulberry32, pick, randInt, type Rng } from '../../rush/logic/rng';
import { autopilot, CAREFUL, KitchenBot, SLOPPY, type BotProfile } from './bot';
import { KitchenProgress } from './progress';
import { KitchenShift } from './shift';
import type { KitchenEvent, KitchenSnapshot, KitchenTarget, TrayPart } from './types';

const SEEDS = Array.from({ length: 300 }, (_, i) => 1000 + i * 31);

function play(profile: BotProfile, seed: number, tutorial: boolean): KitchenShift {
  const sh = new KitchenShift({ seed, tutorial, hints: true });
  autopilot(sh, new KitchenBot(profile, mulberry32(seed ^ 0x5bd1e995)));
  return sh;
}

/**
 * The building order the guide teaches: a layer goes on top of the ones already on (menu order), and
 * nothing goes on the bare bun before the protein (the menu's first layer). Returns what broke it.
 */
function orderBreaks(before: KitchenSnapshot, ev: readonly KitchenEvent[], after: KitchenSnapshot): string[] {
  const o = before.order;
  if (!o) return [];
  const first = burger(o.burger).ingredients[0];
  const out: string[] = [];
  for (const e of ev) {
    if (e.type !== 'stacked') continue;
    const bare = before.stack.length === 0;
    if (bare && e.layer.kind !== first) out.push(`${o.burger}: ${e.layer.kind} on the bare bun`);
    if (after.stack[after.stack.length - 1] !== e.layer) out.push(`${o.burger}: ${e.layer.kind} slid under`);
  }
  return out;
}

describe('playability sweep (300 seeds each)', () => {
  it('a careful human (400 ms reaction, 700 ms per tap, takes in the middle of PERFETTO) makes YOU ARE SO GOLDEN, building like the guide', () => {
    let golden = 0;
    const breaks: string[] = [];
    for (const [i, seed] of SEEDS.entries()) {
      const sh = new KitchenShift({ seed, tutorial: i % 2 === 0, hints: true });
      const bot = new KitchenBot(CAREFUL, mulberry32(seed ^ 0x5bd1e995));
      for (let t = 0; t < 30 * 60_000 && sh.snapshot.phase !== 'finished'; t += 50) {
        sh.step(50);
        const before = sh.snapshot;
        const ev = bot.update(sh, 50);
        breaks.push(...orderBreaks(before, ev, sh.snapshot));
      }
      const s = sh.summary;
      expect(s.completed).toBe(true);
      expect(s.angry).toBe(0);
      if (s.stars === 3 && s.golden) golden++;
    }
    expect(breaks.slice(0, 5)).toEqual([]);
    // measured: 300 / 300 (the debug golden() replays a seed with this bot)
    expect(golden).toBe(SEEDS.length);
  });

  it('three careful shifts in a row through KitchenProgress serve all 17 burgers of the menu', () => {
    for (const seed of SEEDS.slice(0, 40)) {
      const progress = new KitchenProgress(null);
      for (let i = 0; i < 3; i++) {
        const sh = new KitchenShift(progress.optionsFor(seed + i));
        autopilot(sh, new KitchenBot(CAREFUL, mulberry32(seed)));
        progress.recordShift(sh.summary);
      }
      expect(BURGERS.filter((b) => !progress.data.cooked[b.id]).map((b) => b.id), `seed ${seed}`).toEqual([]);
    }
  });

  it('a sloppy player (wrong taps, late flips, forgotten toppings) gets 1-2 stars, never 3, never a crash', () => {
    let oneOrTwo = 0;
    const ratings: number[] = [];
    for (const [i, seed] of SEEDS.entries()) {
      const sh = play(SLOPPY, seed, i % 2 === 0);
      const s = sh.summary;
      expect(sh.snapshot.phase).toBe('finished');
      expect(s.stars).toBeLessThan(3);
      if (s.stars >= 1) oneOrTwo++;
      ratings.push(...s.ratings);
    }
    // measured: 295 / 300 get 1-2 stars, 5 get 0 (TURNO CHIUSO); their orders average 3.1 stars
    expect(oneOrTwo / SEEDS.length).toBeGreaterThanOrEqual(0.85);
    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    expect(avg).toBeGreaterThan(2);
    expect(avg).toBeLessThan(3.5);
  });

  it('a player who only follows the tutorial hand / AIUTI pulse serves 5-star orders, building every burger bottom-up', () => {
    for (const seed of SEEDS.slice(0, 100)) {
      const sh = new KitchenShift({ seed, tutorial: true, hints: true });
      let busy = 0;
      for (let t = 0; t < 20 * 60_000 && sh.snapshot.phase !== 'finished'; t += 50) {
        sh.step(50);
        busy -= 50;
        const g = sh.snapshot.guide;
        if (busy > 0 || !g || g.wait) continue;
        const before = sh.snapshot;
        // SERVI is enabled the moment the guide says "Tutto pronto: tocca SERVI!"
        if (g.step === 'serve') expect(before.canServe).toBe(true);
        // no topping while the protein is still cooking on a bare bun
        if (g.step === 'topping') expect(before.stack.length, `seed ${seed}`).toBeGreaterThan(0);
        const ev = tapTarget(sh, g.target);
        expect(ev.filter((e) => e.type === 'nope')).toEqual([]);
        // every layer goes on top, in the menu's order, the protein first
        expect(orderBreaks(before, ev, sh.snapshot), `seed ${seed}`).toEqual([]);
        busy = 700;
      }
      expect(sh.summary).toMatchObject({ completed: true, ratings: [5, 5, 5, 5, 5, 5, 5, 5], golden: true });
    }
  });
});

/** The action the scene runs for a tap on `t`. */
function tapTarget(sh: KitchenShift, t: KitchenTarget): KitchenEvent[] {
  switch (t.kind) {
    case 'action': return sh.snapshot.phase === 'ordering' ? sh.takeOrder() : sh.serve();
    case 'bin': return sh.tapBin(t.id);
    case 'bun': return sh.closeBurger();
    case 'griddle': return sh.flipOrTake(t.slot);
    case 'fryer': return sh.lift(t.basket);
    case 'drink': return sh.pickDrink(t.id);
    case 'stackTop': return sh.removeTop();
    case 'tray': return sh.trashItem({ from: 'tray', part: t.part });
  }
}

const PARTS: readonly TrayPart[] = ['burger', 'cone', 'side', 'drink'];
const BINS = [...INGREDIENTS, ...SIDES];

/** Any public action with any argument, bad slot numbers included. */
function randomAction(sh: KitchenShift, rng: Rng): KitchenEvent[] {
  const slot = randInt(rng, 6) - 1;
  switch (randInt(rng, 13)) {
    case 0: return sh.takeOrder();
    case 1: return sh.skipDialog();
    case 2: return sh.tapBin(pick(rng, BINS));
    case 3: return sh.placeOnGriddle(pick(rng, ['manzo', 'vegetale', 'bacon', 'guanciale'] as const));
    case 4: return sh.flipOrTake(slot);
    case 5: return sh.dropInFryer(pick(rng, FRY_ITEMS));
    case 6: return sh.lift(slot);
    case 7: return sh.addToStack(pick(rng, INGREDIENTS));
    case 8: return sh.removeTop();
    case 9: return sh.closeBurger();
    case 10: return sh.pickDrink(pick(rng, DRINKS));
    case 11: {
      const from = pick(rng, ['griddle', 'fryer', 'tray'] as const);
      return sh.trashItem(from === 'griddle' ? { from, slot } : from === 'fryer' ? { from, basket: slot } : { from, part: pick(rng, PARTS) });
    }
    default: return sh.serve();
  }
}

describe('random input never breaks the state machine', () => {
  it('300 seeds of random taps and frame times keep every invariant and still end the shift', () => {
    const broken: string[] = [];
    for (const seed of SEEDS) {
      const rng = mulberry32(seed);
      const sh = new KitchenShift({ seed, tutorial: seed % 3 === 0, hints: seed % 2 === 0 });
      let score = 0;
      for (let t = 0; t < 60 * 60_000 && sh.snapshot.phase !== 'finished'; t += 50) {
        const ev = [...sh.step(rng() * 80), ...(rng() < 0.3 ? randomAction(sh, rng) : [])];
        const s = sh.snapshot;
        const ok = s.hearts >= 0 && s.hearts <= KITCHEN_SHIFT.hearts
          && (s.patience === null || (s.patience >= 0 && s.patience <= 1))
          && s.served <= s.index + 1
          && s.stack.length <= KITCHEN_STACK.maxLayers
          && s.griddle.length === 3 && s.fryer.length === 2
          && (s.ticket !== null) === (s.phase === 'ordering' || s.phase === 'cooking')
          && Number.isInteger(s.score) && s.score >= score
          && ev.every((e) => !/NaN|undefined/.test(JSON.stringify(e)));
        if (!ok) broken.push(`seed ${seed} at ${s.timeMs} ms (${s.phase})`);
        score = s.score;
      }
      const sum = sh.summary;
      if (sh.snapshot.phase !== 'finished') broken.push(`seed ${seed} never finished`);
      else if (sum.completed ? sum.served + sum.angry !== 8 : sum.angry !== KITCHEN_SHIFT.hearts) broken.push(`seed ${seed} bad summary`);
    }
    expect(broken.slice(0, 5)).toEqual([]);
  });
});
