import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { CAMERA } from '../config/tuning';
import type { ViewportInfo } from '../contracts';
import { CameraRig, type FollowTarget } from './camera';
import { computeZoom } from './viewport';

function fakeCam(): Phaser.Cameras.Scene2D.Camera {
  const c = {
    width: 0,
    height: 0,
    setSize(w: number, h: number) {
      c.width = w;
      c.height = h;
      return c;
    },
    setZoom: () => c,
    setScroll: () => c,
  };
  return c as unknown as Phaser.Cameras.Scene2D.Camera;
}

// Android Chrome landscape with the browser bars shown: the tightest view the owner may get
const vp: ViewportInfo = { cssW: 780, cssH: 304, dpr: 3, portrait: false, insetBottom: 120, insetTop: 52 };
const zoom = computeZoom(vp.cssW, vp.cssH, vp.dpr).zoom;
const hudBand = (vp.insetTop * vp.dpr) / zoom;
const bannerBand = (CAMERA.bannerCss.landscape * vp.dpr) / zoom;
// flying high over the level 2 lava
const hero: FollowTarget = { x: 600, top: 40, bottom: 76, facing: 1, onGround: false, flying: true };

function rig(): CameraRig {
  const r = new CameraRig(fakeCam(), 4000, 256, 48);
  r.preferBottom = true;
  r.applyViewport(vp, vp.cssW * vp.dpr, vp.cssH * vp.dpr);
  r.snapTo(hero);
  return r;
}

const headRoom = (r: CameraRig): number => hero.top - r.view().y;

function run(r: CameraRig, ms: number): void {
  for (let t = 0; t < ms; t += 16) r.update(hero, 0.016);
}

describe('CameraRig banner band', () => {
  it('keeps the head under the HUD and the banner while one is up, then lets go', () => {
    const r = rig();
    run(r, 1000);
    const free = headRoom(r);
    expect(free).toBeGreaterThanOrEqual(hudBand + CAMERA.headMargin - 0.5);
    expect(free).toBeLessThan(hudBand + bannerBand + CAMERA.headMargin); // the case the band fixes

    r.coverTop(2200);
    run(r, 800);
    expect(headRoom(r)).toBeGreaterThanOrEqual(hudBand + bannerBand + CAMERA.headMargin - 1);

    run(r, 3000);
    expect(headRoom(r)).toBeCloseTo(free, 0);
  });

  it('eases the band in instead of jumping the view', () => {
    const r = rig();
    run(r, 500);
    const before = r.view().y;
    r.coverTop(2000);
    r.update(hero, 0.016);
    expect(before - r.view().y).toBeLessThan(bannerBand * 0.25);
  });
});

describe('CameraRig rage jump', () => {
  // iPhone landscape: the touch pads start 11 css px under the walking line at rest
  const land: ViewportInfo = { cssW: 844, cssH: 390, dpr: 3, portrait: false, insetBottom: 89, insetTop: 52 };
  const z = computeZoom(land.cssW, land.cssH, land.dpr).zoom;
  const GROUND = 208;
  const cssOf = (y: number): number => ((GROUND - y) * z) / land.dpr;
  const stand = (bottom: number, onGround: boolean): FollowTarget => ({ x: 600, top: bottom - 50, bottom, facing: 1, onGround });

  /** How many css px the walking line sinks during a full 108 px rage jump (no banner up). */
  function sink(deadUp: number): number {
    const r = new CameraRig(fakeCam(), 4000, 256, 48);
    r.deadUp = deadUp;
    r.applyViewport(land, land.cssW * land.dpr, land.cssH * land.dpr);
    r.snapTo(stand(GROUND, true));
    for (let i = 0; i < 60; i++) r.update(stand(GROUND, true), 1 / 60);
    const rest = cssOf(r.view().y);
    let worst = rest;
    for (let t = 0; t < 1.5; t += 1 / 60) {
      const h = 520 * t - 625 * t * t; // jumpV0 520, gravity 1250
      if (h < 0) break;
      r.update(stand(GROUND - h, false), 1 / 60);
      worst = Math.max(worst, cssOf(r.view().y));
    }
    for (let i = 0; i < 60; i++) {
      r.update(stand(GROUND, true), 1 / 60);
      worst = Math.max(worst, cssOf(r.view().y));
    }
    return worst - rest;
  }

  it('his dead zone covers the whole jump, so the walking line sinks far less than with the default', () => {
    expect(CAMERA.deadUpRage).toBeGreaterThan((520 * 520) / (2 * 1250));
    expect(sink(CAMERA.deadUp)).toBeGreaterThan(50);
    expect(sink(CAMERA.deadUpRage)).toBeLessThan(35);
  });

  it('on a view taller than the level the background keeps the pinned camera top as its reference', () => {
    const tall: ViewportInfo = { cssW: 412, cssH: 595, dpr: 3, portrait: true, insetBottom: 0, insetTop: 0 };
    const r = new CameraRig(fakeCam(), 4000, 256, 48);
    r.applyViewport(tall, tall.cssW * tall.dpr, tall.cssH * tall.dpr);
    expect(r.restTop).toBeLessThan(-CAMERA.maxExtraTop);
    expect(r.backdropTop).toBe(-CAMERA.maxExtraTop);
    r.snapTo(stand(GROUND, true));
    expect(r.view().y).toBeCloseTo(r.backdropTop, 0);
  });
});
