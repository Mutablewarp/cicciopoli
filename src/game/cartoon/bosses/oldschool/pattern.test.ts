import { describe, expect, it } from 'vitest';
import { ARENA } from '../../api';
import { hopClearSpan, jumpable, minGap, HERO } from './kit/geometry';
import { seeded } from './kit/paint';
import { MIN_TELE_MS } from './kit/scheduler';
import { DECK1, DECK2, hopStops1, hopTarget, POUND_CYCLE_MS, poundStage, sauceVolley, sweepFrom } from './pattern';
import { OS } from './tuning';

const F = ARENA.floorY;

describe('THE OLD SCHOOL patterns', () => {
  it('every attack telegraphs >= 500 ms and fires inside its act', () => {
    for (const a of [...DECK1, ...DECK2]) {
      expect(a.teleMs, a.id).toBeGreaterThanOrEqual(MIN_TELE_MS);
      expect(a.restMs, a.id).toBeGreaterThanOrEqual(400);
      a.fireAt.forEach((t, i) => {
        expect(t).toBeLessThan(a.actMs);
        if (i > 0) expect(t).toBeGreaterThan(a.fireAt[i - 1]);
      });
    }
    expect(new Set(DECK1.map((a) => a.id)).size).toBeGreaterThanOrEqual(3);
    expect(new Set(DECK2.map((a) => a.id)).size).toBeGreaterThanOrEqual(3);
  });

  it('shockwaves and the floor sweep can be jumped', () => {
    expect(jumpable(F - OS.wave.h - 6)).toBe(true);
    expect(jumpable(F - OS.sweep.h - 2)).toBe(true);
  });

  it('each pound locks over its target (the telegraph) >= 500 ms before slamming', () => {
    expect(OS.pound.lockMs).toBeGreaterThanOrEqual(MIN_TELE_MS);
    expect(poundStage(OS.pound.trackMs + 1).stage).toBe('lock');
    expect(poundStage(OS.pound.trackMs + OS.pound.lockMs + 1).stage).toBe('slam');
    const pound = DECK2.find((a) => a.id === 'pound');
    expect(pound?.fireAt[1]).toBeGreaterThanOrEqual(POUND_CYCLE_MS);
  });

  it('sauce volleys always leave a safe gap and one pink drop', () => {
    for (let seed = 1; seed < 400; seed++) {
      for (const n of OS.sauce.counts) {
        const v = sauceVolley(seeded(seed), n);
        expect(v.xs).toHaveLength(n);
        expect(v.pink).toBeGreaterThanOrEqual(0);
        expect(v.pink).toBeLessThan(n);
        expect(minGap(v.xs, OS.sauce.r + 2)).toBeGreaterThanOrEqual(HERO.w + 8);
      }
    }
    expect(OS.sauce.flightMs).toBeGreaterThanOrEqual(MIN_TELE_MS);
  });

  it('hops are shadowed >= 500 ms ahead, stay in the free floor and can be passed under', () => {
    expect(OS.hop.ms).toBeGreaterThanOrEqual(MIN_TELE_MS);
    const stops = hopStops1();
    expect(stops[0]).toEqual(OS.grip);
    expect(stops[stops.length - 1]).toEqual(OS.grip);
    expect(hopTarget(-50).x).toBe(OS.hop.minX);
    expect(hopTarget(900).x).toBe(OS.hop.maxX);
    const [s0, s1] = hopClearSpan(OS.hop.apex);
    expect(s1 - s0).toBeGreaterThan(0.6);
  });

  it('the sweep starts on the far side of the player', () => {
    for (const px of [20, 150, 240, 300, 460]) {
      const { x0 } = sweepFrom(px);
      expect(Math.abs(x0 - px)).toBeGreaterThanOrEqual(150);
    }
  });
});
