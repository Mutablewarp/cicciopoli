import { describe, expect, it } from 'vitest';
import { BIN, GRIDDLE, GRIDDLE_ITEM, IMAGE_SPEC, KITCHEN, SHEET_SPEC } from '../../art/kitchen/keys';
import { FONT_H } from '../../art/rush/font';
import { burger } from '../../config/kitchenMenu';
import { COUNTER_VIEW, KITCHEN_VIEW, LABEL } from './config';
import { bubbleCss, bubbleTop, roomPlace } from './counterFrame';
import { computeFraming, kitchenOffset, lerpRect, pageToCss, pageToWorld, toCss, toWorld, type FramingInput, type KitchenFraming, type Rect } from './framing';
import { binLines, drinkLines, lineWidth } from './labels';
import { kitchenLayout, stackScale, type KitchenLayout } from './layout';
import { buildDeck } from './logic/deck';
import { pageOfX } from './plan';

/**
 * The owner's screens, with the insets the HUD publishes there while an order is cooked (measured in the game,
 * 2026-10-25: portrait = HUD bar 70 px over the host, the ticket on top, the action button under; landscape = the
 * ticket column <= 30% on the left). 390x664 = an iPhone 13 in Safari (the browser's bars take the rest).
 */
const SCREENS: readonly (FramingInput & { name: string })[] = [
  { name: '360x640', cssW: 360, cssH: 570, dpr: 3, insetTop: 141, insetBottom: 78 },
  { name: '375x667', cssW: 375, cssH: 597, dpr: 2, insetTop: 148, insetBottom: 78 },
  { name: '390x664', cssW: 390, cssH: 594, dpr: 3, insetTop: 147, insetBottom: 78 },
  { name: '390x844', cssW: 390, cssH: 774, dpr: 3, insetTop: 194, insetBottom: 78 },
  { name: '430x932', cssW: 430, cssH: 862, dpr: 3, insetTop: 216, insetBottom: 78 },
  { name: '667x375', cssW: 667, cssH: 375, dpr: 2, insetTop: 52, insetBottom: 0, insetLeft: 201 },
  { name: '750x342', cssW: 750, cssH: 342, dpr: 3, insetTop: 52, insetBottom: 0, insetLeft: 225 },
  { name: '844x390', cssW: 844, cssH: 390, dpr: 3, insetTop: 52, insetBottom: 0, insetLeft: 254 },
  { name: '932x430', cssW: 932, cssH: 430, dpr: 3, insetTop: 52, insetBottom: 0, insetLeft: 268 },
  { name: '1280x720', cssW: 1280, cssH: 720, dpr: 1, insetTop: 64, insetBottom: 0, insetLeft: 268 },
];
const ORDERS = Array.from({ length: 30 }, (_, s) => [...buildDeck(s * 7919 + 1), ...buildDeck(s * 104729 + 7, false)]).flat();
const EPS = 1e-6;

/** label tape extents (pixel font at its scale, 1 px of tape round the text), world px */
const tape = (at: { x: number; y: number }, lines: readonly string[], k: number): Rect => {
  const w = (Math.max(...lines.map(lineWidth)) + 2) * k;
  return { x: at.x - w / 2, y: at.y, w, h: (lines.length * LABEL.lineH + 1) * k };
};
/** every tap target of a kitchen (the burger's tap area apart: it is the board) */
const targets = (l: KitchenLayout): Rect[] => [
  ...l.slotHit, ...l.basketHit, ...l.bins.map((b) => b.hit), ...l.drinks.map((d) => d.hit), l.trayHit.cone, l.trayHit.side, l.trayHit.drink,
];
const labels = (l: KitchenLayout): Rect[] => [...l.bins.map((b) => tape(b.label, binLines(b.id), b.art.label)), ...l.drinks.map((d) => tape(d.label, drinkLines(d.id), d.art.label))];

/** A kitchen rect on the screen with page `p` shown (or the whole plan), CSS px of the game host. */
function css(f: KitchenFraming, r: Rect, p: number): Rect {
  const a = pageToCss(f, p, r.x, r.y);
  const b = pageToCss(f, p, r.x + r.w, r.y + r.h);
  return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
}
const inFree = (v: FramingInput, r: Rect): boolean =>
  r.x >= (v.insetLeft ?? 0) - EPS && r.y >= v.insetTop - EPS && r.x + r.w <= v.cssW + EPS && r.y + r.h <= v.cssH - v.insetBottom + EPS;
