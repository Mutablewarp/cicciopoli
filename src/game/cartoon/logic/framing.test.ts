import { describe, expect, it } from 'vitest';
import { ARENA, KMAX } from '../api';
import { bossSlice, cameraPose, computeFraming, follow, frameBox, keepInView, quantizeK, viewRect } from './framing';
import { CT_PLAYER, CT_VIEW } from '../../../config/cartoon';

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

  it('push 1 = the contain framing; a desktop never pushes, a phone held sideways only a little', () => {
    const f = computeFraming({ cssW: 390, cssH: 225, dpr: 2, insetTop: 0, insetBottom: 0 });
    const pose = cameraPose(f, 1, { x: 40, y: 300 });
    expect(pose.zoom).toBeCloseTo(f.zoom);
    expect(pose.centerX).toBeCloseTo(f.centerX);
    expect(pose.centerY).toBeCloseTo(f.centerY);
    expect(computeFraming({ cssW: 1280, cssH: 720, dpr: 1, insetTop: 40, insetBottom: 0 }).pushMax).toBe(1);
    const l = computeFraming({ cssW: 844, cssH: 390, dpr: 2, insetTop: 40, insetBottom: 0 });
    expect(l.zoomCss * l.pushMax).toBeCloseTo(CT_VIEW.push.landZoomCss);
    expect(l.pushFit).toBe(1);
    expect(l.pushFar).toBe(1);
  });

  it('portrait push: the fight zooms to push.minZoomCss on a phone held upright (hero ~60 CSS px, boss 150+)', () => {
    // the UI's portrait host at 390 x 844: the arena height at the pushed zoom + the margins
    const hostH = CT_VIEW.push.minZoomCss * ARENA.h + 2 * CT_VIEW.marginCss;
    const f = computeFraming({ cssW: 390, cssH: hostH, dpr: 2, insetTop: 0, insetBottom: 0 });
    expect(f.pushMax).toBeLessThanOrEqual(CT_VIEW.push.max);
    expect(f.zoomCss * f.pushMax).toBeCloseTo(CT_VIEW.push.minZoomCss);
    expect(52 * f.zoomCss * f.pushMax).toBeGreaterThanOrEqual(60);
    expect(130 * f.zoomCss * f.pushMax).toBeGreaterThanOrEqual(150);
    expect(f.k).toBeLessThanOrEqual(KMAX);
    const hero = { x: 262, y: 246, w: 68, h: 72 };
    const { push, want } = follow(f, { hero, near: hero, boss: { x: 430, y: 130, w: 170, h: 188 } });
    expect(push).toBeGreaterThanOrEqual(f.pushFit);
    expect(push).toBeLessThanOrEqual(f.pushMax);
    expect(52 * f.zoomCss * push).toBeGreaterThanOrEqual(58);
    const view = viewRect(f, cameraPose(f, push, want));
    // the whole height, the hero in view, leaning toward the boss
    expect(view.y).toBeCloseTo(0);
    expect(view.h).toBeCloseTo(ARENA.h);
    expect(view.x).toBeLessThanOrEqual(hero.x + 0.01);
    expect(view.x + view.w).toBeGreaterThanOrEqual(430 + 170 * 0.9);
  });

  it('a pushed view keeps the hero, then the boss side facing it, then the hazards near the hero', () => {
    const f = computeFraming({ cssW: 390, cssH: 462, dpr: 3, insetTop: 0, insetBottom: 0 });
    const P = CT_VIEW.push;
    const boss = { x: 440, y: 140, w: 160, h: 178 };
    const hero = { x: 266, y: 246, w: 68, h: 72 };
    const view = (h: typeof hero, n: typeof hero): ReturnType<typeof viewRect> => {
      const t = follow(f, { hero: h, near: n, boss });
      expect(52 * f.zoomCss * t.push).toBeGreaterThanOrEqual(60);
      return viewRect(f, cameraPose(f, t.push, t.want));
    };
    // hazards just behind the hero fit with the boss side: all in view
    const close = view(hero, { x: 236, y: 200, w: 98, h: 118 });
    expect(close.x).toBeLessThanOrEqual(236 + 0.01);
    expect(close.x + close.w).toBeGreaterThanOrEqual(boss.x + boss.w * P.bossShow - 0.01);
    // hazards far behind do not pull the boss out of view (an edge arrow points at them)
    const far = view(hero, { x: 120, y: 200, w: 214, h: 118 });
    expect(far.x).toBeLessThanOrEqual(hero.x + 0.01);
    expect(far.x + far.w).toBeGreaterThanOrEqual(boss.x + boss.w * P.bossShow - 0.01);
    // the hero against the wall: the hero before everything
    const wall = { x: 0, y: 246, w: 68, h: 72 };
    const w = view(wall, { x: 0, y: 200, w: 600, h: 118 });
    expect(w.x).toBeLessThanOrEqual(0.01);
    expect(w.x + w.w).toBeGreaterThanOrEqual(wall.w - 0.01);
  });

  it('a shorter host keeps the floor at the bottom of a pushed view; landscape sees the whole arena', () => {
    const f = computeFraming({ cssW: 375, cssH: 380, dpr: 2, insetTop: 0, insetBottom: 0 });
    const hero = { x: 300, y: 246, w: 92, h: 72 };
    const t = follow(f, { hero, near: hero, boss: null });
    expect(t.push).toBe(f.pushMax);
    const v = viewRect(f, cameraPose(f, t.push, t.want));
    expect(v.h).toBeLessThan(ARENA.h);
    expect(v.y + v.h).toBeCloseTo(CT_VIEW.push.floorY);
  });

  it('landscape: pushed in while the hero, its hazards and the whole boss fit, else the whole arena', () => {
    const l = computeFraming({ cssW: 524, cssH: 342, dpr: 2, insetTop: 49, insetBottom: 0 });
    const boss = { x: 434, y: 118, w: 152, h: 200 };
    const close = follow(l, { hero: { x: 250, y: 246, w: 68, h: 72 }, near: { x: 250, y: 246, w: 68, h: 72 }, boss });
    expect(close.push).toBeCloseTo(l.pushMax);
    expect(52 * l.zoomCss * close.push).toBeGreaterThanOrEqual(55);
    const cv = viewRect(l, cameraPose(l, close.push, close.want));
    expect(cv.x).toBeLessThanOrEqual(250 + 0.01);
    expect(cv.x + cv.w).toBeGreaterThanOrEqual(boss.x + boss.w - 0.01);
    expect(cv.y).toBeLessThanOrEqual(boss.y + 0.01);
    const far = follow(l, { hero: { x: 0, y: 246, w: 68, h: 72 }, near: { x: 0, y: 246, w: 68, h: 72 }, boss: { ...boss, x: 488 } });
    expect(far.push).toBeLessThan(1.01);
    const fv = viewRect(l, cameraPose(l, far.push, far.want));
    expect(fv.x).toBeLessThanOrEqual(0.01);
    expect(fv.x + fv.w).toBeGreaterThanOrEqual(ARENA.w - 4);
  });

  it('portrait: the side of the boss facing the hero stays in view, easing out down to farZoomCss at most', () => {
    const f = computeFraming({ cssW: 390, cssH: 462, dpr: 2, insetTop: 0, insetBottom: 0 });
    const P = CT_VIEW.push;
    // the boss boxes at the start of each fight (bossBox in debug state(), measured in the game, v8 round 2)
    const bosses = [
      { x: 442, y: 128, w: 132, h: 190 },
      { x: 478, y: 168, w: 98, h: 150 },
      { x: 396, y: 109, w: 196, h: 209 },
      { x: 404, y: 158, w: 157, h: 160 },
      { x: 441, y: 167, w: 185, h: 151 },
      { x: 464, y: 151, w: 126, h: 165 },
      { x: 510, y: 168, w: 130, h: 150 },
    ].map((b) => ({ x: b.x - P.bossPad, y: b.y - P.bossPad, w: b.w + 2 * P.bossPad, h: b.h + 2 * P.bossPad }));
    const at = (x: number) => ({ x: x - P.heroX, y: 318 - P.heroTop, w: P.heroX * 2, h: P.heroTop });
    for (const boss of bosses) {
      const hero = at(CT_PLAYER.startX);
      const t = follow(f, { hero, near: hero, boss });
      const zc = f.zoomCss * t.push;
      expect(zc).toBeGreaterThanOrEqual(P.farZoomCss - 1e-6);
      // v8 point 3: the hero >= 60 CSS px (52 units of opaque pixels), the boss >= 150
      expect(52 * zc).toBeGreaterThanOrEqual(60);
      expect((boss.h - 2 * P.bossPad) * zc).toBeGreaterThanOrEqual(150);
      const v = viewRect(f, cameraPose(f, t.push, t.want));
      const seen = Math.min(v.x + v.w, boss.x + boss.w) - Math.max(v.x, boss.x);
      // the start: the hero and at least the bossShow share of the boss facing him
      expect(seen / boss.w).toBeGreaterThanOrEqual(P.bossShow - 1e-6);
      expect(v.x).toBeLessThanOrEqual(hero.x + 0.01);
    }
    // the hero against the left wall: the camera eases out to farZoomCss and no further, the hero stays in view
    const hero = at(CT_PLAYER.minX);
    const t = follow(f, { hero, near: hero, boss: bosses[0] });
    expect(f.zoomCss * t.push).toBeCloseTo(P.farZoomCss);
    const v = viewRect(f, cameraPose(f, t.push, t.want));
    expect(v.x).toBeLessThanOrEqual(Math.max(0, hero.x) + 0.01);
    // close by: the whole boss at fitZoomCss or more
    const close = at(330);
    const c = follow(f, { hero: close, near: close, boss: bosses[0] });
    expect(f.zoomCss * c.push).toBeGreaterThanOrEqual(P.fitZoomCss - 1e-6);
  });

  it('bossSlice: the share of the boss facing the hero, all of it when the hero is level with it', () => {
    const boss = { x: 400, y: 120, w: 200, h: 198 };
    expect(bossSlice(boss, { x: 100, y: 246, w: 68, h: 72 }, 0.5)).toEqual({ x: 400, y: 120, w: 100, h: 198 });
    expect(bossSlice(boss, { x: 600, y: 246, w: 68, h: 72 }, 0.5)).toEqual({ x: 500, y: 120, w: 100, h: 198 });
    expect(bossSlice(boss, { x: 450, y: 246, w: 68, h: 72 }, 0.5)).toEqual(boss);
  });

  it('a phone held upright pushes in even when Safari leaves a host wider than tall (390 x 664: host 390 x 295)', () => {
    const f = computeFraming({ cssW: 390, cssH: 295, dpr: 2, insetTop: 0, insetBottom: 0, portrait: true });
    expect(f.portrait).toBe(true);
    expect(52 * f.zoomCss * f.pushMax).toBeGreaterThanOrEqual(60);
    const hero = { x: CT_PLAYER.startX - CT_VIEW.push.heroX, y: 262, w: 68, h: 72 };
    const boss = { x: 420, y: 150, w: 170, h: 190 };
    const t = follow(f, { hero, near: hero, boss });
    expect(52 * f.zoomCss * t.push).toBeGreaterThanOrEqual(60);
    const v = viewRect(f, cameraPose(f, t.push, t.want));
    expect(v.y + v.h).toBeCloseTo(CT_VIEW.push.floorY);
    expect(v.y).toBeLessThanOrEqual(boss.y + 0.01);
    expect(v.x).toBeLessThanOrEqual(hero.x + 0.01);
    expect(v.x + v.w - boss.x).toBeGreaterThanOrEqual(boss.w * CT_VIEW.push.bossShow);
    expect(computeFraming({ cssW: 390, cssH: 295, dpr: 2, insetTop: 0, insetBottom: 0, portrait: false }).pushFit).toBe(1);
  });

  it('frameBox: the finale box as big as the band allows, whole, never past pushMax; a desktop never pushes', () => {
    const box = { x: 89, y: 32, w: 462, h: 328 };
    const f = computeFraming({ cssW: 390, cssH: 462, dpr: 3, insetTop: 0, insetBottom: 0 });
    const t = frameBox(f, box);
    expect(t.push).toBeGreaterThan(1.4);
    expect(t.push).toBeLessThanOrEqual(f.pushMax);
    const v = viewRect(f, cameraPose(f, t.push, t.want));
    expect(v.x).toBeLessThanOrEqual(box.x + 0.01);
    expect(v.x + v.w).toBeGreaterThanOrEqual(box.x + box.w - 0.01);
    expect(v.y).toBeLessThanOrEqual(box.y + 0.01);
    expect(v.y + v.h).toBeGreaterThanOrEqual(box.y + box.h - 0.01);
    expect(frameBox(computeFraming({ cssW: 1280, cssH: 720, dpr: 1, insetTop: 40, insetBottom: 0 }), box).push).toBe(1);
  });

  it('keepInView: a lagging pan is pulled back so the hero box stays in view', () => {
    const f = computeFraming({ cssW: 390, cssH: 295, dpr: 2, insetTop: 0, insetBottom: 0, portrait: true });
    const hero = { x: 20, y: 262, w: 68, h: 72 };
    const want = keepInView(f, f.pushMax, { x: 400, y: 216 }, hero);
    const v = viewRect(f, cameraPose(f, f.pushMax, want));
    expect(v.x).toBeLessThanOrEqual(hero.x + 0.01);
    expect(keepInView(f, f.pushMax, { x: 60, y: 216 }, hero)).toEqual({ x: 60, y: 216 });
  });
});
