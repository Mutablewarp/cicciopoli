import { describe, expect, it } from 'vitest';
import { FX, HERO_ANIMS, HERO_FRAME } from '../api';
import { FX_SPEC, HERO_AIM_ANIMS, HERO_ALL_ANIMS, HERO_ANIM_SPEC, type HeroAnimName } from './config';
import { HERO_ATLAS, JOINTS, PARTS } from './parts';
import { HERO_MUZZLE, HERO_ORDER, heroLayout, heroPose } from './pose';
import { FOOT, apply, bones, fingertip, restPose, type Pose } from './rig';

const frames = (name: HeroAnimName): Pose[] => Array.from({ length: HERO_ANIM_SPEC[name].frames }, (_, f) => heroPose(name, f));
const all = (): [string, number, Pose][] => HERO_ORDER.flatMap((name) => frames(name).map((p, f): [string, number, Pose] => [name, f, p]));
const soles = (p: Pose): number[] => {
  const b = bones(p);
  const back = p.stride ? [JOINTS.soleFrontHeel, JOINTS.soleFrontToe] : [JOINTS.soleBackToe, JOINTS.soleBackHeel];
  return [...back.map((v) => apply(b.backLeg, v).y), ...[JOINTS.soleFrontHeel, JOINTS.soleFrontToe].map((v) => apply(b.frontLeg, v).y)];
};

describe('hero anims', () => {
  it('cover every HERO_ANIMS key plus the aim poses with sane frame counts and fps', () => {
    expect([...HERO_ORDER].sort()).toEqual([...new Set([...Object.keys(HERO_ANIMS), ...Object.keys(HERO_AIM_ANIMS)])].sort());
    for (const [name, key] of Object.entries(HERO_ANIMS)) expect(HERO_ALL_ANIMS[name as keyof typeof HERO_ANIMS]).toBe(key);
    expect(new Set(Object.values(HERO_ALL_ANIMS)).size).toBe(HERO_ORDER.length);
    for (const name of HERO_ORDER) {
      expect(HERO_ANIM_SPEC[name].frames).toBeGreaterThanOrEqual(4);
      expect(HERO_ANIM_SPEC[name].fps).toBeGreaterThan(0);
    }
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

  it('start the idle on the owner drawing, untouched', () => {
    const rest = restPose();
    for (const [k, v] of Object.entries(heroPose('idle', 0))) expect(v === rest[k as keyof Pose] || Math.abs(Number(v) - Number(rest[k as keyof Pose])) < 1e-12, k).toBe(true);
    expect(bones(restPose()).head).toEqual([1, 0, 0, 1, 0, 0]);
  });

  it('produce finite poses whose head stays inside the frame', () => {
    const h = PARTS.head;
    for (const [name, f, p] of all()) {
      for (const v of Object.values(p)) if (typeof v === 'number') expect(Number.isFinite(v), `${name}#${f}`).toBe(true);
      const c = apply(bones(p).head, { x: h.x + h.w / 2, y: h.y + h.h / 2 });
      expect(c.x, `${name}#${f}`).toBeGreaterThan(0);
      expect(c.x, `${name}#${f}`).toBeLessThan(HERO_FRAME.w);
      expect(c.y, `${name}#${f}`).toBeGreaterThan(0);
      expect(c.y, `${name}#${f}`).toBeLessThan(HERO_FRAME.h);
    }
  });

  it('keep the feet on footY when standing and running', () => {
    expect(FOOT.y).toBe(HERO_FRAME.footY);
    for (const name of ['idle', 'shoot', 'shootUp', 'run', 'runShoot', 'runShootUp'] as const) {
      for (const [f, p] of frames(name).entries()) expect(Math.max(...soles(p)), `${name}#${f}`).toBeCloseTo(FOOT.y, 0);
    }
  });

  it('spin a full turn in the jump and end upright', () => {
    const n = HERO_ANIM_SPEC.jump.frames;
    expect(heroPose('jump', 0).rot).toBe(0);
    expect(heroPose('jump', n - 1).rot).toBeCloseTo(Math.PI * 2, 5);
    expect(heroPose('jump', 0).sy).toBeGreaterThan(1.05);
  });

  it('shoot from the fingertip: ahead (forward) and over the shoulders (up)', () => {
    expect(HERO_MUZZLE.forward).toEqual({ x: fingertip(heroPose('shoot', 0)).x - FOOT.x, y: fingertip(heroPose('shoot', 0)).y - FOOT.y });
    expect(HERO_MUZZLE.forward.x).toBeGreaterThan(18);
    expect(HERO_MUZZLE.forward.y).toBeLessThan(-20);
    expect(HERO_MUZZLE.forward.y).toBeGreaterThan(-36);
    expect(HERO_MUZZLE.up.y).toBeLessThan(-34);
    expect(HERO_MUZZLE.up.x).toBeGreaterThan(8);
    expect(HERO_MUZZLE.run.x).toBeGreaterThan(18);
  });

  it('fire the aim poses from the fingertip the core spawns shots at', () => {
    const m = HERO_MUZZLE;
    const diag = { x: (m.forward.x + m.up.x) / 2, y: (m.forward.y + m.up.y) / 2 };
    const near = (name: HeroAnimName, at: { x: number; y: number }): void => {
      for (const [f, p] of frames(name).entries()) {
        const t = fingertip(p);
        expect(Math.hypot(t.x - FOOT.x - at.x, t.y - FOOT.y - at.y), `${name}#${f}`).toBeLessThan(7);
      }
    };
    near('runShootUp', diag);
    near('airShoot', m.forward);
    near('airShootUp', m.up);
    near('airShootDiag', diag);
  });

  it('read every part from inside the atlas', () => {
    for (const r of Object.values(PARTS)) {
      expect(r.sx + r.sw).toBeLessThanOrEqual(HERO_ATLAS.w);
      expect(r.sy + r.sh).toBeLessThanOrEqual(HERO_ATLAS.h);
    }
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
