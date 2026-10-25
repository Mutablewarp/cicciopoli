import { describe, expect, it } from 'vitest';
import { IMAGE_SPEC, KITCHEN, SHEET_SPEC } from '../../art/kitchen/keys';
import { COUNTER_VIEW, DRINK, KITCHEN_VIEW, LABEL } from './config';
import { binLines, drinkLines, lineWidth } from './labels';
import { bubbleCss, bubbleTop, roomPlace } from './counterFrame';
import { computeFraming, kitchenLayout, pageOf, toCss, toWorld, type FramingInput, type KitchenFraming, type KitchenLayout, type Rect } from './layout';
import { buildDeck } from './logic/deck';

/** The six screens the owner checks, with the insets the HUD publishes there (measured in the game). */
const SCREENS: readonly (FramingInput & { name: string })[] = [
  { name: '390x844', cssW: 390, cssH: 774, dpr: 3, insetTop: 224, insetBottom: 122 },
  { name: '360x640', cssW: 360, cssH: 570, dpr: 3, insetTop: 163, insetBottom: 122 },
  { name: '320x568', cssW: 320, cssH: 498, dpr: 2, insetTop: 141, insetBottom: 122 },
  { name: '844x390', cssW: 844, cssH: 390, dpr: 3, insetTop: 52, insetBottom: 0, insetLeft: 295 },
  { name: '667x375', cssW: 667, cssH: 375, dpr: 2, insetTop: 52, insetBottom: 0, insetLeft: 233 },
  { name: '1280x720', cssW: 1280, cssH: 720, dpr: 1, insetTop: 64, insetBottom: 0, insetLeft: 420 },
];
const ORDERS = Array.from({ length: 40 }, (_, s) => [...buildDeck(s * 7919 + 1), ...buildDeck(s * 104729 + 7, false)]).flat();
const EPS = 1e-6;

/** label tape extents (pixel font x LABEL.scale, 1 px of tape round the text), world px */
const tape = (at: { x: number; y: number }, lines: readonly string[]): Rect => {
  const w = (Math.max(...lines.map(lineWidth)) + 2) * LABEL.scale;
  return { x: at.x - w / 2, y: at.y, w, h: (lines.length * 6 + 1) * LABEL.scale };
};

/** every tap target of a kitchen (the burger's tap area apart: it is the board) */
const targets = (l: KitchenLayout): Rect[] => [
  ...l.slotHit, ...l.basketHit, ...l.bins.map((b) => b.hit), ...l.drinks.map((d) => d.hit), l.trayHit.cone, l.trayHit.side, l.trayHit.drink,
];
const labels = (l: KitchenLayout): Rect[] => [...l.bins.map((b) => tape(b.label, binLines(b.id))), ...l.drinks.map((d) => tape(d.label, drinkLines(d.id)))];

/** A world rect on the screen with page `p` shown, CSS px of the game host. */
function css(f: KitchenFraming, r: Rect, p: number): Rect {
  const a = toCss(f, r.x, r.y - f.pages[p]);
  const b = toCss(f, r.x + r.w, r.y + r.h - f.pages[p]);
  return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
}
const inFree = (v: FramingInput, r: Rect): boolean =>
  r.x >= (v.insetLeft ?? 0) - EPS && r.y >= v.insetTop - EPS && r.x + r.w <= v.cssW + EPS && r.y + r.h <= v.cssH - v.insetBottom + EPS;

