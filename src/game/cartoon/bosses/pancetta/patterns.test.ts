import { describe, expect, it } from 'vitest';
import { ARENA } from '../../api';
import { PANCETTA_ATTACKS, PANCETTA_BRAIN, restPose, type PancettaAttack } from './patterns';
import { pipeAt, pipeTilt } from './pipe';
import { PANCETTA as C } from './config';
import { hazardEndMs, survivable } from '../brie/kit/fairness';
import { rng } from '../brie/kit/paths';

// phase 0: the free floor left of the board; phase 1: he is up in the background, the whole floor is free
const XS: Record<number, number[]> = { 0: [30, 110, 200, 290, 370, 440], 1: [30, 140, 250, 360, 470, 560, 610] };
const SEEDS = [1, 2, 3];

function ctx(id: PancettaAttack, playerX: number, seed: number) {
  const phase = PANCETTA_ATTACKS.find((a) => a.id === id)?.phases[0] ?? 0;
  return { phase, playerX, from: restPose(phase, C.transformMs + seed * 700), rng: rng(seed) };
}

describe('PANCETTA LO SKATER patterns', () => {
  it('has 3-5 attacks per phase, each with a readable wind-up and a breather', () => {
    for (const phase of [0, 1]) {
      const n = PANCETTA_ATTACKS.filter((a) => a.phases.includes(phase)).length;
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(5);
    }
    for (const a of PANCETTA_ATTACKS) {
      expect(a.telegraphMs, a.id).toBeGreaterThanOrEqual(500);
      expect(a.recoverMs, a.id).toBeGreaterThanOrEqual(400);
    }
  });

  it('every hazard is gone before its attack ends', () => {
    for (const a of PANCETTA_ATTACKS)
      for (const x of XS[a.phases[0] ?? 0] ?? []) {
        const plan = PANCETTA_BRAIN.plan(a.id, ctx(a.id, x, 1));
        for (const h of plan.hazards) expect(hazardEndMs(h), a.id).toBeLessThanOrEqual(a.activeMs);
      }
  });

  it('every attack leaves a way out to a hero who only runs and jumps', () => {
    for (const a of PANCETTA_ATTACKS)
      for (const x of XS[a.phases[0] ?? 0] ?? [])
        for (const seed of SEEDS) expect(survivable(PANCETTA_BRAIN, a.id, ctx(a.id, x, seed)), `${a.id} from x=${x} seed ${seed}`).toBe(true);
  });

  it('both phases throw something pink to parry', () => {
    for (const phase of [0, 1]) {
      const pink = PANCETTA_ATTACKS.filter((a) => a.phases.includes(phase)).some((a) => PANCETTA_BRAIN.plan(a.id, ctx(a.id, 200, 1)).hazards.some((h) => h.pink));
      expect(pink).toBe(true);
    }
  });

  it('the half-pipe: lips up top, flat bottom, riders lean with the walls', () => {
    const P = C.pipe;
    expect(pipeAt(0)).toEqual({ x: P.l, y: P.bottom - P.R });
    expect(pipeAt(1).x).toBeCloseTo(P.r, 5);
    expect(pipeAt(0.5).y).toBe(P.bottom);
    expect(pipeTilt(P.l)).toBeCloseTo(Math.PI / 2, 5);
    expect(pipeTilt(P.r)).toBeCloseTo(-Math.PI / 2, 5);
    expect(pipeTilt((P.l + P.r) / 2)).toBe(0);
  });

  it('up in the background he cannot be touched, only shot; the transformation lands where the loop starts', () => {
    const bg = restPose(1, C.transformMs + 500);
    expect(PANCETTA_BRAIN.boxes(bg, 1).body).toEqual([]);
    expect(PANCETTA_BRAIN.boxes(bg, 1).hurt.length).toBe(1);
    const end = PANCETTA_BRAIN.transformPose(C.transformMs, restPose(0));
    const start = restPose(1, C.transformMs);
    expect(end.x).toBeCloseTo(start.x, 5);
    expect(end.y).toBeCloseTo(start.y, 5);
    expect(PANCETTA_BRAIN.resume?.(1, start)).toBe(C.transformMs);
  });

  it('the knockout brings him down to the front floor', () => {
    const p = PANCETTA_BRAIN.koPose(C.ko.fallMs + 10, restPose(1, C.transformMs + 900));
    expect(p.y).toBe(ARENA.floorY);
    expect(p.s).toBe(1);
  });
});
