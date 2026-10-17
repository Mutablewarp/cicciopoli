import type { SongSrc } from '../sequencer';

/**
 * Title: warm D-major serenade, 118 bpm 4/4, one step = one eighth note, 16 bars.
 * Lead = mandolin (tremolo re-plucks, mellowed by a lowpass), harm = guitar off-beat chops.
 */
export const title: SongSrc = {
  bpm: 118,
  stepsPerBeat: 2,
  stepsPerBar: 8,
  loop: true,
  lead: { wave: 0.25, vol: 0.24, a: 0.003, d: 0.06, sus: 0.3, r: 0.09, gate: 1, trem: 11.8, cutoff: 3600 },
  harm: { wave: 0.5, vol: 0.085, a: 0.002, d: 0.08, sus: 0.15, r: 0.05, gate: 0.6, cutoff: 1800 },
  bass: { wave: 'bass', vol: 0.3, a: 0.005, d: 0.2, sus: 0.6, r: 0.06, gate: 0.85 },
  drums: 0.3,
  echo: { time: 0.381, fb: 0.28, mix: 0.2 },
  patterns: {
    // D | D | G | D
    A: {
      bars: 4,
      lead: 'F#5 - - E5 D5 - A4 - | D5 - E5 - F#5 - A5 - | B5 - - A5 G5 - E5 - | F#5 - - - - - A4 -',
      harm: '. . F#4 A4 . . F#4 A4 | . . F#4 A4 . . F#4 A4 | . . G4 B4 . . G4 B4 | . . F#4 A4 . . F#4 A4',
      bass: 'D3 - . . A2 - . . | D3 - . . A2 - . . | G2 - . . D3 - . . | D3 - . . A2 - . .',
      drums: 'k . h . s . h h',
    },
    // Em | A | D | A7
    B: {
      bars: 4,
      lead: 'G5 - - F#5 E5 - B4 - | C#5 - E5 - A5 - G5 - | F#5 - - E5 D5 - F#5 - | E5 - - - - - . .',
      harm: '. . E4 G4 . . B4 G4 | . . C#4 E4 . . C#4 E4 | . . F#4 A4 . . F#4 A4 | . . C#4 G4 . . C#4 G4',
      bass: 'E3 - . . B2 - . . | A2 - . . E3 - . . | D3 - . . A2 - . . | A2 - . . C#3 - E3 -',
      drums: 'k . h . s . h h | k . h . s . h h | k . h . s . h h | k . h . s . s s',
    },
    // Bm | Bm | G | D
    C: {
      bars: 4,
      lead: 'D5 - - C#5 B4 - F#4 - | B4 - C#5 - D5 - F#5 - | G5 - - F#5 E5 - D5 - | F#5 - - - A5 - - -',
      harm: '. . D4 F#4 . . D4 F#4 | . . D4 F#4 . . D4 F#4 | . . G4 B4 . . G4 B4 | . . F#4 A4 . . F#4 A4',
      bass: 'B2 - . . F#2 - . . | B2 - . . F#2 - . . | G2 - . . D3 - . . | D3 - . . A2 - . .',
      drums: 'k . h . s . h h',
    },
    // Em | A | D A7 | D
    D: {
      bars: 4,
      lead: 'G5 - B5 - G5 - E5 - | A5 - G5 - F#5 - E5 - | D5 - F#5 - E5 - C#5 - | D5 - - - - - . .',
      harm: '. . E4 G4 . . B4 G4 | . . C#4 E4 . . C#4 G4 | . . F#4 A4 . . C#4 G4 | . . F#4 A4 . . F#4 A4',
      bass: 'E3 - . . B2 - . . | A2 - . . E3 - . . | D3 - . . A2 - . . | D3 - . . A2 - . .',
      drums: 'k . h . s . h h | k . h . s . h h | k . h . s . h h | k . h . s . s s',
    },
  },
  order: ['A', 'B', 'C', 'D'],
};