/** the page a kitchen x is shown on */
const pageAt = (f: KitchenFraming, x: number): number => (f.pages.length > 1 ? pageOfX(f.plan, x) : 0);
/** CSS px per world px of the page holding kitchen x */
const kOf = (f: KitchenFraming, x: number): number => f.pages[pageAt(f, x)].zoom / f.dpr;

describe('kitchen framing on the owner\'s screens', () => {
  it('phones get one station per screen (two pages), a big desktop both side by side', () => {
    for (const v of SCREENS) expect(computeFraming(v).pages.length, v.name).toBe(v.cssW >= 1280 ? 1 : 2);
  });

  for (const v of SCREENS) {
    it(`${v.name}: every target and its label inside the free area of its page, every tap >= ${KITCHEN_VIEW.tapCss} CSS px`, () => {
      const f = computeFraming(v);
      if (f.pages.length > 1) {
        f.plan.pages.forEach((p, i) => {
          const c = css(f, p.tab, i);
          expect(inFree(v, c), `tab ${i}`).toBe(true);
          expect(Math.min(c.w, c.h), `tab ${i}`).toBeGreaterThanOrEqual(KITCHEN_VIEW.tapCss - EPS);
        });
      }
      for (const o of ORDERS) {
        const l = kitchenLayout(f.plan, o.bins);
        for (const r of targets(l)) {
          const c = css(f, r, pageAt(f, r.x + r.w / 2));
          expect(inFree(v, c), `${v.name} ${JSON.stringify(r)}`).toBe(true);
          expect(Math.min(c.w, c.h), JSON.stringify(r)).toBeGreaterThanOrEqual(KITCHEN_VIEW.tapCss - EPS);
        }
        for (const [i, r] of labels(l).entries()) expect(inFree(v, css(f, r, pageAt(f, r.x + r.w / 2))), `label ${i} ${o.burger}`).toBe(true);
      }
    });
  }

  /** the v7 sizes on screen (CSS px): label letters, pans, the burger (hamburger and the tallest), the griddle's share of a portrait screen, a patty */
  const sizes = (v: FramingInput): { label: number; pan: number; burger: number; big: number; griddle: number; patty: number } => {
    const f = computeFraming(v);
    const l = kitchenLayout(f.plan, ORDERS[11].bins);
    const kM = kOf(f, l.stackBase.x);
    const kC = kOf(f, l.griddle.x);
    const wide = (id: 'hamburger' | 'big'): number => 44 * stackScale(burger(id).ingredients, f.plan.art, f.plan.room) * kM;
    return {
      label: Math.min(...l.bins.map((b) => FONT_H * b.art.label * kOf(f, b.hit.x)), ...l.drinks.map((d) => FONT_H * d.art.label * kC)),
      pan: Math.min(...l.bins.map((b) => BIN.w * b.art.pan * kOf(f, b.hit.x))),
      burger: wide('hamburger'),
      big: wide('big'),
      griddle: (GRIDDLE.w * kC) / (v.cssW - (v.insetLeft ?? 0)),
      patty: GRIDDLE_ITEM.w * kC,
    };
  };

  it('v7 sizes, the owner\'s iPhone 13 in Safari (390x664, 750x342) included: letters >= 11, pans >= 72, the burger >= 150 CSS px; a patty >= 64; a portrait griddle >= 80% wide where the screen has the room', () => {
    const at = (name: string): ReturnType<typeof sizes> => sizes(SCREENS.find((x) => x.name === name) ?? SCREENS[0]);
    for (const name of ['375x667', '390x664', '390x844', '430x932', '667x375', '750x342', '844x390', '932x430']) {
      const s = at(name);
      expect(s.label, name).toBeGreaterThanOrEqual(11 - EPS);
      expect(s.pan, name).toBeGreaterThanOrEqual(72 - EPS);
      expect(s.burger, name).toBeGreaterThanOrEqual(150 - EPS);
    }
    for (const name of ['390x664', '390x844', '430x932', '844x390', '932x430']) expect(at(name).patty, name).toBeGreaterThanOrEqual(64 - EPS);
    for (const name of ['844x390', '932x430']) expect(at(name).big, name).toBeGreaterThanOrEqual(150 - EPS);
    for (const name of ['390x844', '430x932']) expect(at(name).griddle, name).toBeGreaterThanOrEqual(0.8 - EPS);
  });

  it('smaller screens: never less than measured (the HUD leaves them 290-371 CSS px of height)', () => {
    for (const v of SCREENS) {
      const s = sizes(v);
      expect(s.label, v.name).toBeGreaterThanOrEqual(10.5);
      expect(s.pan, v.name).toBeGreaterThanOrEqual(70);
      expect(s.burger, v.name).toBeGreaterThanOrEqual(150);
      expect(s.big, v.name).toBeGreaterThanOrEqual(110);
      expect(s.patty, v.name).toBeGreaterThanOrEqual(55);
      if (v.cssH > v.cssW) expect(s.griddle, v.name).toBeGreaterThanOrEqual(0.72);
    }
  });

  it('each page fills its free area (no big empty band): its long side takes >= 90% of the room', () => {
    for (const v of SCREENS) {
      const f = computeFraming(v);
      const boxes = f.pages.length > 1 ? f.plan.pages.map((p) => p.view) : [];
      boxes.forEach((b, i) => {
        const c = css(f, b, i);
        expect(Math.max(c.w / (v.cssW - (v.insetLeft ?? 0)), c.h / (v.cssH - v.insetTop - v.insetBottom)), `${v.name} page ${i}`).toBeGreaterThan(0.9);
      });
    }
  });

  it('every frame of a glide (counter -> page, page -> page) is covered by the counter\'s room or the kitchen\'s worktop', () => {
    const pad = KITCHEN_VIEW.pad - EPS;
    for (const v of SCREENS) {
      const f = computeFraming(v);
      const off = kitchenOffset(f);
      const counter = { x: f.view.x - pad, y: f.view.y - pad, w: f.view.w + 2 * pad, h: f.view.h + 2 * pad };
      const work = { x: f.backdrop.x + off - pad, y: f.backdrop.y - pad, w: f.backdrop.w + 2 * pad, h: f.backdrop.h + 2 * pad };
      const covered = (x: number, y: number): boolean => [counter, work].some((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
      const stops = f.pages.map((p) => ({ ...p.view, x: p.view.x + off }));
      const glides: [Rect, Rect][] = [[f.view, stops[0]], [f.view, stops[stops.length - 1]], [stops[0], stops[stops.length - 1]]];
      for (const [a, b] of glides) {
        for (let u = 0; u <= 1; u += 0.05) {
          const r = lerpRect(a, b, u);
          for (let i = 0; i <= 8; i++) for (let j = 0; j <= 8; j++) expect(covered(r.x + (r.w * i) / 8, r.y + (r.h * j) / 8), `${v.name} u=${u.toFixed(2)}`).toBe(true);
        }
      }
    }
  });

  it('the counter is framed at the smallest page zoom; the pages share their centre\'s height', () => {
    for (const v of SCREENS) {
      const f = computeFraming(v);
      expect(f.zoom).toBeCloseTo(Math.min(...f.pages.map((p) => p.zoom)));
      const cy = f.pages.map((p) => pageToWorld(f, f.pages.indexOf(p), (v.cssW + (v.insetLeft ?? 0)) / 2, (v.insetTop + v.cssH - v.insetBottom) / 2).y);
      for (const y of cy) expect(y).toBeCloseTo(cy[0]);
    }
  });

  it('toWorld / toCss and pageToWorld / pageToCss are inverse', () => {
    const f = computeFraming(SCREENS[1]);
    const w = toWorld(f, 123, 321);
    const c = toCss(f, w.x, w.y);
    expect(c.x).toBeCloseTo(123);
    expect(c.y).toBeCloseTo(321);
    const pw = pageToWorld(f, 1, 77, 222);
    const pc = pageToCss(f, 1, pw.x, pw.y);
    expect(pc.x).toBeCloseTo(77);
    expect(pc.y).toBeCloseTo(222);
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
      // (a screen wider than the art at the customer's size: the room fill of counterDecor goes on past its right edge)
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
