import { describe, expect, it } from 'vitest';
import { ARENA } from '../api';
import { choosePlan, preferredX, simulate, type SimHazard, type SimHero } from './dodge';
import { CT_BOT, CT_PLAYER } from '../../../config/cartoon';

const hero: SimHero = { x: 150, y: ARENA.floorY, vx: 0, vy: 0, onGround: true, facing: 1, canDash: true, safeMs: 0 };
const still = { axisX: 0 as const, jumpAt: null, hold: false, dash: false };

describe('QA bot look-ahead', () => {
  it('with nothing coming it walks to its spot without jumping or dashing', () => {
    const r = choosePlan(hero, [], [], 260, 1);
    expect(r.hitAt).toBe(Infinity);
    expect(r.plan).toMatchObject({ axisX: 1, jumpAt: null, dash: false });
  });

  it('a low baguette rolling in: standing still is hit, the chosen plan clears it', () => {
    const low: SimHazard = { x: 330, y: ARENA.floorY - 8, vx: -320, vy: 0, ax: 0, ay: 0, w: 40, h: 12, pink: false };
    expect(simulate(hero, still, [low], []).hitAt).toBeLessThan(CT_BOT.horizonMs);
    const r = choosePlan(hero, [low], [], 150, 1);
    expect(r.hitAt).toBe(Infinity);
    expect(r.plan.jumpAt !== null || r.plan.dash).toBe(true);
  });

  it('a pink thing in mid-air is a parry, not a hit', () => {
    const air = { ...hero, y: ARENA.floorY - 60, vy: -200, onGround: false };
    const pink: SimHazard = { x: 150, y: ARENA.floorY - 76, vx: 0, vy: 0, ax: 0, ay: 0, r: 8, pink: true };
    expect(simulate(air, { ...still, hold: true }, [pink], []).hitAt).toBe(Infinity);
    expect(simulate(air, { ...still, hold: true }, [{ ...pink, pink: false }], []).hitAt).toBeLessThan(CT_BOT.horizonMs);
  });

  it('a telegraphed low whip: harmless outside its window, jumped when it is due', () => {
    const whip: SimHazard = { x: 150, y: ARENA.floorY - 13, vx: 0, vy: 0, ax: 0, ay: 0, w: 300, h: 14, pink: false, fromMs: 100, toMs: 600 };
    const hit = simulate(hero, still, [whip], []).hitAt;
    expect(hit).toBeGreaterThanOrEqual(100);
    expect(hit).toBeLessThan(150);
    expect(simulate(hero, still, [{ ...whip, fromMs: CT_BOT.horizonMs + 1 }], []).hitAt).toBe(Infinity);
    // a jump too early comes down into it
    expect(simulate(hero, { ...still, jumpAt: 0, hold: true }, [{ ...whip, fromMs: 400, toMs: 900 }], []).hitAt).toBeLessThan(CT_BOT.horizonMs);
    const r = choosePlan(hero, [whip], [], 150, 1);
    expect(r.hitAt).toBe(Infinity);
    expect(r.plan.jumpAt).not.toBeNull();
  });

  it('a boss body charging in is avoided', () => {
    const body = { box: { x: 260, y: ARENA.floorY - 90, w: 90, h: 90 }, vx: -260, vy: 0 };
    expect(simulate(hero, still, [], [body]).hitAt).toBeLessThan(CT_BOT.horizonMs);
    expect(choosePlan(hero, [], [body], 150, 1).hitAt).toBe(Infinity);
  });

  it('keeps its distance from the boss, and goes round when cornered', () => {
    const boss = { x: 480, y: 200, w: 140, h: 118 };
    expect(preferredX(100, boss)).toBe(boss.x - CT_BOT.keep);
    const left = { x: 30, y: 200, w: 120, h: 118 };
    expect(preferredX(20, left)).toBeGreaterThan(left.x + left.w);
    expect(preferredX(20, left)).toBeLessThanOrEqual(CT_PLAYER.maxX);
  });
});
