import { describe, expect, it } from 'vitest';
import { ROAD_W } from '../../art/rush/keys';
import { RUSH_ROAD } from '../../config/rush';
import { RUSH_VIEW, TRUCK_LEN } from './config';
import { computeFraming, cover, project, roadCss, screenUp, type FramingInput } from './framing';

const A = RUSH_ROAD.viewAheadPx;
const K = RUSH_VIEW.kerbPx;

/** World y of the truck centre's screen row, and the road's screen span in CSS px. */
function onScreen(v: FramingInput): { ahead: number; behind: number; roadL: number; roadR: number; zoom: number } {
  const f = computeFraming(v);
  const devH = v.cssH * v.dpr;
  const truckDev = (0 - f.top) * f.zoom;
  const roadL = ((0 - f.left) * f.zoom) / v.dpr;
  return { ahead: f.ahead, behind: (devH - truckDev) / f.zoom, roadL, roadR: roadL + (ROAD_W * f.zoom) / v.dpr, zoom: f.zoom };
}

/** Upright layouts (aspect <= RUSH_VIEW.side.aspect). */
const LAYOUTS: Record<string, FramingInput> = {
  portrait: { cssW: 390, cssH: 590, dpr: 3, insetTop: 0, insetBottom: 0 },
  square: { cssW: 700, cssH: 640, dpr: 2, insetTop: 46, insetBottom: 150 },
  narrow: { cssW: 320, cssH: 760, dpr: 2, insetTop: 0, insetBottom: 0 },
  tablet: { cssW: 768, cssH: 1024, dpr: 2, insetTop: 0, insetBottom: 0 },
  desktopTall: { cssW: 800, cssH: 720, dpr: 1, insetTop: 0, insetBottom: 0 },
};

/** Side-view layouts (landscape phones, desktop, landscape tablet). */
const SIDE: Record<string, FramingInput> = {
  landscape: { cssW: 844, cssH: 390, dpr: 3, insetTop: 46, insetBottom: 0, touch: true },
  se: { cssW: 568, cssH: 320, dpr: 2, insetTop: 40, insetBottom: 0, touch: true },
  desktop: { cssW: 1280, cssH: 720, dpr: 1, insetTop: 52, insetBottom: 0 },
  wide: { cssW: 2560, cssH: 1080, dpr: 1, insetTop: 52, insetBottom: 0 },
  tabletWide: { cssW: 1024, cssH: 768, dpr: 2, insetTop: 49, insetBottom: 0, touch: true },
};

describe('rush framing (upright)', () => {
  for (const [name, v] of Object.entries(LAYOUTS)) {
    it(`${name}: ahead within the fair window, whole road + sidewalks visible`, () => {
      expect(computeFraming(v).side).toBe(false);
      const s = onScreen(v);
      expect(s.ahead).toBeGreaterThanOrEqual(A.min - 1e-6);
      expect(s.ahead).toBeLessThanOrEqual(A.max + 1e-6);
      expect(s.roadL).toBeGreaterThanOrEqual(((RUSH_VIEW.minSidePx - 1) * s.zoom) / v.dpr);
      expect(s.roadR).toBeLessThanOrEqual(v.cssW - ((RUSH_VIEW.minSidePx - 1) * s.zoom) / v.dpr);
      expect(s.behind).toBeGreaterThan(RUSH_VIEW.behindPx * 0.5);
    });
  }

  it('near-square landscape: road and kerbs run between the corner controls, down to the bottom', () => {
    const v = LAYOUTS.square;
    const f = computeFraming(v);
    expect(roadCss(f, v.dpr)).toBeLessThanOrEqual(v.cssW - 2 * RUSH_VIEW.cornerReserveCss);
    const s = onScreen(v);
    expect((s.behind * s.zoom) / v.dpr).toBeLessThan(v.insetBottom);
  });

  it('portrait road is big: at least 45% of the screen width', () => {
    const v = LAYOUTS.portrait;
    const s = onScreen(v);
    expect(s.roadR - s.roadL).toBeGreaterThan(v.cssW * 0.45);
  });

  it('desktop 1x keeps an integer zoom only when it costs little', () => {
    expect(computeFraming(LAYOUTS.desktopTall).zoom).toBe(2);
  });

  it('an integer zoom within 1% of the ideal one is taken (ideal 1.994 -> 2)', () => {
    const v: FramingInput = { cssW: 360, cssH: (1.994 * (A.min + RUSH_VIEW.behindPx)) / 2, dpr: 2, insetTop: 0, insetBottom: 0 };
    const s = onScreen(v);
    expect(s.zoom).toBe(2);
    expect(s.ahead).toBeGreaterThanOrEqual(A.min);
    expect(computeFraming({ ...v, cssH: v.cssH * 0.97 }).zoom).not.toBe(2);
  });

  it('bottom inset (portrait controls overlay) lifts the truck above it', () => {
    const v: FramingInput = { cssW: 390, cssH: 700, dpr: 3, insetTop: 0, insetBottom: 150 };
    const s = onScreen(v);
    expect((s.behind * s.zoom) / v.dpr).toBeGreaterThanOrEqual(150 + RUSH_VIEW.behindPx * 0.5);
  });

  it('the upright pose projects like the axis-aligned rect', () => {
    const v = LAYOUTS.portrait;
    const f = computeFraming(v);
    const p = project(f, v.cssW * v.dpr, v.cssH * v.dpr, 0, 0);
    expect(p.x).toBeCloseTo((0 - f.left) * f.zoom);
    expect(p.y).toBeCloseTo((0 - f.top) * f.zoom);
  });
});

