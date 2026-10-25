import { describe, expect, it } from 'vitest';
import { FX, HERO_ANIMS, HERO_FRAME } from '../api';
import { FX_SPEC, HERO_AIM_ANIMS, HERO_ALL_ANIMS, HERO_ANIM_SPEC } from './config';
import { ANKLE_Y, HEAD, HEAD_R, muzzleOf, outerToFrame, upperToFrame, type Pose } from './anatomy';
import { HERO_MUZZLE, HERO_ORDER, heroLayout, heroPose } from './pose';

const all = (): [string, number, Pose][] =>
  HERO_ORDER.flatMap((name) => Array.from({ length: HERO_ANIM_SPEC[name].frames }, (_, f): [string, number, Pose] => [name, f, heroPose(name, f)]));

describe('hero anims', () => {
  it('cover every HERO_ANIMS key plus the aim poses with sane frame counts and fps', () => {
    expect([...HERO_ORDER].sort()).toEqual([...new Set([...Object.keys(HERO_ANIMS), ...Object.keys(HERO_AIM_ANIMS)])].sort());
    for (const [name, key] of Object.entries(HERO_ANIMS)) expect(HERO_ALL_ANIMS[name as keyof typeof HERO_ANIMS]).toBe(key);
    expect(new Set(Object.values(HERO_ALL_ANIMS)).size).toBe(HERO_ORDER.length);
    for (const name of HERO_ORDER) {
      const s = HERO_ANIM_SPEC[name];
      expect(s.frames).toBeGreaterThanOrEqual(4);
      expect(s.fps).toBeGreaterThan(0);
    }
    expect(HERO_ANIM_SPEC.run.frames).toBeGreaterThanOrEqual(6);
    expect(HERO_ANIM_SPEC.run.frames).toBeLessThanOrEqual(8);
  });

  it('loop the cyclic anims and play the one-shots once', () => {
    for (const name of ['idle', 'run', 'fall', 'shoot', 'shootUp', 'runShoot', 'runShootUp', 'airShoot', 'airShootUp', 'airShootDiag'] as const) expect(HERO_ANIM_SPEC[name].repeat).toBe(-1);
    for (const name of ['intro', 'jump', 'dash', 'hurt', 'parry', 'super', 'victory', 'ko'] as const) expect(HERO_ANIM_SPEC[name].repeat).toBe(0);
  });

  it('lay the frames out back to back in one sheet', () => {
    const { start, total } = heroLayout();
    let next = 0;
    for (const name of HERO_ORDER) {
      expect(start[name]).toBe(next);
      next += HERO_ANIM_SPEC[name].frames;
    }
    expect(total).toBe(next);
  });

  it('produce finite poses whose head stays inside the frame', () => {
    for (const [name, f, p] of all()) {
      for (const v of Object.values(p)) if (typeof v === 'number') expect(Number.isFinite(v), `${name}#${f}`).toBe(true);
      const h = upperToFrame(p, HEAD);
      const r = HEAD_R * Math.max(p.sx, p.sy);
      expect(h.x - r, `${name}#${f} left`).toBeGreaterThanOrEqual(-0.5);
      expect(h.x + r, `${name}#${f} right`).toBeLessThanOrEqual(HERO_FRAME.w + 0.5);
      expect(h.y - r, `${name}#${f} top`).toBeGreaterThanOrEqual(-0.5);
      expect(h.y + r, `${name}#${f} bottom`).toBeLessThanOrEqual(HERO_FRAME.h + 0.5);
    }
  });

  it('keep the feet on footY when standing', () => {
    for (const name of ['idle', 'shoot', 'shootUp'] as const) {
      for (let f = 0; f < HERO_ANIM_SPEC[name].frames; f++) {
        const p = heroPose(name, f);
        for (const leg of [p.frontLeg, p.backLeg]) {
          expect(leg.y).toBe(ANKLE_Y);
          expect(outerToFrame(p, { x: leg.x, y: HERO_FRAME.footY }).y).toBeCloseTo(HERO_FRAME.footY, 5);
        }
      }
    }
  });

  it('spin a full turn in the jump and end upright', () => {
    const n = HERO_ANIM_SPEC.jump.frames;
    expect(heroPose('jump', 2).rot).toBe(0);
    expect(heroPose('jump', n - 1).rot).toBeCloseTo(Math.PI * 2, 5);
    expect(heroPose('jump', 0).sy).toBeGreaterThan(1.1);
  });

  it('place the finger-gun muzzle ahead (forward) and above the head (up)', () => {
    expect(HERO_MUZZLE.forward.x).toBeGreaterThan(20);
    expect(HERO_MUZZLE.forward.y).toBeLessThan(-15);
    expect(HERO_MUZZLE.forward.y).toBeGreaterThan(-35);
    expect(HERO_MUZZLE.up.y).toBeLessThan(-40);
    expect(HERO_MUZZLE.run.x).toBeGreaterThan(20);
  });

  it('fire the aim poses from the fingertip the core spawns shots at', () => {
    const m = HERO_MUZZLE;
    const diag = { x: (m.forward.x + m.up.x) / 2, y: (m.forward.y + m.up.y) / 2 };
    const near = (name: Parameters<typeof heroPose>[0], at: { x: number; y: number }): void => {
      for (let f = 0; f < HERO_ANIM_SPEC[name].frames; f++) {
        const t = muzzleOf(heroPose(name, f));
        expect(Math.hypot(t.x - at.x, t.y - at.y), `${name}#${f}`).toBeLessThan(f === 0 ? 4 : 6);
      }
    };
    near('runShootUp', diag);
    near('airShoot', m.forward);
    near('airShootUp', m.up);
    near('airShootDiag', diag);
    for (const name of ['runShootUp', 'airShoot', 'airShootUp', 'airShootDiag'] as const) expect(heroPose(name, 0).front.glove).toBe('gun');
  });
});

describe('fx specs', () => {
  it('cover every FX key; still ones have no anim', () => {
    expect(Object.keys(FX_SPEC).sort()).toEqual(Object.keys(FX).sort());
    expect(FX_SPEC.fry.fps).toBe(0);
    expect(FX_SPEC.card.frames).toBe(2);
    for (const name of ['blast', 'muzzle', 'hit', 'parryFlash', 'dust'] as const) {
      expect(FX_SPEC[name].repeat).toBe(0);
      expect(FX_SPEC[name].fps).toBeGreaterThan(0);
    }
  });
});
