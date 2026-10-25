import { describe, expect, it } from 'vitest';
import { compileSong, type SongSrc } from './sequencer';
import { advanceStep, catchUp, hz, midiToFreq, noteToMidi, stepDuration, stepsDue } from './theory';
import { SONGS, type SongName } from './tracks';

describe('note -> frequency', () => {
  it('parses note names', () => {
    expect(noteToMidi('A4')).toBe(69);
    expect(noteToMidi('C4')).toBe(60);
    expect(noteToMidi('C#4')).toBe(61);
    expect(noteToMidi('Bb3')).toBe(58);
    expect(noteToMidi('B#3')).toBe(60);
    expect(noteToMidi('C-1')).toBe(0);
    expect(noteToMidi('H4')).toBeNull();
    expect(noteToMidi('-')).toBeNull();
    expect(noteToMidi('c4')).toBeNull();
  });

  it('maps midi to equal-tempered Hz', () => {
    expect(midiToFreq(69)).toBe(440);
    expect(midiToFreq(81)).toBeCloseTo(880, 6);
    expect(midiToFreq(60)).toBeCloseTo(261.626, 3);
    expect(hz('E6')).toBeCloseTo(1318.51, 2);
    expect(() => hz('X9')).toThrow();
  });
});

describe('step timing', () => {
  it('computes step duration', () => {
    expect(stepDuration(120, 4)).toBeCloseTo(0.125, 9);
    expect(stepDuration(140, 3)).toBeCloseTo(60 / 420, 9);
  });

  it('counts steps due inside the lookahead window', () => {
    expect(stepsDue(1, 1, 0.1)).toBe(0);
    expect(stepsDue(1.2, 1, 0.1)).toBe(0);
    expect(stepsDue(1, 1.12, 0.1)).toBe(2); // 1.0 and 1.1
    expect(stepsDue(1, 1.2, 0.1)).toBe(2); // 1.2 itself is not inside
    expect(stepsDue(0, 0.25, 0.125)).toBe(2);
    expect(stepsDue(0, 0.2501, 0.125)).toBe(3);
  });

  it('wraps loops and ends one-shots', () => {
    expect(advanceStep(0, 4, true)).toBe(1);
    expect(advanceStep(3, 4, true)).toBe(0);
    expect(advanceStep(3, 4, false)).toBe(-1);
  });

  it('resyncs a lagging cursor instead of bursting', () => {
    expect(catchUp(10, 10.02)).toBe(10); // small lag: keep timing
    expect(catchUp(5, 10)).toBeCloseTo(10.02, 9);
    expect(catchUp(11, 10)).toBe(11);
  });
});

const tiny = (over: Partial<SongSrc> = {}): SongSrc => {
  const p = { wave: 0.5, vol: 0.1, a: 0.01, d: 0.1, sus: 0.5, r: 0.05 } as const;
  return {
    bpm: 120,
    stepsPerBeat: 2,
    stepsPerBar: 4,
    loop: true,
    lead: p,
    harm: p,
    bass: p,
    drums: 0.5,
    patterns: { A: { bars: 2, lead: 'C4 - - . | E4 . G4 -', drums: 'kH . s .' } },
    order: ['A', 'A'],
    ...over,
  };
};

describe('compileSong', () => {
  it('merges holds, repeats short channels and reads accents', () => {
    const s = compileSong(tiny());
    expect(s.total).toBe(16);
    expect(s.stepDur).toBeCloseTo(0.25, 9);
    expect(s.steps[0]).toContainEqual({ ch: 'lead', midi: 60, len: 3 });
    expect(s.steps[6]).toContainEqual({ ch: 'lead', midi: 67, len: 2 });
    expect(s.steps[0]).toContainEqual({ ch: 'drums', drum: 'h', accent: true });
    expect(s.steps[4].filter((e) => e.ch === 'drums')).toHaveLength(2); // 1-bar loop repeated
    expect(s.steps[8]).toContainEqual({ ch: 'lead', midi: 60, len: 3 }); // second pass of A
  });

  it('plays "+" chords as one held event per note', () => {
    const s = compileSong(tiny({ patterns: { A: { bars: 1, harm: 'F3+A3+C4 - . E4' } }, order: ['A'] }));
    expect(s.steps[0]).toEqual([
      { ch: 'harm', midi: 53, len: 2 },
      { ch: 'harm', midi: 57, len: 2 },
      { ch: 'harm', midi: 60, len: 2 },
    ]);
    expect(s.steps[3]).toEqual([{ ch: 'harm', midi: 64, len: 1 }]);
    expect(() => compileSong(tiny({ patterns: { A: { bars: 1, harm: 'F3+X3 . . .' } } }))).toThrow(/bad note/);
  });

  it('rejects authoring mistakes', () => {
    expect(() => compileSong(tiny({ patterns: { A: { bars: 1, lead: 'C4 - -' } } }))).toThrow(/3 steps/);
    expect(() => compileSong(tiny({ patterns: { A: { bars: 1, lead: 'C4 - - Q9' } } }))).toThrow(/bad note/);
    expect(() => compileSong(tiny({ patterns: { A: { bars: 1, drums: 'k x . .' } } }))).toThrow(/bad drum/);
    expect(() => compileSong(tiny({ order: ['B'] }))).toThrow(/unknown pattern/);
    expect(() => compileSong(tiny({ patterns: { A: { bars: 3, lead: 'C4 . . . | D4 . . .' } } }))).toThrow(/tile/);
  });
});

describe('tracks', () => {
  const names = Object.keys(SONGS) as SongName[];
  const seconds = (n: SongName): number => {
    const s = compileSong(SONGS[n]);
    return s.total * s.stepDur;
  };

  it.each(names)('%s compiles with sane ranges', (n) => {
    const s = compileSong(SONGS[n]);
    for (const step of s.steps) {
      for (const e of step) {
        if (e.ch === 'lead') expect(e.midi).toBeGreaterThanOrEqual(57);
        if (e.ch === 'lead') expect(e.midi).toBeLessThanOrEqual(90);
        if (e.ch === 'bass') expect(e.midi).toBeLessThanOrEqual(52);
      }
    }
  });

  it('loops have the requested length and form', () => {
    const loops: SongName[] = ['title', 'hills', 'inferno', 'invaders', 'maze', 'rampage'];
    for (const n of loops) expect(SONGS[n].loop).toBe(true);
    const bars = (n: SongName): number => compileSong(SONGS[n]).total / SONGS[n].stepsPerBar;
    expect(bars('title')).toBeGreaterThanOrEqual(8);
    expect(bars('title')).toBeLessThanOrEqual(16);
    expect(bars('hills')).toBeGreaterThanOrEqual(16);
    expect(bars('inferno')).toBeGreaterThanOrEqual(16);
    expect(bars('invaders')).toBeGreaterThanOrEqual(16);
    expect(bars('maze')).toBeGreaterThanOrEqual(8);
    expect(bars('maze')).toBeLessThanOrEqual(16);
    expect(bars('rampage')).toBe(16);
    expect(SONGS.invaders.bpm).toBeCloseTo(128, -1);
    expect(SONGS.maze.bpm).toBeCloseTo(140, -1);
    for (const n of ['hills', 'inferno', 'invaders', 'maze', 'rampage'] as const) {
      expect(new Set(SONGS[n].order).size).toBeGreaterThanOrEqual(2);
    }
  });

  it('jingles are short one-shots', () => {
    expect(SONGS.win.loop || SONGS.gameover.loop).toBe(false);
    expect(seconds('win')).toBeLessThanOrEqual(4);
    expect(seconds('gameover')).toBeLessThanOrEqual(4);
  });
});
