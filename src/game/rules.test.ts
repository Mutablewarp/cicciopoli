import { describe, expect, it } from 'vitest';
import { SCORE } from '../config/tuning';
import { clearBonus, collect, createRun, enemyHit, killPoints, nextLevel, pitFall, Timer } from './rules';

describe('run rules', () => {
  it('starts with 4 hearts and the cup score 161', () => {
    const r = createRun(1);
    expect(r.hearts).toBe(4);
    expect(r.score).toBe(161);
  });

  it('scores pickups and grants powers once', () => {
    const r = createRun(1);
    expect(collect(r, 'nugget').points).toBe(10);
    expect(collect(r, 'fries').points).toBe(30);
    expect(collect(r, 'goat').gained).toBe('goat');
    expect(collect(r, 'goat').gained).toBeNull();
    expect(r.score).toBe(161 + 10 + 30 + 50 + 50);
    expect(r.powers.goat).toBe(true);
    expect(collect(r, 'nugget').gained).toBeNull();
  });

  it('burger heals only a missing heart', () => {
    const r = createRun(1);
    expect(collect(r, 'burger').healed).toBe(false);
    enemyHit(r);
    expect(r.hearts).toBe(3);
    expect(collect(r, 'burger').healed).toBe(true);
    expect(r.hearts).toBe(4);
  });

  it('brie absorbs one enemy hit instead of a heart', () => {
    const r = createRun(1);
    collect(r, 'brie');
    expect(enemyHit(r)).toBe('shield');
    expect(r.hearts).toBe(4);
    expect(r.powers.brie).toBe(false);
    expect(enemyHit(r)).toBe('hurt');
    expect(r.hearts).toBe(3);
  });

  it('pits ignore the shield (a heart is lost) and keep every power, brie too', () => {
    const r = createRun(1);
    collect(r, 'brie');
    collect(r, 'thai');
    expect(pitFall(r)).toBe('respawn');
    expect(r.hearts).toBe(3);
    expect(r.powers).toEqual({ brie: true, goat: false, thai: true, wings: false });
  });

  it('reports death at zero hearts', () => {
    const r = createRun(2);
    r.hearts = 1;
    expect(enemyHit(r)).toBe('dead');
    r.hearts = 1;
    expect(pitFall(r)).toBe('dead');
  });

  it('kill and clear bonuses follow the table', () => {
    expect(killPoints('stomp')).toBe(30);
    expect(killPoints('club')).toBe(40);
    expect(killPoints('cheese')).toBe(45);
    const r1 = createRun(1);
    expect(clearBonus(r1)).toBe(SCORE.clear[1]);
    const r2 = createRun(2);
    expect(clearBonus(r2)).toBe(200);
    expect(clearBonus(createRun(3))).toBe(300);
  });

  it('chains the levels 1 → 2 → 3 → 4, the last has no next', () => {
    expect(nextLevel(1)).toBe(2);
    expect(nextLevel(2)).toBe(3);
    expect(nextLevel(3)).toBe(4);
    expect(nextLevel(4)).toBe(5);
    expect(nextLevel(5)).toBe(6);
    expect(nextLevel(6)).toBeNull();
  });
});

describe('Timer', () => {
  it('counts down and blinks while active', () => {
    const t = new Timer();
    t.start(1600);
    expect(t.active).toBe(true);
    const phases = new Set<boolean>();
    for (let i = 0; i < 20; i++) {
      t.tick(16);
      phases.add(t.blinkOn(14));
    }
    expect(phases.size).toBe(2);
    t.tick(5000);
    expect(t.active).toBe(false);
    expect(t.blinkOn(14)).toBe(true);
  });

  it('start never shortens a running window', () => {
    const t = new Timer();
    t.start(1000);
    t.start(200);
    expect(t.remaining).toBe(1000);
  });
});
