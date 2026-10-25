import { describe, expect, it } from 'vitest';
import { ARENA } from '../../../api';
import { hazardEndMs, survivable } from './fairness';
import { hold, line, rng } from './paths';
import type { AttackPlan, Brain, HazardPlan } from './timeline';

type Id = 'x';
const F = ARENA.floorY;

function brain(hazards: HazardPlan[]): Brain<Id> {
  const plan: AttackPlan = { hazards, marks: [], cues: [] };
  return {
    attacks: [{ id: 'x', telegraphMs: 600, activeMs: 3000, recoverMs: 500, phases: [0], weight: 1 }],
    introMs: 0,
    transformMs: 0,
    koMs: 0,
    openers: {},
    plan: () => plan,
    rest: () => ({ x: 560, y: F, s: 1, f: -1 }),
    transformPose: (_t, p) => p,
    koPose: (_t, p) => p,
    boxes: (p) => ({ hurt: [], body: [{ x: p.x - 40, y: p.y - 120, w: 80, h: 120 }] }),
  };
}
const ctx = { phase: 0, playerX: 200, from: { x: 560, y: F, s: 1, f: -1 as const }, rng: rng(1) };
const low = (atMs: number, x: number): HazardPlan => ({ atMs, kind: 'k', w: 30, h: 10, lifeMs: 3000, path: line(x, F - 5, -300) });

describe('fairness model', () => {
  it('a low hazard can be jumped', () => {
    expect(survivable(brain([low(0, 520)]), 'x', ctx)).toBe(true);
  });

  it('a floor-to-sky wall sweeping the arena cannot be dodged', () => {
    const wall: HazardPlan = { atMs: 0, kind: 'k', w: 24, h: 360, lifeMs: 3000, path: line(500, 180, -300) };
    expect(survivable(brain([wall]), 'x', ctx)).toBe(false);
  });

  it('a train of low hazards longer than one jump, with no room to land between, cannot be dodged', () => {
    expect(survivable(brain(Array.from({ length: 8 }, (_, i) => low(i * 120, 520))), 'x', ctx)).toBe(false);
  });

  it('the same train with landing room between the cars can be dodged', () => {
    expect(survivable(brain(Array.from({ length: 4 }, (_, i) => low(i * 800, 520))), 'x', ctx)).toBe(true);
  });

  it('a hazard parked on the hero with no time to move is a hit', () => {
    const trap: HazardPlan = { atMs: 0, kind: 'k', w: 600, h: 300, lifeMs: 2000, path: hold({ x: 300, y: 200 }) };
    expect(survivable(brain([trap]), 'x', ctx)).toBe(false);
  });

  it('a hazard ends when it leaves the arena', () => {
    expect(hazardEndMs(low(0, 520))).toBeLessThan(2100);
  });
});
