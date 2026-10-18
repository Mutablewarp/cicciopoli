import { describe, expect, it } from 'vitest';
import { compileSong, type SongEvent } from './sequencer';
import { SONGS } from './tracks';

describe('rampage track', () => {
  const src = SONGS.rampage;
  const song = compileSong(src);
  const notes = (ch: 'lead' | 'harm' | 'bass'): number[] =>
    song.steps.flatMap((evs) => evs.flatMap((e: SongEvent) => (e.ch === ch ? [e.midi] : [])));
  const drums = (step: number): string => song.steps[step].flatMap((e) => (e.ch === 'drums' ? [e.drum] : [])).join('');

  it('is a 150 bpm loop of 8 bars A + 8 bars B', () => {
    expect(src.loop).toBe(true);
    expect(src.bpm).toBe(150);
    expect(src.order).toEqual(['A', 'B']);
    expect(src.patterns.A.bars).toBe(8);
    expect(src.patterns.B.bars).toBe(8);
    expect(song.total / src.stepsPerBar).toBe(16);
    expect(song.total * song.stepDur).toBeCloseTo(25.6, 6);
  });

  it('sections differ in tune and bass line', () => {
    expect(src.patterns.A.lead).not.toBe(src.patterns.B.lead);
    expect(src.patterns.A.bass).not.toBe(src.patterns.B.bass);
  });

  it('stays in C minor (b2 and the leading tone as the only colours)', () => {
    const pcs = new Set([...notes('lead'), ...notes('harm'), ...notes('bass')].map((m) => m % 12));
    for (const pc of pcs) expect([0, 1, 2, 3, 5, 7, 8, 10, 11]).toContain(pc);
    expect(pcs.has(3)).toBe(true); // Eb
    expect(pcs.has(4)).toBe(false); // no E natural
    expect(notes('bass')[0] % 12).toBe(0);
  });

  it('wraps without a gap: every section opens on a downbeat with kick, bass and tune', () => {
    for (const step of [0, song.total / 2]) {
      const kinds = song.steps[step].map((e) => e.ch);
      expect(kinds).toContain('lead');
      expect(kinds).toContain('bass');
      expect(drums(step)).toContain('k');
    }
    // the last beat of each section is a fill that falls back onto the crash
    for (const end of [song.total / 2, song.total]) {
      const fill = [4, 3, 2, 1].map((i) => drums(end - i)).filter((d) => d.includes('s'));
      expect(fill.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('keeps a backbeat: snare on beats 2 and 4 of every bar', () => {
    for (let bar = 0; bar < 16; bar++) {
      const o = bar * src.stepsPerBar;
      expect(drums(o + 4)).toContain('s');
      expect(drums(o + 12)).toContain('s');
    }
  });
});
