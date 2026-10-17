import type { SongSrc } from '../sequencer';

/**
 * Level 1 "Le Colline": bright G-major tarantella in 6/8, 140 dotted-quarter bpm,
 * one step = one eighth note. Form A A' B B' A A' (24 bars).
 * Harm plays the "um-pa-pa" accordion chops, drums the tamburello (accents on 1 and 4).
 */
export const hills: SongSrc = {
  bpm: 140,
  stepsPerBeat: 3,
  stepsPerBar: 6,
  loop: true,
  lead: { wave: 0.25, vol: 0.22, a: 0.004, d: 0.12, sus: 0.6, r: 0.06, gate: 0.85, vib: { cents: 18, rate: 6, delay: 0.2 } },
  harm: { wave: 0.5, vol: 0.085, a: 0.002, d: 0.05, sus: 0.35, r: 0.03, gate: 0.55, cutoff: 2400 },
  bass: { wave: 'bass', vol: 0.32, a: 0.004, d: 0.1, sus: 0.8, r: 0.04, gate: 0.8 },
  drums: 0.34,
  echo: { time: 0.214, fb: 0.2, mix: 0.12 },
  patterns: {
    // G | G | D7 | D7
    A1: {
      bars: 4,
      lead: 'D5 - G5 G5 - B5 | A5 G5 F#5 G5 - D5 | C5 - A5 A5 - C6 | B5 A5 G5 F#5 - D5',
      harm: '. B4 D5 . B4 D5 | . B4 D5 . B4 D5 | . F#4 C5 . A4 C5 | . F#4 C5 . A4 C5',
      bass: 'G2 - . D3 - . | G2 - . D3 - . | D3 - . A2 - . | D3 - . A2 - .',
      drums: 'ko h h so h h',
    },
    // G | C | D7 | G (chromatic run back to the top)
    A2: {
      bars: 4,
      lead: 'D5 - G5 G5 - B5 | C6 - E6 D6 C6 B5 | A5 B5 C6 F#5 G5 A5 | G5 - - B4 C5 C#5',
      harm: '. B4 D5 . B4 D5 | . C5 E5 . C5 E5 | . F#4 C5 . A4 C5 | . B4 D5 . . .',
      bass: 'G2 - . D3 - . | C3 - . G2 - . | D3 - . A2 - . | G2 - . B2 C3 C#3',
      drums: 'ko h h so h h | ko h h so h h | ko h h so h h | ko h h s s s',
    },
    // C | G | D7 | G
    B1: {
      bars: 4,
      lead: 'E6 - - E6 D6 C6 | D6 - B5 G5 - - | C6 - - C6 B5 A5 | B5 - G5 D5 - -',
      harm: '. C5 E5 . C5 E5 | . B4 D5 . B4 D5 | . F#4 C5 . A4 C5 | . B4 D5 . B4 D5',
      bass: 'C3 - . G2 - . | G2 - . D3 - . | D3 - . A2 - . | G2 - . D3 - .',
      drums: 'ko h h so h h',
    },
    // C | G | A7 | D7
    B2: {
      bars: 4,
      lead: 'E5 G5 C6 E6 - C6 | D6 B5 G5 D6 - B5 | C#6 - A5 E5 - G5 | F#5 - A5 D6 C6 A5',
      harm: '. C5 E5 . C5 E5 | . B4 D5 . B4 D5 | . C#5 E5 . A4 E5 | . F#4 C5 . A4 C5',
      bass: 'C3 - . G2 - . | G2 - . D3 - . | A2 - . E3 - . | D3 - . A2 - .',
      drums: 'ko h h so h h | ko h h so h h | ko h h so h h | ko h h s s S',
    },
  },
  order: ['A1', 'A2', 'B1', 'B2', 'A1', 'A2'],
};