describe('kitchen framing on the owner\'s screens', () => {
  it('one screen when it fits with every tap >= 44 CSS px, else the two pages', () => {
    const mode = (v: FramingInput): string => {
      const f = computeFraming(v);
      return `${f.orient}${f.pages.length > 1 ? '-paged' : ''}`;
    };
    expect(SCREENS.map((v) => `${v.name}:${mode(v)}`)).toEqual([
      '390x844:portrait', '360x640:portrait-paged', '320x568:portrait-paged', '844x390:landscape', '667x375:landscape', '1280x720:landscape',
    ]);
  });

  for (const v of SCREENS) {
    it(`${v.name}: every target and its label inside the free area (on its page), every tap >= 44 CSS px`, () => {
      const f = computeFraming(v);
      const tabs = f.plan.pages && f.pages.length > 1 ? f.plan.pages.map((p) => p.tab) : [];
      tabs.forEach((t, p) => {
        const c = css(f, t, p);
        expect(inFree(v, c), `tab ${p}`).toBe(true);
        expect(Math.min(c.w, c.h)).toBeGreaterThanOrEqual(44 - EPS);
      });
      for (const o of ORDERS) {
        const l = kitchenLayout(f.plan, o.bins);
        const page = (y: number): number => (f.pages.length > 1 ? pageOf(f.plan, y) : 0);
        for (const r of targets(l)) {
          const c = css(f, r, page(r.y + r.h / 2));
          expect(inFree(v, c), `${JSON.stringify(r)}`).toBe(true);
          expect(Math.min(c.w, c.h), JSON.stringify(r)).toBeGreaterThanOrEqual(44 - EPS);
        }
        for (const [i, r] of labels(l).entries()) expect(inFree(v, css(f, r, page(r.y))), `label ${i} ${o.burger}`).toBe(true);
      }
    });
  }

  it('the plan fills its free area (no big empty band): its long side takes >= 90% of the room', () => {
    for (const v of SCREENS) {
      const f = computeFraming(v);
      const box = f.pages.length > 1 && f.plan.pages ? f.plan.pages[0].view : { x: 0, y: 0, ...f.plan.size };
      const c = css(f, box, 0);
      const fillW = c.w / (v.cssW - (v.insetLeft ?? 0));
      const fillH = c.h / (v.cssH - v.insetTop - v.insetBottom);
      expect(Math.max(fillW, fillH), v.name).toBeGreaterThan(0.9);
    }
  });

  it('a paged kitchen: page 1 is the COTTURA half (griddle, fryer, drinks, tray), page 0 MONTAGGIO (board, sauces, CHIUDI)', () => {
    const f = computeFraming(SCREENS[1]);
    const l = kitchenLayout(f.plan, ORDERS[5].bins);
    for (const r of [...l.slotHit, ...l.basketHit, ...l.drinks.map((d) => d.hit), l.trayHit.cone]) expect(pageOf(f.plan, r.y)).toBe(1);
    for (const b of l.bins.filter((x) => x.kind !== 'pan')) expect(pageOf(f.plan, b.hit.y)).toBe(0);
    expect(pageOf(f.plan, l.stackBase.y)).toBe(0);
    expect(f.pages[1]).toBeGreaterThan(0);
  });

  it('toWorld and toCss are inverse', () => {
    const f = computeFraming(SCREENS[1]);
    const w = toWorld(f, 123, 321);
    const c = toCss(f, w.x, w.y);
    expect(c.x).toBeCloseTo(123);
    expect(c.y).toBeCloseTo(321);
  });
});

