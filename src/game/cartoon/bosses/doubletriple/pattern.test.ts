import { describe, expect, it } from 'vitest';
import { ARENA } from '../../api';
import { hopClearSpan, HERO, jumpable, minGap, overhead } from '../oldschool/kit/geometry';
import { seeded } from '../oldschool/kit/paint';
import { MIN_TELE_MS } from '../oldschool/kit/scheduler';
import { bands, DECK1, DECK2, frisbeeThrow, frisbeeY, hopTarget, salsaVolley, stompStops, whipBox } from './pattern';
import { DT } from './tuning';

const F = ARENA.floorY;

describe('DOUBLE TRIPLE patterns', () => {
  it('every attack telegraphs >= 500 ms and fires inside its act', () => {
    for (const a of [...DECK1, ...DECK2]) {
      expect(a.teleMs, a.id).toBeGreaterThanOrEqual(MIN_TELE_MS);
      expect(a.restMs, a.id).toBeGreaterThanOrEqual(400);
      a.fireAt.forEach((t, i) => {
        expect(t).toBeLessThan(a.actMs);
        if (i > 0) expect(t - a.fireAt[i - 1]).toBeGreaterThanOrEqual(100);
      });
    }
    expect(DECK1.length).toBeGreaterThanOrEqual(3);
    expect(DECK2.length).toBeGreaterThanOrEqual(3);
  });

  it('frisbees and whips come one low (jump it) and one high (stay under it)', () => {
    for (let seed = 1; seed < 50; seed++) expect([...bands(seeded(seed))].sort()).toEqual(['high', 'low']);
    expect(jumpable(frisbeeY('low') - DT.frisbee.h / 2)).toBe(true);
    expect(overhead(frisbeeY('high') + DT.frisbee.h / 2)).toBe(true);
    const low = whipBox(DT.home.x, 'low');
    const high = whipBox(DT.home.x, 'high');
    expect(jumpable(low.y)).toBe(true);
    expect(overhead(high.y + high.h)).toBe(true);
    expect(low.x).toBeGreaterThan(HERO.w * 2);
  });

  it('a frisbee turns inside the arena and comes back to the thrower', () => {
    for (const x0 of [440, 380]) {
      const { vx, ax, lifeMs } = frisbeeThrow(x0);
      const t = lifeMs / 1000;
      expect(x0 + vx * (t / 2) + 0.5 * ax * (t / 2) ** 2).toBeCloseTo(DT.frisbee.turnX);
      expect(x0 + vx * t + 0.5 * ax * t * t).toBeCloseTo(x0);
    }
  });

  it('both frisbees are home before the next attack winds up (no boomerang crosses another attack)', () => {
    for (const [deck, x] of [[DECK1, DT.home.x], [DECK2, DT.minis[1].x]] as const) {
      const a = deck.find((d) => d.id === 'frisbee');
      expect(a).toBeDefined();
      if (a) expect(a.actMs).toBeGreaterThanOrEqual(a.fireAt[a.fireAt.length - 1] + frisbeeThrow(x).lifeMs);
    }
  });

  it('a frisbee is in its lane (a 100-unit dip within 4) before it has flown 120 units', () => {
    const { vx, ax } = frisbeeThrow(DT.home.x);
    const t = (-vx - Math.sqrt(vx * vx - 2 * ax * 120)) / ax;
    expect(100 * Math.exp((-t * 1000) / DT.frisbee.glideMs)).toBeLessThan(4);
  });

  it('three cheddar waves leave room to land between them', () => {
    const c = DT.cheddar;
    expect(F - c.h).toBeGreaterThanOrEqual(F - HERO.jumpClear / 2);
    expect((c.gapMs - 50) * c.speed / 1000 - c.w).toBeGreaterThanOrEqual(HERO.w + 40);
  });

  it('the stomp is shadowed >= 500 ms ahead and can be run under', () => {
    expect(DT.stomp.flightMs).toBeGreaterThanOrEqual(MIN_TELE_MS);
    const [s0, s1] = hopClearSpan(DT.stomp.apex);
    expect(s1 - s0).toBeGreaterThan(0.7);
    expect(stompStops()[2].x).toBe(DT.home.x);
    expect(hopTarget(999).x).toBe(DT.hop.maxX);
  });

  it('salsa rain always leaves a safe gap and one pink drop', () => {
    for (let seed = 1; seed < 400; seed++) {
      const v = salsaVolley(seeded(seed));
      expect(v.pink).toBeLessThan(DT.salsa.count);
      expect(minGap(v.xs, DT.salsa.r + 2)).toBeGreaterThanOrEqual(HERO.w + 8);
    }
  });
});
