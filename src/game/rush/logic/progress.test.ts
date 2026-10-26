import { describe, expect, it } from 'vitest';
import type { SaveData, SaveStore } from '../../../contracts';
import { RUSH_STORE } from '../../../config/rush';
import { DEFAULT_SETTINGS, RushProgress, type KeyValueStore } from './progress';
import { settleRun } from './results';
import { dailySeed } from './rng';
import type { RushRunSummary } from './types';

const DAY = new Date(2026, 9, 20, 18);

function memory(init: Record<string, string> = {}): KeyValueStore & { map: Record<string, string> } {
  const map = { ...init };
  return { map, getItem: (k) => map[k] ?? null, setItem: (k, v) => void (map[k] = v) };
}

function fakeSave(best = 0): SaveStore {
  const data: SaveData = { best: best ? { 6: best } : {}, completed: [], muted: false };
  return {
    data,
    recordWin(level, score) {
      const isBest = score > (data.best[level] ?? -1);
      if (isBest) data.best[level] = score;
      return isBest;
    },
    setMuted: () => undefined,
  };
}

const run = (o: Partial<RushRunSummary>): RushRunSummary => ({
  seed: 1,
  daily: false,
  driver: 'riflessi',
  completed: false,
  reachedEnd: true,
  score: 3000,
  points: { deliveries: 1000, fresh: 450, sky: 0, passes: 1250, zones: 300, pickups: 0, nearMiss: 0, chains: 0, fever: 0 },
  delivered: 1,
  perfect: 1,
  fresh: [90],
  collisions: 0,
  bestCombo: 2,
  flew: false,
  nearMisses: 0,
  chains: 0,
  fevers: 0,
  ...o,
});

describe('RushProgress', () => {
  it('starts with the standard driver, defaults and the hints', () => {
    const p = new RushProgress(memory());
    expect(p.data.unlocked).toEqual(['riflessi']);
    expect(p.data.settings).toEqual(DEFAULT_SETTINGS);
    const info = p.setupInfo(0, DAY);
    expect(info.drivers.map((d) => [d.id, d.locked])).toEqual([
      ['riflessi', false],
      ['occhio', true],
      ['consegne', true],
    ]);
    expect(info.drivers[1].unlockHint).toBe('Fai la tua prima consegna.');
    expect(info.achievements.find((a) => a.id === 'vola')).toMatchObject({ name: '???', unlocked: false });
    expect(info.daily).toEqual({ label: 'SFIDA DEL 20 OTTOBRE', best: null });
    expect(p.optionsFor(false, DAY, 42)).toEqual({ seed: 42, driver: 'riflessi', daily: false, hints: true });
  });

  it('records achievements, unlocks drivers and round-trips through the store', () => {
    const store = memory();
    const p = new RushProgress(store);
    const out = p.recordRun(run({ delivered: 3, completed: true, perfect: 3, fresh: [95, 92, 91], bestCombo: 3, flew: true }), DAY);
    expect(out.newAchievements.map((a) => a.name)).toEqual([
      'PRIMA CONSEGNA',
      'ZERO URTI',
      'RE DI PALERMO',
      'TRIS PERFETTO',
      'MAESTRO DEL TRAFFICO',
      'IL TRUCK VOLA!',
    ]);
    expect(out.unlockedDrivers).toEqual(['OCCHIO AL TRAFFICO', 'RE DELLE CONSEGNE']);
    p.setDriver('consegne');
    p.setSettings({ ...DEFAULT_SETTINGS, swipe: false, music: false });
    p.markFirstRunDone();
    const again = new RushProgress(store);
    expect(again.data).toEqual(p.data);
    expect(again.data.bestStars).toBe(3);
    expect(again.optionsFor(true, DAY, 42)).toEqual({ seed: dailySeed(DAY), driver: 'riflessi', daily: true, hints: false });
    expect(again.recordRun(run({}), DAY).newAchievements).toEqual([]);
  });

  it('v9 achievements: MAESTRO DEL PELO, CATENA D\'ORO, FEBBRE DA CICCIO (per run)', () => {
    const p = new RushProgress(memory());
    expect(p.recordRun(run({ nearMisses: 9, chains: 2, fevers: 1 }), DAY).newAchievements.map((a) => a.name)).toEqual(['PRIMA CONSEGNA', 'ZERO URTI']);
    expect(p.recordRun(run({ nearMisses: 10, chains: 3, fevers: 2 }), DAY).newAchievements.map((a) => a.name)).toEqual([
      'MAESTRO DEL PELO',
      "CATENA D'ORO",
      'FEBBRE DA CICCIO',
    ]);
    expect(p.setupInfo(0, DAY).achievements.filter((a) => a.unlocked).map((a) => a.id)).toEqual(['prima', 'zero', 'pelo', 'catena', 'febbre']);
  });

  it('survives corrupted or hostile data and a throwing storage', () => {
    expect(new RushProgress(memory({ [RUSH_STORE.key]: '{not json' })).data.driver).toBe('riflessi');
    const odd = new RushProgress(
      memory({
        [RUSH_STORE.key]: JSON.stringify({
          driver: 'consegne',
          unlocked: ['occhio', 'hacker'],
          achievements: ['prima', 42],
          bestStars: 7,
          daily: { bad: 5, '2026-10-20': -3, '2026-10-19': 1200.7 },
          settings: { swipe: 'ultra', vibration: 'yes', music: false },
          firstRunDone: 'true',
        }),
      }),
    );
    expect(odd.data).toEqual({
      driver: 'riflessi',
      unlocked: ['riflessi', 'occhio'],
      achievements: ['prima'],
      bestStars: 0,
      daily: { '2026-10-19': 1200 },
      settings: { ...DEFAULT_SETTINGS, music: false },
      firstRunDone: false,
    });
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    const p = new RushProgress(broken);
    expect(() => p.recordRun(run({}), DAY)).not.toThrow();
    expect(p.data.achievements).toContain('prima');
    expect(new RushProgress(null).data.firstRunDone).toBe(false);
  });

  it('keeps one best per day, only the last days', () => {
    const p = new RushProgress(memory());
    for (let i = 0; i < 20; i++) p.recordRun(run({ daily: true, score: 100 + i }), new Date(2026, 9, i + 1));
    expect(Object.keys(p.data.daily)).toHaveLength(RUSH_STORE.dailyKeep);
    expect(p.recordRun(run({ daily: true, score: 50 }), new Date(2026, 9, 20)).prevDailyBest).toBe(119);
    expect(p.data.daily['2026-10-20']).toBe(119);
  });
});

