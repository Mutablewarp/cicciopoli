import { describe, expect, it } from 'vitest';
import { BIN, DRINKS, FRY_ITEMS, GRIDDLE, GRIDDLE_ITEMS, INGREDIENTS, LAYER_H, PAPER, SAUCES, SIDES, TRAY } from '../../art/kitchen/keys';
import { KITCHEN_DECK, KITCHEN_STACK } from '../../config/kitchen';
import { BURGERS, burger } from '../../config/kitchenMenu';
import { KITCHEN_FX, KITCHEN_VIEW, LABEL } from './config';
import { inRect, type Rect } from './framing';
import { binLines, canDraw, drinkLines, lineWidth } from './labels';
import { destination, FRILLS, hitKitchen, kitchenLayout, stackScale, TAPE_H2, targetRect, type KitchenLayout } from './layout';
import { buildDeck } from './logic/deck';
import { binLabel } from './logic/order';
import type { KitchenBins } from './logic/types';
import { BANNER, plusEuro, tipLine } from './logic/strings';
import { KITCHEN_PLANS, pageOfX } from './plan';

const overlap = (a: Rect, b: Rect): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
/** the overlapping pairs of a set of rects (one expect per set: thousands of orders stay fast) */
const overlaps = (rs: readonly Rect[]): string[] => rs.flatMap((a, i) => rs.slice(i + 1).filter((b) => overlap(a, b)).map((b) => JSON.stringify([a, b])));
const inside = (r: Rect, box: Rect, eps = 1e-6): boolean => r.x >= box.x - eps && r.y >= box.y - eps && r.x + r.w <= box.x + box.w + eps && r.y + r.h <= box.y + box.h + eps;
const ORDERS = Array.from({ length: 60 }, (_, s) => [...buildDeck(s * 7919 + 1), ...buildDeck(s * 104729 + 7, false)]).flat();
const COOKED = new Set<string>([...GRIDDLE_ITEMS, ...FRY_ITEMS]);
const shownBy = (b: KitchenBins): string[] => [...b.griddle, ...b.fryer, ...b.cold, ...b.sauces];
/** every tap target of a kitchen, with the page it must be on (the burger's tap area apart: it is the board) */
const targets = (l: KitchenLayout): { r: Rect; page: 0 | 1 }[] => [
  ...[...l.slotHit, ...l.basketHit, ...l.drinks.map((d) => d.hit)].map((r) => ({ r, page: 1 as const })),
  ...l.bins.map((b) => ({ r: b.hit, page: (b.kind === 'pan' && COOKED.has(b.id) ? 1 : 0) as 0 | 1 })),
  ...[l.trayHit.cone, l.trayHit.side, l.trayHit.drink].map((r) => ({ r, page: 0 as const })),
];
/** a label tape (pixel font at its scale, 1 px of tape round the text), world px */
const tape = (at: { x: number; y: number }, lines: readonly string[], k: number): Rect => {
  const w = (Math.max(...lines.map(lineWidth)) + 2) * k;
  return { x: at.x - w / 2, y: at.y, w, h: (lines.length * LABEL.lineH + 1) * k };
};
const tapes = (l: KitchenLayout): Rect[] => [
  ...l.bins.map((b) => tape(b.label, binLines(b.id), b.art.label)),
  ...l.drinks.map((d) => tape(d.label, drinkLines(d.id), d.art.label)),
];

