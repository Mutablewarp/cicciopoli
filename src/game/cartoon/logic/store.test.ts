import { describe, expect, it } from 'vitest';
import type { CartoonBossId } from '../../../contracts';
import { CARTOON_STORE } from '../../../config/cartoon';
import { CartoonProgress, type KeyValueStore } from './store';

const IDS: CartoonBossId[] = ['brie', 'pancetta', 'tuma', 'happy', 'oldschool', 'doubletriple', 'burgergang'];
const INFO = IDS.map((id) => ({ id, name: id.toUpperCase(), tagline: '' }));

function mem(raw: string | null = null): KeyValueStore & { raw: string | null } {
  return {
    raw,
    getItem() {
      return this.raw;
    },
    setItem(_k, v) {
      this.raw = v;
    },
  };
}

describe('cartoon progress store', () => {
  it('fresh: first boss open, the rest locked; auto-fire follows touch', () => {
    const p = new CartoonProgress(mem(), IDS, true);
    const m = p.mapInfo(INFO, 0);
    expect(m.next).toBe('brie');
    expect(m.bosses.map((b) => b.state)).toEqual(['open', 'locked', 'locked', 'locked', 'locked', 'locked', 'locked']);
    expect(m.settings.autoFire).toBe(true);
    expect(new CartoonProgress(mem(), IDS, false).data.settings.autoFire).toBe(false);
  });

  it('a knockout opens the next boss, keeps the best grade and persists', () => {
    const s = mem();
    const p = new CartoonProgress(s, IDS, false);
    expect(p.recordKnockout('brie', 'B', 5000)).toBe(false);
    expect(p.after('brie')).toBe('pancetta');
    p.recordKnockout('brie', 'C', 9000);
    expect(p.data.grades.brie).toBe('B');
    expect(p.data.bestScores.brie).toBe(9000);
    const again = new CartoonProgress(s, IDS, false);
    expect(again.stateOf('brie')).toBe('beaten');
    expect(again.stateOf('pancetta')).toBe('open');
    expect(again.stateOf('tuma')).toBe('locked');
    expect(again.mapInfo(INFO, 1).bosses[0].grade).toBe('B');
  });

  it('all seven beaten = golden, and next goes back to the first', () => {
    const p = new CartoonProgress(mem(), IDS, false);
    const done = IDS.map((id) => p.recordKnockout(id, 'A', 1));
    expect(done.at(-1)).toBe(true);
    expect(p.data.golden).toBe(true);
    expect(p.next()).toBe('brie');
    expect(p.after('burgergang')).toBeNull();
  });

  it('tolerant load: garbage, wrong types and unknown ids fall back to defaults', () => {
    for (const raw of ['{', 'null', '42', JSON.stringify({ beaten: 'x', grades: { brie: 'Z' }, settings: { music: 'yes' } })]) {
      const p = new CartoonProgress(mem(raw), IDS, false);
      expect(p.data.beaten).toEqual([]);
      expect(p.data.grades).toEqual({});
      expect(p.data.settings.music).toBe(true);
    }
    const p = new CartoonProgress(mem(JSON.stringify({ beaten: ['tuma', 'nope', 'brie'], grades: { brie: 'A+' }, golden: true })), IDS, false);
    expect(p.data.beaten).toEqual(['brie', 'tuma']);
    expect(p.data.grades.brie).toBe('A+');
    expect(p.data.golden).toBe(true);
  });

  it('a throwing storage never blocks the game', () => {
    const bad: KeyValueStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('quota');
      },
    };
    const p = new CartoonProgress(bad, IDS, false);
    expect(() => p.recordKnockout('brie', 'A', 1)).not.toThrow();
    expect(p.stateOf('brie')).toBe('beaten');
    expect(CARTOON_STORE.key).toBe('cicciopoli.cartoon.v1');
  });
});
