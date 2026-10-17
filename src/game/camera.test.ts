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
