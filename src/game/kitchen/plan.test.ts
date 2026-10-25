import { describe, expect, it } from 'vitest';
import { DRINKS, FRY_ITEMS, GRIDDLE_ITEMS, INGREDIENTS, PAPER, SAUCES, SIDES, TRAY } from '../../art/kitchen/keys';
import { KITCHEN_DECK, KITCHEN_STACK } from '../../config/kitchen';
import { burger } from '../../config/kitchenMenu';
import { FURNITURE, KITCHEN_FX, LABEL, MONTAGGIO } from './config';
import { binLines, canDraw, drinkLines, lineWidth } from './labels';
import { hitKitchen, inRect, kitchenLayout, pageOf, stackScale, type KitchenLayout, type Rect } from './layout';
import { buildDeck } from './logic/deck';
import type { KitchenBins } from './logic/types';
import { BANNER, plusEuro, tipLine } from './logic/strings';
import { HIT_MIN, KITCHEN_PLAN } from './plan';

const overlap = (a: Rect, b: Rect): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
/** the overlapping pairs of a set of rects (one expect per set: thousands of orders stay fast) */
const overlaps = (rs: readonly Rect[]): string[] => rs.flatMap((a, i) => rs.slice(i + 1).filter((b) => overlap(a, b)).map((b) => JSON.stringify([a, b])));
const ORDERS = Array.from({ length: 60 }, (_, s) => [...buildDeck(s * 7919 + 1), ...buildDeck(s * 104729 + 7, false)]).flat();
const COOKED = new Set<string>([...GRIDDLE_ITEMS, ...FRY_ITEMS]);
const shownBy = (b: KitchenBins): string[] => [...b.griddle, ...b.fryer, ...b.cold, ...b.sauces];
const targets = (l: KitchenLayout): Rect[] => [
  ...l.slotHit, ...l.basketHit, ...l.bins.map((b) => b.hit), ...l.drinks.map((d) => d.hit), l.trayHit.cone, l.trayHit.side, l.trayHit.drink,
];
const tape = (at: { x: number; y: number }, lines: readonly string[]): Rect => {
  const w = (Math.max(...lines.map(lineWidth)) + 2) * LABEL.scale;
  return { x: at.x - w / 2, y: at.y, w, h: (lines.length * 6 + 1) * LABEL.scale };
};

