import { describe, expect, it } from 'vitest';
import { cardFills, defeatLine, gradeTone, percent, superLabel, SUPER_CARDS } from './text';

describe('super cards', () => {
  it('fills whole cards, then the one being filled', () => {
    expect(cardFills(2.4)).toEqual([1, 1, 0.4, 0, 0]);
    expect(cardFills(0)).toEqual([0, 0, 0, 0, 0]);
    expect(cardFills(SUPER_CARDS)).toEqual([1, 1, 1, 1, 1]);
  });

  it('clamps bad values and treats float drift as a full card', () => {
    expect(cardFills(-3)).toEqual([0, 0, 0, 0, 0]);
    expect(cardFills(99)).toEqual([1, 1, 1, 1, 1]);
    expect(cardFills(Number.NaN)).toEqual([0, 0, 0, 0, 0]);
    expect(cardFills(0.9999)[0]).toBe(1);
  });

  it('SUPER reads EX until all five cards are full', () => {
    expect([0, 1, 4, 5].map(superLabel)).toEqual(['EX', 'EX', 'EX', 'SUPER']);
  });
});

describe('report card', () => {
  it('grade stamp tones', () => {
    expect(['A+', 'A', 'B', 'C', 'D', null].map(gradeTone)).toEqual(['top', 'top', 'good', 'ok', 'low', 'low']);
  });

  it('percent clamps and rounds', () => {
    expect([0.724, 1.2, -1, Number.NaN].map(percent)).toEqual(['72%', '100%', '0%', '0%']);
  });

  it('the defeat line fits how far the boss was pushed', () => {
    expect(defeatLine('DON TUMA', 0.72)).toBe('Mancava solo il 28%: ci sei quasi!');
    expect(defeatLine('DON TUMA', 0.4)).toBe('Hai fatto il 40% del lavoro. Riprova!');
    expect(defeatLine('DON TUMA', 0.1)).toContain('DON TUMA');
  });
});
