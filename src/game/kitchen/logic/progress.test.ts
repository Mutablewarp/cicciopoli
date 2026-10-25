import { describe, expect, it } from 'vitest';
import type { SaveData, SaveStore } from '../../../contracts';
import { KITCHEN_STORE } from '../../../config/kitchen';
import type { KeyValueStore } from '../../rush/logic/progress';
import { DEFAULT_KITCHEN_SETTINGS, KitchenProgress } from './progress';
import { settleShift } from './results';
import type { KitchenShiftSummary } from './types';

function memory(init: Record<string, string> = {}): KeyValueStore & { map: Record<string, string> } {
  const map = { ...init };
  return { map, getItem: (k) => map[k] ?? null, setItem: (k, v) => void (map[k] = v) };
}

function fakeSave(best = 0): SaveStore {
  const data: SaveData = { best: best ? { 7: best } : {}, completed: [], muted: false };
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

const shift = (o: Partial<KitchenShiftSummary> = {}): KitchenShiftSummary => ({
  seed: 1,
  completed: true,
  stars: 3,
  golden: true,
  score: 12_340,
  points: { orders: 8000, speed: 2000, perfect: 1500, combo: 840 },
  total: 8,
  served: 8,
  ratings: [5, 5, 5, 5, 5, 4, 5, 5],
  seen: ['hamburger', 'cheeseburger', 'baconCheeseburger', 'zola', 'brie', 'crispyGoat', 'big', 'doubleTriple'],
  angry: 0,
  takingsCents: 9540,
  perfectCooks: 15,
  perfectPatties: 9,
  bacon: 4,
  perfectBacon: 4,
  menuFive: true,
  rawOrders: 0,
  overOrders: 1,
  wrongOrders: 0,
  menuErrors: 0,
  slowOrders: 0,
  tutorialDone: true,
  ...o,
});

describe('KitchenProgress', () => {
  it('defaults: AIUTI on, tutorial to do, nothing unlocked', () => {
    const p = new KitchenProgress(memory());
    expect(p.data).toMatchObject({ settings: DEFAULT_KITCHEN_SETTINGS, tutorialDone: false, achievements: [], bestStars: 0, golden: false });
    expect(DEFAULT_KITCHEN_SETTINGS.hints).toBe(true);
    expect(p.optionsFor(-1)).toEqual({ seed: 0xffffffff, tutorial: true, hints: true, cooked: {} });
  });

  it('round-trips through the store key cicciopoli.kitchen.v1', () => {
    const store = memory();
    const p = new KitchenProgress(store);
    p.setSettings({ hints: false, vibration: false, reducedMotion: true, music: false });
    p.markTutorialDone();
    p.recordShift(shift());
    expect(Object.keys(store.map)).toEqual([KITCHEN_STORE.key]);
    const back = new KitchenProgress(store);
    expect(back.data).toEqual(p.data);
    expect(back.optionsFor(9)).toMatchObject({ seed: 9, tutorial: false, hints: false, cooked: { hamburger: 1, zola: 1, doubleTriple: 1 } });
  });

  it('tolerates corrupt, partial and hostile data and a throwing store', () => {
    for (const raw of ['{nope', 'null', '42', '"x"', '[]', JSON.stringify({ achievements: 'all', bestStars: 9, settings: { hints: 'yes' }, perfectPatties: -5, cooked: 'lots' })]) {
      const p = new KitchenProgress(memory({ [KITCHEN_STORE.key]: raw }));
      expect(p.data.settings).toEqual(DEFAULT_KITCHEN_SETTINGS);
      expect(p.data).toMatchObject({ achievements: [], bestStars: 0, perfectPatties: 0, tutorialDone: false, cooked: {} });
    }
    const counts = new KitchenProgress(memory({ [KITCHEN_STORE.key]: JSON.stringify({ cooked: { zola: 2.7, brie: -1, big: 'x', pizza: 4, green: 3, fanta: 1, emma: 2, nuggets: 0 } }) }));
    expect(counts.data.cooked).toEqual({ zola: 2, green: 3, fanta: 1, emma: 2 });
    const kept = new KitchenProgress(memory({ [KITCHEN_STORE.key]: JSON.stringify({ achievements: ['primo', 'hack'], bestStars: 2, settings: { music: false } }) }));
    expect(kept.data).toMatchObject({ achievements: ['primo'], bestStars: 2, settings: { ...DEFAULT_KITCHEN_SETTINGS, music: false } });
    const broken: KeyValueStore = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('quota'); } };
    const p = new KitchenProgress(broken);
    expect(() => p.recordShift(shift())).not.toThrow();
    expect(p.data.golden).toBe(true);
    expect(new KitchenProgress(null).data.tutorialDone).toBe(false);
  });

  it('counts the served burgers, starters, drinks and regulars of every shift: the next shifts favour the others', () => {
    const p = new KitchenProgress(memory());
    p.recordShift(shift());
    p.recordShift(shift({ seen: ['zola', 'tommaso', 'meatball', 'chinotto', 'green', 'chiara'] }));
    expect(p.data.cooked).toEqual({
      hamburger: 1, cheeseburger: 1, baconCheeseburger: 1, zola: 2, brie: 1, crispyGoat: 1, big: 1, doubleTriple: 1, green: 1,
      tommaso: 1, meatball: 1, chinotto: 1, chiara: 1,
    });
    const o = p.optionsFor(1);
    expect(o.cooked).toEqual(p.data.cooked);
    expect(o.cooked).not.toBe(p.data.cooked);
  });

  it('achievements unlock once; PIASTRA D\'ORO counts PERFETTO burgers over all shifts', () => {
    const p = new KitchenProgress(memory());
    const first = p.recordShift(shift({ perfectPatties: 6, golden: false, stars: 2, bacon: 2, perfectBacon: 1, menuFive: false, angry: 1 }));
    expect(first.map((a) => a.name)).toEqual(['PRIMO PANINO']);
    const second = p.recordShift(shift({ perfectPatties: 4 }));
    expect(second.map((a) => a.name)).toEqual(["PIASTRA D'ORO", 'RE DEL BACON', 'MENÙ COMPLETO', 'NESSUNO SCONTENTO', 'YOU ARE SO GOLDEN']);
    expect(p.recordShift(shift())).toEqual([]);
    expect(p.data).toMatchObject({ bestStars: 3, golden: true, perfectPatties: 19 });
    expect(p.setupInfo(5000)).toMatchObject({ best: 5000, bestStars: 3, golden: true });
    expect(p.setupInfo(0).achievements.every((a) => a.unlocked)).toBe(true);
  });
});