describe('the BANCONE', () => {
  const NEON_H = SHEET_SPEC[KITCHEN.neon][1];
  const RISE = SHEET_SPEC[KITCHEN.customer][1] - COUNTER_VIEW.customerSink - COUNTER_VIEW.headTopPx;
  const S = COUNTER_VIEW.signs;
  for (const v of SCREENS) {
    it(`${v.name}: the counter on the bottom of the free area, the room over the screen, the neon and the bubble's room over the head`, () => {
      const f = computeFraming(v);
      const c = f.counter;
      const perPx = c.zoom / c.dpr;
      const cssY = (y: number): number => toCss(f, 0, y * c.scale).y;
      const s = c.stage;
      const top = s.y + s.h - COUNTER_VIEW.topH;
      const bottom = v.cssH - v.insetBottom;
      if (c.orient === 'portrait') {
        expect(cssY(s.y + s.h), v.name).toBeLessThanOrEqual(bottom + EPS);
        expect(cssY(s.y + s.h), v.name).toBeGreaterThan(bottom - perPx - EPS);
      } else {
        // a short screen sinks the counter top's last rows, never more than it keeps
        expect(cssY(s.y + s.h), v.name).toBeGreaterThan(bottom - perPx - EPS);
        expect(cssY(top), v.name).toBeLessThanOrEqual(bottom - COUNTER_VIEW.minTopPx * perPx + EPS);
      }
      // the customer's head leaves the bubble's room under the ticket / HUD, and the neon's over it
      const head = cssY(top - RISE);
      const neon = (NEON_H + 2 * S.gapPx) * perPx;
      expect(head - bubbleCss(v.cssW) - neon, v.name).toBeGreaterThanOrEqual(v.insetTop - perPx - EPS);
      // the neon at 1x hangs over the bubble's room (the UI keeps the bubble under its middle)
      expect(c.free.y + S.gapPx + NEON_H, v.name).toBeLessThanOrEqual(bubbleTop(c, top - RISE) + EPS);
      // the stage's customer and tray are inside the free width
      const mid = toCss(f, (s.x + s.w / 2) * c.scale, 0).x;
      expect(mid - 60 * perPx, v.name).toBeGreaterThanOrEqual((v.insetLeft ?? 0) - EPS);
      expect(mid + 60 * perPx, v.name).toBeLessThanOrEqual(v.cssW + EPS);
    });
  }

  it('portrait: the room art covers the whole screen (shake pad included) down to the stage\'s bottom, never smaller than the counter', () => {
    const custH = SHEET_SPEC[KITCHEN.customer][1];
    for (const v of SCREENS) {
      const c = computeFraming(v).counter;
      if (c.orient !== 'portrait') continue;
      const [w, h] = IMAGE_SPEC[KITCHEN.roomTall];
      const s = c.stage;
      const head = s.y + s.h - COUNTER_VIEW.topH + COUNTER_VIEW.customerSink - custH + COUNTER_VIEW.headTopPx;
      const r = roomPlace(c, w, h, head);
      const pad = KITCHEN_VIEW.pad - 1;
      expect(r.scale, v.name).toBeGreaterThanOrEqual(1);
      expect(r.x, v.name).toBeLessThanOrEqual(c.view.x - pad);
      expect(r.y, v.name).toBeLessThanOrEqual(c.view.y - pad);
      expect(r.x + w * r.scale, v.name).toBeGreaterThanOrEqual(c.view.x + c.view.w + pad);
      expect(r.y + h * r.scale, v.name).toBeGreaterThanOrEqual(s.y + s.h - 1);
    }
  });

  it('landscape: the room art at the customer\'s pixel size across the free area, down to the counter top, its wall for the disc over the bubble\'s room', () => {
    const [w, h] = IMAGE_SPEC[KITCHEN.roomWide];
    let n = 0;
    for (const v of SCREENS) {
      const c = computeFraming(v).counter;
      if (c.orient !== 'landscape') continue;
      n++;
      const s = c.stage;
      const top = s.y + s.h - COUNTER_VIEW.topH;
      const head = top - RISE;
      const r = roomPlace(c, w, h, head);
      expect(r.scale, v.name).toBe(1);
      expect(r.x, v.name).toBeLessThanOrEqual(c.free.x);
      expect(r.x + w, v.name).toBeGreaterThanOrEqual(c.view.x + c.view.w + KITCHEN_VIEW.pad - 1);
      expect(r.y + h, v.name).toBeGreaterThanOrEqual(top);
      expect(r.y + S.wallTop + 2 * S.wall.landscape.r + S.gapPx, v.name).toBeLessThanOrEqual(bubbleTop(c, head) + 1);
      // never lower than the art frames the stage: the customer's head no higher up the room than drawn for
      expect(r.y, v.name).toBeLessThanOrEqual(s.y + (s.h - h) / 2 + 1);
    }
    expect(n).toBeGreaterThan(0);
  });

  it('the free area of the counter frame is the HUD-free area, counter px', () => {
    const v = SCREENS[3];
    const f = computeFraming(v);
    const fr = f.counter.free;
    const a = toCss(f, fr.x * f.counter.scale, fr.y * f.counter.scale);
    expect(a.x).toBeCloseTo(v.insetLeft ?? 0);
    expect(a.y).toBeCloseTo(v.insetTop);
  });
});

describe('drinks', () => {
  it('two drinks of a rack: their places side by side, their labels never touch', () => {
    expect(DRINK.at[1] - DRINK.at[0]).toBeGreaterThanOrEqual((LABEL.maxW + 2) * LABEL.scale);
  });
});