for (const plan of KITCHEN_PLANS) {
  const [M, C] = plan.pages;
  describe(`${plan.name} plan`, () => {
    it('every order fits: its pans, bottles, CHIUDI and drinks have a place; no two taps, labels or pans overlap; every tap >= its page\'s hit', () => {
      for (const o of ORDERS) {
        const l = kitchenLayout(plan, o.bins);
        for (const id of shownBy(o.bins)) expect(l.bins.some((b) => b.id === id), `${plan.name} ${id}`).toBe(true);
        const pans = l.bins.filter((b) => b.kind === 'pan');
        expect(pans.length).toBe(plan.griddleRail.length + plan.fryRail.length + plan.coldRail.length + plan.sauces.length - o.bins.sauces.length);
        expect(l.bins.filter((b) => b.kind === 'bottle').map((b) => b.id)).toEqual(o.bins.sauces);
        expect(l.drinks.map((d) => d.id)).toEqual(o.bins.drinks);
        const all = targets(l).map((t) => t.r);
        expect(overlaps(all)).toEqual([]);
        for (const t of targets(l)) expect(Math.min(t.r.w, t.r.h), JSON.stringify(t)).toBeGreaterThanOrEqual(plan.pages[t.page].hit - 1e-6);
        expect(overlaps(tapes(l))).toEqual([]);
        expect(overlaps(l.bins.map((b) => ({ x: b.x, y: b.y, w: BIN.w * b.art.pan, h: BIN.h * b.art.pan })))).toEqual([]);
      }
    });

    it('MONTAGGIO: at most 8 pans and the order\'s sauces (at most one decoy bottle); every free pan place holds a decoy it does not show, never twice; no locked or empty pan', () => {
      expect(plan.coldRail.length).toBeLessThanOrEqual(8);
      expect(plan.coldRail.length).toBeGreaterThanOrEqual(KITCHEN_DECK.maxBins);
      expect(plan.sauces.length).toBe(KITCHEN_DECK.maxSauces);
      const cookSide = new Set([...plan.griddleRail, ...plan.fryRail].map((c) => `${c.x},${c.y}`));
      for (const o of ORDERS) {
        const l = kitchenLayout(plan, o.bins);
        const shown = new Set(shownBy(o.bins));
        const ids = l.bins.map((b) => b.id);
        expect(new Set(ids).size).toBe(ids.length);
        // every place holds a real, labelled, tappable thing: the order's, a decoy (a cold pan in a free bottle place) or CHIUDI
        const cold = l.bins.filter((b) => b.kind !== 'bottle' && pageOfX(plan, b.hit.x) === 0);
        expect(cold.length + l.bins.filter((b) => b.kind === 'bottle').length).toBe(plan.coldRail.length + plan.sauces.length + 1);
        expect(cold.length).toBeLessThanOrEqual(8);
        for (const b of l.bins.filter((x) => x.id !== 'bun' && !shown.has(x.id))) {
          expect(b.kind, b.id).toBe('pan');
          expect(COOKED.has(b.id), b.id).toBe(cookSide.has(`${b.hit.x},${b.hit.y}`));
        }
      }
    });

    it('griddle pans take the griddle\'s places, fryer pans the fryer\'s, before the other station\'s', () => {
      const at = (cells: readonly Rect[]): Set<string> => new Set(cells.map((c) => `${c.x},${c.y}`));
      const [g, f] = [at(plan.griddleRail), at(plan.fryRail)];
      for (const o of ORDERS) {
        const l = kitchenLayout(plan, o.bins);
        const on = (ids: readonly string[], rail: Set<string>): number => l.bins.filter((b) => ids.includes(b.id) && rail.has(`${b.hit.x},${b.hit.y}`)).length;
        expect(on(o.bins.griddle, g)).toBe(Math.min(o.bins.griddle.length, g.size));
        expect(on(o.bins.fryer, f)).toBe(Math.min(o.bins.fryer.length, f.size));
      }
    });

    it('pages: COTTURA (stations, raw pans, racks) right of MONTAGGIO (board, cold pans, sauces, CHIUDI, tray, trash), each target inside its page and clear of its tab', () => {
      expect(M.view.x + M.view.w).toBeLessThan(C.view.x);
      expect(M.view.y + M.view.h / 2).toBeCloseTo(C.view.y + C.view.h / 2);
      for (const o of ORDERS.slice(0, 80)) {
        const l = kitchenLayout(plan, o.bins);
        for (const t of targets(l)) {
          const p = plan.pages[t.page];
          expect(pageOfX(plan, t.r.x + t.r.w / 2), JSON.stringify(t)).toBe(t.page);
          expect(inside(t.r, p.view), JSON.stringify(t)).toBe(true);
          expect(overlap(t.r, p.tab), JSON.stringify(t)).toBe(false);
        }
        for (const [i, r] of tapes(l).entries()) expect(inside(r, plan.pages[pageOfX(plan, r.x + r.w / 2)].view), `tape ${i}`).toBe(true);
        expect(inside(l.board, M.view)).toBe(true);
        expect(inside({ ...l.tray, w: TRAY.w * l.art.tray, h: TRAY.h * l.art.tray }, M.view)).toBe(true);
      }
      for (const p of plan.pages) {
        expect(inside(p.tab, p.view)).toBe(true);
        expect(Math.min(p.tab.w, p.tab.h)).toBeGreaterThanOrEqual(p.hit);
      }
    });

    it('each page\'s hit is its smallest tap side, and the labels fit their places', () => {
      const l = kitchenLayout(plan, ORDERS[9].bins);
      for (const page of [0, 1] as const) {
        const sides = targets(l).filter((t) => t.page === page).map((t) => Math.min(t.r.w, t.r.h));
        expect(Math.min(...sides, plan.pages[page].tab.w, plan.pages[page].tab.h)).toBeCloseTo(plan.pages[page].hit, 5);
      }
      // the widest label line (LABEL.maxW font px) fits a place's width
      for (const b of l.bins) expect((LABEL.maxW + 2) * b.art.label, b.id).toBeLessThanOrEqual(b.hit.w + 1e-6);
      for (const b of l.bins) expect(b.label.y + TAPE_H2 * b.art.label, b.id).toBeLessThanOrEqual(b.hit.y + b.hit.h + 1e-6);
    });

    it('taps land on what is drawn there; a picked-up source has somewhere to go on its own page (a drink: the tray, by tap)', () => {
      const l = kitchenLayout(plan, ORDERS[7].bins);
      const centre = (r: Rect): [number, number] => [r.x + r.w / 2, r.y + r.h / 2];
      l.slotHit.forEach((r, slot) => expect(hitKitchen(l, ...centre(r), null)).toEqual({ kind: 'griddle', slot }));
      l.basketHit.forEach((r, basket) => expect(hitKitchen(l, ...centre(r), null)).toEqual({ kind: 'fryer', basket }));
      expect(l.slotHit.reduce((a, r) => a + r.w, 0)).toBe(GRIDDLE.w);
      for (const b of l.bins) {
        const t = b.id === 'bun' ? ({ kind: 'bun' } as const) : ({ kind: 'bin', id: b.id } as const);
        expect(hitKitchen(l, ...centre(b.hit), null)).toEqual(t);
        const to = destination(l, t);
        expect(to, b.id).not.toBeNull();
        if (to) expect(pageOfX(plan, to.x + to.w / 2), b.id).toBe(pageOfX(plan, b.hit.x));
      }
      for (const d of l.drinks) {
        expect(hitKitchen(l, ...centre(d.hit), null)).toEqual({ kind: 'drink', id: d.id });
        expect(inRect(d.hit, d.at.x, d.at.y - 4)).toBe(true);
      }
      expect(hitKitchen(l, l.stackBase.x, l.stackBase.y - 4, l.stackBase.y - 20)).toEqual({ kind: 'stackTop' });
      expect(hitKitchen(l, l.stackBase.x, l.stackBase.y - 4, null)).toBeNull();
      // the burger's tap area: never thinner than the page's hit, even a bare bun
      const bare = targetRect(l, { kind: 'stackTop' }, l.stackBase.y - LAYER_H.bunBottom * plan.art.stack);
      expect(Math.min(bare?.w ?? 0, bare?.h ?? 0)).toBeGreaterThanOrEqual(M.hit - 1e-6);
      for (const p of ['cone', 'side', 'drink'] as const) expect(inRect(l.trayHit[p], l.trayAt[p].x, l.trayAt[p].y - 4), p).toBe(true);
    });

    it('the board: the burger centred on it, its room inside it, the paper and the tray clear of every tap target', () => {
      const a = plan.art;
      for (const o of ORDERS.slice(0, 60)) {
        const l = kitchenLayout(plan, o.bins);
        const b = l.stackBase;
        const room: Rect = { x: b.x - 24 * a.stack, y: b.y - plan.room, w: 48 * a.stack, h: plan.room };
        const paper: Rect = { x: l.paper.x, y: l.paper.y, w: PAPER.w * a.paper, h: PAPER.h * a.paper };
        const tray: Rect = { x: l.tray.x, y: l.tray.y, w: TRAY.w * a.tray, h: TRAY.h * a.tray };
        expect(Math.abs(b.x - (l.board.x + l.board.w / 2))).toBeLessThanOrEqual(2);
        expect(inside(room, l.board)).toBe(true);
        expect(inside(paper, l.board)).toBe(true);
        expect(overlap(paper, tray)).toBe(false);
        const others = [...l.slotHit, ...l.basketHit, ...l.bins.map((x) => x.hit), ...l.drinks.map((d) => d.hit)];
        for (const zone of [room, paper, tray]) for (const r of others) expect(overlap(zone, r), JSON.stringify([zone, r])).toBe(false);
      }
    });

    it('the plan has a place for the most pans an order shows', () => {
      expect(plan.griddleRail.length + plan.fryRail.length).toBeGreaterThanOrEqual(KITCHEN_DECK.maxCook);
      expect(kitchenLayout(plan, ORDERS[0].bins).shelves.length * 2).toBeGreaterThanOrEqual(KITCHEN_DECK.drinkSlots);
      expect(plan.drinks.length).toBe(KITCHEN_DECK.drinkSlots);
    });
  });
}

