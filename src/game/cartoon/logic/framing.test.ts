import { describe, expect, it } from 'vitest';
import { ARENA, KMAX } from '../api';
import { cameraPose, computeFraming, pushFor, quantizeK } from './framing';
import { CT_VIEW } from '../../../config/cartoon';

describe('arena framing', () => {
  it('portrait: full width, the arena stays between the HUD and the controls below', () => {
    const v = { cssW: 390, cssH: 844, dpr: 3, insetTop: 56, insetBottom: 330 };
    const f = computeFraming(v);
    expect(f.portrait).toBe(true);
    expect(f.css.w).toBeGreaterThan(370);
    expect(f.css.y).toBeGreaterThanOrEqual(v.insetTop);
    expect(f.css.y + f.css.h).toBeLessThanOrEqual(v.cssH - v.insetBottom + 0.01);
    expect(f.css.w / f.css.h).toBeCloseTo(ARENA.w / ARENA.h);
  });

  it('landscape: fills the height under the HUD down to the bottom (controls overlaid in the side bands)', () => {
    const f = computeFraming({ cssW: 844, cssH: 390, dpr: 3, insetTop: 40, insetBottom: 120 });
    expect(f.portrait).toBe(false);
    expect(f.css.y).toBeCloseTo(40);
    expect(f.css.y + f.css.h).toBeCloseTo(390);
    expect(f.css.x).toBeGreaterThan(100);
  });

  it('the camera centre puts the arena centre at its css rect centre', () => {
    const v = { cssW: 390, cssH: 844, dpr: 2, insetTop: 50, insetBottom: 300 };
    const f = computeFraming(v);
    const zoomCss = f.zoom / v.dpr;
    const screenX = v.cssW / 2 + (ARENA.w / 2 - f.centerX) * zoomCss;
    const screenY = v.cssH / 2 + (ARENA.h / 2 - f.centerY) * zoomCss;
    expect(screenX).toBeCloseTo(f.css.x + f.css.w / 2);
    expect(screenY).toBeCloseTo(f.css.y + f.css.h / 2);
  });

  it('k = device px per unit, quantised, between 1 and KMAX', () => {
    expect(quantizeK(0.3)).toBe(1);
    expect(quantizeK(1.6)).toBe(2);
    expect(quantizeK(1.9)).toBe(2);
    expect(quantizeK(9)).toBe(KMAX);
    expect(computeFraming({ cssW: 1280, cssH: 720, dpr: 1, insetTop: 0, insetBottom: 0 }).k).toBe(2);
  });

  it('never breaks on a zero-size host', () => {
    const f = computeFraming({ cssW: 0, cssH: 0, dpr: 1, insetTop: 0, insetBottom: 0 });
    expect(Number.isFinite(f.zoom)).toBe(true);
    expect(f.zoom).toBeGreaterThan(0);
  });

  it('push 1 = the contain framing; landscape never pushes', () => {
    const f = computeFraming({ cssW: 390, cssH: 225, dpr: 2, insetTop: 0, insetBottom: 0 });
    const pose = cameraPose(f, 1, { x: 40, y: 300 });
    expect(pose.zoom).toBeCloseTo(f.zoom);
    expect(pose.centerX).toBeCloseTo(f.centerX);
    expect(pose.centerY).toBeCloseTo(f.centerY);
    expect(computeFraming({ cssW: 844, cssH: 390, dpr: 2, insetTop: 40, insetBottom: 0 }).pushMax).toBe(1);
  });

  it('portrait push: a small fight area zooms to pushMax, a wide one stays at the whole arena', () => {
    const f = computeFraming({ cssW: 390, cssH: 225, dpr: 2, insetTop: 0, insetBottom: 0 });
    expect(f.pushMax).toBeCloseTo(Math.min(CT_VIEW.push.max, CT_VIEW.push.minZoomCss / f.zoomCss));
    expect(f.pushMax).toBeGreaterThan(1.3);
    expect(pushFor(f, { x: 200, y: 150, w: 200, h: 180 }).push).toBeCloseTo(f.pushMax);
    expect(pushFor(f, { x: 0, y: 20, w: ARENA.w, h: 314 }).push).toBe(1);
  });

  it('a pushed camera keeps the needed box in view and never shows past the arena edges', () => {
    const f = computeFraming({ cssW: 390, cssH: 225, dpr: 3, insetTop: 0, insetBottom: 0 });
    const need = { x: 380, y: 160, w: 250, h: 174 };
    const { push, want } = pushFor(f, need);
    const pose = cameraPose(f, push, want);
    const zc = f.zoomCss * push;
    const visW = 390 / zc;
    const visH = 225 / zc;
    const left = pose.centerX - visW / 2;
    const top = pose.centerY - visH / 2;
    expect(left).toBeGreaterThanOrEqual(-0.01);
    expect(left + visW).toBeLessThanOrEqual(ARENA.w + 0.01);
    expect(top + visH).toBeLessThanOrEqual(ARENA.h + 0.01);
    expect(left).toBeLessThanOrEqual(need.x + 0.01);
    expect(left + visW).toBeGreaterThanOrEqual(need.x + need.w - 0.01);
    expect(top).toBeLessThanOrEqual(need.y + 0.01);
    expect(top + visH).toBeGreaterThanOrEqual(need.y + need.h - 0.01);
  });
});