for (const [orient, plan] of Object.entries(KITCHEN_PLAN)) {
  describe(`${orient} plan`, () => {
    it('every order fits: all its pans, sauces, CHIUDI and drinks have a place; no two taps, labels or pans overlap', () => {
      for (const o of ORDERS) {
        const l = kitchenLayout(plan, o.bins);
        for (const id of shownBy(o.bins)) expect(l.bins.some((b) => b.id === id), id).toBe(true);
        expect(l.bins.length + l.locked.length).toBe(plan.griddleRail.length + plan.fryRail.length + plan.coldRail.length + plan.sauces.length + 1);
        expect(l.drinks.length).toBe(o.bins.drinks.length);
        const all = targets(l);
        expect(overlaps(all)).toEqual([]);
        expect(Math.min(...all.map((r) => Math.min(r.w, r.h)))).toBeGreaterThanOrEqual(HIT_MIN);
        expect(overlaps([...l.bins.map((b) => tape(b.label, binLines(b.id))), ...l.drinks.map((d) => tape(d.label, drinkLines(d.id)))])).toEqual([]);
        expect(overlaps([...l.bins, ...l.locked].map((b) => ({ x: b.x, y: b.y, w: 48, h: 36 })))).toEqual([]);
      }
    });

    it('every free place holds a decoy the order does not show (cooking side: something cooked, a bottle place: a sauce), never twice; at most FURNITURE.lock.keep locked', () => {
      const cookSide = new Set([...plan.griddleRail, ...plan.fryRail].map((c) => `${c.x},${c.y}`));
      for (const o of ORDERS) {
        const l = kitchenLayout(plan, o.bins);
        const shown = new Set(shownBy(o.bins));
        const ids = [...l.bins, ...l.locked].map((b) => b.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(l.locked.length).toBeLessThanOrEqual(FURNITURE.lock.keep);
        for (const b of [...l.bins, ...l.locked].filter((x) => x.id !== 'bun' && !shown.has(x.id))) {
          if (b.kind === 'bottle') expect(SAUCES as readonly string[]).toContain(b.id);
          else expect(COOKED.has(b.id), b.id).toBe(cookSide.has(`${b.hit.x},${b.hit.y}`));
        }
      }
    });

    it('griddle pans take the griddle\'s places, fryer pans the fryer\'s, before anything else', () => {
      const at = (cells: readonly Rect[]): Set<string> => new Set(cells.map((c) => `${c.x},${c.y}`));
      const [g, f] = [at(plan.griddleRail), at(plan.fryRail)];
      for (const o of ORDERS) {
        const l = kitchenLayout(plan, o.bins);
        const on = (ids: readonly string[], rail: Set<string>): number => l.bins.filter((b) => ids.includes(b.id) && rail.has(`${b.hit.x},${b.hit.y}`)).length;
        expect(on(o.bins.griddle, g)).toBe(Math.min(o.bins.griddle.length, g.size));
        expect(on(o.bins.fryer, f)).toBe(Math.min(o.bins.fryer.length, f.size));
      }
    });

    it('griddle / fryer pans (decoys too) next to the cooking, cold pans round the board: a paged plan never sends one to the other page', () => {
      for (const o of ORDERS) {
        const l = kitchenLayout(plan, o.bins);
        for (const b of l.bins.filter((x) => x.kind === 'pan')) expect(pageOf(plan, b.hit.y), b.id).toBe(COOKED.has(b.id) && plan.pages ? 1 : 0);
      }
    });

    it('taps land on what is drawn there', () => {
      const l = kitchenLayout(plan, ORDERS[7].bins);
      const centre = (r: Rect): [number, number] => [r.x + r.w / 2, r.y + r.h / 2];
      l.slotHit.forEach((r, slot) => expect(hitKitchen(l, ...centre(r), null)).toEqual({ kind: 'griddle', slot }));
      l.basketHit.forEach((r, basket) => expect(hitKitchen(l, ...centre(r), null)).toEqual({ kind: 'fryer', basket }));
      for (const b of l.bins) expect(hitKitchen(l, ...centre(b.hit), null)).toEqual(b.id === 'bun' ? { kind: 'bun' } : { kind: 'bin', id: b.id });
      for (const d of l.drinks) {
        expect(hitKitchen(l, ...centre(d.hit), null)).toEqual({ kind: 'drink', id: d.id });
        expect(inRect(d.hit, d.at.x, d.at.y - 4)).toBe(true);
      }
      expect(hitKitchen(l, l.stackBase.x, l.stackBase.y - 4, l.stackBase.y - 20)).toEqual({ kind: 'stackTop' });
      expect(hitKitchen(l, l.stackBase.x, l.stackBase.y - 4, null)).toBeNull();
      for (const p of ['cone', 'side', 'drink'] as const) expect(inRect(l.trayHit[p], l.trayAt[p].x, l.trayAt[p].y - 4), p).toBe(true);
      for (const r of l.slotHit) expect(r.x >= l.griddle.x - 10 && r.x + r.w <= l.griddle.x + 126).toBe(true);
    });

    it('the board: the burger centred on it, its room, the paper and the tray clear of every tap target, the tray right under the board', () => {
      const ms = MONTAGGIO.scale;
      const ts = MONTAGGIO.trayScale;
      for (const o of ORDERS.slice(0, 60)) {
        const l = kitchenLayout(plan, o.bins);
        const b = l.stackBase;
        const room: Rect = { x: b.x - 24 * ms, y: b.y - MONTAGGIO.room, w: 48 * ms, h: MONTAGGIO.room };
        const paper: Rect = { x: l.paper.x, y: l.paper.y, w: PAPER.w * ms, h: PAPER.h * ms };
        const tray: Rect = { x: l.tray.x, y: l.tray.y, w: TRAY.w * ts, h: TRAY.h * ts };
        expect(Math.abs(b.x - (l.board.x + l.board.w / 2))).toBeLessThanOrEqual(2);
        expect(room.y).toBeGreaterThanOrEqual(l.board.y - 4);
        expect(tray.y - (l.board.y + l.board.h)).toBeLessThanOrEqual(8);
        expect(overlap(paper, tray)).toBe(false);
        const others = [...l.slotHit, ...l.basketHit, ...l.bins.map((x) => x.hit), ...l.drinks.map((d) => d.hit)];
        for (const zone of [room, paper, tray]) for (const r of others) expect(overlap(zone, r), JSON.stringify([zone, r])).toBe(false);
      }
    });

    it('the plan has a place for the most pans and bottles an order shows', () => {
      expect(plan.griddleRail.length + plan.fryRail.length + plan.coldRail.length).toBeGreaterThanOrEqual(KITCHEN_DECK.maxRail);
      expect(plan.sauces.length).toBeGreaterThanOrEqual(KITCHEN_DECK.maxSauces);
      expect(plan.shelves.length * 2).toBeGreaterThanOrEqual(KITCHEN_DECK.drinkSlots);
    });

    const pages = plan.pages;
    if (pages) {
      it('pages: each shows its half and its tab, the tab clear of that page\'s taps', () => {
        const [p0, p1] = pages;
        for (const o of ORDERS.slice(0, 60)) {
          const l = kitchenLayout(plan, o.bins);
          for (const r of targets(l)) {
            const p = pageOf(plan, r.y + r.h / 2) === 0 ? p0 : p1;
            expect(r.y >= p.view.y && r.y + r.h <= p.view.y + p.view.h, JSON.stringify(r)).toBe(true);
            expect(overlap(r, p.tab), JSON.stringify(r)).toBe(false);
          }
        }
        for (const p of pages) expect(Math.min(p.tab.w, p.tab.h)).toBeGreaterThanOrEqual(HIT_MIN);
      });
    }
  });
}

describe('MONTAGGIO scale', () => {
  it('the tallest burgers (BIG, DOUBLE TRIPLE, PANCETTA) close at full size, a pile of wrong layers shrinks into the room', () => {
    for (const id of ['big', 'doubleTriple', 'pancetta'] as const) expect(stackScale(burger(id).ingredients), id).toBe(MONTAGGIO.scale);
    const pile = Array<'polloPastellato'>(KITCHEN_STACK.maxLayers).fill('polloPastellato');
    expect(stackScale(pile)).toBeGreaterThan(0);
    expect(stackScale(pile)).toBeLessThan(MONTAGGIO.scale);
  });
});

describe('labels', () => {
  it('every pan, bottle and drink label fits its place in at most two lines and can be drawn', () => {
    const lines = [...INGREDIENTS.map((i) => binLines(i)), ...SIDES.map((s) => binLines(s)), binLines('bun'), ...DRINKS.map(drinkLines)];
    for (const l of lines) {
      expect(l.length).toBeGreaterThan(0);
      expect(l.length).toBeLessThanOrEqual(2);
      for (const line of l) {
        expect(canDraw(line), line).toBe(true);
        expect(lineWidth(line), line).toBeLessThanOrEqual(LABEL.maxW);
      }
    }
  });

  it('floating texts can be drawn', () => {
    const texts = [plusEuro(1490), tipLine(50), plusEuro(1690), BANNER.perfect, BANNER.burnt, '+12345', '123,40 €'];
    for (const t of texts) expect(canDraw(t.toUpperCase()), t).toBe(true);
  });

  it('station cues fit their slot / basket', () => {
    const Q = KITCHEN_FX.cue;
    for (const t of [Q.flip, Q.take, Q.lift, Q.burning]) {
      expect(canDraw(t), t).toBe(true);
      expect(Math.max(Q.w, lineWidth(t) + 2) * Q.scale, t).toBeLessThanOrEqual(36);
    }
  });
});
