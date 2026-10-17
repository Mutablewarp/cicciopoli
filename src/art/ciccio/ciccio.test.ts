import { describe, expect, it } from 'vitest';
import { CICCIO } from '../keys';
import { BRIDGE } from './head';
import { FRAME, renderPose } from './body';
import { headIcon, portrait } from './icons';
import { IDLE_SEQUENCE, POSES } from './poses';
import { bounds } from './raster';

const frames = POSES.map(renderPose);
const FLY: readonly number[] = CICCIO.fly;

describe('ciccio sheet', () => {
  it('has one pose per frame index in keys.ts', () => {
    expect(POSES.length).toBe(CICCIO.frameCount);
  });

  it('keeps the feet on row 47 and nothing clipped by the frame', () => {
    frames.forEach(({ raster }, i) => {
      const b = bounds(raster);
      expect(b, `frame ${i}`).not.toBeNull();
      if (!b) return;
      expect(b.x0, `frame ${i} left`).toBeGreaterThan(0);
      expect(b.x1, `frame ${i} right`).toBeLessThan(FRAME - 1);
      expect(b.y0, `frame ${i} top`).toBeGreaterThan(0);
      if (FLY.includes(i)) expect(b.y1, `frame ${i} bottom`).toBeLessThanOrEqual(47);
      else expect(b.y1, `frame ${i} feet`).toBe(47);
    });
  });

  it('matches the idle size spec (~28 x 38, centred, head top ~ y 9)', () => {
    const b = bounds(frames[0].raster);
    expect(b).not.toBeNull();
    if (!b) return;
    expect(b.x1 - b.x0 + 1).toBeGreaterThanOrEqual(25);
    expect(b.x1 - b.x0 + 1).toBeLessThanOrEqual(30);
    expect(b.y0).toBeGreaterThanOrEqual(7);
    expect(b.y0).toBeLessThanOrEqual(9);
    expect(Math.abs((b.x0 + b.x1) / 2 - 24)).toBeLessThanOrEqual(2);
  });

  it('puts every anchor inside the frame and the head anchor on the glasses bridge', () => {
    frames.forEach(({ raster, anchors }, i) => {
      for (const a of [anchors.hand, anchors.chest, anchors.back, anchors.head]) {
        expect(a.x >= 0 && a.y >= 0 && a.x < FRAME && a.y < FRAME, `frame ${i}`).toBe(true);
      }
      expect(raster.get(anchors.head.x, anchors.head.y - 1), `frame ${i} bridge`).not.toBeNull();
      expect(raster.get(anchors.hand.x, anchors.hand.y), `frame ${i} fist`).not.toBeNull();
    });
  });

  it('never points the held club across the face', () => {
    frames.forEach(({ anchors }, i) => {
      const ox = anchors.head.x - BRIDGE.x;
      const oy = anchors.head.y - BRIDGE.y;
      // club sprite points up-right (-45 deg) at angle 0
      const dir = (anchors.hand.angle ?? 0) - Math.PI / 4;
      for (let t = 3; t <= 20; t++) {
        const x = Math.round(anchors.hand.x + Math.cos(dir) * t);
        const y = Math.round(anchors.hand.y + Math.sin(dir) * t);
        const inFace = x >= ox + 5 && x <= ox + 16 && y >= oy + 5 && y <= oy + 16;
        expect(inFace, `frame ${i} t=${t}`).toBe(false);
      }
    });
  });

  it('idle loop only uses idle frames and includes the blink', () => {
    expect(IDLE_SEQUENCE.every((f) => (CICCIO.idle as readonly number[]).includes(f))).toBe(true);
    expect(IDLE_SEQUENCE).toContain(3);
  });

  it('is deterministic', () => {
    const again = POSES.map(renderPose);
    again.forEach((f, i) => expect(f.raster.px).toEqual(frames[i].raster.px));
  });
});

describe('ciccio head images', () => {
  it('builds a 16x16 icon and a 64x64 portrait with transparent corners', () => {
    const icon = headIcon();
    const big = portrait();
    expect([icon.w, icon.h, big.w, big.h]).toEqual([16, 16, 64, 64]);
    expect(icon.get(0, 0)).toBeNull();
    expect(big.get(0, 0)).toBeNull();
    expect(bounds(big)?.y1).toBe(63);
  });
});