describe('settleShift', () => {
  it('builds the results screen: record, breakdown summing to the score, tip, share text', () => {
    const save = fakeSave(10_000);
    const r = settleShift(shift(), new KitchenProgress(memory()), save);
    expect(r).toMatchObject({ completed: true, golden: true, score: 12_340, best: 12_340, newBest: true, stars: 3, served: 8, total: 8, avgStars: 4.9, takingsCents: 9540, perfectCooks: 15, angry: 0 });
    expect(r.breakdown.reduce((a, b) => a + b.points, 0)).toBe(r.score);
    expect(r.shareText).toBe("Ho fatto 12.340 punti su Ciccio's Kitchen! Riesci a battermi?");
    expect(r.newAchievements.map((a) => a.name)).not.toContain("PIASTRA D'ORO");
    expect(r.newAchievements).toHaveLength(5);
    // a golden shift is praised, even with one burger a bit over-cooked or just short of the record
    expect(r.tip).toBe("Sei d'oro! Ora prova a battere il tuo record.");
    expect(settleShift(shift(), new KitchenProgress(memory()), fakeSave(12_500)).tip).toBe("Sei d'oro! Ora prova a battere il tuo record.");
    expect(settleShift(shift({ golden: false, stars: 2 }), new KitchenProgress(memory()), fakeSave(12_500)).tip).toBe('Ti mancavano 160 punti per il tuo record!');
    expect(settleShift(shift({ golden: false, stars: 2 }), new KitchenProgress(memory()), fakeSave()).tip).toBe('Togli la carne appena è dorata: troppo cotta perde stelle.');
  });

  it('a closed shift with nobody served does not touch the record', () => {
    const save = fakeSave(500);
    const r = settleShift(shift({ completed: false, stars: 0, golden: false, served: 0, ratings: [], angry: 3, score: 0, points: { orders: 0, speed: 0, perfect: 0, combo: 0 } }), new KitchenProgress(memory()), save);
    expect(r).toMatchObject({ completed: false, newBest: false, best: 500, avgStars: 0 });
    expect(r.tip).toBe("Tieni d'occhio la pazienza del cliente: prima la carne, poi il resto!");
    expect(r.breakdown.map((b) => b.label)).not.toContain('Combo 5 stelle');
  });
});
