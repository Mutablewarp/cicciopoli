import { describe, expect, it } from 'vitest';
import { ScoreBook, avgFresh, breakdown, comboFor, deliveryPoints, starsFor, tipFor } from './score';
import * as strings from './strings';
import type { RushRunSummary } from './types';

const summary = (o: Partial<RushRunSummary>): RushRunSummary => ({
  seed: 1,
  daily: false,
  driver: 'riflessi',
  completed: false,
  reachedEnd: true,
  score: 0,
  points: { deliveries: 0, fresh: 0, sky: 0, passes: 0, zones: 0, pickups: 0 },
  delivered: 0,
  perfect: 0,
  fresh: [],
  collisions: 0,
  bestCombo: 1,
  flew: false,
  ...o,
});

describe('score', () => {
  it('combo: x1, +0.25 every 4 clean passes, capped at x3', () => {
    expect([0, 3, 4, 8, 31, 32, 200].map(comboFor)).toEqual([1, 1, 1.25, 1.5, 2.75, 3, 3]);
    const b = new ScoreBook();
    const got = Array.from({ length: 5 }, () => b.pass());
    expect(got.map((p) => p.points)).toEqual([15, 15, 15, 15, 19]);
    expect(got.map((p) => p.up)).toEqual([false, false, false, true, false]);
    expect(b.points.passes).toBe(79);
    b.streak = 0;
    expect(b.combo).toBe(1);
    expect(b.bestCombo).toBe(1.25);
  });

  it('hand-off: 1000 + freshness 0..500 + 200 from the sky', () => {
    expect(deliveryPoints(100, false)).toEqual({ base: 1000, fresh: 500, sky: 0 });
    expect(deliveryPoints(80, true)).toEqual({ base: 1000, fresh: 400, sky: 200 });
    expect(deliveryPoints(-5, false).fresh).toBe(0);
  });

  it('stars follow the brief', () => {
    expect(starsFor(summary({ delivered: 0 }))).toBe(0);
    expect(starsFor(summary({ delivered: 1, score: 9000 }))).toBe(1);
    expect(starsFor(summary({ delivered: 2, score: 2499 }))).toBe(1);
    expect(starsFor(summary({ delivered: 2, score: 2500 }))).toBe(2);
    expect(starsFor(summary({ delivered: 3, score: 5000, fresh: [90, 80, 70], collisions: 0 }))).toBe(3);
    expect(starsFor(summary({ delivered: 3, score: 5000, fresh: [90, 80, 60], collisions: 0 }))).toBe(2);
    expect(starsFor(summary({ delivered: 3, score: 5000, fresh: [100, 100, 100], collisions: 1 }))).toBe(2);
    expect(avgFresh(summary({ fresh: [] }))).toBe(0);
  });

  it('breakdown rows add up to the score (sky row only when earned)', () => {
    const p = { deliveries: 3000, fresh: 1300, sky: 0, passes: 2150, zones: 600, pickups: 75 };
    const rows = breakdown(p);
    expect(rows.map((r) => r.label)).not.toContain(strings.BREAKDOWN_TEXT.sky);
    expect(rows.reduce((a, r) => a + r.points, 0)).toBe(7125);
    expect(breakdown({ ...p, sky: 200 })).toHaveLength(6);
  });

  it('one encouraging tip', () => {
    expect(tipFor(summary({ score: 4850, delivered: 1 }), 5000)).toBe('Ti mancavano 150 punti per il tuo record!');
    // a run that could never set the record does not count the gap
    expect(tipFor(summary({ score: 4850, delivered: 1, reachedEnd: false }), 5000)).toBe(strings.TIP_TEXT.brake);
    expect(tipFor(summary({ score: 800 }), 1000)).toBe(strings.TIP_TEXT.deliver);
    expect(tipFor(summary({ score: 5200, delivered: 2, reachedEnd: false }), 5000)).toBe(strings.TIP_TEXT.recordRule);
    const perfect = summary({ delivered: 3, completed: true, fresh: [95, 92, 90], bestCombo: 3, score: 12000 });
    expect(tipFor(perfect, 0)).toBe(strings.TIP_TEXT.perfect);
    expect(tipFor({ ...perfect, daily: true }, 0)).toBe('Corsa perfetta! Torna domani per la nuova SFIDA DEL GIORNO.');
    expect(tipFor(summary({ delivered: 3, completed: true, collisions: 1, fresh: [90, 90, 90] }), 0)).toBe(
      'Evita un urto per la terza stella!',
    );
    expect(tipFor(summary({ delivered: 0 }), 0)).toBe(strings.TIP_TEXT.deliver);
    expect(tipFor(summary({ delivered: 1, reachedEnd: false }), 0)).toBe(strings.TIP_TEXT.brake);
  });

  it('Italian number format and share text', () => {
    expect(strings.formatPoints(5250)).toBe('5.250');
    expect(strings.formatPoints(1234567)).toBe('1.234.567');
    expect(strings.formatPoints(999)).toBe('999');
    expect(strings.shareText(5250)).toBe("Ho fatto 5.250 punti su Ciccio's Rush! Riesci a battermi?");
    expect(strings.comboText(1.25)).toBe('COMBO x1,25');
    expect(strings.dailyLabel(new Date(2026, 9, 20))).toBe('SFIDA DEL 20 OTTOBRE');
  });

  it('accented capitals the pixel font cannot draw', () => {
    expect(strings.pixelCaps('TALÌA CHE VELOCITÀ!')).toBe("TALIA CHE VELOCITA'!");
    expect(strings.pixelCaps('AMUNÌ, CHE FAME!')).toBe("AMUNI', CHE FAME!");
    expect(strings.pixelCaps('Più è già')).toBe('Più è già');
  });

  it('no forbidden name anywhere in the player-facing texts', () => {
    const all = JSON.stringify(strings).toLowerCase() + strings.orderText('Big + Fries', 'Turi', "Ciccio's Terrasini", 'mare');
    for (const w of ['tesla', 'elon', 'spacex', 'starman', 'hulk', 'pac-man', 'mondello']) expect(all).not.toContain(w);
    expect(strings.ZONE_TEXT.mare.name).toBe('LUNGOMARE TERRASINI');
    expect(strings.RUSH_TEXT.roadcoaster).toBe('ROADCOASTER ATTIVATA!');
    expect(strings.RUSH_TEXT.card).toContain('Ciccio nello Spazio dal 2021');
  });
});
