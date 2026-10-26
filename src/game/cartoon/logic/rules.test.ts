import { describe, expect, it } from 'vitest';
import { CT_CARDS, CT_PLAYER } from '../../../config/cartoon';
import {
  addCards,
  betterGrade,
  bossTempo,
  boxesOverlap,
  bumpX,
  cardsForDamage,
  circleHitsBox,
  gradeOf,
  nextWeapon,
  parMs,
  parryHits,
  scoreOf,
  shapeBox,
  superAction,
  tipFor,
  TIPS,
  type RoundStats,
} from './rules';

const hero = { x: 100, y: 280, w: CT_PLAYER.hitW, h: CT_PLAYER.hitH };
const perfect: RoundStats = { timeMs: 40_000, hp: 3, maxHp: 3, parries: 3, supers: 5, damage: 2000, bossHp: 2000 };

describe('geometry', () => {
  it('boxes and circles', () => {
    expect(boxesOverlap(hero, { x: 110, y: 290, w: 30, h: 30 })).toBe(true);
    expect(boxesOverlap(hero, { x: 200, y: 290, w: 30, h: 30 })).toBe(false);
    expect(circleHitsBox({ x: 100 + CT_PLAYER.hitW + 5, y: 290 }, 6, hero)).toBe(true);
    expect(circleHitsBox({ x: 100 + CT_PLAYER.hitW + 7, y: 290 }, 6, hero)).toBe(false);
    expect(shapeBox({ x: 50, y: 40, w: 20, h: 10 })).toEqual({ x: 40, y: 35, w: 20, h: 10 });
    expect(shapeBox({ x: 50, y: 40, r: 5 })).toEqual({ x: 45, y: 35, w: 10, h: 10 });
  });
});

describe('touching a slow boss', () => {
  const body = { x: 440, y: 150, w: 130, h: 168 };
  const at = (x: number) => ({ ...hero, x: x - hero.w / 2 });
  it('pushes the hero out on the side of its centre', () => {
    expect(bumpX(at(445), body, 20, 620)).toBe(440 - hero.w / 2);
    expect(bumpX(at(560), body, 20, 620)).toBe(570 + hero.w / 2);
  });
  it('the other side when a wall is in the way, null when neither side has room', () => {
    expect(bumpX(at(560), { ...body, x: 490 }, 20, 620)).toBe(490 - hero.w / 2);
    expect(bumpX(at(30), { x: 0, y: 150, w: 640, h: 168 }, 20, 620)).toBeNull();
  });
});

describe('parry window', () => {
  const pinkNear = { x: hero.x + hero.w + CT_PLAYER.parryPad + 3, y: 290, r: 5, pink: true };
  it('pops a pink thing inside the padded box while the window is open', () => {
    expect(parryHits(100, hero, pinkNear)).toBe(true);
  });
  it('never when closed, never on a plain hazard, never out of reach', () => {
    expect(parryHits(0, hero, pinkNear)).toBe(false);
    expect(parryHits(100, hero, { ...pinkNear, pink: false })).toBe(false);
    expect(parryHits(100, hero, { ...pinkNear, x: pinkNear.x + 20 })).toBe(false);
  });
});

describe('cards', () => {
  it('fill by damage and clamp to the max', () => {
    expect(cardsForDamage(1 / CT_CARDS.perDamage)).toBeCloseTo(1);
    expect(addCards(4.8, 1)).toBe(CT_CARDS.max);
    expect(addCards(0.5, -2)).toBe(0);
  });
  it('SUPER spends 5 for the rain, 1 for an EX, nothing below', () => {
    expect(superAction(5)).toBe('super');
    expect(superAction(4.99)).toBe('ex');
    expect(superAction(1)).toBe('ex');
    expect(superAction(0.99)).toBeNull();
  });
  it('ARMA cycles the three weapons', () => {
    expect(nextWeapon('provola')).toBe('meatball');
    expect(nextWeapon('meatball')).toBe('nuggets');
    expect(nextWeapon('nuggets')).toBe('provola');
  });
});

describe('grade and score', () => {
  it('a perfect round is A+, a sloppy one D', () => {
    expect(gradeOf(perfect)).toBe('A+');
    expect(gradeOf({ ...perfect, timeMs: 10 * 60_000, hp: 1, parries: 0, supers: 0 })).toBe('D');
  });
  it('the grade improves with every component', () => {
    const base = { ...perfect, timeMs: parMs(2000) * 1.6, hp: 1, parries: 0, supers: 0 };
    const g0 = gradeOf(base);
    expect(betterGrade(gradeOf({ ...base, hp: 3 }), g0)).toBe(gradeOf({ ...base, hp: 3 }));
    expect(betterGrade(gradeOf({ ...base, parries: 3, supers: 5 }), g0)).toBe(gradeOf({ ...base, parries: 3, supers: 5 }));
  });
  it('par time is clamped', () => {
    expect(parMs(1)).toBeGreaterThanOrEqual(45_000);
    expect(parMs(1e9)).toBeLessThanOrEqual(110_000);
  });
  it('a knockout scores more than the same damage lost', () => {
    expect(scoreOf(perfect, 'A+')).toBeGreaterThan(scoreOf(perfect, null));
    expect(scoreOf(perfect, null)).toBe(2 * 2000 + 3 * 150);
  });
  it('best grade keeps the better one', () => {
    expect(betterGrade('B', 'A+')).toBe('A+');
    expect(betterGrade('A', 'C')).toBe('A');
    expect(betterGrade(null, 'D')).toBe('D');
  });
  it('the tip points at the weakest part', () => {
    expect(tipFor({ ...perfect, hp: 1 }, true)).toBe(TIPS.hp);
    expect(tipFor({ ...perfect, parries: 0, supers: 5 }, true)).toBe(TIPS.parries);
    expect(tipFor(perfect, true)).toBe(TIPS.great);
    expect(tipFor(perfect, false)).toBe(TIPS.lost);
  });
});

describe('boss pacing', () => {
  const pace = { tempo: 0.9, openFrom: 0.4, openMs: 5000, hp: 1, mercyMs: 0 };
  it('eases from openFrom up to tempo over the opening, then holds', () => {
    expect(bossTempo(pace, 0)).toBeCloseTo(0.4);
    expect(bossTempo(pace, 2500)).toBeCloseTo(0.65);
    expect(bossTempo(pace, 5000)).toBeCloseTo(0.9);
    expect(bossTempo(pace, 60_000)).toBeCloseTo(0.9);
    expect(bossTempo(pace, 1000)).toBeLessThan(bossTempo(pace, 2000));
  });
  it('no opening: the tempo from the start', () => {
    expect(bossTempo({ tempo: 1, openFrom: 0.2, openMs: 0, hp: 1, mercyMs: 0 }, 0)).toBe(1);
  });
});
