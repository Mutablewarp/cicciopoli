import type { SongSrc } from '../sequencer';

/** Level clear: 2-bar C-major fanfare ending on the bVI - bVII - I "victory" cadence. 16th grid. */
export const win: SongSrc = {
  bpm: 150,
  stepsPerBeat: 4,
  stepsPerBar: 16,
  loop: false,
  lead: { wave: 0.25, vol: 0.2, a: 0.003, d: 0.1, sus: 0.7, r: 0.3, gate: 0.95, vib: { cents: 15, rate: 6, delay: 0.25 } },
  harm: { wave: 0.5, vol: 0.09, a: 0.003, d: 0.1, sus: 0.6, r: 0.3, gate: 0.95, cutoff: 2600 },
  bass: { wave: 'bass', vol: 0.3, a: 0.004, d: 0.1, sus: 0.8, r: 0.2, gate: 0.9 },
  drums: 0.4,
  echo: { time: 0.15, fb: 0.25, mix: 0.15 },
  patterns: {
    F: {
      bars: 2,
      lead: 'C5 E5 G5 C6 - - G5 - E5 - G5 - C6 - - - | Ab5 - - Ab5 Bb5 - - Bb5 C6 - - - - - - -',
      harm: 'C5 - - - - - E5 - - - - - G5 - - - | C5 - - C5 D5 - - D5 E5 - - - - - - -',
      bass: 'C3 - - - G2 - - - C3 - - - G2 - - - | Ab2 - - Ab2 Bb2 - - Bb2 C3 - - - - - - -',
      drums: 'k . . . s . . . k . . . s . s s | k . . k k . . k ko . . . . . . .',
    },
  },
  order: ['F'],
};

/** Game over: slow "sad trombone" chromatic descent with a wobbling last note. */
export const gameover: SongSrc = {
  bpm: 110,
  stepsPerBeat: 2,
  stepsPerBar: 4,
  loop: false,
  lead: { wave: 0.25, vol: 0.18, a: 0.012, d: 0.15, sus: 0.7, r: 0.35, gate: 0.95, vib: { cents: 35, rate: 5, delay: 0.25 } },
  harm: { wave: 0.5, vol: 0.08, a: 0.012, d: 0.15, sus: 0.6, r: 0.35, gate: 0.95, cutoff: 1500 },
  bass: { wave: 'bass', vol: 0.3, a: 0.01, d: 0.15, sus: 0.8, r: 0.3, gate: 0.95 },
  drums: 0,
  patterns: {
    G: {
      bars: 3,
      lead: 'D5 - C#5 - | C5 - B4 - | - - - .',
      harm: 'F4 - E4 - | Eb4 - D4 - | - - - .',
      bass: 'Bb2 - A2 - | Ab2 - G2 - | - - - .',
    },
  },
  order: ['G'],
};
