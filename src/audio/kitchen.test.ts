import { describe, expect, it } from 'vitest';
import { compileSong, type SongEvent } from './sequencer';
import { SONGS } from './tracks';

describe('kitchen track', () => {
  const src = SONGS.kitchen;
  const song = compileSong(src);
  const BAR = src.stepsPerBar;
  const at = (step: number, ch: SongEvent['ch']): SongEvent[] => song.steps[step].filter((e) => e.ch === ch);
  const drums = (step: number): string => song.steps[step].flatMap((e) => (e.ch === 'drums' ? [e.drum] : [])).join('');
  const midis = (ch: 'lead' | 'harm' | 'bass'): number[] => song.steps.flatMap((s) => s.flatMap((e) => (e.ch === ch ? [e.midi] : [])));

  it('is a 112 bpm swing loop on a triplet grid: 32 bars A A2 B BRK, ~69 s', () => {
    expect(src.loop).toBe(true);
    expect(src.bpm).toBe(112);
    expect(src.stepsPerBeat).toBe(3);
    expect(BAR).toBe(12);
    expect(src.order).toEqual(['A', 'A2', 'B', 'BRK']);
    expect(song.total / BAR).toBe(32);
    expect(song.total * song.stepDur).toBeCloseTo(68.57, 1);
  });

  it('every section has its own tune; A and A2 share the hook', () => {
    const leads = src.order.map((n) => src.patterns[n].lead);
    expect(new Set(leads).size).toBe(4);
    const opening = (n: string): string | undefined => src.patterns[n].lead?.split('|').slice(0, 4).join('|');
    expect(opening('A')).toBe(opening('A2'));
  });

  it('is in F major with jazz colours (F# of D7, C# of A7, Eb of F7, B of G7)', () => {
    const pcs = new Set([...midis('lead'), ...midis('harm'), ...midis('bass')].map((m) => m % 12));
    for (const pc of [5, 7, 9, 10, 0, 2, 4, 6, 1, 3, 11]) expect(pcs.has(pc), `pc ${pc}`).toBe(true);
    expect(midis('bass')[0] % 12).toBe(5);
  });

  it('the Rhodes plays real chords: at least one 3-note voicing in every bar', () => {
    for (let bar = 0; bar < 32; bar++) {
      const widest = Math.max(...Array.from({ length: BAR }, (_, i) => at(bar * BAR + i, 'harm').length));
      expect(widest, `bar ${bar + 1}`).toBeGreaterThanOrEqual(3);
    }
  });

  it('the bass walks a note on every beat outside the breakdown vamp', () => {
    for (let step = 0; step < 24 * BAR; step += 3) expect(at(step, 'bass').length, `step ${step}`).toBe(1);
    for (let step = 28 * BAR; step < song.total; step += 3) expect(at(step, 'bass').length, `step ${step}`).toBe(1);
  });

  it('swings: shaker (or tambourine) on every swung eighth and never the middle triplet in groove bars', () => {
    for (let bar = 0; bar < 32; bar++) {
      if (bar % 8 === 7 || (bar >= 24 && bar < 28)) continue; // fills and the breakdown vamp
      for (const i of [0, 2, 3, 5, 6, 8, 9, 11]) expect(drums(bar * BAR + i), `bar ${bar + 1} step ${i}`).toMatch(/[ho]/);
      for (const i of [1, 4, 7, 10]) expect(drums(bar * BAR + i), `bar ${bar + 1} step ${i}`).toBe('');
      expect(drums(bar * BAR + 3)).toContain('s');
      expect(drums(bar * BAR + 9)).toContain('s');
    }
  });

  it('the breakdown drops out: no tune and no brushes in its first two bars', () => {
    for (let step = 24 * BAR; step < 26 * BAR; step++) {
      expect(at(step, 'lead')).toHaveLength(0);
      expect(drums(step)).not.toContain('s');
    }
  });

  it('wraps without a gap: a brush roll and the bass lead-in fall onto the hook downbeat', () => {
    expect(drums(0)).toContain('k');
    expect(at(0, 'bass')).toHaveLength(1);
    const roll = [4, 3, 2, 1].filter((i) => drums(song.total - i).includes('s'));
    expect(roll).toHaveLength(4);
    const last = midis('bass').at(-1) ?? 0;
    expect(Math.abs(midis('bass')[0] - last)).toBe(1); // E2 -> F2
  });
});