describe('the burger on the board', () => {
  it('KITCHEN_VIEW.tallestBurger is the tallest closed burger of the menu', () => {
    const h = (id: (typeof BURGERS)[number]['id']): number => LAYER_H.bunBottom + LAYER_H.bunTop + FRILLS + burger(id).ingredients.reduce((a, k) => a + LAYER_H[k], 0);
    expect(Math.max(...BURGERS.map((b) => h(b.id)))).toBe(KITCHEN_VIEW.tallestBurger);
  });

  it('a pile of wrong layers shrinks into the room, never to nothing', () => {
    for (const plan of KITCHEN_PLANS) {
      const pile = Array<'polloPastellato'>(KITCHEN_STACK.maxLayers).fill('polloPastellato');
      expect(stackScale(pile, plan.art, plan.room)).toBeGreaterThan(0);
      expect(stackScale(pile, plan.art, plan.room)).toBeLessThan(plan.art.stack);
      expect(stackScale(burger('hamburger').ingredients, plan.art, plan.room) * 4 % 1).toBe(0);
    }
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
    expect([...SAUCES].every((s) => binLines(s).length === 1)).toBe(true);
  });

  it('pan labels read the ticket\'s words (a long word broken at a syllable), only CIPOLLA CARAMELLATA and GREEN NUGGETS VEGGIE cut', () => {
    const cut = ['cipollaCaramellata', 'greenNuggets'];
    for (const id of [...INGREDIENTS, ...SIDES].filter((x) => !cut.includes(x))) {
      expect(binLines(id).join(' ').replace(/- /g, ''), id).toBe(binLabel(id).replace(/^SALSA /, ''));
    }
  });

  it('floating texts can be drawn', () => {
    const texts = [plusEuro(1490), tipLine(50), plusEuro(1690), BANNER.perfect, BANNER.burnt, '+12345', '123,40 €'];
    for (const t of texts) expect(canDraw(t.toUpperCase()), t).toBe(true);
  });

  it('station cues fit their slot / basket', () => {
    const Q = KITCHEN_FX.cue;
    const pitch = GRIDDLE.slots[1].x - GRIDDLE.slots[0].x;
    for (const t of [Q.flip, Q.take, Q.lift, Q.burning]) {
      expect(canDraw(t), t).toBe(true);
      expect(Math.max(Q.w, lineWidth(t) + 2) * Q.scale, t).toBeLessThanOrEqual(pitch);
    }
    expect(KITCHEN_FX.bar.w).toBeLessThan(pitch);
  });
});