describe('settleRun', () => {
  it('records the level best through SaveStore and builds the results screen', () => {
    const save = fakeSave(2800);
    const res = settleRun(run({ score: 3000 }), new RushProgress(memory()), save, DAY);
    expect(res).toMatchObject({ completed: false, daily: false, score: 3000, best: 3000, newBest: true, stars: 1, delivered: 1, avgFresh: 90 });
    expect(res.breakdown.reduce((a, r) => a + r.points, 0)).toBe(3000);
    expect(res.unlockedDriver).toBe('OCCHIO AL TRAFFICO');
    expect(res.shareText).toBe("Ho fatto 3.000 punti su Ciccio's Rush! Riesci a battermi?");
    expect(save.data.best[6]).toBe(3000);
  });

  it('a run ended by a crash or without deliveries is not a record; the tips never promise one', () => {
    const save = fakeSave(5000);
    const res = settleRun(run({ score: 4850, reachedEnd: false }), new RushProgress(memory()), save, DAY);
    expect(res).toMatchObject({ best: 5000, newBest: false, tip: 'Tieni premuto FRENA per passare tra le auto!' });
    expect(settleRun(run({ score: 4850 }), new RushProgress(memory()), save, DAY).tip).toBe('Ti mancavano 150 punti per il tuo record!');
    const crashedHigh = settleRun(run({ score: 6000, reachedEnd: false }), new RushProgress(memory()), save, DAY);
    expect(crashedHigh).toMatchObject({ best: 5000, newBest: false, tip: 'Il record conta solo se arrivi alla fine con almeno una consegna!' });
    expect(save.data.best[6]).toBe(5000);
    expect('unlockedDriver' in settleRun(run({ delivered: 0, fresh: [] }), new RushProgress(memory()), fakeSave(), DAY)).toBe(false);
  });

  it('a daily run shows the day best', () => {
    const p = new RushProgress(memory());
    const save = fakeSave(9000);
    expect(settleRun(run({ daily: true, score: 3000 }), p, save, DAY)).toMatchObject({ daily: true, best: 3000, newBest: true });
    expect(settleRun(run({ daily: true, score: 2000 }), p, save, DAY)).toMatchObject({ best: 3000, newBest: false });
  });

  it('a daily run that crashed out or delivered nothing never sets the day best', () => {
    const p = new RushProgress(memory());
    const crash = settleRun(run({ daily: true, score: 250, delivered: 0, fresh: [], reachedEnd: false }), p, fakeSave(), DAY);
    expect(crash).toMatchObject({ newBest: false, best: 0 });
    expect(p.data.daily).toEqual({});
    expect(settleRun(run({ daily: true, score: 900, delivered: 0, fresh: [] }), p, fakeSave(), DAY)).toMatchObject({ newBest: false });
    expect(p.setupInfo(0, DAY).daily.best).toBeNull();
    expect(settleRun(run({ daily: true, score: 3000 }), p, fakeSave(), DAY)).toMatchObject({ newBest: true, best: 3000 });
    expect(settleRun(run({ daily: true, score: 3500, reachedEnd: false }), p, fakeSave(), DAY)).toMatchObject({ newBest: false, best: 3000 });
    expect(p.data.daily['2026-10-20']).toBe(3000);
  });
});
