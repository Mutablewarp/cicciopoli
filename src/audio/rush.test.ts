import { describe, expect, it } from 'vitest';
import { compileSong, type SongEvent } from './sequencer';
import { SONGS } from './tracks';
import { rushFever } from './tracks/rushFever';

describe('rush track', () => {
  const src = SONGS.rush;
  const song = compileSong(src);
  const notes = (ch: 'lead' | 'harm' | 'bass'): number[] =>
    song.steps.flatMap((evs) => evs.flatMap((e: SongEvent) => (e.ch === ch ? [e.midi] : [])));
  const drums = (step: number): string => song.steps[step].flatMap((e) => (e.ch === 'drums' ? [e.drum] : [])).join('');
  const has = (step: number, ch: SongEvent['ch']): boolean => song.steps[step].some((e) => e.ch === ch);
  const BAR = src.stepsPerBar;

  it('is a 6/8 tarantella at 160 dotted-quarter bpm: 32 bars A A2 B C, 24 s', () => {
    expect(src.loop).toBe(true);
    expect(src.bpm).toBe(160);
    expect(src.stepsPerBeat).toBe(3);
    expect(BAR).toBe(6);
    expect(src.order).toEqual(['A', 'A2', 'B', 'C']);
    expect(song.total / BAR).toBe(32);
    expect(song.total * song.stepDur).toBeCloseTo(24, 6);
  });

  it('every section has its own tune; A and A2 share the hook', () => {
    const leads = src.order.map((n) => src.patterns[n].lead);
    expect(new Set(leads).size).toBe(4);
    const opening = (n: string): string | undefined => src.patterns[n].lead?.split('|').slice(0, 4).join('|');
    expect(opening('A')).toBe(opening('A2'));
  });

  it('stays in E minor (D# leading tone, C# only as a passing note, no F)', () => {
    const pcs = new Set([...notes('lead'), ...notes('harm'), ...notes('bass')].map((m) => m % 12));
    for (const pc of pcs) expect([4, 6, 7, 9, 11, 0, 1, 2, 3]).toContain(pc);
    expect(pcs.has(3)).toBe(true); // D#
    expect(pcs.has(5)).toBe(false); // no F natural
    expect(notes('bass')[0] % 12).toBe(4);
  });

  it('the engine never stops: the bass pulses on every dotted beat of every bar', () => {
    for (let step = 0; step < song.total; step += 3) expect(has(step, 'bass'), `step ${step}`).toBe(true);
  });

  it('the mandolin runs on every eighth', () => {
    for (let step = 0; step < song.total; step++) expect(has(step, 'harm'), `step ${step}`).toBe(true);
  });

  it('tambourine jingles in every bar, the kick drives A and B on both beats (fill bars aside)', () => {
    for (let bar = 0; bar < 31; bar++) {
      const jingles = [0, 1, 2, 3, 4, 5].filter((i) => drums(bar * BAR + i).includes('o'));
      expect(jingles.length, `bar ${bar + 1}`).toBeGreaterThanOrEqual(2);
    }
    for (let bar = 0; bar < 24; bar++) {
      if (bar % 8 === 7) continue;
      expect(drums(bar * BAR)).toContain('k');
      expect(drums(bar * BAR + 3)).toContain('k');
    }
  });

  it('wraps without a gap: the loop ends on a snare roll that lands on the hook downbeat', () => {
    expect(has(0, 'lead') && has(0, 'bass')).toBe(true);
    expect(drums(0)).toContain('k');
    const roll = [6, 5, 4, 3, 2, 1].filter((i) => drums(song.total - i).includes('s'));
    expect(roll).toHaveLength(6);
  });
});

describe('rush FEVER arrangement (intensity 1)', () => {
  const base = compileSong(SONGS.rush);
  const fever = compileSong(rushFever);
  const BAR = rushFever.stepsPerBar;
  const events = (song: typeof base, step: number, ch: SongEvent['ch']): SongEvent[] => song.steps[step].filter((e) => e.ch === ch);
  const midis = (evs: SongEvent[]): number[] => evs.flatMap((e) => (e.ch === 'drums' ? [] : [e.midi]));
  const drums = (step: number): string => fever.steps[step].flatMap((e) => (e.ch === 'drums' ? [(e.accent ? e.drum.toUpperCase() : e.drum)] : [])).join('');

  it('runs on the same grid as the base track, so it can be swapped in on any step', () => {
    for (const k of ['bpm', 'stepsPerBeat', 'stepsPerBar', 'loop', 'order'] as const) expect(rushFever[k]).toEqual(SONGS.rush[k]);
    expect(fever.total).toBe(base.total);
    expect(fever.stepDur).toBe(base.stepDur);
  });

  it('keeps the tune on top and adds a second accordion a chord tone a third or a fourth below', () => {
    let harmonised = 0;
    for (let step = 0; step < base.total; step++) {
      const tune = midis(events(base, step, 'lead'));
      const both = midis(events(fever, step, 'lead'));
      expect(Math.max(...both, -1), `step ${step}`).toBe(Math.max(...tune, -1));
      const bar = Math.floor(step / BAR) * BAR;
      const chord = new Set(Array.from({ length: BAR }, (_, i) => midis(events(base, bar + i, 'harm'))).flat().map((m) => m % 12));
      for (const low of both.filter((m) => !tune.includes(m))) {
        harmonised++;
        expect(tune[0] - low, `step ${step}`).toBeGreaterThanOrEqual(3);
        expect(tune[0] - low, `step ${step}`).toBeLessThanOrEqual(5);
        expect(chord.has(low % 12), `step ${step}`).toBe(true);
      }
    }
    expect(harmonised).toBeGreaterThan(100);
  });

  it('the tamburello jingles on every eighth, accented on both dotted beats; castanets lead into each beat', () => {
    for (let step = 0; step < fever.total; step++) expect(drums(step), `step ${step}`).toContain(step % 3 === 0 ? 'O' : 'o');
    const clacks = Array.from({ length: fever.total }, (_, s) => s).filter((s) => drums(s).includes('w'));
    expect(clacks.length).toBeGreaterThan(50);
    for (const s of clacks) expect(s % 3).toBe(2);
  });

  it('the engine keeps its beats and pumps octaves in between; everything stays in E minor', () => {
    for (let step = 0; step < base.total; step += 3) expect(midis(events(fever, step, 'bass'))).toEqual(midis(events(base, step, 'bass')));
    const pumped = Array.from({ length: fever.total }, (_, s) => s).filter((s) => {
      const [f] = midis(events(fever, s, 'bass'));
      const [b] = midis(events(base, s, 'bass'));
      return f !== undefined && f === b + 12;
    });
    expect(pumped.length).toBeGreaterThanOrEqual(2 * 26);
    const pcs = new Set(fever.steps.flatMap((evs) => midis(evs)).map((m) => m % 12));
    for (const pc of pcs) expect([4, 6, 7, 9, 11, 0, 1, 2, 3]).toContain(pc);
  });
});
