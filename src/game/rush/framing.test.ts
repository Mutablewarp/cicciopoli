import { describe, expect, it } from 'vitest';
import { ROAD_W } from '../../art/rush/keys';
import { RUSH_ROAD } from '../../config/rush';
import { RUSH_VIEW } from './config';
import { computeFraming, roadCss, type FramingInput } from './framing';

const A = RUSH_ROAD.viewAheadPx;

/** World y of the truck centre's screen row, and the road's screen span in CSS px. */
function onScreen(v: FramingInput): { ahead: number; behind: number; roadL: number; roadR: number; zoom: number } {
  const f = computeFraming(v);
  const devH = v.cssH * v.dpr;
  const truckDev = (0 - f.top) * f.zoom;
  const roadL = ((0 - f.left) * f.zoom) / v.dpr;
  return { ahead: f.ahead, behind: (devH - truckDev) / f.zoom, roadL, roadR: roadL + (ROAD_W * f.zoom) / v.dpr, zoom: f.zoom };
}

const LAYOUTS: Record<string, FramingInput> = {
  portrait: { cssW: 390, cssH: 590, dpr: 3, insetTop: 0, insetBottom: 0 },
  landscape: { cssW: 844, cssH: 390, dpr: 3, insetTop: 46, insetBottom: 120 },
  desktop: { cssW: 1280, cssH: 720, dpr: 1, insetTop: 52, insetBottom: 0 },
  se: { cssW: 568, cssH: 320, dpr: 2, insetTop: 40, insetBottom: 96 },
  narrow: { cssW: 320, cssH: 760, dpr: 2, insetTop: 0, insetBottom: 0 },
  tablet: { cssW: 768, cssH: 1024, dpr: 2, insetTop: 0, insetBottom: 0 },
};

describe('rush framing', () => {
  for (const [name, v] of Object.entries(LAYOUTS)) {
    it(`${name}: ahead within the fair window, whole road + sidewalks visible`, () => {
      const s = onScreen(v);
      expect(s.ahead).toBeGreaterThanOrEqual(A.min - 1e-6);
      expect(s.ahead).toBeLessThanOrEqual(A.max + 1e-6);
      expect(s.roadL).toBeGreaterThanOrEqual(((RUSH_VIEW.minSidePx - 1) * s.zoom) / v.dpr);
      expect(s.roadR).toBeLessThanOrEqual(v.cssW - ((RUSH_VIEW.minSidePx - 1) * s.zoom) / v.dpr);
      expect(s.behind).toBeGreaterThan(RUSH_VIEW.behindPx * 0.5);
    });
  }

  it('landscape: road and kerbs run between the corner controls, down to the bottom', () => {
    const v = LAYOUTS.landscape;
    const f = computeFraming(v);
    expect(roadCss(f, v.dpr)).toBeLessThanOrEqual(v.cssW - 2 * RUSH_VIEW.cornerReserveCss);
    const s = onScreen(v);
    // the truck sits in the bottom band beside the buttons, not above them
    expect((s.behind * s.zoom) / v.dpr).toBeLessThan(v.insetBottom);
  });

  it('portrait road is big: at least 45% of the screen width', () => {
    const v = LAYOUTS.portrait;
    const s = onScreen(v);
    expect(s.roadR - s.roadL).toBeGreaterThan(v.cssW * 0.45);
  });

  it('desktop 1x keeps an integer zoom only when it costs little', () => {
    const f = computeFraming({ cssW: 800, cssH: 720, dpr: 1, insetTop: 0, insetBottom: 0 });
    expect(f.zoom).toBe(2);
    // 1280x720: zoom 2 instead of ~1.89, the truck rides a little lower, the road ahead is kept
    const g = onScreen(LAYOUTS.desktop);
    expect(g.zoom).toBe(2);
    expect(g.behind).toBeGreaterThanOrEqual(RUSH_VIEW.behindTightPx / (1 + RUSH_VIEW.integerSnap) - 1e-6);
    const h = computeFraming({ cssW: 1280, cssH: 560, dpr: 1, insetTop: 52, insetBottom: 0 });
    expect(Number.isInteger(h.zoom)).toBe(false);
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
});