describe('rush framing (side view)', () => {
  for (const [name, v] of Object.entries(SIDE)) {
    it(`${name}: truck drives right, road + kerbs in the free height, fair road ahead, room behind`, () => {
      const f = computeFraming(v);
      expect(f.side).toBe(true);
      const W = v.cssW * v.dpr;
      const H = v.cssH * v.dpr;
      const truck = project(f, W, H, 0, 0);
      const front = project(f, W, H, 0, -10);
      expect(front.x).toBeGreaterThan(truck.x); // ahead = right
      expect(project(f, W, H, 0, 0).y).toBeLessThan(project(f, W, H, ROAD_W, 0).y); // lane 0 on top
      // road + kerbs inside the free height (under the HUD, above the bottom edge)
      const kerbTop = project(f, W, H, -K, 0).y;
      const kerbBottom = project(f, W, H, ROAD_W + K, 0).y;
      expect(kerbTop).toBeGreaterThanOrEqual(v.insetTop * v.dpr - 1e-6);
      expect(kerbBottom).toBeLessThanOrEqual(H + 1e-6);
      // the screen's right edge is `ahead` px of road away, within the fair window; the spawn line is off screen
      expect(f.ahead).toBeGreaterThanOrEqual(A.min - 1e-6);
      expect(f.ahead).toBeLessThanOrEqual(A.max + 1e-6);
      expect((W - truck.x) / f.zoom).toBeCloseTo(f.ahead);
      expect(f.ahead).toBeLessThan(RUSH_ROAD.spawnAheadPx);
      // the truck's rear stays right of the ▲ ▼ column
      const rear = (truck.x - (TRUCK_LEN / 2) * f.zoom) / v.dpr;
      expect(rear).toBeGreaterThanOrEqual(v.touch ? RUSH_VIEW.side.controlsCss : 0);
      // the axis-aligned world rect is what the canvas shows
      const r = cover(f, W, H);
      expect(r.left).toBeCloseTo(f.left);
      expect(r.top).toBeCloseTo(f.top);
      expect(f.freeTop).toBeCloseTo(f.top);
    });
  }

  it('844x390 phone: road + kerbs >= 230 CSS px tall, truck >= 60 CSS px long, integer zoom', () => {
    const v = SIDE.landscape;
    const f = computeFraming(v);
    expect(roadCss(f, v.dpr)).toBeGreaterThanOrEqual(230);
    expect((TRUCK_LEN * f.zoom) / v.dpr).toBeGreaterThanOrEqual(60);
    expect(Number.isInteger(f.zoom)).toBe(true);
  });

  it('flips at the configured aspect', () => {
    const a = RUSH_VIEW.side.aspect;
    expect(computeFraming({ cssW: 400 * a - 1, cssH: 400, dpr: 2, insetTop: 0, insetBottom: 0 }).side).toBe(false);
    expect(computeFraming({ cssW: 400 * a + 1, cssH: 400, dpr: 2, insetTop: 0, insetBottom: 0 }).side).toBe(true);
  });

  it('a portrait window stays upright even when its toolbars leave a wide canvas (iPhone SE Safari, small Android)', () => {
    for (const [cssW, cssH] of [[375, 280], [360, 290]]) {
      const v: FramingInput = { cssW, cssH, dpr: 2, insetTop: 0, insetBottom: 0, touch: true, portrait: true };
      expect(computeFraming(v).side).toBe(false);
      expect(computeFraming({ ...v, wasSide: true }).side).toBe(false);
      expect(computeFraming({ ...v, portrait: false }).side).toBe(true);
    }
  });

  it('once turned, the view holds until the aspect drops under aspectHold (a toolbar never flips it back and forth)', () => {
    const { aspect, aspectHold } = RUSH_VIEW.side;
    const mid = (aspect + aspectHold) / 2;
    const v: FramingInput = { cssW: 400 * mid, cssH: 400, dpr: 2, insetTop: 0, insetBottom: 0 };
    expect(computeFraming(v).side).toBe(false);
    expect(computeFraming({ ...v, wasSide: true }).side).toBe(true);
    expect(computeFraming({ ...v, cssW: 400 * aspectHold - 1, wasSide: true }).side).toBe(false);
  });

  it('screen-up runs along world -x in the side view, -y upright', () => {
    const u = screenUp(Math.PI / 2);
    expect(u.x).toBeCloseTo(-1);
    expect(u.y).toBeCloseTo(0);
    expect(screenUp(0).y).toBeCloseTo(-1);
  });

  it('mid-turn cover holds every corner of the canvas', () => {
    const f = computeFraming(SIDE.landscape);
    const pose = { ...f, rotation: Math.PI / 4 };
    const W = 2532;
    const H = 1170;
    const r = cover(pose, W, H);
    for (const [x, y] of [[r.left, r.top], [r.left + r.width, r.top], [r.left, r.top + r.height], [r.left + r.width, r.top + r.height]]) {
      const p = project(pose, W, H, x, y);
      // the rect corners lie outside (or on) the canvas: the canvas is inside the rect
      expect(p.x < 1 || p.x > W - 1 || p.y < 1 || p.y > H - 1).toBe(true);
    }
  });
});
